
-- Switch get_position_counter to SECURITY INVOKER (linter warning)
CREATE OR REPLACE FUNCTION public.get_position_counter(p_position_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_pos public.pdr_install_positions%ROWTYPE;
  v_link public.pdr_entity_links%ROWTYPE;
  v_line_id uuid;
  v_date_pose timestamptz;
  v_total_prod numeric := 0;
  v_active_count int := 1;
BEGIN
  SELECT * INTO v_pos FROM public.pdr_install_positions WHERE id = p_position_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF v_pos.lifespan_mode = 'none' THEN RETURN 0; END IF;
  IF v_pos.production_rule = 'manuel' THEN RETURN COALESCE(v_pos.compteur_manuel, 0); END IF;
  IF v_pos.lifespan_mode = 'time' THEN
    SELECT MAX(date_installation) INTO v_date_pose
    FROM public.pdr_instances
    WHERE position_id = p_position_id AND statut = 'active';
    v_date_pose := COALESCE(v_date_pose, v_pos.created_at);
    RETURN EXTRACT(EPOCH FROM (now() - v_date_pose)) / 86400.0;
  END IF;
  SELECT * INTO v_link FROM public.pdr_entity_links WHERE id = v_pos.link_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF v_link.entity_type = 'machine' THEN
    SELECT ligne_id INTO v_line_id FROM public.machines WHERE id = v_link.entity_id;
  ELSIF v_link.entity_type = 'equipement' THEN
    SELECT line_id INTO v_line_id FROM public.equipements WHERE id = v_link.entity_id;
  ELSIF v_link.entity_type = 'organe' THEN
    SELECT e.line_id INTO v_line_id
      FROM public.organes o JOIN public.equipements e ON e.id = o.equipement_id
     WHERE o.id = v_link.entity_id;
  END IF;
  IF v_line_id IS NULL THEN RETURN COALESCE(v_pos.compteur_manuel, 0); END IF;
  SELECT MAX(date_installation) INTO v_date_pose
    FROM public.pdr_instances WHERE position_id = p_position_id AND statut = 'active';
  v_date_pose := COALESCE(v_date_pose, v_pos.created_at);
  SELECT COALESCE(SUM(pd.quantite_produite), 0) INTO v_total_prod
    FROM public.production_declarations pd
    JOIN public.shifts s ON s.id = pd.shift_id
   WHERE s.line_id = v_line_id
     AND pd.heure_production >= v_date_pose;
  IF v_pos.production_rule = 'complete' THEN RETURN v_total_prod;
  ELSIF v_pos.production_rule = 'reparti' THEN
    SELECT COUNT(*) INTO v_active_count
      FROM public.pdr_install_positions
     WHERE link_id = v_pos.link_id AND statut = 'active';
    IF v_active_count < 1 THEN v_active_count := 1; END IF;
    RETURN v_total_prod / v_active_count;
  ELSIF v_pos.production_rule = 'coefficient' THEN
    RETURN v_total_prod * COALESCE(v_pos.production_coefficient, 1);
  END IF;
  RETURN COALESCE(v_pos.compteur_manuel, 0);
END;
$$;

-- Recreate view with security_invoker
DROP VIEW IF EXISTS public.pdr_position_status;
CREATE VIEW public.pdr_position_status
WITH (security_invoker = true) AS
SELECT
  p.id AS position_id,
  p.link_id,
  l.pdr_id,
  l.entity_type,
  l.entity_id,
  p.designation,
  p.statut,
  p.lifespan_mode,
  p.seuil_min,
  p.seuil_max,
  p.seuil_alerte_pct,
  p.unite_mesure,
  p.production_rule,
  p.production_coefficient,
  (SELECT pi.id FROM public.pdr_instances pi
    WHERE pi.position_id = p.id AND pi.statut = 'active'
    ORDER BY pi.date_installation DESC LIMIT 1) AS current_instance_id,
  (SELECT pi.date_installation FROM public.pdr_instances pi
    WHERE pi.position_id = p.id AND pi.statut = 'active'
    ORDER BY pi.date_installation DESC LIMIT 1) AS date_pose,
  (SELECT pi.date_installation FROM public.pdr_instances pi
    WHERE pi.position_id = p.id
    ORDER BY pi.date_installation DESC LIMIT 1) AS date_dernier_changement,
  (SELECT pi.ticket_id FROM public.pdr_instances pi
    WHERE pi.position_id = p.id AND pi.ticket_id IS NOT NULL
    ORDER BY pi.date_installation DESC LIMIT 1) AS last_ticket_id,
  public.get_position_counter(p.id) AS compteur_actuel,
  p.seuil_max AS compteur_max,
  CASE
    WHEN p.seuil_max IS NULL OR p.seuil_max = 0 THEN 0
    ELSE LEAST(100, GREATEST(0, (public.get_position_counter(p.id) / p.seuil_max) * 100))
  END AS pct_consomme,
  CASE
    WHEN p.seuil_max IS NULL OR p.seuil_max = 0 THEN NULL
    ELSE GREATEST(0, p.seuil_max - public.get_position_counter(p.id))
  END AS compteur_restant,
  CASE
    WHEN p.seuil_max IS NULL OR p.seuil_max = 0 THEN 'vert'
    WHEN public.get_position_counter(p.id) >= p.seuil_max THEN 'rouge'
    WHEN (public.get_position_counter(p.id) / p.seuil_max) * 100 >= COALESCE(p.seuil_alerte_pct, 80) THEN 'orange'
    ELSE 'vert'
  END AS niveau
FROM public.pdr_install_positions p
JOIN public.pdr_entity_links l ON l.id = p.link_id;
