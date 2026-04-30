
-- 1) quality_shifts : un shift = un contrôleur sur un créneau
CREATE TABLE public.quality_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_shift date NOT NULL DEFAULT CURRENT_DATE,
  shift_type shift_type NOT NULL,
  shift_team_id uuid REFERENCES public.shift_teams(id),
  controller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  heure_debut timestamptz NOT NULL DEFAULT now(),
  heure_fin timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quality_shifts_controller_active
  ON public.quality_shifts(controller_id, is_active);
CREATE INDEX idx_quality_shifts_date ON public.quality_shifts(date_shift DESC);

-- 2) Lignes/ateliers couverts par le shift
CREATE TABLE public.quality_shift_lines (
  quality_shift_id uuid NOT NULL REFERENCES public.quality_shifts(id) ON DELETE CASCADE,
  production_line_id uuid NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
  PRIMARY KEY (quality_shift_id, production_line_id)
);

CREATE INDEX idx_quality_shift_lines_line ON public.quality_shift_lines(production_line_id);

-- 3) Rattachement aux shifts production
CREATE TABLE public.quality_shift_production_links (
  quality_shift_id uuid NOT NULL REFERENCES public.quality_shifts(id) ON DELETE CASCADE,
  production_shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (quality_shift_id, production_shift_id)
);

CREATE INDEX idx_qspl_prod_shift ON public.quality_shift_production_links(production_shift_id);

-- 4) Traçabilité côté contrôles & NC
ALTER TABLE public.quality_checks
  ADD COLUMN quality_shift_id uuid REFERENCES public.quality_shifts(id);

ALTER TABLE public.quality_non_conformities
  ADD COLUMN quality_shift_id uuid REFERENCES public.quality_shifts(id);

CREATE INDEX idx_quality_checks_qshift ON public.quality_checks(quality_shift_id);
CREATE INDEX idx_quality_nc_qshift ON public.quality_non_conformities(quality_shift_id);

-- 5) Trigger updated_at
CREATE TRIGGER trg_quality_shifts_updated_at
  BEFORE UPDATE ON public.quality_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Trigger : valider la fermeture (observations obligatoires)
CREATE OR REPLACE FUNCTION public.quality_shifts_close_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    IF NEW.heure_fin IS NULL THEN NEW.heure_fin := now(); END IF;
    IF NEW.observations IS NULL OR length(btrim(NEW.observations)) = 0 THEN
      RAISE EXCEPTION 'Les observations de fin de shift qualité sont obligatoires';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_quality_shifts_close_validate
  BEFORE UPDATE ON public.quality_shifts
  FOR EACH ROW EXECUTE FUNCTION public.quality_shifts_close_validate();

-- 7) RPC : rafraîchir les liens vers les shifts production actifs
CREATE OR REPLACE FUNCTION public.quality_shift_refresh_links(p_quality_shift_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
  v_count integer := 0;
BEGIN
  SELECT date_shift INTO v_date
    FROM public.quality_shifts
   WHERE id = p_quality_shift_id;

  IF v_date IS NULL THEN RETURN 0; END IF;

  INSERT INTO public.quality_shift_production_links (quality_shift_id, production_shift_id)
  SELECT p_quality_shift_id, s.id
    FROM public.shifts s
    JOIN public.quality_shift_lines qsl
      ON qsl.production_line_id = s.line_id
   WHERE qsl.quality_shift_id = p_quality_shift_id
     AND s.date_shift = v_date
     AND s.is_active = true
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- 8) Trigger : à l'insert d'une ligne couverte, lier les shifts production actifs
CREATE OR REPLACE FUNCTION public.quality_shift_lines_attach_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
BEGIN
  SELECT date_shift INTO v_date
    FROM public.quality_shifts
   WHERE id = NEW.quality_shift_id;

  IF v_date IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.quality_shift_production_links (quality_shift_id, production_shift_id)
  SELECT NEW.quality_shift_id, s.id
    FROM public.shifts s
   WHERE s.line_id = NEW.production_line_id
     AND s.date_shift = v_date
     AND s.is_active = true
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_quality_shift_lines_attach
  AFTER INSERT ON public.quality_shift_lines
  FOR EACH ROW EXECUTE FUNCTION public.quality_shift_lines_attach_links();

-- 9) RLS
ALTER TABLE public.quality_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_shift_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_shift_production_links ENABLE ROW LEVEL SECURITY;

-- quality_shifts : SELECT
CREATE POLICY "qshifts_select_own_or_managers" ON public.quality_shifts
FOR SELECT TO authenticated
USING (
  controller_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_si'::app_role)
  OR has_role(auth.uid(), 'auditeur'::app_role)
  OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
  OR has_role(auth.uid(), 'directeur_qualite'::app_role)
  OR has_role(auth.uid(), 'resp_production'::app_role)
  OR has_role(auth.uid(), 'chef_ligne'::app_role)
);

-- quality_shifts : INSERT (un contrôleur ouvre son propre shift)
CREATE POLICY "qshifts_insert_self" ON public.quality_shifts
FOR INSERT TO authenticated
WITH CHECK (
  controller_id = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'controleur_qualite'::app_role)
    OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
    OR has_role(auth.uid(), 'directeur_qualite'::app_role)
  )
);

-- quality_shifts : UPDATE (le contrôleur ferme son propre shift, sinon manager)
CREATE POLICY "qshifts_update_own_or_managers" ON public.quality_shifts
FOR UPDATE TO authenticated
USING (
  controller_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
  OR has_role(auth.uid(), 'directeur_qualite'::app_role)
);

-- quality_shifts : DELETE (admin uniquement)
CREATE POLICY "qshifts_delete_admin" ON public.quality_shifts
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- quality_shift_lines : suit le shift parent
CREATE POLICY "qshift_lines_select" ON public.quality_shift_lines
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.quality_shifts qs WHERE qs.id = quality_shift_id)
);

CREATE POLICY "qshift_lines_modify" ON public.quality_shift_lines
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quality_shifts qs
     WHERE qs.id = quality_shift_id
       AND (qs.controller_id = auth.uid()
            OR has_role(auth.uid(), 'admin'::app_role)
            OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
            OR has_role(auth.uid(), 'directeur_qualite'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quality_shifts qs
     WHERE qs.id = quality_shift_id
       AND (qs.controller_id = auth.uid()
            OR has_role(auth.uid(), 'admin'::app_role)
            OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
            OR has_role(auth.uid(), 'directeur_qualite'::app_role))
  )
);

-- quality_shift_production_links : lecture pour tout porteur de qualité, modif via RPC
CREATE POLICY "qshift_links_select" ON public.quality_shift_production_links
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.quality_shifts qs WHERE qs.id = quality_shift_id)
);

CREATE POLICY "qshift_links_modify" ON public.quality_shift_production_links
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quality_shifts qs
     WHERE qs.id = quality_shift_id
       AND (qs.controller_id = auth.uid()
            OR has_role(auth.uid(), 'admin'::app_role)
            OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
            OR has_role(auth.uid(), 'directeur_qualite'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quality_shifts qs
     WHERE qs.id = quality_shift_id
       AND (qs.controller_id = auth.uid()
            OR has_role(auth.uid(), 'admin'::app_role)
            OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
            OR has_role(auth.uid(), 'directeur_qualite'::app_role))
  )
);
