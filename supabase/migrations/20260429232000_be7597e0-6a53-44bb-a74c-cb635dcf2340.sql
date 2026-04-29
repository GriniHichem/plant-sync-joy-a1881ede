
-- 1) Étendre recipe_lines avec les champs BOM
ALTER TABLE public.recipe_lines
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'raw_material',
  ADD COLUMN IF NOT EXISTS waste_percent numeric(8,4),
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_quality_sensitive boolean NOT NULL DEFAULT false;

-- Trigger-based check (CHECK constraints with text are fine, but we keep flexibility)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recipe_lines_item_type_check') THEN
    ALTER TABLE public.recipe_lines
      ADD CONSTRAINT recipe_lines_item_type_check
      CHECK (item_type IN ('raw_material','packaging','label','carton','pallet','consumable'));
  END IF;
END $$;

-- 2) Backfill : copier les bom_items existants dans recipe_lines
DO $$
DECLARE
  v_bom record;
  v_recipe_id uuid;
BEGIN
  FOR v_bom IN
    SELECT b.id AS bom_id, b.product_id, b.version, b.status
      FROM public.bill_of_materials b
     WHERE b.status IN ('active','draft')
  LOOP
    -- Pick latest active recipe for the product, else create one
    SELECT id INTO v_recipe_id
      FROM public.recipes
     WHERE product_id = v_bom.product_id
       AND COALESCE(status,'') IN ('active','draft')
     ORDER BY (status='active') DESC, version DESC
     LIMIT 1;

    IF v_recipe_id IS NULL THEN
      INSERT INTO public.recipes (name, product_id, version, status, is_active)
      VALUES (
        'Recette migrée v' || v_bom.version,
        v_bom.product_id,
        v_bom.version,
        v_bom.status,
        v_bom.status = 'active'
      )
      RETURNING id INTO v_recipe_id;
    END IF;

    -- Copy items only if not already present (by article_id)
    INSERT INTO public.recipe_lines (
      recipe_id, article_id, quantite, unite,
      item_type, waste_percent, is_mandatory, is_quality_sensitive
    )
    SELECT
      v_recipe_id, bi.article_id, bi.quantity_per_unit, COALESCE(bi.unit,'g'),
      bi.item_type, bi.waste_percent, bi.is_mandatory, bi.is_quality_sensitive
    FROM public.bom_items bi
    WHERE bi.bom_id = v_bom.bom_id
      AND NOT EXISTS (
        SELECT 1 FROM public.recipe_lines rl
         WHERE rl.recipe_id = v_recipe_id
           AND rl.article_id = bi.article_id
      );
  END LOOP;
END $$;

-- 3) Marquer bill_of_materials comme legacy
COMMENT ON TABLE public.bill_of_materials IS
  'LEGACY — fusionné dans recipes/recipe_lines. Conservé pour historique. Ne plus écrire.';
COMMENT ON TABLE public.bom_items IS
  'LEGACY — fusionné dans recipe_lines. Conservé pour historique. Ne plus écrire.';

-- 4) RPC qui assemble recette + composants + étapes pour un OF
CREATE OR REPLACE FUNCTION public.get_recipe_for_of(p_of_id uuid)
RETURNS TABLE (
  recipe_id uuid,
  recipe_name text,
  version int,
  status text,
  product_id uuid,
  components jsonb,
  steps jsonb,
  quality_sensitive_components jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe_id uuid;
BEGIN
  SELECT o.recipe_id INTO v_recipe_id
    FROM public.ordres_fabrication o
   WHERE o.id = p_of_id;

  IF v_recipe_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.version,
    COALESCE(r.status, CASE WHEN r.is_active THEN 'active' ELSE 'archived' END),
    r.product_id,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'article_id', rl.article_id,
        'code', a.code,
        'designation', a.designation,
        'quantity', rl.quantite,
        'unit', rl.unite,
        'item_type', rl.item_type,
        'waste_percent', rl.waste_percent,
        'is_mandatory', rl.is_mandatory,
        'is_quality_sensitive', rl.is_quality_sensitive
      ) ORDER BY a.code)
        FROM public.recipe_lines rl
        LEFT JOIN public.articles a ON a.id = rl.article_id
       WHERE rl.recipe_id = r.id
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', rs.id,
        'order', rs.step_order,
        'title', rs.title,
        'description', rs.description,
        'duration', rs.expected_duration_minutes,
        'ccp', rs.critical_control_point,
        'indicator_id', rs.quality_indicator_id
      ) ORDER BY rs.step_order)
        FROM public.recipe_steps rs
       WHERE rs.recipe_id = r.id
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'article_id', rl.article_id,
        'code', a.code,
        'designation', a.designation,
        'quantity', rl.quantite,
        'unit', rl.unite,
        'item_type', rl.item_type
      ) ORDER BY a.code)
        FROM public.recipe_lines rl
        LEFT JOIN public.articles a ON a.id = rl.article_id
       WHERE rl.recipe_id = r.id AND rl.is_quality_sensitive = true
    ), '[]'::jsonb)
  FROM public.recipes r
  WHERE r.id = v_recipe_id;
END;
$$;

-- 5) Trigger rétro-compat : remplir bom_id d'un OF si nul
CREATE OR REPLACE FUNCTION public.of_backfill_bom_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bom_id IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT id INTO NEW.bom_id
      FROM public.bill_of_materials
     WHERE product_id = NEW.product_id
       AND status = 'active'
     ORDER BY version DESC
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_of_backfill_bom_id ON public.ordres_fabrication;
CREATE TRIGGER trg_of_backfill_bom_id
BEFORE INSERT ON public.ordres_fabrication
FOR EACH ROW EXECUTE FUNCTION public.of_backfill_bom_id();
