-- ============================================================
-- Module: Gestion des temps & rotation des shifts par employé
-- ============================================================

-- Cleanup previous maintenance auto-schedule approach
SELECT cron.unschedule('apply-maintenance-schedules');
DROP TABLE IF EXISTS public.maintenance_shift_schedules CASCADE;

-- 1) Systems
CREATE TABLE public.work_shift_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  cycle_type text NOT NULL DEFAULT 'rotation',
  nb_shifts integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_shift_systems TO authenticated;
GRANT ALL ON public.work_shift_systems TO service_role;
ALTER TABLE public.work_shift_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_shift_systems readable" ON public.work_shift_systems
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "work_shift_systems manage" ON public.work_shift_systems
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'resp_maintenance'::app_role) OR has_role(auth.uid(),'resp_production'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'resp_maintenance'::app_role) OR has_role(auth.uid(),'resp_production'::app_role));

-- 2) System slots
CREATE TABLE public.work_shift_system_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.work_shift_systems(id) ON DELETE CASCADE,
  slot_code text NOT NULL,
  label text NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time NOT NULL,
  crosses_midnight boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_id, slot_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_shift_system_slots TO authenticated;
GRANT ALL ON public.work_shift_system_slots TO service_role;
ALTER TABLE public.work_shift_system_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_shift_system_slots readable" ON public.work_shift_system_slots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "work_shift_system_slots manage" ON public.work_shift_system_slots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'resp_maintenance'::app_role) OR has_role(auth.uid(),'resp_production'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'resp_maintenance'::app_role) OR has_role(auth.uid(),'resp_production'::app_role));

-- 3) Employee assignments
CREATE TABLE public.employee_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  system_id uuid NOT NULL REFERENCES public.work_shift_systems(id),
  scope_kind text NOT NULL DEFAULT 'maintenance',
  shift_team_id uuid REFERENCES public.shift_teams(id),
  line_ids uuid[] NOT NULL DEFAULT '{}',
  pattern jsonb NOT NULL DEFAULT '[]'::jsonb,
  anchor_date date NOT NULL DEFAULT current_date,
  autorisation_libre boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_shift_assignments TO authenticated;
GRANT ALL ON public.employee_shift_assignments TO service_role;
ALTER TABLE public.employee_shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "esa read own or manager" ON public.employee_shift_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'resp_maintenance'::app_role)
    OR has_role(auth.uid(),'resp_production'::app_role)
    OR has_role(auth.uid(),'responsable_controle_qualite'::app_role));
CREATE POLICY "esa manage" ON public.employee_shift_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'resp_maintenance'::app_role) OR has_role(auth.uid(),'resp_production'::app_role) OR has_role(auth.uid(),'responsable_controle_qualite'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'resp_maintenance'::app_role) OR has_role(auth.uid(),'resp_production'::app_role) OR has_role(auth.uid(),'responsable_controle_qualite'::app_role));

CREATE TRIGGER trg_esa_updated_at BEFORE UPDATE ON public.employee_shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_wss_updated_at BEFORE UPDATE ON public.work_shift_systems
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4) Seed systems + slots
WITH s AS (
  INSERT INTO public.work_shift_systems (code, label, cycle_type, nb_shifts) VALUES
    ('3x8','Système 3-8 (3 shifts)','rotation',3),
    ('2x8','Système 2-8 (2 shifts)','rotation',2),
    ('1x8','Système 1-8 (1 shift)','rotation',1),
    ('2x12','Système 2-12 (2 shifts)','rotation',2),
    ('surface','Surface (journée 5/7)','fixed_weekly',1)
  RETURNING id, code
)
INSERT INTO public.work_shift_system_slots (system_id, slot_code, label, heure_debut, heure_fin, crosses_midnight, sort_order)
SELECT s.id, v.slot_code, v.label, v.hd::time, v.hf::time, v.cm, v.so
FROM s
JOIN (VALUES
  ('3x8','matin','Matin','06:00','14:00',false,1),
  ('3x8','midi','Midi','14:00','22:00',false,2),
  ('3x8','nuit','Nuit','22:00','06:00',true,3),
  ('2x8','matin','Matin','06:00','14:00',false,1),
  ('2x8','midi','Midi','14:00','22:00',false,2),
  ('1x8','matin','Matin','06:00','14:00',false,1),
  ('2x12','matin','Matin','06:00','18:00',false,1),
  ('2x12','nuit','Nuit','18:00','06:00',true,2),
  ('surface','jour','Journée','08:00','16:30',false,1)
) AS v(code, slot_code, label, hd, hf, cm, so) ON v.code = s.code;

