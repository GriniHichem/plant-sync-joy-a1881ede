-- 1. Colonnes de cycle d'exécution sur preventive_executions
ALTER TABLE public.preventive_executions
  ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'terminee',
  ADD COLUMN IF NOT EXISTS heure_debut timestamptz,
  ADD COLUMN IF NOT EXISTS heure_fin timestamptz,
  ADD COLUMN IF NOT EXISTS duree_minutes integer;

-- 2. intervention_pdr devient polymorphe (ticket OU exécution préventive)
ALTER TABLE public.intervention_pdr ALTER COLUMN intervention_id DROP NOT NULL;
ALTER TABLE public.intervention_pdr
  ADD COLUMN IF NOT EXISTS preventive_execution_id uuid REFERENCES public.preventive_executions(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.intervention_pdr
    ADD CONSTRAINT intervention_pdr_source_chk
    CHECK (
      (intervention_id IS NOT NULL AND preventive_execution_id IS NULL)
      OR (intervention_id IS NULL AND preventive_execution_id IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. RPC : consommation des pièces prêtées à la clôture d'une exécution préventive
CREATE OR REPLACE FUNCTION public.consume_maintenance_holding_preventive(
  p_holding_id uuid, p_execution_id uuid, p_qte_consomme integer,
  p_position_id uuid DEFAULT NULL, p_cause text DEFAULT NULL, p_commentaire text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_h public.pdr_maintenance_holdings; v_leftover int; v_pdr public.pdr; v_avant int; v_apres int;
BEGIN
  IF NOT (has_role(auth.uid(),'maintenancier') OR has_role(auth.uid(),'resp_maintenance') OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;
  IF p_execution_id IS NULL THEN RAISE EXCEPTION 'Exécution préventive requise'; END IF;

  SELECT * INTO v_h FROM public.pdr_maintenance_holdings WHERE id=p_holding_id FOR UPDATE;
  IF v_h.id IS NULL THEN RAISE EXCEPTION 'Stock maintenance introuvable'; END IF;
  IF v_h.statut <> 'en_main' THEN RAISE EXCEPTION 'Déjà traité'; END IF;
  IF v_h.request_item_id IS NULL THEN
    RAISE EXCEPTION 'Stock maintenance non rattaché à une demande validée';
  END IF;
  IF NOT (v_h.holder_id = auth.uid() OR has_role(auth.uid(),'resp_maintenance') OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Seul le détenteur de la pièce peut la consommer';
  END IF;
  IF p_qte_consomme < 0 OR p_qte_consomme > v_h.quantite THEN RAISE EXCEPTION 'Quantité consommée invalide'; END IF;

  -- autoriser les inserts gardés ci-dessous
  PERFORM set_config('app.pdr_flow', 'on', true);

  IF p_qte_consomme > 0 THEN
    INSERT INTO public.intervention_pdr(preventive_execution_id, pdr_id, quantite, position_id, cause_remplacement, commentaire_technique)
    VALUES (p_execution_id, v_h.pdr_id, p_qte_consomme, p_position_id, p_cause, p_commentaire);
  END IF;

  v_leftover := v_h.quantite - p_qte_consomme;
  IF v_leftover > 0 THEN
    SELECT * INTO v_pdr FROM public.pdr WHERE id=v_h.pdr_id FOR UPDATE;
    v_avant := v_pdr.stock_actuel; v_apres := v_avant + v_leftover;
    UPDATE public.pdr SET stock_actuel = v_apres WHERE id=v_h.pdr_id;
    INSERT INTO public.pdr_stock_movements(pdr_id, type, quantite, stock_avant, stock_apres,
      prix_unitaire, source_type, source_id, motif, user_id, applied, validation_status)
    VALUES (v_h.pdr_id, 'entree', v_leftover, v_avant, v_apres, v_pdr.pmp,
      'pdr_request', v_h.request_item_id, 'Retour reliquat stock maintenance (préventif)', auth.uid(), true, 'applied');
  END IF;

  UPDATE public.pdr_maintenance_holdings
    SET statut='consomme', quantite=GREATEST(p_qte_consomme,0)
  WHERE id=p_holding_id;
END $$;

GRANT EXECUTE ON FUNCTION public.consume_maintenance_holding_preventive(uuid, uuid, integer, uuid, text, text) TO authenticated;