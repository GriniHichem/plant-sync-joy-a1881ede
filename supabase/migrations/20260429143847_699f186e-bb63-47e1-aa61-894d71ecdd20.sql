-- ============================================================
-- Quality indicator assignments (product / family / line / recipe)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quality_indicator_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.quality_indicators(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  product_family_id uuid REFERENCES public.product_families(id) ON DELETE CASCADE,
  production_line_id uuid REFERENCES public.production_lines(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT false,
  is_blocking boolean NOT NULL DEFAULT false,
  frequency_type public.quality_frequency_type,
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qia_indicator ON public.quality_indicator_assignments(indicator_id);
CREATE INDEX IF NOT EXISTS idx_qia_product ON public.quality_indicator_assignments(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qia_family ON public.quality_indicator_assignments(product_family_id) WHERE product_family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qia_line ON public.quality_indicator_assignments(production_line_id) WHERE production_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qia_recipe ON public.quality_indicator_assignments(recipe_id) WHERE recipe_id IS NOT NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_qia_updated_at ON public.quality_indicator_assignments;
CREATE TRIGGER trg_qia_updated_at
BEFORE UPDATE ON public.quality_indicator_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger: prevent exact duplicate (same indicator + same scope tuple)
CREATE OR REPLACE FUNCTION public.quality_indicator_assignments_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.quality_indicator_assignments a
    WHERE a.indicator_id = NEW.indicator_id
      AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(a.product_id::text,'') = COALESCE(NEW.product_id::text,'')
      AND COALESCE(a.product_family_id::text,'') = COALESCE(NEW.product_family_id::text,'')
      AND COALESCE(a.production_line_id::text,'') = COALESCE(NEW.production_line_id::text,'')
      AND COALESCE(a.recipe_id::text,'') = COALESCE(NEW.recipe_id::text,'')
  ) THEN
    RAISE EXCEPTION 'Affectation déjà existante pour cet indicateur et ce périmètre';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qia_validate ON public.quality_indicator_assignments;
CREATE TRIGGER trg_qia_validate
BEFORE INSERT OR UPDATE ON public.quality_indicator_assignments
FOR EACH ROW
EXECUTE FUNCTION public.quality_indicator_assignments_validate();

-- RLS
ALTER TABLE public.quality_indicator_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "QIA viewable by authenticated"
ON public.quality_indicator_assignments
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "QIA manage by admin/bureau/prod/magasin"
ON public.quality_indicator_assignments
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'bureau_methode'::app_role)
  OR has_role(auth.uid(), 'resp_production'::app_role)
  OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'bureau_methode'::app_role)
  OR has_role(auth.uid(), 'resp_production'::app_role)
  OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
);

-- ============================================================
-- Read-only helper: indicators applicable to an OF
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_quality_indicators_for_of(p_of_id uuid)
RETURNS TABLE (
  indicator_id uuid,
  code text,
  name text,
  description text,
  indicator_type text,
  category text,
  unit text,
  target_value numeric,
  min_value numeric,
  max_value numeric,
  tolerance_minus numeric,
  tolerance_plus numeric,
  select_options jsonb,
  effective_frequency_type text,
  effective_is_required boolean,
  effective_is_blocking boolean,
  match_scope text,
  assignment_id uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH of_ctx AS (
    SELECT
      o.id              AS of_id,
      o.product_id      AS product_id,
      o.recipe_id       AS recipe_id,
      o.line_id         AS line_id,
      p.family_id       AS family_id
    FROM public.ordres_fabrication o
    LEFT JOIN public.products p ON p.id = o.product_id
    WHERE o.id = p_of_id
  ),
  candidates AS (
    -- 1) Explicit assignments matching any scope of the OF
    SELECT
      qi.id                 AS indicator_id,
      qi.code, qi.name, qi.description,
      qi.indicator_type::text, qi.category::text,
      qi.unit, qi.target_value, qi.min_value, qi.max_value,
      qi.tolerance_minus, qi.tolerance_plus,
      to_jsonb(qi.select_options) AS select_options,
      COALESCE(a.frequency_type::text, qi.frequency_type::text) AS effective_frequency_type,
      (a.is_required OR qi.is_required) AS effective_is_required,
      (a.is_blocking OR qi.is_blocking) AS effective_is_blocking,
      CASE
        WHEN a.recipe_id IS NOT NULL THEN 'recipe'
        WHEN a.product_id IS NOT NULL THEN 'product'
        WHEN a.product_family_id IS NOT NULL THEN 'family'
        WHEN a.production_line_id IS NOT NULL THEN 'line'
        ELSE 'global'
      END AS match_scope,
      CASE
        WHEN a.recipe_id IS NOT NULL THEN 5
        WHEN a.product_id IS NOT NULL THEN 4
        WHEN a.product_family_id IS NOT NULL THEN 3
        WHEN a.production_line_id IS NOT NULL THEN 2
        ELSE 1
      END AS scope_priority,
      a.id AS assignment_id
    FROM public.quality_indicator_assignments a
    JOIN public.quality_indicators qi ON qi.id = a.indicator_id
    CROSS JOIN of_ctx ctx
    WHERE qi.is_active = true
      AND (
        (a.product_id IS NOT NULL AND a.product_id = ctx.product_id)
        OR (a.product_family_id IS NOT NULL AND a.product_family_id = ctx.family_id)
        OR (a.production_line_id IS NOT NULL AND a.production_line_id = ctx.line_id)
        OR (a.recipe_id IS NOT NULL AND a.recipe_id = ctx.recipe_id)
        OR (
          a.product_id IS NULL
          AND a.product_family_id IS NULL
          AND a.production_line_id IS NULL
          AND a.recipe_id IS NULL
        )
      )

    UNION ALL

    -- 2) Indicators with NO assignment row at all → considered global
    SELECT
      qi.id, qi.code, qi.name, qi.description,
      qi.indicator_type::text, qi.category::text,
      qi.unit, qi.target_value, qi.min_value, qi.max_value,
      qi.tolerance_minus, qi.tolerance_plus,
      to_jsonb(qi.select_options),
      qi.frequency_type::text,
      qi.is_required, qi.is_blocking,
      'global'::text, 1,
      NULL::uuid
    FROM public.quality_indicators qi
    WHERE qi.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.quality_indicator_assignments a WHERE a.indicator_id = qi.id
      )
  ),
  ranked AS (
    SELECT c.*,
      ROW_NUMBER() OVER (PARTITION BY c.indicator_id ORDER BY c.scope_priority DESC, c.assignment_id NULLS LAST) AS rn
    FROM candidates c
  )
  SELECT
    indicator_id, code, name, description,
    indicator_type, category, unit,
    target_value, min_value, max_value,
    tolerance_minus, tolerance_plus, select_options,
    effective_frequency_type, effective_is_required, effective_is_blocking,
    match_scope, assignment_id
  FROM ranked
  WHERE rn = 1
  ORDER BY category, code;
$$;

GRANT EXECUTE ON FUNCTION public.get_quality_indicators_for_of(uuid) TO authenticated;