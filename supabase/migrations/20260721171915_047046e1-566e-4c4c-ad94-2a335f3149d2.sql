
CREATE SEQUENCE IF NOT EXISTS public.reception_ticket_seq;
CREATE SEQUENCE IF NOT EXISTS public.reception_weighing_seq;

CREATE OR REPLACE FUNCTION public.next_reception_ticket_no()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'RQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.reception_ticket_seq')::text, 4, '0');
$$;

CREATE OR REPLACE FUNCTION public.next_reception_weighing_no()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'PB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.reception_weighing_seq')::text, 4, '0');
$$;

CREATE TABLE public.reception_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  designation text NOT NULL,
  description text,
  normes text[] NOT NULL DEFAULT '{}',
  calibres text[] NOT NULL DEFAULT '{}',
  varietes text[] NOT NULL DEFAULT '{}',
  caracteristiques jsonb NOT NULL DEFAULT '{}'::jsonb,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_products TO authenticated;
GRANT ALL ON public.reception_products TO service_role;
ALTER TABLE public.reception_products ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reception_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  nom text NOT NULL,
  region text, wilaya text, contact text, telephone text, adresse text, notes text,
  agree boolean NOT NULL DEFAULT true,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_suppliers TO authenticated;
GRANT ALL ON public.reception_suppliers TO service_role;
ALTER TABLE public.reception_suppliers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reception_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  libelle text NOT NULL,
  product_id uuid NOT NULL REFERENCES public.reception_products(id) ON DELETE RESTRICT,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  objectif_kg numeric(14,2),
  kpi_targets jsonb NOT NULL DEFAULT '{}'::jsonb,
  actif boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT reception_campaigns_dates_ck CHECK (date_fin >= date_debut)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_campaigns TO authenticated;
GRANT ALL ON public.reception_campaigns TO service_role;
ALTER TABLE public.reception_campaigns ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX reception_campaigns_only_one_default
  ON public.reception_campaigns((1)) WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.reception_campaigns_enforce_default()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.reception_campaigns SET is_default=false, updated_at=now()
      WHERE is_default=true AND id <> NEW.id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER reception_campaigns_default_trg
BEFORE INSERT OR UPDATE OF is_default ON public.reception_campaigns
FOR EACH ROW WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.reception_campaigns_enforce_default();

CREATE TABLE public.reception_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE DEFAULT public.next_reception_ticket_no(),
  campaign_id uuid NOT NULL REFERENCES public.reception_campaigns(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.reception_products(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES public.reception_suppliers(id) ON DELETE RESTRICT,
  date_ticket date NOT NULL DEFAULT current_date,
  heure_debut time, heure_fin time,
  taux_abattement numeric(5,2) NOT NULL DEFAULT 0 CHECK (taux_abattement >= 0 AND taux_abattement <= 100),
  commentaire text,
  statut text NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert','cloture')),
  cloture_at timestamptz, cloture_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_tickets TO authenticated;
GRANT ALL ON public.reception_tickets TO service_role;
ALTER TABLE public.reception_tickets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reception_tickets_derive_product()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  SELECT product_id INTO NEW.product_id FROM public.reception_campaigns WHERE id = NEW.campaign_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER reception_tickets_derive_product_trg
BEFORE INSERT OR UPDATE OF campaign_id ON public.reception_tickets
FOR EACH ROW EXECUTE FUNCTION public.reception_tickets_derive_product();

CREATE OR REPLACE FUNCTION public.reception_tickets_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.statut = 'cloture' THEN
    RAISE EXCEPTION 'Ticket clôturé — suppression interdite'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.statut = 'cloture' THEN
    RAISE EXCEPTION 'Ticket clôturé — modification interdite'; END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER reception_tickets_lock_trg
BEFORE UPDATE OR DELETE ON public.reception_tickets
FOR EACH ROW EXECUTE FUNCTION public.reception_tickets_lock();

CREATE TABLE public.reception_ticket_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.reception_tickets(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot IN (1,2,3)),
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_ticket_photos TO authenticated;
GRANT ALL ON public.reception_ticket_photos TO service_role;
ALTER TABLE public.reception_ticket_photos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reception_photos_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE s text;
BEGIN
  SELECT statut INTO s FROM public.reception_tickets WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id);
  IF s = 'cloture' THEN RAISE EXCEPTION 'Ticket clôturé — photos verrouillées'; END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER reception_photos_lock_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.reception_ticket_photos
FOR EACH ROW EXECUTE FUNCTION public.reception_photos_lock();

CREATE TABLE public.reception_weighings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES public.reception_tickets(id) ON DELETE RESTRICT,
  code_pesee text NOT NULL UNIQUE DEFAULT public.next_reception_weighing_no(),
  poids_brut_kg numeric(12,2) NOT NULL CHECK (poids_brut_kg > 0),
  taux_abattement_snapshot numeric(5,2) NOT NULL,
  poids_abattement_kg numeric(14,4) GENERATED ALWAYS AS (poids_brut_kg * taux_abattement_snapshot / 100) STORED,
  poids_net_kg numeric(14,4) GENERATED ALWAYS AS (poids_brut_kg - (poids_brut_kg * taux_abattement_snapshot / 100)) STORED,
  weighed_by uuid REFERENCES auth.users(id),
  weighed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_weighings TO authenticated;
GRANT ALL ON public.reception_weighings TO service_role;
ALTER TABLE public.reception_weighings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reception_weighings_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.reception_tickets WHERE id = NEW.ticket_id AND statut = 'cloture') THEN
    RAISE EXCEPTION 'Le ticket doit être clôturé avant la pesée';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER reception_weighings_ins_trg
