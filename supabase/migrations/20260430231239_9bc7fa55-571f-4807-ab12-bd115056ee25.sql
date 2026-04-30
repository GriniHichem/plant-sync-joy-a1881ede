
-- 1. Champ auto_generate_shifts
ALTER TABLE public.ordres_fabrication
  ADD COLUMN IF NOT EXISTS auto_generate_shifts boolean NOT NULL DEFAULT true;

-- 2. Table d'affectation
CREATE TABLE IF NOT EXISTS public.of_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  of_id uuid NOT NULL REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE,
  shift_type public.shift_type NOT NULL,
  shift_team_id uuid NOT NULL REFERENCES public.shift_teams(id) ON DELETE RESTRICT,
  chef_ligne_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (of_id, shift_type)
);

CREATE INDEX IF NOT EXISTS idx_of_shift_assignments_of ON public.of_shift_assignments(of_id);
CREATE INDEX IF NOT EXISTS idx_of_shift_assignments_chef ON public.of_shift_assignments(chef_ligne_id);

ALTER TABLE public.of_shift_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "of_shift_assignments_select" ON public.of_shift_assignments;
CREATE POLICY "of_shift_assignments_select" ON public.of_shift_assignments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "of_shift_assignments_manage" ON public.of_shift_assignments;
CREATE POLICY "of_shift_assignments_manage" ON public.of_shift_assignments
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'resp_production'::app_role)
    OR EXISTS (SELECT 1 FROM public.ordres_fabrication o
                WHERE o.id = of_shift_assignments.of_id AND o.created_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'resp_production'::app_role)
    OR EXISTS (SELECT 1 FROM public.ordres_fabrication o
                WHERE o.id = of_shift_assignments.of_id AND o.created_by = auth.uid())
  );

DROP TRIGGER IF EXISTS tg_of_shift_assignments_updated ON public.of_shift_assignments;
CREATE TRIGGER tg_of_shift_assignments_updated
BEFORE UPDATE ON public.of_shift_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Fonction utilitaire : créneau en cours selon l'heure locale
CREATE OR REPLACE FUNCTION public.derive_shift_type_from_now()
RETURNS public.shift_type
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN extract(hour from now())::int BETWEEN 5 AND 12 THEN 'matin'::public.shift_type
    WHEN extract(hour from now())::int BETWEEN 13 AND 20 THEN 'apres_midi'::public.shift_type
    ELSE 'nuit'::public.shift_type
  END;
$$;

-- 4. RPC ensure_production_shift_session
CREATE OR REPLACE FUNCTION public.ensure_production_shift_session(p_of_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_of public.ordres_fabrication%ROWTYPE;
  v_assignment public.of_shift_assignments%ROWTYPE;
  v_shift_type public.shift_type;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_session_id uuid;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  SELECT * INTO v_of FROM public.ordres_fabrication WHERE id = p_of_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'OF introuvable'; END IF;
  IF v_of.statut <> 'en_cours' THEN RETURN NULL; END IF;
  IF v_of.auto_generate_shifts IS DISTINCT FROM true THEN RETURN NULL; END IF;
  IF v_of.line_id IS NULL THEN RETURN NULL; END IF;

  v_shift_type := public.derive_shift_type_from_now();

  -- Session déjà active pour (of, line, jour, créneau) ?
  SELECT id INTO v_session_id
  FROM public.shifts
  WHERE of_id = p_of_id
    AND line_id = v_of.line_id
    AND date_shift = v_today
    AND shift_type = v_shift_type
    AND is_active = true
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    RETURN v_session_id;
  END IF;

  -- Affectation pour ce créneau ?
  SELECT * INTO v_assignment
  FROM public.of_shift_assignments
  WHERE of_id = p_of_id AND shift_type = v_shift_type
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Horaires standards
  v_start := CASE v_shift_type
    WHEN 'matin' THEN (v_today::timestamp + interval '5 hours')
    WHEN 'apres_midi' THEN (v_today::timestamp + interval '13 hours')
    ELSE (v_today::timestamp + interval '21 hours')
  END AT TIME ZONE 'UTC';
  v_end := v_start + interval '8 hours';

  INSERT INTO public.shifts (
    of_id, line_id, shift_type, date_shift, chef_ligne_id,
    heure_debut, heure_fin, shift_team_id, is_active, statut,
    heure_debut_reelle, opened_by, observations
  )
  VALUES (
    p_of_id, v_of.line_id, v_shift_type, v_today, v_assignment.chef_ligne_id,
    v_start, v_end, v_assignment.shift_team_id, true, 'en_cours',
    now(), auth.uid(), '[Auto-généré depuis plan OF]'
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_production_shift_session(uuid) TO authenticated;

-- 5. Trigger : clôturer les shifts à la fin de l'OF
CREATE OR REPLACE FUNCTION public.of_close_cascade_shifts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.statut IN ('termine', 'annule') AND OLD.statut <> NEW.statut THEN
    UPDATE public.shifts
       SET is_active = false,
           heure_fin_reelle = COALESCE(heure_fin_reelle, now()),
           statut = 'cloture',
           observations = COALESCE(NULLIF(observations,''),'') ||
                          E'\n[Clôture automatique : OF ' || NEW.statut || ']'
     WHERE of_id = NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_of_close_cascade_shifts ON public.ordres_fabrication;
CREATE TRIGGER tg_of_close_cascade_shifts
AFTER UPDATE OF statut ON public.ordres_fabrication
FOR EACH ROW EXECUTE FUNCTION public.of_close_cascade_shifts();
