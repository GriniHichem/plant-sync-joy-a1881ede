
-- Enums
CREATE TYPE public.quality_indicator_type AS ENUM ('numeric','boolean','text','select');
CREATE TYPE public.quality_frequency_type AS ENUM ('hourly','shift','daily','per_of','per_lot','manual');
CREATE TYPE public.quality_indicator_category AS ENUM (
  'produit_fini','emballage','process','hygiene','poids','controle_visuel','autre'
);

-- Table
CREATE TABLE public.quality_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  indicator_type public.quality_indicator_type NOT NULL,
  unit text,
  target_value numeric,
  min_value numeric,
  max_value numeric,
  tolerance_minus numeric,
  tolerance_plus numeric,
  frequency_type public.quality_frequency_type NOT NULL DEFAULT 'manual',
  category public.quality_indicator_category NOT NULL DEFAULT 'autre',
  select_options jsonb,
  is_required boolean NOT NULL DEFAULT false,
  is_blocking boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE INDEX idx_quality_indicators_category ON public.quality_indicators(category);
CREATE INDEX idx_quality_indicators_type ON public.quality_indicators(indicator_type);
CREATE INDEX idx_quality_indicators_active ON public.quality_indicators(is_active);

-- updated_at trigger
CREATE TRIGGER trg_quality_indicators_updated_at
BEFORE UPDATE ON public.quality_indicators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger
CREATE OR REPLACE FUNCTION public.quality_indicators_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.indicator_type = 'numeric' THEN
    IF NEW.min_value IS NOT NULL AND NEW.max_value IS NOT NULL AND NEW.min_value > NEW.max_value THEN
      RAISE EXCEPTION 'min_value (%) must be <= max_value (%)', NEW.min_value, NEW.max_value;
    END IF;
  END IF;
  IF NEW.tolerance_minus IS NOT NULL AND NEW.tolerance_minus < 0 THEN
    RAISE EXCEPTION 'tolerance_minus must be >= 0';
  END IF;
  IF NEW.tolerance_plus IS NOT NULL AND NEW.tolerance_plus < 0 THEN
    RAISE EXCEPTION 'tolerance_plus must be >= 0';
  END IF;
  RETURN NEW;
END$$;

CREATE TRIGGER trg_quality_indicators_validate
BEFORE INSERT OR UPDATE ON public.quality_indicators
FOR EACH ROW EXECUTE FUNCTION public.quality_indicators_validate();

-- RLS
ALTER TABLE public.quality_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quality indicators viewable by qualite module"
ON public.quality_indicators FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR check_permission(auth.uid(), 'qualite', 'view')
  OR check_permission(auth.uid(), 'qualite_indicators', 'view')
);

CREATE POLICY "Quality indicators insert by authorized"
ON public.quality_indicators FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR check_permission(auth.uid(), 'qualite_indicators', 'create')
);

CREATE POLICY "Quality indicators update by authorized"
ON public.quality_indicators FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR check_permission(auth.uid(), 'qualite_indicators', 'edit')
);

CREATE POLICY "Quality indicators delete by admin"
ON public.quality_indicators FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR check_permission(auth.uid(), 'qualite_indicators', 'delete')
);

-- Seed permissions for the new module
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
  ('admin', 'qualite_indicators', true, true, true, true),
  ('bureau_methode', 'qualite_indicators', true, true, true, false),
  ('resp_production', 'qualite_indicators', true, false, false, false),
  ('chef_ligne', 'qualite_indicators', true, false, false, false),
  ('gestionnaire_magasin', 'qualite_indicators', true, false, false, false)
ON CONFLICT (role, module) DO NOTHING;
