-- 1. Enum type de campagne
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_campaign_type') THEN
    CREATE TYPE public.inventory_campaign_type AS ENUM ('pdr','investissement');
  END IF;
END $$;

-- 2. Colonnes campagne
ALTER TABLE public.inventory_campaigns
  ADD COLUMN IF NOT EXISTS campaign_type public.inventory_campaign_type NOT NULL DEFAULT 'pdr',
  ADD COLUMN IF NOT EXISTS scope_machines boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scope_equipements boolean NOT NULL DEFAULT false;

-- 3. Descendants de familles : PDR + machine
CREATE OR REPLACE FUNCTION public.inv_family_descendants(p_family_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH RECURSIVE all_fam AS (
    SELECT id, parent_id FROM public.pdr_families
    UNION ALL
    SELECT id, parent_id FROM public.machine_families
  ),
  t AS (
    SELECT id FROM all_fam WHERE id = p_family_id
    UNION ALL
    SELECT f.id FROM all_fam f JOIN t ON f.parent_id = t.id
  )
  SELECT id FROM t;
$function$;

-- 4. Génération des cibles selon le type
CREATE OR REPLACE FUNCTION public.inv_ensure_targets(p_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_camp public.inventory_campaigns%ROWTYPE; v_count int := 0; v_n int := 0;
BEGIN
  SELECT * INTO v_camp FROM public.inventory_campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'responsable_inventaire'::app_role)
       OR v_camp.responsable_id = auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF v_camp.campaign_type = 'pdr' THEN
    IF v_camp.scope_pdr THEN
      INSERT INTO public.inventory_targets (campaign_id, entity_type, entity_id, entity_code, entity_label, family_id, qty_systeme)
      SELECT v_camp.id, 'pdr'::public.inventory_entity_type, p.id, p.reference, p.designation, p.famille_id, COALESCE(p.stock_actuel,0)
      FROM public.pdr p
      WHERE p.famille_id IN (SELECT public.inv_campaign_authorized_families(v_camp.id))
      ON CONFLICT (campaign_id, entity_type, entity_id) DO NOTHING;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_count := v_count + v_n;
    END IF;
  ELSIF v_camp.campaign_type = 'investissement' THEN
    -- Machines
    IF v_camp.scope_machines THEN
      INSERT INTO public.inventory_targets (campaign_id, entity_type, entity_id, entity_code, entity_label, family_id, qty_systeme)
      SELECT v_camp.id, 'machine'::public.inventory_entity_type, m.id, m.code, m.designation, m.family_id, 1
      FROM public.machines m
      WHERE m.is_active = true
        AND m.family_id IN (SELECT public.inv_campaign_authorized_families(v_camp.id))
      ON CONFLICT (campaign_id, entity_type, entity_id) DO NOTHING;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_count := v_count + v_n;
    END IF;
    -- Equipements
    IF v_camp.scope_equipements THEN
      INSERT INTO public.inventory_targets (campaign_id, entity_type, entity_id, entity_code, entity_label, family_id, qty_systeme)
      SELECT v_camp.id, 'equipement'::public.inventory_entity_type, e.id, e.code, e.designation, e.family_id, 1
      FROM public.equipements e
      WHERE e.is_active = true
        AND e.family_id IN (SELECT public.inv_campaign_authorized_families(v_camp.id))
      ON CONFLICT (campaign_id, entity_type, entity_id) DO NOTHING;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_count := v_count + v_n;
    END IF;
    -- Organes (famille résolue via machine ou équipement parent)
    IF v_camp.scope_organes THEN
      INSERT INTO public.inventory_targets (campaign_id, entity_type, entity_id, entity_code, entity_label, family_id, qty_systeme)
      SELECT v_camp.id, 'organe'::public.inventory_entity_type, o.id, o.code, o.designation,
             COALESCE(m.family_id, e.family_id), 1
      FROM public.organes o
      LEFT JOIN public.machines m ON m.id = o.machine_id
      LEFT JOIN public.equipements e ON e.id = o.equipement_id
      WHERE o.is_active = true
        AND COALESCE(m.family_id, e.family_id) IN (SELECT public.inv_campaign_authorized_families(v_camp.id))
      ON CONFLICT (campaign_id, entity_type, entity_id) DO NOTHING;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_count := v_count + v_n;
    END IF;
  END IF;

  INSERT INTO public.inventory_results (target_id, campaign_id, round)
  SELECT t.id, t.campaign_id, t.current_round
  FROM public.inventory_targets t
  WHERE t.campaign_id = v_camp.id
  ON CONFLICT (target_id) DO NOTHING;

  RETURN v_count;
END $function$;