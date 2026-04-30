
CREATE OR REPLACE FUNCTION public.ensure_my_production_shift_session()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shift_type public.shift_type;
  v_of_id uuid;
  v_session_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  v_shift_type := public.derive_shift_type_from_now();

  -- Chercher un OF en cours avec auto + assignment au current user pour ce créneau
  SELECT a.of_id INTO v_of_id
  FROM public.of_shift_assignments a
  JOIN public.ordres_fabrication o ON o.id = a.of_id
  WHERE a.chef_ligne_id = v_uid
    AND a.shift_type = v_shift_type
    AND o.statut = 'en_cours'
    AND o.auto_generate_shifts = true
  LIMIT 1;

  IF v_of_id IS NULL THEN RETURN NULL; END IF;

  v_session_id := public.ensure_production_shift_session(v_of_id);
  RETURN v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_production_shift_session() TO authenticated;
