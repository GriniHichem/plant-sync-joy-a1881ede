CREATE OR REPLACE FUNCTION public.initiate_holding_transfer(p_holding_id uuid, p_qte integer, p_destination pdr_transfer_destination, p_to_holder uuid DEFAULT NULL::uuid, p_motif text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_h public.pdr_maintenance_holdings; v_reste int; v_transfer_id uuid;
BEGIN
  SELECT * INTO v_h FROM public.pdr_maintenance_holdings WHERE id=p_holding_id FOR UPDATE;
  IF v_h.id IS NULL THEN RAISE EXCEPTION 'Stock maintenance introuvable'; END IF;
  IF v_h.holder_id <> auth.uid() AND NOT has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Seul le détenteur peut transférer cette pièce';
  END IF;
  IF v_h.statut <> 'en_main' THEN RAISE EXCEPTION 'Pièce non disponible'; END IF;
  IF p_qte < 1 OR p_qte > v_h.quantite THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  IF p_destination = 'maintainer' THEN
    IF p_to_holder IS NULL THEN RAISE EXCEPTION 'Destinataire requis'; END IF;
    IF p_to_holder = v_h.holder_id THEN RAISE EXCEPTION 'Destinataire invalide'; END IF;
  END IF;

  v_reste := v_h.quantite - p_qte;
  IF v_reste > 0 THEN
    UPDATE public.pdr_maintenance_holdings SET quantite = v_reste WHERE id=p_holding_id;
  ELSE
    -- toute la quantité part en transit : supprimer la ligne (quantite>0 obligatoire)
    DELETE FROM public.pdr_maintenance_holdings WHERE id=p_holding_id;
  END IF;

  INSERT INTO public.pdr_holding_transfers(pdr_id, quantite, from_holder, destination, to_holder, motif, request_item_id)
  VALUES (v_h.pdr_id, p_qte, v_h.holder_id, p_destination,
          CASE WHEN p_destination='maintainer' THEN p_to_holder ELSE NULL END,
          p_motif, v_h.request_item_id)
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END $function$;