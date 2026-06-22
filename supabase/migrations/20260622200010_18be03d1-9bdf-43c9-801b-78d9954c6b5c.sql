
-- ============ 1. Reserve column on pdr ============
ALTER TABLE public.pdr ADD COLUMN IF NOT EXISTS stock_reserve integer NOT NULL DEFAULT 0;

-- ============ 2. Enums ============
DO $$ BEGIN
  CREATE TYPE public.pdr_request_type AS ENUM ('curative','preventive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pdr_request_status AS ENUM ('demandee','prete','partielle','prise','refusee','annulee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pdr_request_item_status AS ENUM ('demandee','prete','prise','refusee','annulee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pdr_holding_status AS ENUM ('en_main','consomme','retourne');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ 3. Tables ============
CREATE TABLE public.pdr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  type public.pdr_request_type NOT NULL DEFAULT 'curative',
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  preventive_plan_id uuid REFERENCES public.preventive_plans(id) ON DELETE SET NULL,
  intervention_id uuid REFERENCES public.interventions(id) ON DELETE SET NULL,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  ligne_id uuid REFERENCES public.production_lines(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  priorite text NOT NULL DEFAULT 'normale',
  statut public.pdr_request_status NOT NULL DEFAULT 'demandee',
  commentaire text,
  refused_reason text,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pdr_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.pdr_requests(id) ON DELETE CASCADE,
  pdr_id uuid NOT NULL REFERENCES public.pdr(id) ON DELETE RESTRICT,
  quantite_demandee integer NOT NULL CHECK (quantite_demandee > 0),
  quantite_preparee integer,
  quantite_prise integer,
  statut public.pdr_request_item_status NOT NULL DEFAULT 'demandee',
  dispo_snapshot boolean,
  position_id uuid,
  cause_remplacement text,
  commentaire text,
  refused_reason text,
  prepared_by uuid,
  prepared_at timestamptz,
  taken_by uuid,
  taken_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pdr_maintenance_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdr_id uuid NOT NULL REFERENCES public.pdr(id) ON DELETE RESTRICT,
  request_item_id uuid REFERENCES public.pdr_request_items(id) ON DELETE SET NULL,
  holder_id uuid NOT NULL,
  quantite integer NOT NULL CHECK (quantite > 0),
  statut public.pdr_holding_status NOT NULL DEFAULT 'en_main',
  intervention_id uuid REFERENCES public.interventions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdr_requests_statut ON public.pdr_requests(statut);
CREATE INDEX idx_pdr_requests_ticket ON public.pdr_requests(ticket_id);
CREATE INDEX idx_pdr_request_items_request ON public.pdr_request_items(request_id);
CREATE INDEX idx_pdr_request_items_statut ON public.pdr_request_items(statut);
CREATE INDEX idx_pdr_holdings_holder ON public.pdr_maintenance_holdings(holder_id);
CREATE INDEX idx_pdr_holdings_statut ON public.pdr_maintenance_holdings(statut);

-- ============ 4. GRANTs ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdr_requests TO authenticated;
GRANT ALL ON public.pdr_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdr_request_items TO authenticated;
GRANT ALL ON public.pdr_request_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdr_maintenance_holdings TO authenticated;
GRANT ALL ON public.pdr_maintenance_holdings TO service_role;

-- ============ 5. RLS ============
ALTER TABLE public.pdr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdr_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdr_maintenance_holdings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "read pdr_requests" ON public.pdr_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "read pdr_request_items" ON public.pdr_request_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "read pdr_holdings" ON public.pdr_maintenance_holdings FOR SELECT TO authenticated USING (true);

-- Maintenance/admin can create requests + items
CREATE POLICY "maintenance create pdr_requests" ON public.pdr_requests FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'maintenancier') OR has_role(auth.uid(),'resp_maintenance') OR has_role(auth.uid(),'admin')
  );
CREATE POLICY "maintenance update own pdr_requests" ON public.pdr_requests FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'maintenancier') OR has_role(auth.uid(),'resp_maintenance')
    OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestionnaire_magasin')
  );
