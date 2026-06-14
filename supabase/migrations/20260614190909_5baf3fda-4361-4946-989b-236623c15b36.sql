-- 1. Colonnes par-employé
ALTER TABLE public.shift_team_members
  ADD COLUMN IF NOT EXISTS shift_mode_id uuid REFERENCES public.shift_modes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cycle_pattern text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS anchor_date date,
  ADD COLUMN IF NOT EXISTS scope_kind text NOT NULL DEFAULT 'all';

-- 2. Helper : créneau attendu (motif bouclé depuis l'ancrage)
CREATE OR REPLACE FUNCTION public.shift_cycle_slot(_pattern text[], _anchor date, _d date)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _pattern IS NULL OR array_length(_pattern,1) IS NULL OR _anchor IS NULL THEN NULL
    ELSE _pattern[ ((((_d - _anchor) % array_length(_pattern,1)) + array_length(_pattern,1)) % array_length(_pattern,1)) + 1 ]
  END
$$;

-- 3. Contexte par périmètre
CREATE OR REPLACE FUNCTION public.get_scope_shift_context(_user_id uuid, _scope text, _at timestamp with time zone DEFAULT now())
RETURNS TABLE(team_id uuid, template_id uuid, template_code text, heure_debut timestamp with time zone, heure_fin timestamp with time zone, line_ids uuid[], is_on_shift boolean, autorisation_libre boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := (_at AT TIME ZONE 'Africa/Algiers')::date;
BEGIN
  RETURN QUERY
  WITH candidate_dates AS (SELECT v_today AS d UNION ALL SELECT v_today - 1),
  member AS (
    SELECT stm.team_id, stm.autorisation_libre, stm.cycle_pattern, stm.anchor_date,
           m.id AS mode_id, m.code AS mode_code
    FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    JOIN public.shift_modes m ON m.id = stm.shift_mode_id AND m.is_active
    WHERE stm.user_id = _user_id AND stm.is_active
      AND (stm.scope_kind = _scope OR stm.scope_kind = 'all' OR _scope = 'all')
  ),
  slot_for_day AS (
    SELECT mb.team_id, mb.autorisation_libre, mb.mode_id, mb.mode_code, cd.d AS d,
      CASE WHEN mb.mode_code = 'surface'
        THEN CASE WHEN EXTRACT(ISODOW FROM cd.d) IN (6,7) THEN NULL
             ELSE (SELECT lower(s.label) FROM public.shift_mode_slots s WHERE s.shift_mode_id = mb.mode_id ORDER BY s.sort_order LIMIT 1) END
        ELSE lower(public.shift_cycle_slot(mb.cycle_pattern, mb.anchor_date, cd.d)) END AS slot_label
    FROM member mb CROSS JOIN candidate_dates cd
  ),
  rows AS (
    SELECT sf.team_id, sl.id AS template_id, lower(sl.label) AS template_code,
      ((sf.d + sl.heure_debut) AT TIME ZONE 'Africa/Algiers') AS h_debut,
      ((CASE WHEN sl.heure_fin <= sl.heure_debut THEN sf.d + 1 ELSE sf.d END + sl.heure_fin) AT TIME ZONE 'Africa/Algiers') AS h_fin,
      '{}'::uuid[] AS line_ids, sf.autorisation_libre
    FROM slot_for_day sf
    JOIN public.shift_mode_slots sl ON sl.shift_mode_id = sf.mode_id AND lower(sl.label) = sf.slot_label
    WHERE sf.slot_label IS NOT NULL
  )
  SELECT r.team_id, r.template_id, r.template_code, r.h_debut, r.h_fin, r.line_ids,
    (_at >= r.h_debut AND _at < r.h_fin) AS is_on_shift, r.autorisation_libre
  FROM rows r
  ORDER BY (_at >= r.h_debut AND _at < r.h_fin) DESC,
    CASE WHEN r.h_debut >= _at THEN r.h_debut END ASC NULLS LAST, r.h_debut DESC
  LIMIT 1;
END;
$function$;

-- 4. Contexte actif (affichage)
CREATE OR REPLACE FUNCTION public.get_active_shift_context(_user_id uuid, _at timestamp with time zone DEFAULT now())
RETURNS TABLE(team_id uuid, team_name text, template_id uuid, template_code text, heure_debut timestamp with time zone, heure_fin timestamp with time zone, is_on_shift boolean, autorisation_libre boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := (_at AT TIME ZONE 'Africa/Algiers')::date;
BEGIN
  RETURN QUERY
  WITH candidate_dates AS (SELECT v_today AS d UNION ALL SELECT v_today - 1),
  member AS (
    SELECT stm.team_id, t.name AS team_name, stm.autorisation_libre, stm.cycle_pattern, stm.anchor_date,
           m.id AS mode_id, m.code AS mode_code
    FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    JOIN public.shift_modes m ON m.id = stm.shift_mode_id AND m.is_active
    WHERE stm.user_id = _user_id AND stm.is_active
  ),
  slot_for_day AS (
    SELECT mb.team_id, mb.team_name, mb.autorisation_libre, mb.mode_id, mb.mode_code, cd.d AS d,
      CASE WHEN mb.mode_code = 'surface'
        THEN CASE WHEN EXTRACT(ISODOW FROM cd.d) IN (6,7) THEN NULL
             ELSE (SELECT lower(s.label) FROM public.shift_mode_slots s WHERE s.shift_mode_id = mb.mode_id ORDER BY s.sort_order LIMIT 1) END
        ELSE lower(public.shift_cycle_slot(mb.cycle_pattern, mb.anchor_date, cd.d)) END AS slot_label
    FROM member mb CROSS JOIN candidate_dates cd
  ),
  rows AS (
    SELECT sf.team_id, sf.team_name, sl.id AS template_id, lower(sl.label) AS template_code,
      ((sf.d + sl.heure_debut) AT TIME ZONE 'Africa/Algiers') AS h_debut,
      ((CASE WHEN sl.heure_fin <= sl.heure_debut THEN sf.d + 1 ELSE sf.d END + sl.heure_fin) AT TIME ZONE 'Africa/Algiers') AS h_fin,
      sf.autorisation_libre
    FROM slot_for_day sf
    JOIN public.shift_mode_slots sl ON sl.shift_mode_id = sf.mode_id AND lower(sl.label) = sf.slot_label
    WHERE sf.slot_label IS NOT NULL
  )
  SELECT r.team_id, r.team_name, r.template_id, r.template_code, r.h_debut, r.h_fin,
    (_at >= r.h_debut AND _at < r.h_fin), r.autorisation_libre
  FROM rows r
  ORDER BY (_at >= r.h_debut AND _at < r.h_fin) DESC,
    CASE WHEN r.h_debut >= _at THEN r.h_debut END ASC NULLS LAST, r.h_debut DESC
  LIMIT 1;
END;
$function$;

-- 5. Test on-shift
CREATE OR REPLACE FUNCTION public.is_user_on_shift(_user_id uuid, _scope text DEFAULT 'all', _at timestamp with time zone DEFAULT now())
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := (_at AT TIME ZONE 'Africa/Algiers')::date;
  v_free boolean := false;
  v_found boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    WHERE stm.user_id = _user_id AND stm.is_active AND stm.autorisation_libre
  ) INTO v_free;
  IF v_free THEN RETURN true; END IF;

  WITH candidate_dates AS (SELECT v_today AS d UNION ALL SELECT v_today - 1),
  member AS (
    SELECT stm.cycle_pattern, stm.anchor_date, m.id AS mode_id, m.code AS mode_code
    FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    JOIN public.shift_modes m ON m.id = stm.shift_mode_id AND m.is_active
    WHERE stm.user_id = _user_id AND stm.is_active
      AND (stm.scope_kind = _scope OR stm.scope_kind = 'all' OR _scope = 'all')
  ),
  slot_for_day AS (
    SELECT mb.mode_id, cd.d AS d,
      CASE WHEN mb.mode_code = 'surface'
        THEN CASE WHEN EXTRACT(ISODOW FROM cd.d) IN (6,7) THEN NULL
             ELSE (SELECT lower(s.label) FROM public.shift_mode_slots s WHERE s.shift_mode_id = mb.mode_id ORDER BY s.sort_order LIMIT 1) END
        ELSE lower(public.shift_cycle_slot(mb.cycle_pattern, mb.anchor_date, cd.d)) END AS slot_label
    FROM member mb CROSS JOIN candidate_dates cd
  )
  SELECT EXISTS(
    SELECT 1 FROM slot_for_day sf
    JOIN public.shift_mode_slots sl ON sl.shift_mode_id = sf.mode_id AND lower(sl.label) = sf.slot_label
    WHERE sf.slot_label IS NOT NULL
      AND _at >= ((sf.d + sl.heure_debut) AT TIME ZONE 'Africa/Algiers')
      AND _at <  ((CASE WHEN sl.heure_fin <= sl.heure_debut THEN sf.d + 1 ELSE sf.d END + sl.heure_fin) AT TIME ZONE 'Africa/Algiers')
  ) INTO v_found;
  RETURN v_found;
END;
$function$;

-- 6. Suppression de l'ancien moteur par-équipe
DROP TABLE IF EXISTS public.shift_schedules CASCADE;
DROP FUNCTION IF EXISTS public.tg_shift_schedules_validate() CASCADE;