-- ============ Transferts de pièces du mini-stock maintenance ============
DO $$ BEGIN
  CREATE TYPE public.pdr_transfer_status AS ENUM ('en_attente','confirme','refuse','annule');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pdr_transfer_destination AS ENUM ('maintainer','magasin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pdr_holding_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id uuid NOT NULL REFERENCES public.pdr(id) ON DELETE CASCADE,
  quantite integer NOT NULL CHECK (quantite > 0),
  from_holder uuid NOT NULL,
  destination public.pdr_transfer_destination NOT NULL,
  to_holder uuid,
  statut public.pdr_transfer_status NOT NULL DEFAULT 'en_attente',
  motif text,
  request_item_id uuid,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdr_transfers_from ON public.pdr_holding_transfers(from_holder);
CREATE INDEX IF NOT EXISTS idx_pdr_transfers_to ON public.pdr_holding_transfers(to_holder);
CREATE INDEX IF NOT EXISTS idx_pdr_transfers_statut ON public.pdr_holding_transfers(statut);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdr_holding_transfers TO authenticated;
GRANT ALL ON public.pdr_holding_transfers TO service_role;

ALTER TABLE public.pdr_holding_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read pdr_transfers" ON public.pdr_holding_transfers
  FOR SELECT TO authenticated
  USING (
    from_holder = auth.uid()
    OR to_holder = auth.uid()
    OR has_role(auth.uid(),'gestionnaire_magasin')
    OR has_role(auth.uid(),'responsable_magasin')
    OR has_role(auth.uid(),'resp_maintenance')
    OR has_role(auth.uid(),'admin')
  );

CREATE POLICY "no direct write pdr_transfers" ON public.pdr_holding_transfers
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

CREATE TRIGGER update_pdr_holding_transfers_updated_at
  BEFORE UPDATE ON public.pdr_holding_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pdr_holding_transfers REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='pdr_holding_transfers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pdr_holding_transfers;
  END IF;
END $$;

-- ============ RPC 1 : initier ============
CREATE OR REPLACE FUNCTION public.initiate_holding_transfer(
  p_holding_id uuid, p_qte integer, p_destination public.pdr_transfer_destination,
  p_to_holder uuid DEFAULT NULL, p_motif text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
    UPDATE public.pdr_maintenance_holdings SET statut='retourne', quantite=0 WHERE id=p_holding_id;
  END IF;

  INSERT INTO public.pdr_holding_transfers(pdr_id, quantite, from_holder, destination, to_holder, motif, request_item_id)
  VALUES (v_h.pdr_id, p_qte, v_h.holder_id, p_destination,
          CASE WHEN p_destination='maintainer' THEN p_to_holder ELSE NULL END,
          p_motif, v_h.request_item_id)
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END $$;

GRANT EXECUTE ON FUNCTION public.initiate_holding_transfer(uuid, integer, public.pdr_transfer_destination, uuid, text) TO authenticated;

-- ============ RPC 2 : confirmer ============
CREATE OR REPLACE FUNCTION public.confirm_holding_transfer(p_transfer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_t public.pdr_holding_transfers; v_pdr public.pdr; v_avant int; v_apres int; v_existing uuid;
BEGIN
  SELECT * INTO v_t FROM public.pdr_holding_transfers WHERE id=p_transfer_id FOR UPDATE;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_t.statut <> 'en_attente' THEN RAISE EXCEPTION 'Transfert déjà traité'; END IF;

  IF v_t.destination = 'maintainer' THEN
    IF v_t.to_holder <> auth.uid() AND NOT has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'Seul le destinataire peut confirmer la réception';
    END IF;
    SELECT id INTO v_existing FROM public.pdr_maintenance_holdings
      WHERE holder_id=v_t.to_holder AND pdr_id=v_t.pdr_id AND statut='en_main'
        AND request_item_id IS NOT DISTINCT FROM v_t.request_item_id
      LIMIT 1;
    IF v_existing IS NOT NULL THEN
      UPDATE public.pdr_maintenance_holdings SET quantite = quantite + v_t.quantite WHERE id=v_existing;
    ELSE
      INSERT INTO public.pdr_maintenance_holdings(pdr_id, request_item_id, holder_id, quantite, statut)
      VALUES (v_t.pdr_id, v_t.request_item_id, v_t.to_holder, v_t.quantite, 'en_main');
    END IF;

  ELSE
    IF NOT (has_role(auth.uid(),'gestionnaire_magasin') OR has_role(auth.uid(),'responsable_magasin') OR has_role(auth.uid(),'admin')) THEN
      RAISE EXCEPTION 'Seul le magasin peut confirmer le retour';
    END IF;
    SELECT * INTO v_pdr FROM public.pdr WHERE id=v_t.pdr_id FOR UPDATE;
    v_avant := v_pdr.stock_actuel; v_apres := v_avant + v_t.quantite;
    PERFORM set_config('app.pdr_flow','on', true);
    UPDATE public.pdr SET stock_actuel = v_apres WHERE id=v_t.pdr_id;
    INSERT INTO public.pdr_stock_movements(pdr_id, type, quantite, stock_avant, stock_apres,
      prix_unitaire, source_type, source_id, motif, user_id, applied, validation_status)
    VALUES (v_t.pdr_id, 'entree', v_t.quantite, v_avant, v_apres, v_pdr.pmp,
      'pdr_request', v_t.id, 'Retour stock maintenance au magasin', auth.uid(), true, 'applied');
  END IF;

  UPDATE public.pdr_holding_transfers
    SET statut='confirme', confirmed_by=auth.uid(), confirmed_at=now()
  WHERE id=p_transfer_id;
END $$;

GRANT EXECUTE ON FUNCTION public.confirm_holding_transfer(uuid) TO authenticated;

-- ============ RPC 3 : annuler / refuser ============
CREATE OR REPLACE FUNCTION public.cancel_holding_transfer(p_transfer_id uuid, p_raison text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_t public.pdr_holding_transfers; v_existing uuid; v_new_status public.pdr_transfer_status;
BEGIN
  SELECT * INTO v_t FROM public.pdr_holding_transfers WHERE id=p_transfer_id FOR UPDATE;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_t.statut <> 'en_attente' THEN RAISE EXCEPTION 'Transfert déjà traité'; END IF;

  IF v_t.from_holder = auth.uid() OR has_role(auth.uid(),'admin') THEN
    v_new_status := 'annule';
  ELSIF v_t.destination='maintainer' AND v_t.to_holder = auth.uid() THEN
    v_new_status := 'refuse';
  ELSIF v_t.destination='magasin' AND (has_role(auth.uid(),'gestionnaire_magasin') OR has_role(auth.uid(),'responsable_magasin')) THEN
    v_new_status := 'refuse';
  ELSE
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT id INTO v_existing FROM public.pdr_maintenance_holdings
    WHERE holder_id=v_t.from_holder AND pdr_id=v_t.pdr_id AND statut='en_main'
      AND request_item_id IS NOT DISTINCT FROM v_t.request_item_id
    LIMIT 1;
  IF v_existing IS NOT NULL THEN
    UPDATE public.pdr_maintenance_holdings SET quantite = quantite + v_t.quantite WHERE id=v_existing;
  ELSE
    INSERT INTO public.pdr_maintenance_holdings(pdr_id, request_item_id, holder_id, quantite, statut)
    VALUES (v_t.pdr_id, v_t.request_item_id, v_t.from_holder, v_t.quantite, 'en_main');
  END IF;

  UPDATE public.pdr_holding_transfers
    SET statut=v_new_status, motif=COALESCE(p_raison, motif), confirmed_by=auth.uid(), confirmed_at=now()
  WHERE id=p_transfer_id;
END $$;

GRANT EXECUTE ON FUNCTION public.cancel_holding_transfer(uuid, text) TO authenticated;