CREATE POLICY "maintenance create pdr_request_items" ON public.pdr_request_items FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'maintenancier') OR has_role(auth.uid(),'resp_maintenance') OR has_role(auth.uid(),'admin')
  );
CREATE POLICY "maintenance update pdr_request_items" ON public.pdr_request_items FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'maintenancier') OR has_role(auth.uid(),'resp_maintenance')
    OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestionnaire_magasin')
  );
CREATE POLICY "admin manage holdings" ON public.pdr_maintenance_holdings FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'maintenancier') OR has_role(auth.uid(),'resp_maintenance') OR has_role(auth.uid(),'admin')
  )
  WITH CHECK (
    has_role(auth.uid(),'maintenancier') OR has_role(auth.uid(),'resp_maintenance') OR has_role(auth.uid(),'admin')
  );

-- ============ 6. updated_at triggers ============
CREATE TRIGGER trg_pdr_requests_updated BEFORE UPDATE ON public.pdr_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pdr_request_items_updated BEFORE UPDATE ON public.pdr_request_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pdr_holdings_updated BEFORE UPDATE ON public.pdr_maintenance_holdings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 7. Numbering ============
CREATE OR REPLACE FUNCTION public.generate_pdr_request_numero()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num integer;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 5) AS integer)), 0) + 1 INTO next_num
    FROM public.pdr_requests WHERE numero ~ '^DPR-[0-9]+$';
    NEW.numero := 'DPR-' || LPAD(next_num::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pdr_request_numero BEFORE INSERT ON public.pdr_requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_pdr_request_numero();

-- ============ 8. Reservation trigger on items ============
CREATE OR REPLACE FUNCTION public.pdr_request_item_reserve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pdr SET stock_reserve = stock_reserve + NEW.quantite_demandee WHERE id = NEW.pdr_id;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.statut IN ('demandee','prete') THEN
      UPDATE public.pdr SET stock_reserve = GREATEST(0, stock_reserve - OLD.quantite_demandee) WHERE id = OLD.pdr_id;
    END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_pdr_item_reserve AFTER INSERT OR DELETE ON public.pdr_request_items
  FOR EACH ROW EXECUTE FUNCTION public.pdr_request_item_reserve();

-- ============ 9. Request status aggregation ============
CREATE OR REPLACE FUNCTION public.pdr_request_recalc_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_req uuid := COALESCE(NEW.request_id, OLD.request_id);
  v_total int; v_active int; v_prete int; v_prise int; v_new public.pdr_request_status;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE statut NOT IN ('refusee','annulee')),
         count(*) FILTER (WHERE statut = 'prete'),
         count(*) FILTER (WHERE statut = 'prise')
    INTO v_total, v_active, v_prete, v_prise
  FROM public.pdr_request_items WHERE request_id = v_req;

  IF v_active = 0 THEN
    v_new := 'annulee';
  ELSIF v_prise = v_active THEN
    v_new := 'prise';
  ELSIF v_prise > 0 OR (v_prete > 0 AND v_prete < v_active) THEN
    v_new := 'partielle';
  ELSIF v_prete = v_active THEN
    v_new := 'prete';
  ELSE
    v_new := 'demandee';
  END IF;

  UPDATE public.pdr_requests SET statut = v_new WHERE id = v_req AND statut <> 'refusee';
  RETURN NULL;
END $$;
CREATE TRIGGER trg_pdr_request_recalc AFTER INSERT OR UPDATE OF statut ON public.pdr_request_items
  FOR EACH ROW EXECUTE FUNCTION public.pdr_request_recalc_status();

