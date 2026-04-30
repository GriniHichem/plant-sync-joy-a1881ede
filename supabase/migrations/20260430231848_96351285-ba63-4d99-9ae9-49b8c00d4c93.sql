-- 1. Fonction TZ Algérie pour le créneau courant
CREATE OR REPLACE FUNCTION public.derive_shift_type_from_now()
RETURNS public.shift_type
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN extract(hour from (now() AT TIME ZONE 'Africa/Algiers'))::int BETWEEN 5 AND 12 THEN 'matin'::public.shift_type
    WHEN extract(hour from (now() AT TIME ZONE 'Africa/Algiers'))::int BETWEEN 13 AND 20 THEN 'apres_midi'::public.shift_type
    ELSE 'nuit'::public.shift_type
  END;
$$;

-- 2. ensure_production_shift_session : utilise l'heure serveur en TZ Algiers
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
  v_today date := (now() AT TIME ZONE 'Africa/Algiers')::date;
  v_session_id uuid;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  SELECT * INTO v_of FROM public.ordres_fabrication WHERE id = p_of_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OF introuvable'; END IF;
  -- Garantie que l'OF est toujours actif au moment précis du déclenchement (heure serveur)
  IF v_of.statut <> 'en_cours' THEN RETURN NULL; END IF;
  IF COALESCE(v_of.auto_generate_shifts, true) IS DISTINCT FROM true THEN RETURN NULL; END IF;
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

  -- Horaires standards calculés en TZ Algérie puis convertis en timestamptz
  v_start := CASE v_shift_type
    WHEN 'matin' THEN (v_today::timestamp + interval '5 hours')
    WHEN 'apres_midi' THEN (v_today::timestamp + interval '13 hours')
    ELSE (v_today::timestamp + interval '21 hours')
  END AT TIME ZONE 'Africa/Algiers';
  v_end := v_start + interval '8 hours';

  INSERT INTO public.shifts (
    of_id, line_id, shift_type, date_shift, chef_ligne_id,
    heure_debut, heure_fin, shift_team_id, is_active, statut,
    heure_debut_reelle, opened_by, observations
  )
  VALUES (
    p_of_id, v_of.line_id, v_shift_type, v_today, v_assignment.chef_ligne_id,
    v_start, v_end, v_assignment.shift_team_id, true, 'en_cours',
    now(), auth.uid(), '[Auto-généré depuis plan OF — heure serveur Africa/Algiers]'
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_production_shift_session(uuid) TO authenticated;

-- 3. ensure_my_production_shifts : crée TOUTES les sessions des OFs ouverts du user
CREATE OR REPLACE FUNCTION public.ensure_my_production_shifts()
RETURNS SETOF uuid
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
  IF v_uid IS NULL THEN RETURN; END IF;
  v_shift_type := public.derive_shift_type_from_now();

  FOR v_of_id IN
    SELECT a.of_id
    FROM public.of_shift_assignments a
    JOIN public.ordres_fabrication o ON o.id = a.of_id
    WHERE a.chef_ligne_id = v_uid
      AND a.shift_type = v_shift_type
      AND o.statut = 'en_cours'
      AND COALESCE(o.auto_generate_shifts, true) = true
  LOOP
    v_session_id := public.ensure_production_shift_session(v_of_id);
    IF v_session_id IS NOT NULL THEN
      RETURN NEXT v_session_id;
    END IF;
  END LOOP;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_production_shifts() TO authenticated;

-- 4. Compat : ensure_my_production_shift_session retourne la 1ère session générée
CREATE OR REPLACE FUNCTION public.ensure_my_production_shift_session()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_first uuid;
BEGIN
  SELECT id INTO v_first FROM public.ensure_my_production_shifts() AS id LIMIT 1;
  RETURN v_first;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_production_shift_session() TO authenticated;

-- 5. Côté qualité : si la table d'affectation existe, on génère pareillement
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='quality_shift_assignments'
  ) THEN
    EXECUTE $f$
    CREATE OR REPLACE FUNCTION public.ensure_my_quality_shifts()
    RETURNS SETOF uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $body$
    DECLARE
      v_uid uuid := auth.uid();
      v_shift_type public.shift_type;
      v_today date := (now() AT TIME ZONE 'Africa/Algiers')::date;
      v_qs_id uuid;
      v_assign record;
      v_start timestamptz;
      v_end timestamptz;
    BEGIN
      IF v_uid IS NULL THEN RETURN; END IF;
      v_shift_type := public.derive_shift_type_from_now();

      FOR v_assign IN
        SELECT * FROM public.quality_shift_assignments
        WHERE controller_id = v_uid AND shift_type = v_shift_type
      LOOP
        SELECT id INTO v_qs_id
        FROM public.quality_shifts
        WHERE controller_id = v_uid
          AND date_shift = v_today
          AND shift_type = v_shift_type
          AND is_active = true
        LIMIT 1;

        IF v_qs_id IS NOT NULL THEN
          RETURN NEXT v_qs_id;
          CONTINUE;
        END IF;

        v_start := CASE v_shift_type
          WHEN 'matin' THEN (v_today::timestamp + interval '5 hours')
          WHEN 'apres_midi' THEN (v_today::timestamp + interval '13 hours')
          ELSE (v_today::timestamp + interval '21 hours')
        END AT TIME ZONE 'Africa/Algiers';
        v_end := v_start + interval '8 hours';

        INSERT INTO public.quality_shifts (
          controller_id, shift_type, date_shift, shift_team_id,
          heure_debut, heure_fin, is_active, observations
        ) VALUES (
          v_uid, v_shift_type, v_today, v_assign.shift_team_id,
          v_start, v_end, true,
          '[Auto-généré — heure serveur Africa/Algiers]'
        )
        RETURNING id INTO v_qs_id;

        RETURN NEXT v_qs_id;
      END LOOP;
      RETURN;
    END;
    $body$;
    $f$;
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ensure_my_quality_shifts() TO authenticated';
  END IF;
END $$;