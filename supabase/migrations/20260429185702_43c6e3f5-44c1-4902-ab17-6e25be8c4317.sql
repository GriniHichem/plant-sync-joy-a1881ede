CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE IF NOT EXISTS public.quality_nc_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, label text NOT NULL, description text, color text,
  is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid);
ALTER TABLE public.quality_nc_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.quality_action_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, label text NOT NULL, description text, color text,
  is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid);
ALTER TABLE public.quality_action_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.quality_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE, label text NOT NULL, category text,
  is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid);
ALTER TABLE public.quality_units ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.quality_control_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, label text NOT NULL, description text, production_line_id uuid,
  is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid);
ALTER TABLE public.quality_control_points ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.quality_defect_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, label text NOT NULL, description text, default_severity text,
  is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid);
ALTER TABLE public.quality_defect_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.quality_decision_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, label text NOT NULL, decision_type text, description text,
  is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid);
ALTER TABLE public.quality_decision_reasons ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['quality_nc_categories','quality_action_categories','quality_units','quality_control_points','quality_defect_types','quality_decision_reasons'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_read" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_read" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_write" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_write" ON public.%I FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin'::app_role)
          OR public.has_role(auth.uid(),'directeur_qualite'::app_role)
          OR public.has_role(auth.uid(),'responsable_controle_qualite'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
          OR public.has_role(auth.uid(),'directeur_qualite'::app_role)
          OR public.has_role(auth.uid(),'responsable_controle_qualite'::app_role))$p$, t, t);
  END LOOP;
END $$;

INSERT INTO public.quality_units (symbol,label,category,sort_order) VALUES
  ('g','Gramme','Masse',10),('kg','Kilogramme','Masse',20),
  ('mm','Millimètre','Longueur',30),('cm','Centimètre','Longueur',40),
  ('°C','Degré Celsius','Température',50),('%','Pourcentage','Ratio',60),
  ('ml','Millilitre','Volume',70),('L','Litre','Volume',80),
  ('pH','pH','Chimie',90),('u','Unité','Comptage',100)
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO public.quality_nc_categories (code,label,sort_order) VALUES
  ('produit','Produit',10),('process','Procédé',20),('matiere','Matière première',30),
  ('emballage','Emballage',40),('etiquetage','Étiquetage',50),('hygiene','Hygiène',60)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.quality_action_categories (code,label,sort_order) VALUES
  ('corrective','Corrective',10),('preventive','Préventive',20),
  ('amelioration','Amélioration',30),('formation','Formation',40)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.quality_defect_types (code,label,default_severity,sort_order) VALUES
  ('aspect','Défaut d''aspect','minor',10),('dimension','Hors dimension','major',20),
  ('contamination','Contamination','critical',30),('poids','Hors poids','major',40),
  ('etiquette','Étiquette incorrecte','minor',50)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.quality_decision_reasons (code,label,decision_type,sort_order) VALUES
  ('rebut_irrecuperable','Irrécupérable','scrap',10),
  ('retouche_possible','Retouche possible','rework',20),
  ('derogation_client','Dérogation client','derogation',30),
  ('reclassement','Reclassement qualité','downgrade',40),
  ('acceptation','Acceptation en l''état','accept',50)
ON CONFLICT (code) DO NOTHING;