-- ============ 10. Audit helper (internal) ============
CREATE OR REPLACE FUNCTION public.pdr_request_audit(
  p_action text, p_record_id uuid, p_label text, p_old jsonb, p_new jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.audit_logs(action, table_name, record_id, action_type, module,
    entity_type, entity_id, entity_label, action_label, old_values, new_values, user_id)
  VALUES (p_action, 'pdr_request_items', p_record_id, p_action, 'pdr',
    'pdr_request_item', p_record_id, p_label, p_label, p_old, p_new, auth.uid());
END $$;

-- ============ 11. set_request_item_ready (magasin) ============
CREATE OR REPLACE FUNCTION public.set_request_item_ready(
  p_item_id uuid, p_qte integer DEFAULT NULL, p_comment text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_item public.pdr_request_items; v_qte int; v_req public.pdr_requests; v_pdr_ref text;
BEGIN
  IF NOT (has_role(auth.uid(),'gestionnaire_magasin') OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Permission refusée: réservé au magasin';
  END IF;
  SELECT * INTO v_item FROM public.pdr_request_items WHERE id = p_item_id FOR UPDATE;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Ligne introuvable'; END IF;
  IF v_item.statut <> 'demandee' THEN RAISE EXCEPTION 'Ligne non modifiable (statut %)', v_item.statut; END IF;
  v_qte := COALESCE(p_qte, v_item.quantite_demandee);
  IF v_qte <= 0 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;

  UPDATE public.pdr_request_items
    SET statut='prete', quantite_preparee=v_qte, prepared_by=auth.uid(), prepared_at=now(),
        commentaire=COALESCE(p_comment, commentaire)
  WHERE id=p_item_id;

  SELECT * INTO v_req FROM public.pdr_requests WHERE id=v_item.request_id;
  SELECT reference INTO v_pdr_ref FROM public.pdr WHERE id=v_item.pdr_id;
  PERFORM public.pdr_request_audit('update', p_item_id, 'Pièce préparée '||COALESCE(v_pdr_ref,''),
    jsonb_build_object('statut','demandee'), jsonb_build_object('statut','prete','quantite_preparee',v_qte));

  INSERT INTO public.notifications(title, message, notification_type, module, severity, status, source, is_critical,
    entity_type, entity_id, entity_label, recipient_user_id, action_url)
  VALUES ('Pièce prête à prendre',
    'La pièce '||COALESCE(v_pdr_ref,'')||' de la demande '||v_req.numero||' est prête.',
    'pdr_request_ready','pdr','info','unread','app',false,
    'pdr_request', v_req.id, v_req.numero, v_req.requested_by, '/maintenance/shift');
END $$;

-- ============ 12. refuse_request_item (magasin) ============
CREATE OR REPLACE FUNCTION public.refuse_request_item(
  p_item_id uuid, p_motif text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_item public.pdr_request_items; v_req public.pdr_requests; v_pdr_ref text;
BEGIN
  IF NOT (has_role(auth.uid(),'gestionnaire_magasin') OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Permission refusée: réservé au magasin';
  END IF;
  SELECT * INTO v_item FROM public.pdr_request_items WHERE id=p_item_id FOR UPDATE;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Ligne introuvable'; END IF;
  IF v_item.statut NOT IN ('demandee','prete') THEN RAISE EXCEPTION 'Ligne non refusable'; END IF;

  -- release reservation
  UPDATE public.pdr SET stock_reserve = GREATEST(0, stock_reserve - v_item.quantite_demandee) WHERE id=v_item.pdr_id;
  UPDATE public.pdr_request_items SET statut='refusee', refused_reason=p_motif WHERE id=p_item_id;

  SELECT * INTO v_req FROM public.pdr_requests WHERE id=v_item.request_id;
  SELECT reference INTO v_pdr_ref FROM public.pdr WHERE id=v_item.pdr_id;
  PERFORM public.pdr_request_audit('update', p_item_id, 'Pièce refusée '||COALESCE(v_pdr_ref,''),
    jsonb_build_object('statut',v_item.statut), jsonb_build_object('statut','refusee','motif',p_motif));

  INSERT INTO public.notifications(title, message, notification_type, module, severity, status, source, is_critical,
    entity_type, entity_id, entity_label, recipient_user_id, action_url)
  VALUES ('Demande de pièce refusée',
    'La pièce '||COALESCE(v_pdr_ref,'')||' ('||v_req.numero||') a été refusée : '||COALESCE(p_motif,'—'),
    'pdr_request_refused','pdr','high','unread','app',false,
    'pdr_request', v_req.id, v_req.numero, v_req.requested_by, '/maintenance/shift');
END $$;

-- ============ 13. confirm_request_item_taken (maintenance) ============
CREATE OR REPLACE FUNCTION public.confirm_request_item_taken(
  p_item_id uuid, p_qte integer DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_item public.pdr_request_items; v_req public.pdr_requests; v_pdr public.pdr;
  v_qte int; v_avant int; v_apres int; v_holding uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'maintenancier') OR has_role(auth.uid(),'resp_maintenance') OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Permission refusée: réservé à la maintenance';
  END IF;
  SELECT * INTO v_item FROM public.pdr_request_items WHERE id=p_item_id FOR UPDATE;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Ligne introuvable'; END IF;
  IF v_item.statut <> 'prete' THEN RAISE EXCEPTION 'La pièce doit être prête avant la prise'; END IF;
  v_qte := COALESCE(p_qte, v_item.quantite_preparee, v_item.quantite_demandee);
  IF v_qte <= 0 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;

  SELECT * INTO v_pdr FROM public.pdr WHERE id=v_item.pdr_id FOR UPDATE;
  v_avant := v_pdr.stock_actuel;
  v_apres := GREATEST(0, v_avant - v_qte);

  -- release reservation (full requested qty) + decrement actual stock
  UPDATE public.pdr
    SET stock_reserve = GREATEST(0, stock_reserve - v_item.quantite_demandee),
        stock_actuel = v_apres
  WHERE id=v_item.pdr_id;

  SELECT * INTO v_req FROM public.pdr_requests WHERE id=v_item.request_id;

  -- consumption movement
  INSERT INTO public.pdr_stock_movements(pdr_id, type, quantite, stock_avant, stock_apres,
    prix_unitaire, source_type, source_id, motif, user_id, applied, validation_status)
  VALUES (v_item.pdr_id, 'sortie', v_qte, v_avant, v_apres, v_pdr.pmp,
    'pdr_request', v_req.id, 'Prise pièce demande '||v_req.numero, auth.uid(), true, 'applied');

  -- maintenance holding
  INSERT INTO public.pdr_maintenance_holdings(pdr_id, request_item_id, holder_id, quantite, statut, intervention_id)
  VALUES (v_item.pdr_id, p_item_id, auth.uid(), v_qte, 'en_main', v_req.intervention_id)
  RETURNING id INTO v_holding;

  UPDATE public.pdr_request_items
    SET statut='prise', quantite_prise=v_qte, taken_by=auth.uid(), taken_at=now()
  WHERE id=p_item_id;

  PERFORM public.pdr_request_audit('update', p_item_id, 'Pièce prise '||COALESCE(v_pdr.reference,''),
    jsonb_build_object('statut','prete','stock_actuel',v_avant),
    jsonb_build_object('statut','prise','quantite_prise',v_qte,'stock_actuel',v_apres));

  INSERT INTO public.notifications(title, message, notification_type, module, severity, status, source, is_critical,
    entity_type, entity_id, entity_label, recipient_role, action_url)
  VALUES ('Pièce remise à la maintenance',
    'La pièce '||COALESCE(v_pdr.reference,'')||' ('||v_req.numero||') a été prise par la maintenance.',
    'pdr_request_taken','pdr','info','unread','app',false,
    'pdr_request', v_req.id, v_req.numero, 'gestionnaire_magasin', '/pdr/demandes');

  RETURN v_holding;
END $$;

-- ============ 14. cancel_pdr_request (requester) ============
CREATE OR REPLACE FUNCTION public.cancel_pdr_request(
  p_request_id uuid, p_motif text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_req public.pdr_requests; r record;
BEGIN
  SELECT * INTO v_req FROM public.pdr_requests WHERE id=p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF NOT (v_req.requested_by = auth.uid() OR has_role(auth.uid(),'resp_maintenance') OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;
  FOR r IN SELECT * FROM public.pdr_request_items WHERE request_id=p_request_id AND statut IN ('demandee','prete') LOOP
    UPDATE public.pdr SET stock_reserve = GREATEST(0, stock_reserve - r.quantite_demandee) WHERE id=r.pdr_id;
    UPDATE public.pdr_request_items SET statut='annulee', refused_reason=COALESCE(p_motif,'Annulée') WHERE id=r.id;
  END LOOP;
  UPDATE public.pdr_requests SET statut='annulee', refused_reason=p_motif, updated_by=auth.uid() WHERE id=p_request_id;
  PERFORM public.pdr_request_audit('update', p_request_id, 'Demande annulée '||v_req.numero,
    jsonb_build_object('statut',v_req.statut), jsonb_build_object('statut','annulee','motif',p_motif));
END $$;

-- ============ 15. consume_maintenance_holding (closure) ============
CREATE OR REPLACE FUNCTION public.consume_maintenance_holding(
  p_holding_id uuid, p_intervention_id uuid, p_qte_consomme integer,
  p_position_id uuid DEFAULT NULL, p_cause text DEFAULT NULL, p_commentaire text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_h public.pdr_maintenance_holdings; v_leftover int; v_pdr public.pdr; v_avant int; v_apres int;
BEGIN
  IF NOT (has_role(auth.uid(),'maintenancier') OR has_role(auth.uid(),'resp_maintenance') OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;
  SELECT * INTO v_h FROM public.pdr_maintenance_holdings WHERE id=p_holding_id FOR UPDATE;
  IF v_h.id IS NULL THEN RAISE EXCEPTION 'Stock maintenance introuvable'; END IF;
  IF v_h.statut <> 'en_main' THEN RAISE EXCEPTION 'Déjà traité'; END IF;
  IF p_qte_consomme < 0 OR p_qte_consomme > v_h.quantite THEN RAISE EXCEPTION 'Quantité consommée invalide'; END IF;

  IF p_qte_consomme > 0 THEN
    INSERT INTO public.intervention_pdr(intervention_id, pdr_id, quantite, position_id, cause_remplacement, commentaire_technique)
    VALUES (p_intervention_id, v_h.pdr_id, p_qte_consomme, p_position_id, p_cause, p_commentaire);
  END IF;

  v_leftover := v_h.quantite - p_qte_consomme;
  IF v_leftover > 0 THEN
    SELECT * INTO v_pdr FROM public.pdr WHERE id=v_h.pdr_id FOR UPDATE;
    v_avant := v_pdr.stock_actuel; v_apres := v_avant + v_leftover;
    UPDATE public.pdr SET stock_actuel = v_apres WHERE id=v_h.pdr_id;
    INSERT INTO public.pdr_stock_movements(pdr_id, type, quantite, stock_avant, stock_apres,
      prix_unitaire, source_type, source_id, motif, user_id, applied, validation_status)
    VALUES (v_h.pdr_id, 'entree', v_leftover, v_avant, v_apres, v_pdr.pmp,
      'pdr_request', v_h.request_item_id, 'Retour reliquat stock maintenance', auth.uid(), true, 'applied');
  END IF;

  UPDATE public.pdr_maintenance_holdings
    SET statut='consomme', intervention_id=p_intervention_id, quantite=GREATEST(p_qte_consomme,0)
  WHERE id=p_holding_id;
END $$;

-- ============ 16. function grants ============
REVOKE EXECUTE ON FUNCTION public.set_request_item_ready(uuid,integer,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.refuse_request_item(uuid,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.confirm_request_item_taken(uuid,integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cancel_pdr_request(uuid,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.consume_maintenance_holding(uuid,uuid,integer,uuid,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_request_item_ready(uuid,integer,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refuse_request_item(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_request_item_taken(uuid,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_pdr_request(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_maintenance_holding(uuid,uuid,integer,uuid,text,text) TO authenticated, service_role;
