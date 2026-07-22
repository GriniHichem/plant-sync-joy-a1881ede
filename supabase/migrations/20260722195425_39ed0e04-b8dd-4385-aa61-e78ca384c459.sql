CREATE OR REPLACE FUNCTION public.reception_weighings_lock_upd()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('prodintime.bypass_lock', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION 'Pesée verrouillée — modification interdite';
END; $$;