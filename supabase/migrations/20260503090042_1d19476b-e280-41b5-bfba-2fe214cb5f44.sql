-- ============ 1) Extend intervention_pdr ============
ALTER TABLE public.intervention_pdr
  ADD COLUMN IF NOT EXISTS position_id uuid REFERENCES public.pdr_install_positions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compteur_fin numeric,
  ADD COLUMN IF NOT EXISTS cause_remplacement text,
  ADD COLUMN IF NOT EXISTS commentaire_technique text,
  ADD COLUMN IF NOT EXISTS photo_avant_path text,
  ADD COLUMN IF NOT EXISTS photo_apres_path text,
  ADD COLUMN IF NOT EXISTS compteur_initial_new numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_intervention_pdr_position ON public.intervention_pdr(position_id);

-- Validate cause enum (loose check, allows null)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'intervention_pdr_cause_check') THEN
    ALTER TABLE public.intervention_pdr
      ADD CONSTRAINT intervention_pdr_cause_check
      CHECK (cause_remplacement IS NULL OR cause_remplacement IN
        ('usure_normale','casse','fuite','preventif','amelioration','non_conformite','autre'));
  END IF;
END $$;

-- ============ 2) Lifecycle trigger for intervention_pdr ============
CREATE OR REPLACE FUNCTION public.tg_intervention_pdr_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link public.pdr_entity_links%ROWTYPE;
  v_pos  public.pdr_install_positions%ROWTYPE;
  v_machine_id uuid;
  v_equipement_id uuid;
  v_ticket_id uuid;
  v_intv public.interventions%ROWTYPE;
BEGIN
  IF NEW.position_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_pos FROM public.pdr_install_positions WHERE id = NEW.position_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT * INTO v_link FROM public.pdr_entity_links WHERE id = v_pos.link_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_link.entity_type = 'machine' THEN
    v_machine_id := v_link.entity_id;
  ELSIF v_link.entity_type = 'equipement' THEN
    v_equipement_id := v_link.entity_id;
  ELSIF v_link.entity_type = 'organe' THEN
    SELECT equipement_id INTO v_equipement_id FROM public.organes WHERE id = v_link.entity_id;
  END IF;

  SELECT * INTO v_intv FROM public.interventions WHERE id = NEW.intervention_id;
  IF FOUND THEN v_ticket_id := v_intv.ticket_id; END IF;

  -- Close any active instance on this position
  UPDATE public.pdr_instances
     SET statut = 'replaced',
         date_remplacement = now(),
         notes = COALESCE(notes, '') ||
                 E'\n[Remplacé via intervention] cause=' || COALESCE(NEW.cause_remplacement, 'non_specifiee') ||
                 CASE WHEN NEW.compteur_fin IS NOT NULL THEN ' compteur_fin=' || NEW.compteur_fin::text ELSE '' END ||
                 CASE WHEN NEW.commentaire_technique IS NOT NULL THEN ' note=' || NEW.commentaire_technique ELSE '' END
   WHERE position_id = NEW.position_id AND statut = 'active';

  -- Open a new active instance with optional initial counter
  INSERT INTO public.pdr_instances (
    pdr_id, machine_id, equipement_id, position_id,
    intervention_id, ticket_id, installed_by,
    date_installation, statut, compteur_pose_at, notes
  ) VALUES (
    NEW.pdr_id, v_machine_id, v_equipement_id, NEW.position_id,
    NEW.intervention_id, v_ticket_id, COALESCE(v_intv.technicien_id, auth.uid()),
    now(), 'active', COALESCE(NEW.compteur_initial_new, 0),
    COALESCE('[Pose initiale via intervention] ' || COALESCE(NEW.commentaire_technique,''), '')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_intervention_pdr_lifecycle ON public.intervention_pdr;
CREATE TRIGGER trg_intervention_pdr_lifecycle
AFTER INSERT ON public.intervention_pdr
FOR EACH ROW
EXECUTE FUNCTION public.tg_intervention_pdr_lifecycle();

-- ============ 3) Lifecycle trigger for preventive_executions.pdr_used ============
-- Each entry in pdr_used JSONB may contain position_id; we process them at insert time.
CREATE OR REPLACE FUNCTION public.tg_preventive_execution_pdr_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item jsonb;
  v_pos public.pdr_install_positions%ROWTYPE;
  v_link public.pdr_entity_links%ROWTYPE;
  v_machine_id uuid;
  v_equipement_id uuid;
  v_pdr_id uuid;
  v_position_id uuid;
  v_compteur_initial numeric;
  v_compteur_fin numeric;
  v_cause text;
  v_commentaire text;
BEGIN
  IF NEW.pdr_used IS NULL OR jsonb_typeof(NEW.pdr_used) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.pdr_used) LOOP
    v_position_id := NULLIF(v_item->>'position_id','')::uuid;
    v_pdr_id := NULLIF(v_item->>'pdr_id','')::uuid;
    IF v_position_id IS NULL OR v_pdr_id IS NULL THEN CONTINUE; END IF;

    v_compteur_initial := COALESCE((v_item->>'compteur_initial_new')::numeric, 0);
    v_compteur_fin := NULLIF(v_item->>'compteur_fin','')::numeric;
    v_cause := COALESCE(v_item->>'cause_remplacement', 'preventif');
    v_commentaire := v_item->>'commentaire_technique';

    SELECT * INTO v_pos FROM public.pdr_install_positions WHERE id = v_position_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT * INTO v_link FROM public.pdr_entity_links WHERE id = v_pos.link_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_machine_id := NULL; v_equipement_id := NULL;
    IF v_link.entity_type = 'machine' THEN
      v_machine_id := v_link.entity_id;
    ELSIF v_link.entity_type = 'equipement' THEN
      v_equipement_id := v_link.entity_id;
    ELSIF v_link.entity_type = 'organe' THEN
      SELECT equipement_id INTO v_equipement_id FROM public.organes WHERE id = v_link.entity_id;
    END IF;

    UPDATE public.pdr_instances
       SET statut = 'replaced',
           date_remplacement = now(),
           notes = COALESCE(notes,'') ||
                   E'\n[Remplacé via préventif] cause=' || v_cause ||
                   CASE WHEN v_compteur_fin IS NOT NULL THEN ' compteur_fin=' || v_compteur_fin::text ELSE '' END ||
                   CASE WHEN v_commentaire IS NOT NULL THEN ' note=' || v_commentaire ELSE '' END
     WHERE position_id = v_position_id AND statut = 'active';

    INSERT INTO public.pdr_instances (
      pdr_id, machine_id, equipement_id, position_id,
      installed_by, date_installation, statut, compteur_pose_at, notes
    ) VALUES (
      v_pdr_id, v_machine_id, v_equipement_id, v_position_id,
      COALESCE(NEW.executed_by, auth.uid()),
      now(), 'active', v_compteur_initial,
      '[Pose préventive] ' || COALESCE(v_commentaire, '')
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preventive_execution_pdr_lifecycle ON public.preventive_executions;
CREATE TRIGGER trg_preventive_execution_pdr_lifecycle
AFTER INSERT ON public.preventive_executions
FOR EACH ROW
EXECUTE FUNCTION public.tg_preventive_execution_pdr_lifecycle();