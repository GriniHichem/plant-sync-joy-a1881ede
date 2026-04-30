-- 1. Table d'affectation qualité
CREATE TABLE IF NOT EXISTS public.quality_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shift_type public.shift_type NOT NULL,
  shift_team_id uuid REFERENCES public.shift_teams(id) ON DELETE SET NULL,
  line_ids uuid[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (controller_id, shift_type)
);

CREATE INDEX IF NOT EXISTS idx_qsa_controller ON public.quality_shift_assignments(controller_id);

ALTER TABLE public.quality_shift_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qsa_select" ON public.quality_shift_assignments;
CREATE POLICY "qsa_select" ON public.quality_shift_assignments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "qsa_manage" ON public.quality_shift_assignments;
CREATE POLICY "qsa_manage" ON public.quality_shift_assignments
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'directeur_qualite'::app_role)
    OR public.has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'directeur_qualite'::app_role)
    OR public.has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
  );

DROP TRIGGER IF EXISTS tg_qsa_updated ON public.quality_shift_assignments;
CREATE TRIGGER tg_qsa_updated
BEFORE UPDATE ON public.quality_shift_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Unique constraints needed for ON CONFLICT in the RPC
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.quality_shift_lines
      ADD CONSTRAINT quality_shift_lines_unique UNIQUE (quality_shift_id, production_line_id);
  EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.quality_shift_production_links
      ADD CONSTRAINT quality_shift_production_links_unique UNIQUE (quality_shift_id, production_shift_id);
  EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
  END;
END $$;

-- 3. RPC ensure_my_quality_shifts
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
  v_prod_shift uuid;
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
        '[Auto-généré — heure serveur Africa/Algiers]', v_uid
      )
      RETURNING id INTO v_qs_id;
    END IF;

    IF v_assign.line_ids IS NOT NULL THEN
      FOREACH v_line_id IN ARRAY v_assign.line_ids LOOP
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
    END IF;

    RETURN NEXT v_qs_id;
  END LOOP;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_quality_shifts() TO authenticated;

-- 4. Détache une session qualité d'un shift production fermé
CREATE OR REPLACE FUNCTION public.qshift_unlink_closed_production()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    DELETE FROM public.quality_shift_production_links
    WHERE production_shift_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_qshift_unlink_closed_production ON public.shifts;
CREATE TRIGGER tg_qshift_unlink_closed_production
AFTER UPDATE OF is_active ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.qshift_unlink_closed_production();