
-- =========================================================
-- 0. Helper: who can manage shift configuration
-- =========================================================
CREATE OR REPLACE FUNCTION public.can_manage_shifts(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'resp_maintenance'::app_role)
    OR public.has_role(_user_id, 'resp_production'::app_role)
    OR public.has_role(_user_id, 'responsable_si'::app_role)
    OR public.has_role(_user_id, 'directeur_qualite'::app_role)
    OR public.has_role(_user_id, 'responsable_controle_qualite'::app_role)
$$;

-- =========================================================
-- 1. shift_templates (modèles de créneaux)
-- =========================================================
CREATE TABLE public.shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time NOT NULL,
  crosses_midnight boolean NOT NULL DEFAULT false,
  couleur text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_templates TO authenticated;
GRANT ALL ON public.shift_templates TO service_role;
GRANT SELECT ON public.shift_templates TO anon;

ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_templates readable by everyone"
  ON public.shift_templates FOR SELECT
  USING (true);

CREATE POLICY "shift_templates managed by managers"
  ON public.shift_templates FOR ALL
  TO authenticated
  USING (public.can_manage_shifts(auth.uid()))
  WITH CHECK (public.can_manage_shifts(auth.uid()));

CREATE TRIGGER trg_shift_templates_updated_at
  BEFORE UPDATE ON public.shift_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 2. shift_team_members (membres d'équipe)
-- =========================================================
CREATE TABLE public.shift_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.shift_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_team text NOT NULL DEFAULT 'membre',
  autorisation_libre boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_team_members TO authenticated;
GRANT ALL ON public.shift_team_members TO service_role;

ALTER TABLE public.shift_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_team_members read own or managers"
  ON public.shift_team_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_shifts(auth.uid()));

CREATE POLICY "shift_team_members managed by managers"
  ON public.shift_team_members FOR ALL
  TO authenticated
  USING (public.can_manage_shifts(auth.uid()))
  WITH CHECK (public.can_manage_shifts(auth.uid()));