-- 5) compute_expected_shift
CREATE OR REPLACE FUNCTION public.compute_expected_shift(_user_id uuid, _at timestamptz DEFAULT now())
RETURNS TABLE(slot_code text, heure_debut timestamptz, heure_fin timestamptz, is_now boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_assign public.employee_shift_assignments%ROWTYPE;
  v_sys public.work_shift_systems%ROWTYPE;
  v_local date := (_at AT TIME ZONE 'Africa/Algiers')::date;
  v_dow int;
  v_len int;
  v_idx int;
  v_token text;
  v_slot public.work_shift_system_slots%ROWTYPE;
  v_start timestamptz;
  v_end timestamptz;
  d date;
BEGIN
  SELECT * INTO v_assign FROM public.employee_shift_assignments WHERE user_id = _user_id AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO v_sys FROM public.work_shift_systems WHERE id = v_assign.system_id;

  FOR d IN SELECT unnest(ARRAY[v_local, v_local - 1]) LOOP
    v_token := NULL;
    IF v_sys.cycle_type = 'fixed_weekly' THEN
      v_dow := EXTRACT(ISODOW FROM d);
      IF v_dow BETWEEN 1 AND 5 THEN v_token := 'jour'; END IF;
    ELSE
      v_len := jsonb_array_length(v_assign.pattern);
      IF v_len IS NULL OR v_len = 0 THEN CONTINUE; END IF;
      v_idx := ((d - v_assign.anchor_date) % v_len + v_len) % v_len;
      v_token := v_assign.pattern->>v_idx;
    END IF;

    IF v_token IS NULL OR v_token = 'repos' THEN CONTINUE; END IF;

    SELECT * INTO v_slot FROM public.work_shift_system_slots
      WHERE system_id = v_sys.id AND work_shift_system_slots.slot_code = v_token;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_start := (d::timestamp + v_slot.heure_debut) AT TIME ZONE 'Africa/Algiers';
    IF v_slot.crosses_midnight THEN
      v_end := ((d + 1)::timestamp + v_slot.heure_fin) AT TIME ZONE 'Africa/Algiers';
    ELSE
      v_end := (d::timestamp + v_slot.heure_fin) AT TIME ZONE 'Africa/Algiers';
    END IF;

    IF _at >= v_start AND _at < v_end THEN
      slot_code := v_slot.slot_code; heure_debut := v_start; heure_fin := v_end; is_now := true;
      RETURN NEXT; RETURN;
    END IF;

    IF d = v_local THEN
      slot_code := v_slot.slot_code; heure_debut := v_start; heure_fin := v_end;
      is_now := (_at >= v_start AND _at < v_end);
      RETURN NEXT; RETURN;
    END IF;
  END LOOP;
  RETURN;
END;
$$;

-- 6) open_my_work_session
CREATE OR REPLACE FUNCTION public.open_my_work_session()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_assign public.employee_shift_assignments%ROWTYPE;
  v_exp record;
  v_today date := (now() AT TIME ZONE 'Africa/Algiers')::date;
  v_type text;
  v_enum public.shift_type;
  v_session uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_assign FROM public.employee_shift_assignments WHERE user_id = v_uid AND is_active = true;
  IF NOT FOUND OR v_assign.autorisation_libre = false THEN RETURN NULL; END IF;

  SELECT * INTO v_exp FROM public.compute_expected_shift(v_uid, now()) LIMIT 1;
  IF v_exp.slot_code IS NULL OR v_exp.is_now = false THEN RETURN NULL; END IF;

  v_type := CASE v_exp.slot_code
    WHEN 'matin' THEN 'matin'
    WHEN 'midi' THEN 'apres_midi'
    WHEN 'jour' THEN 'matin'
    WHEN 'nuit' THEN 'nuit'
    ELSE 'matin' END;

  IF v_assign.scope_kind = 'maintenance' THEN
    SELECT id INTO v_session FROM public.maintenance_shifts
      WHERE maintenancier_id = v_uid AND date_shift = v_today AND shift_type = v_type AND is_active = true LIMIT 1;
    IF v_session IS NOT NULL THEN RETURN v_session; END IF;
    INSERT INTO public.maintenance_shifts (date_shift, shift_type, shift_team_id, maintenancier_id, line_ids, heure_debut, heure_fin, is_active, observations, opened_by)
    VALUES (v_today, v_type, v_assign.shift_team_id, v_uid, v_assign.line_ids, v_exp.heure_debut, v_exp.heure_fin, true, '[Ouverture auto rotation]', v_uid)
    RETURNING id INTO v_session;

  ELSIF v_assign.scope_kind = 'quality' THEN
    v_enum := v_type::public.shift_type;
    SELECT id INTO v_session FROM public.quality_shifts
      WHERE controller_id = v_uid AND date_shift = v_today AND shift_type = v_enum AND is_active = true LIMIT 1;
    IF v_session IS NOT NULL THEN RETURN v_session; END IF;
    INSERT INTO public.quality_shifts (controller_id, shift_type, date_shift, shift_team_id, heure_debut, heure_fin, is_active, observations, opened_by)
    VALUES (v_uid, v_enum, v_today, v_assign.shift_team_id, v_exp.heure_debut, v_exp.heure_fin, true, '[Ouverture auto rotation]', v_uid)
    RETURNING id INTO v_session;
  ELSE
    RETURN NULL;
  END IF;

  INSERT INTO public.audit_logs(user_id, action, table_name, record_id, module, entity_type, entity_id, action_label, action_type, description, severity)
  VALUES (v_uid, 'auto_open_work_session',
    CASE WHEN v_assign.scope_kind='quality' THEN 'quality_shifts' ELSE 'maintenance_shifts' END,
    v_session, v_assign.scope_kind, 'work_session', v_session,
    'Ouverture automatique de session (rotation)', 'create',
    'Session ouverte automatiquement selon le motif de rotation', 'info');

  RETURN v_session;
END;
$$;