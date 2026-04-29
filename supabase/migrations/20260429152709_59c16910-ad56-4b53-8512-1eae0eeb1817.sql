-- 1) Extend recipes (additive only)
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS valid_to timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS notes text;

-- Backfill status from is_active for existing rows
UPDATE public.recipes SET status = CASE WHEN is_active THEN 'active' ELSE 'archived' END
  WHERE status IS NULL OR status NOT IN ('draft','active','archived');

-- Constraint check on status values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recipes_status_check') THEN
    ALTER TABLE public.recipes
      ADD CONSTRAINT recipes_status_check CHECK (status IN ('draft','active','archived'));
  END IF;
END $$;

-- Keep is_active and status in sync via trigger (non-breaking)
CREATE OR REPLACE FUNCTION public.recipes_sync_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If status changed, align is_active
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.is_active := (NEW.status = 'active');
  -- Else if is_active toggled, align status
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.status := CASE WHEN NEW.is_active THEN 'active' ELSE 'archived' END;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_recipes_sync_status ON public.recipes;
CREATE TRIGGER trg_recipes_sync_status
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.recipes_sync_status();

-- 2) recipe_steps table
CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  title text NOT NULL,
  description text,
  process_parameter jsonb,
  expected_duration_minutes numeric,
  critical_control_point boolean NOT NULL DEFAULT false,
  quality_indicator_id uuid REFERENCES public.quality_indicators(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (recipe_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe ON public.recipe_steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_indicator ON public.recipe_steps(quality_indicator_id);

ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe_steps_select_authenticated" ON public.recipe_steps;
CREATE POLICY "recipe_steps_select_authenticated"
  ON public.recipe_steps FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "recipe_steps_write_managers" ON public.recipe_steps;
CREATE POLICY "recipe_steps_write_managers"
  ON public.recipe_steps FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'resp_production'::app_role)
    OR public.has_role(auth.uid(),'bureau_methode'::app_role)
    OR public.has_role(auth.uid(),'controleur_qualite'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'resp_production'::app_role)
    OR public.has_role(auth.uid(),'bureau_methode'::app_role)
    OR public.has_role(auth.uid(),'controleur_qualite'::app_role)
  );

DROP TRIGGER IF EXISTS trg_recipe_steps_updated_at ON public.recipe_steps;
CREATE TRIGGER trg_recipe_steps_updated_at
  BEFORE UPDATE ON public.recipe_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RPC to safely change recipe status
CREATE OR REPLACE FUNCTION public.set_recipe_status(
  p_recipe_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old text;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_status NOT IN ('draft','active','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  IF NOT (
    public.has_role(v_uid,'admin'::app_role)
    OR public.has_role(v_uid,'resp_production'::app_role)
    OR public.has_role(v_uid,'bureau_methode'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to change recipe status';
  END IF;

  SELECT status, name INTO v_old, v_name FROM public.recipes WHERE id = p_recipe_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Recipe not found';
  END IF;

  IF p_status = 'active' THEN
    UPDATE public.recipes
       SET status = 'active',
           is_active = true,
           valid_from = COALESCE(valid_from, now()),
           valid_to = NULL,
           approved_by = v_uid,
           approved_at = now(),
           updated_by = v_uid
     WHERE id = p_recipe_id;
  ELSIF p_status = 'archived' THEN
    UPDATE public.recipes
       SET status = 'archived',
           is_active = false,
           valid_to = now(),
           updated_by = v_uid
     WHERE id = p_recipe_id;
  ELSE
    UPDATE public.recipes
       SET status = 'draft',
           is_active = false,
           updated_by = v_uid
     WHERE id = p_recipe_id;
  END IF;

  INSERT INTO public.audit_logs(
    user_id, action, table_name, record_id, module, entity_type, entity_id, entity_code,
    action_label, action_type, description, old_values, new_values, severity
  ) VALUES (
    v_uid, 'update_recipe_status', 'recipes', p_recipe_id, 'gpao', 'recipe', p_recipe_id, v_name,
    'Changement de statut recette', 'update',
    COALESCE(p_reason,''),
    jsonb_build_object('status', v_old),
    jsonb_build_object('status', p_status),
    'info'
  );
END $$;