CREATE TRIGGER trg_shift_team_members_updated_at
  BEFORE UPDATE ON public.shift_team_members
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 3. shift_schedules (rotations / plannings)
-- =========================================================
CREATE TABLE public.shift_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.shift_teams(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.shift_templates(id) ON DELETE RESTRICT,
  scope_kind text NOT NULL DEFAULT 'all',
  line_ids uuid[] NOT NULL DEFAULT '{}',
  date_debut date NOT NULL,
  date_fin date,
  weekdays smallint[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_schedules TO authenticated;
GRANT ALL ON public.shift_schedules TO service_role;

ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_schedules readable by authenticated"
  ON public.shift_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "shift_schedules managed by managers"
  ON public.shift_schedules FOR ALL
  TO authenticated
  USING (public.can_manage_shifts(auth.uid()))
  WITH CHECK (public.can_manage_shifts(auth.uid()));

CREATE TRIGGER trg_shift_schedules_updated_at
  BEFORE UPDATE ON public.shift_schedules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_shift_schedules_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_fin IS NOT NULL AND NEW.date_fin < NEW.date_debut THEN
    RAISE EXCEPTION 'date_fin (%) doit être >= date_debut (%)', NEW.date_fin, NEW.date_debut;
  END IF;
  IF NEW.scope_kind NOT IN ('maintenance','production','quality','all') THEN
    RAISE EXCEPTION 'scope_kind invalide: %', NEW.scope_kind;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shift_schedules_validate
  BEFORE INSERT OR UPDATE ON public.shift_schedules
  FOR EACH ROW EXECUTE FUNCTION public.tg_shift_schedules_validate();

-- =========================================================
-- 4. Seed default templates (3x8)
-- =========================================================
INSERT INTO public.shift_templates (code, label, heure_debut, heure_fin, crosses_midnight, sort_order, couleur)
VALUES
  ('matin', 'Matin', '06:00', '14:00', false, 1, '#22c55e'),
  ('soir',  'Soir',  '14:00', '22:00', false, 2, '#f59e0b'),
  ('nuit',  'Nuit',  '22:00', '06:00', true,  3, '#6366f1')
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- 5. Function: get_active_shift_context
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_active_shift_context(_user_id uuid, _at timestamptz DEFAULT now())
RETURNS TABLE (
  team_id uuid,
  team_name text,
  template_id uuid,
  template_code text,
  heure_debut timestamptz,
  heure_fin timestamptz,
  is_on_shift boolean,
  autorisation_libre boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (_at AT TIME ZONE 'Africa/Algiers')::date;
BEGIN
  RETURN QUERY
  WITH candidate_dates AS (
    SELECT v_today AS d
    UNION ALL
    SELECT v_today - 1
  ),
  rows AS (
    SELECT
      t.id AS team_id,
      t.name AS team_name,
      tpl.id AS template_id,
      tpl.code AS template_code,
      ((cd.d + tpl.heure_debut) AT TIME ZONE 'Africa/Algiers') AS h_debut,
      ((CASE WHEN tpl.crosses_midnight THEN cd.d + 1 ELSE cd.d END + tpl.heure_fin) AT TIME ZONE 'Africa/Algiers') AS h_fin,
      stm.autorisation_libre AS autorisation_libre
    FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    JOIN public.shift_schedules sc ON sc.team_id = t.id AND sc.is_active
    JOIN public.shift_templates tpl ON tpl.id = sc.template_id AND tpl.is_active
    CROSS JOIN candidate_dates cd
    WHERE stm.user_id = _user_id
      AND stm.is_active
      AND cd.d >= sc.date_debut
      AND (sc.date_fin IS NULL OR cd.d <= sc.date_fin)
      AND (array_length(sc.weekdays, 1) IS NULL
           OR EXTRACT(ISODOW FROM cd.d)::smallint = ANY(sc.weekdays))
  )
  SELECT
    r.team_id, r.team_name, r.template_id, r.template_code,
    r.h_debut, r.h_fin,
    (_at >= r.h_debut AND _at < r.h_fin) AS is_on_shift,
    r.autorisation_libre
  FROM rows r
  ORDER BY
    (_at >= r.h_debut AND _at < r.h_fin) DESC,
    CASE WHEN r.h_debut >= _at THEN r.h_debut END ASC NULLS LAST,
    r.h_debut DESC
  LIMIT 1;
END;
$$;

-- =========================================================
-- 6. Function: is_user_on_shift
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_user_on_shift(_user_id uuid, _scope text DEFAULT 'all', _at timestamptz DEFAULT now())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (_at AT TIME ZONE 'Africa/Algiers')::date;
  v_found boolean := false;
  v_free boolean := false;
BEGIN
  -- Free authorization: member can act anytime
  SELECT EXISTS (
    SELECT 1 FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    WHERE stm.user_id = _user_id AND stm.is_active AND stm.autorisation_libre
  ) INTO v_free;
  IF v_free THEN RETURN true; END IF;

  -- On-shift check for the scope
  SELECT EXISTS (
    SELECT 1
    FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    JOIN public.shift_schedules sc ON sc.team_id = t.id AND sc.is_active
    JOIN public.shift_templates tpl ON tpl.id = sc.template_id AND tpl.is_active
    CROSS JOIN (SELECT v_today AS d UNION ALL SELECT v_today - 1) cd
    WHERE stm.user_id = _user_id
      AND stm.is_active
      AND (sc.scope_kind = _scope OR sc.scope_kind = 'all' OR _scope = 'all')
      AND cd.d >= sc.date_debut
      AND (sc.date_fin IS NULL OR cd.d <= sc.date_fin)
      AND (array_length(sc.weekdays, 1) IS NULL
           OR EXTRACT(ISODOW FROM cd.d)::smallint = ANY(sc.weekdays))
      AND _at >= ((cd.d + tpl.heure_debut) AT TIME ZONE 'Africa/Algiers')
      AND _at <  ((CASE WHEN tpl.crosses_midnight THEN cd.d + 1 ELSE cd.d END + tpl.heure_fin) AT TIME ZONE 'Africa/Algiers')
  ) INTO v_found;

  RETURN v_found;
END;
$$;

-- =========================================================
-- 7. Rewrite open_my_work_session (team-based)
-- =========================================================
CREATE OR REPLACE FUNCTION public.open_my_work_session()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ctx record;
  v_today date := (now() AT TIME ZONE 'Africa/Algiers')::date;
  v_session_id uuid;
  v_shift_type public.shift_type;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_ctx
  FROM public.get_active_shift_context(v_uid, now())
  LIMIT 1;

  IF v_ctx.team_id IS NULL THEN RETURN NULL; END IF;
  -- Only auto-open when actually on shift (or free authorization)
  IF NOT (v_ctx.is_on_shift OR v_ctx.autorisation_libre) THEN RETURN NULL; END IF;

  -- Map template code -> shift_type enum used by session tables
  v_shift_type := CASE v_ctx.template_code
    WHEN 'matin' THEN 'matin'::public.shift_type
    WHEN 'soir' THEN 'apres_midi'::public.shift_type
    WHEN 'midi' THEN 'apres_midi'::public.shift_type
    WHEN 'nuit' THEN 'nuit'::public.shift_type
    ELSE 'matin'::public.shift_type
  END;

  -- Anti-duplicate: an active maintenance session today for this user
  SELECT id INTO v_session_id
  FROM public.maintenance_shifts
  WHERE maintenancier_id = v_uid
    AND is_active = true
  LIMIT 1;
  IF v_session_id IS NOT NULL THEN RETURN v_session_id; END IF;

  INSERT INTO public.maintenance_shifts (
    maintenancier_id, shift_type, date_shift, shift_team_id,
    heure_debut, heure_fin, is_active, observations, opened_by
  ) VALUES (
    v_uid, v_shift_type, v_today, v_ctx.team_id,
    v_ctx.heure_debut, v_ctx.heure_fin, true,
    '[Ouverture auto rotation équipe]', v_uid
  )
  RETURNING id INTO v_session_id;

  INSERT INTO public.audit_logs (action, action_label, description, user_id, entity_type, entity_id)
  VALUES (
    'shift_auto_open', 'Ouverture auto session',
    'Session ouverte automatiquement via rotation équipe (' || v_ctx.template_code || ')',
    v_uid, 'maintenance_shift', v_session_id
  );

  RETURN v_session_id;
END;
$$;

-- =========================================================
-- 8. Cleanup legacy per-employee rotation engine
-- =========================================================
DROP FUNCTION IF EXISTS public.compute_expected_shift(uuid, timestamptz);
DROP TABLE IF EXISTS public.employee_shift_assignments CASCADE;
DROP TABLE IF EXISTS public.work_shift_system_slots CASCADE;
DROP TABLE IF EXISTS public.work_shift_systems CASCADE;
DROP TABLE IF EXISTS public.shift_rotation CASCADE;
