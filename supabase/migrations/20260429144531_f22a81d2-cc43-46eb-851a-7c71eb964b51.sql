-- ============================================================
-- Quality checks per OF
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  of_id uuid NOT NULL REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  production_line_id uuid REFERENCES public.production_lines(id) ON DELETE SET NULL,
  shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.shift_teams(id) ON DELETE SET NULL,
  indicator_id uuid NOT NULL REFERENCES public.quality_indicators(id) ON DELETE RESTRICT,

  measured_value_numeric numeric,
  measured_value_text text,
  measured_value_boolean boolean,
  selected_value text,

  unit text,
  target_value numeric,
  min_value numeric,
  max_value numeric,

  is_conform boolean,
  deviation_value numeric,
  deviation_percent numeric,

  control_time timestamptz NOT NULL DEFAULT now(),
  controlled_by uuid,
  comment text NOT NULL DEFAULT '',

  status text NOT NULL DEFAULT 'submitted',
  validation_status text NOT NULL DEFAULT 'not_required',
  validated_by uuid,
  validated_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_of ON public.quality_checks(of_id);
CREATE INDEX IF NOT EXISTS idx_qc_indicator ON public.quality_checks(indicator_id);
CREATE INDEX IF NOT EXISTS idx_qc_line ON public.quality_checks(production_line_id);
CREATE INDEX IF NOT EXISTS idx_qc_time ON public.quality_checks(control_time DESC);
CREATE INDEX IF NOT EXISTS idx_qc_conform ON public.quality_checks(is_conform);

DROP TRIGGER IF EXISTS trg_qc_updated_at ON public.quality_checks;
CREATE TRIGGER trg_qc_updated_at
BEFORE UPDATE ON public.quality_checks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conformity computation
CREATE OR REPLACE FUNCTION public.quality_checks_compute_conformity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
BEGIN
  -- Whitelist statuses
  IF NEW.status NOT IN ('draft','submitted','validated','rejected') THEN
    RAISE EXCEPTION 'Statut invalide: %', NEW.status;
  END IF;
  IF NEW.validation_status NOT IN ('not_required','pending','approved','rejected') THEN
    RAISE EXCEPTION 'Statut de validation invalide: %', NEW.validation_status;
  END IF;

  SELECT indicator_type::text INTO v_type FROM public.quality_indicators WHERE id = NEW.indicator_id;

  IF v_type = 'numeric' AND NEW.measured_value_numeric IS NOT NULL THEN
    NEW.is_conform := (NEW.min_value IS NULL OR NEW.measured_value_numeric >= NEW.min_value)
                  AND (NEW.max_value IS NULL OR NEW.measured_value_numeric <= NEW.max_value);
    IF NEW.target_value IS NOT NULL THEN
      NEW.deviation_value := NEW.measured_value_numeric - NEW.target_value;
      IF NEW.target_value <> 0 THEN
        NEW.deviation_percent := (NEW.measured_value_numeric - NEW.target_value) / NEW.target_value * 100.0;
      ELSE
        NEW.deviation_percent := NULL;
      END IF;
    ELSE
      NEW.deviation_value := NULL;
      NEW.deviation_percent := NULL;
    END IF;
  ELSIF v_type = 'boolean' AND NEW.measured_value_boolean IS NOT NULL THEN
    NEW.is_conform := NEW.measured_value_boolean;
    NEW.deviation_value := NULL;
    NEW.deviation_percent := NULL;
  ELSE
    -- text / select / no value: leave is_conform NULL (no automatic verdict)
    NEW.is_conform := NULL;
    NEW.deviation_value := NULL;
    NEW.deviation_percent := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qc_conformity ON public.quality_checks;
CREATE TRIGGER trg_qc_conformity
BEFORE INSERT OR UPDATE ON public.quality_checks
FOR EACH ROW EXECUTE FUNCTION public.quality_checks_compute_conformity();

-- RLS
ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "QC viewable by authenticated"
ON public.quality_checks FOR SELECT TO authenticated USING (true);

CREATE POLICY "QC insert by authorized"
ON public.quality_checks FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'bureau_methode'::app_role)
  OR has_role(auth.uid(), 'resp_production'::app_role)
  OR has_role(auth.uid(), 'chef_ligne'::app_role)
  OR has_role(auth.uid(), 'operateur'::app_role)
  OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
);

CREATE POLICY "QC update by authorized"
ON public.quality_checks FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'bureau_methode'::app_role)
  OR has_role(auth.uid(), 'resp_production'::app_role)
  OR has_role(auth.uid(), 'chef_ligne'::app_role)
  OR controlled_by = auth.uid()
);

CREATE POLICY "QC delete by admin"
ON public.quality_checks FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));