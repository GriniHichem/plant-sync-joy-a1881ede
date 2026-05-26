
-- 1. BEFORE INSERT trigger on shifts: default heure_fin & heure_debut_reelle
CREATE OR REPLACE FUNCTION public.shifts_fill_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.heure_debut IS NULL THEN
    NEW.heure_debut := now();
  END IF;
  IF NEW.heure_fin IS NULL THEN
    NEW.heure_fin := NEW.heure_debut + interval '8 hours';
  END IF;
  IF NEW.heure_debut_reelle IS NULL THEN
    NEW.heure_debut_reelle := NEW.heure_debut;
  END IF;
  IF NEW.date_shift IS NULL THEN
    NEW.date_shift := (NEW.heure_debut AT TIME ZONE 'Africa/Algiers')::date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_shifts_fill_defaults ON public.shifts;
CREATE TRIGGER tg_shifts_fill_defaults
BEFORE INSERT ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.shifts_fill_defaults();

-- 2. Quality shift open by responsable: extend RLS
DROP POLICY IF EXISTS "qshifts_insert_self" ON public.quality_shifts;
CREATE POLICY "qshifts_insert_self_or_manager"
ON public.quality_shifts
FOR INSERT
TO authenticated
WITH CHECK (
  (
    controller_id = auth.uid()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'controleur_qualite'::app_role)
      OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
      OR has_role(auth.uid(), 'directeur_qualite'::app_role)
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
  OR has_role(auth.uid(), 'directeur_qualite'::app_role)
);

-- 3. Unique partial index on active production shift per (of, line, date, type)
CREATE UNIQUE INDEX IF NOT EXISTS uq_shifts_active_of_line_slot
ON public.shifts (of_id, line_id, date_shift, shift_type)
WHERE is_active = true;

-- 4. Restrict notify_shift_event trigger to changes of is_active only on UPDATE
DROP TRIGGER IF EXISTS shift_notify_event ON public.shifts;
CREATE TRIGGER shift_notify_event
AFTER INSERT OR UPDATE OF is_active ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.notify_shift_event();

DROP TRIGGER IF EXISTS maintenance_shift_notify_event ON public.maintenance_shifts;
CREATE TRIGGER maintenance_shift_notify_event
AFTER INSERT OR UPDATE OF is_active ON public.maintenance_shifts
FOR EACH ROW EXECUTE FUNCTION public.notify_shift_event();

-- Quality shifts trigger (recreate if exists)
DROP TRIGGER IF EXISTS quality_shift_notify_event ON public.quality_shifts;
CREATE TRIGGER quality_shift_notify_event
AFTER INSERT OR UPDATE OF is_active ON public.quality_shifts
FOR EACH ROW EXECUTE FUNCTION public.notify_shift_event();

-- 5. Auto-close stale shifts (called by edge function / cron)
CREATE OR REPLACE FUNCTION public.auto_close_stale_shifts()
RETURNS TABLE(kind text, closed_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH p AS (
    UPDATE public.shifts
    SET is_active = false,
        heure_fin = LEAST(now(), heure_fin),
        observations = COALESCE(observations,'') || ' [Auto-clôturé : session abandonnée]'
    WHERE is_active = true
      AND heure_fin + interval '2 hours' < now()
    RETURNING id
  )
  SELECT 'production'::text, id FROM p;

  RETURN QUERY
  WITH m AS (
    UPDATE public.maintenance_shifts
    SET is_active = false,
        heure_fin = now(),
        observations = COALESCE(observations,'') || ' [Auto-clôturé : session abandonnée]'
    WHERE is_active = true
      AND heure_debut + interval '12 hours' < now()
    RETURNING id
  )
  SELECT 'maintenance'::text, id FROM m;

  RETURN QUERY
  WITH q AS (
    UPDATE public.quality_shifts
    SET is_active = false,
        heure_fin = now(),
        observations = COALESCE(observations,'') || ' [Auto-clôturé : session abandonnée]'
    WHERE is_active = true
      AND heure_debut + interval '12 hours' < now()
    RETURNING id
  )
  SELECT 'quality'::text, id FROM q;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_close_stale_shifts() TO authenticated, service_role;