BEFORE INSERT ON public.reception_weighings
FOR EACH ROW EXECUTE FUNCTION public.reception_weighings_before_insert();

CREATE OR REPLACE FUNCTION public.reception_weighings_lock_upd()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Pesée verrouillée — modification interdite'; END; $$;
CREATE TRIGGER reception_weighings_upd_trg
BEFORE UPDATE OR DELETE ON public.reception_weighings
FOR EACH ROW EXECUTE FUNCTION public.reception_weighings_lock_upd();

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['reception_products','reception_suppliers','reception_campaigns','reception_tickets']
  LOOP
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.close_reception_ticket(_ticket_id uuid)
RETURNS public.reception_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.reception_tickets; n_photos int;
BEGIN
  SELECT * INTO t FROM public.reception_tickets WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket introuvable'; END IF;
  IF t.statut = 'cloture' THEN RAISE EXCEPTION 'Ticket déjà clôturé'; END IF;
  IF t.supplier_id IS NULL OR t.campaign_id IS NULL
     OR t.heure_debut IS NULL OR t.heure_fin IS NULL
     OR t.taux_abattement IS NULL THEN
    RAISE EXCEPTION 'Champs obligatoires manquants';
  END IF;
  SELECT count(*) INTO n_photos FROM public.reception_ticket_photos WHERE ticket_id = _ticket_id;
  IF n_photos < 3 THEN RAISE EXCEPTION 'Les 3 photos sont obligatoires'; END IF;
  UPDATE public.reception_tickets
    SET statut='cloture', cloture_at=now(), cloture_by=auth.uid()
    WHERE id = _ticket_id RETURNING * INTO t;
  RETURN t;
END; $$;
REVOKE ALL ON FUNCTION public.close_reception_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_reception_ticket(uuid) TO authenticated;

CREATE OR REPLACE VIEW public.v_reception_global AS
SELECT
  t.id, t.numero, t.date_ticket, t.heure_debut, t.heure_fin,
  t.taux_abattement, t.commentaire, t.statut, t.cloture_at,
  c.id AS campaign_id, c.libelle AS campagne, c.objectif_kg,
  p.id AS product_id, p.designation AS produit, p.code AS produit_code,
  s.id AS supplier_id, s.nom AS fournisseur, s.region, s.wilaya,
  w.id AS weighing_id, w.code_pesee, w.poids_brut_kg, w.poids_abattement_kg, w.poids_net_kg, w.weighed_at,
  (CASE
    WHEN t.heure_debut IS NULL OR t.heure_fin IS NULL THEN NULL
    WHEN t.heure_fin >= t.heure_debut THEN EXTRACT(EPOCH FROM (t.heure_fin - t.heure_debut))/60
    ELSE EXTRACT(EPOCH FROM ((t.heure_fin + INTERVAL '24 hours') - t.heure_debut))/60
   END)::int AS duree_minutes,
  (CASE WHEN w.id IS NOT NULL THEN 'pese' ELSE 'a_peser' END) AS etat_pesee,
  (SELECT count(*) FROM public.reception_ticket_photos rp WHERE rp.ticket_id = t.id) AS nb_photos
FROM public.reception_tickets t
JOIN public.reception_campaigns c ON c.id = t.campaign_id
JOIN public.reception_products p ON p.id = t.product_id
JOIN public.reception_suppliers s ON s.id = t.supplier_id
LEFT JOIN public.reception_weighings w ON w.ticket_id = t.id;
GRANT SELECT ON public.v_reception_global TO authenticated;
GRANT SELECT ON public.v_reception_global TO service_role;

CREATE POLICY reception_products_read ON public.reception_products FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite') OR has_role(auth.uid(),'agent_pont_bascule')
  OR has_role(auth.uid(),'auditeur'));
CREATE POLICY reception_products_write ON public.reception_products FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite'));

CREATE POLICY reception_suppliers_read ON public.reception_suppliers FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite') OR has_role(auth.uid(),'agent_pont_bascule')
  OR has_role(auth.uid(),'auditeur'));
CREATE POLICY reception_suppliers_write ON public.reception_suppliers FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite'));

CREATE POLICY reception_campaigns_read ON public.reception_campaigns FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite') OR has_role(auth.uid(),'agent_pont_bascule')
  OR has_role(auth.uid(),'auditeur'));
CREATE POLICY reception_campaigns_write ON public.reception_campaigns FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite'));

CREATE POLICY reception_tickets_read ON public.reception_tickets FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite') OR has_role(auth.uid(),'agent_pont_bascule')
  OR has_role(auth.uid(),'auditeur'));
CREATE POLICY reception_tickets_ins ON public.reception_tickets FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite'));
CREATE POLICY reception_tickets_upd ON public.reception_tickets FOR UPDATE TO authenticated
USING (statut = 'ouvert' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite')));

CREATE POLICY reception_photos_read ON public.reception_ticket_photos FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite') OR has_role(auth.uid(),'agent_pont_bascule')
  OR has_role(auth.uid(),'auditeur'));
CREATE POLICY reception_photos_write ON public.reception_ticket_photos FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite'));

CREATE POLICY reception_weighings_read ON public.reception_weighings FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite') OR has_role(auth.uid(),'agent_pont_bascule')
  OR has_role(auth.uid(),'auditeur'));
CREATE POLICY reception_weighings_ins ON public.reception_weighings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'agent_pont_bascule'));

CREATE POLICY "reception photos read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'reception-photos');

CREATE POLICY "reception photos upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reception-photos' AND (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite')
));

CREATE POLICY "reception photos delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'reception-photos' AND (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
  OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')
  OR has_role(auth.uid(),'controleur_qualite')
));
