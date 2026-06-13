CREATE TABLE public.maintenance_shift_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenancier_id uuid NOT NULL,
  shift_type text NOT NULL DEFAULT 'matin',
  shift_team_id uuid,
  line_ids uuid[] NOT NULL DEFAULT '{}',
  weekdays smallint[] NOT NULL DEFAULT '{}',
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  date_fin date,
  auto_open boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_shift_schedules TO authenticated;
GRANT ALL ON public.maintenance_shift_schedules TO service_role;

ALTER TABLE public.maintenance_shift_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resp maintenance manage schedules"
ON public.maintenance_shift_schedules
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance'));

CREATE POLICY "Maintenancier read own schedules"
ON public.maintenance_shift_schedules
FOR SELECT
TO authenticated
USING (maintenancier_id = auth.uid());

CREATE TRIGGER update_maintenance_shift_schedules_updated_at
BEFORE UPDATE ON public.maintenance_shift_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.apply_maintenance_shift_schedules()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sched record;
  v_today date := CURRENT_DATE;
  v_dow smallint := EXTRACT(DOW FROM now())::smallint;
  v_now_t time := (now())::time;
  v_slot_start time;
  v_existing uuid;
  v_new_id uuid;
BEGIN
  FOR sched IN
    SELECT * FROM public.maintenance_shift_schedules
    WHERE is_active = true
      AND auto_open = true
      AND date_debut <= v_today
      AND (date_fin IS NULL OR date_fin >= v_today)
      AND (array_length(weekdays, 1) IS NULL OR v_dow = ANY(weekdays))
  LOOP
    SELECT heure_debut INTO v_slot_start
    FROM public.shift_time_slots
    WHERE code = sched.shift_type AND is_active = true
    LIMIT 1;

    IF v_slot_start IS NULL THEN
      v_slot_start := CASE sched.shift_type
        WHEN 'matin' THEN TIME '06:00'
        WHEN 'apres_midi' THEN TIME '14:00'
        ELSE TIME '22:00'
      END;
    END IF;

    IF sched.shift_type <> 'nuit' AND v_now_t < v_slot_start THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_existing
    FROM public.maintenance_shifts
    WHERE maintenancier_id = sched.maintenancier_id
      AND date_shift = v_today
      AND shift_type = sched.shift_type
      AND is_active = true
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.maintenance_shifts (
      date_shift, shift_type, shift_team_id, maintenancier_id,
      line_ids, heure_debut, is_active, opened_by, observations
    ) VALUES (
      v_today, sched.shift_type, sched.shift_team_id, sched.maintenancier_id,
      sched.line_ids, now(), true, NULL, '[Ouverture automatique - programmation]'
    )
    RETURNING id INTO v_new_id;

    RETURN NEXT v_new_id;
  END LOOP;
END;
$$;