-- 1. Ajout des colonnes OF-based sur quality_shift_assignments
ALTER TABLE public.quality_shift_assignments
  ADD COLUMN IF NOT EXISTS of_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS all_open_ofs boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.quality_shift_assignments.line_ids
  IS 'DEPRECATED — utiliser of_ids/all_open_ofs. Conservé pour rétrocompatibilité.';
COMMENT ON COLUMN public.quality_shift_assignments.of_ids
  IS 'Liste explicite des OFs couverts par ce contrôleur sur ce créneau.';
COMMENT ON COLUMN public.quality_shift_assignments.all_open_ofs
  IS 'Si true, le contrôleur couvre tous les OFs en cours au moment du shift.';

-- 2. Réécriture de ensure_my_quality_shifts : OF-driven
CREATE OR REPLACE FUNCTION public.ensure_my_quality_shifts()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shift_type public.shift_type;
  v_today date := (now() AT TIME ZONE 'Africa/Algiers')::date;
  v_qs_id uuid;
  v_assign record;
  v_start timestamptz;
  v_end timestamptz;
  v_line_id uuid;
  v_of_id uuid;
  v_resolved_lines uuid[];
  v_resolved_ofs uuid[];
  v_prod_shift uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  v_shift_type := public.derive_shift_type_from_now();

  FOR v_assign IN
    SELECT * FROM public.quality_shift_assignments
    WHERE controller_id = v_uid AND shift_type = v_shift_type
  LOOP
    -- Résolution des OFs pertinents (en_cours uniquement)
    IF v_assign.all_open_ofs THEN
      SELECT array_agg(DISTINCT id), array_agg(DISTINCT ligne_id)
        INTO v_resolved_ofs, v_resolved_lines
      FROM public.ordres_fabrication
      WHERE statut = 'en_cours' AND ligne_id IS NOT NULL;
    ELSIF v_assign.of_ids IS NOT NULL AND array_length(v_assign.of_ids, 1) > 0 THEN
      SELECT array_agg(DISTINCT id), array_agg(DISTINCT ligne_id)
        INTO v_resolved_ofs, v_resolved_lines
      FROM public.ordres_fabrication
      WHERE id = ANY(v_assign.of_ids) AND statut = 'en_cours' AND ligne_id IS NOT NULL;
    ELSE
      -- Fallback rétrocompat sur line_ids
      v_resolved_lines := v_assign.line_ids;
      v_resolved_ofs := NULL;
    END IF;

    -- Skip si aucun travail à couvrir actuellement
    IF v_resolved_lines IS NULL OR array_length(v_resolved_lines, 1) IS NULL THEN
      CONTINUE;
    END IF;

    -- Cherche/crée la session qualité du jour
    SELECT id INTO v_qs_id
    FROM public.quality_shifts
    WHERE controller_id = v_uid
      AND date_shift = v_today
      AND shift_type = v_shift_type
      AND is_active = true
    LIMIT 1;

    IF v_qs_id IS NULL THEN
      v_start := CASE v_shift_type
        WHEN 'matin' THEN (v_today::timestamp + interval '5 hours')
        WHEN 'apres_midi' THEN (v_today::timestamp + interval '13 hours')
        ELSE (v_today::timestamp + interval '21 hours')
      END AT TIME ZONE 'Africa/Algiers';
      v_end := v_start + interval '8 hours';

      INSERT INTO public.quality_shifts (
        controller_id, shift_type, date_shift, shift_team_id,
        heure_debut, heure_fin, is_active, observations, opened_by
      ) VALUES (
        v_uid, v_shift_type, v_today, v_assign.shift_team_id,
        v_start, v_end, true,
        '[Auto-généré OF-based — heure serveur Africa/Algiers]', v_uid
      )
      RETURNING id INTO v_qs_id;
    END IF;

    -- Lignes couvertes (résolues dynamiquement)
    FOREACH v_line_id IN ARRAY v_resolved_lines LOOP
      INSERT INTO public.quality_shift_lines (quality_shift_id, production_line_id)
      VALUES (v_qs_id, v_line_id)
      ON CONFLICT (quality_shift_id, production_line_id) DO NOTHING;

      FOR v_prod_shift IN
        SELECT id FROM public.shifts
        WHERE line_id = v_line_id
          AND date_shift = v_today
          AND is_active = true
      LOOP
        INSERT INTO public.quality_shift_production_links (quality_shift_id, production_shift_id)
        VALUES (v_qs_id, v_prod_shift)
        ON CONFLICT (quality_shift_id, production_shift_id) DO NOTHING;
      END LOOP;
    END LOOP;

    RETURN NEXT v_qs_id;
  END LOOP;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_quality_shifts() TO authenticated;

-- 3. Règle Heure-1 stricte côté serveur sur production_declarations
CREATE OR REPLACE FUNCTION public.tg_production_declarations_hour_minus_1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_now_local timestamptz := now() AT TIME ZONE 'Africa/Algiers';
  v_slot_local timestamp;
  v_shift_start timestamptz;
  v_shift_end timestamptz;
BEGIN
  IF NEW.heure_production IS NULL THEN
    RAISE EXCEPTION 'heure_production requise';
  END IF;

  -- L'heure déclarée doit être strictement < heure courante (heure entièrement écoulée)
  IF NEW.heure_production + interval '1 hour' > v_now THEN
    RAISE EXCEPTION 'Règle Heure-1 : on ne peut déclarer qu''une heure complètement écoulée (créneau %)',
      to_char(NEW.heure_production AT TIME ZONE 'Africa/Algiers', 'HH24"h"');
  END IF;

  -- L'heure déclarée doit appartenir à la fenêtre du shift
  IF NEW.shift_id IS NOT NULL THEN
    SELECT heure_debut, COALESCE(heure_fin, heure_debut + interval '8 hours')
      INTO v_shift_start, v_shift_end
    FROM public.shifts WHERE id = NEW.shift_id;

    IF v_shift_start IS NOT NULL AND
       (NEW.heure_production < v_shift_start OR NEW.heure_production >= v_shift_end) THEN
      RAISE EXCEPTION 'L''heure déclarée doit être dans la fenêtre du shift (% → %)',
        v_shift_start, v_shift_end;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_production_declarations_hour_minus_1 ON public.production_declarations;
CREATE TRIGGER tg_production_declarations_hour_minus_1
BEFORE INSERT OR UPDATE OF heure_production ON public.production_declarations
FOR EACH ROW EXECUTE FUNCTION public.tg_production_declarations_hour_minus_1();