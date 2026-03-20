
-- Enums
CREATE TYPE public.approvisionnement_type AS ENUM ('local', 'importation', 'mixte');
CREATE TYPE public.statut_pdr AS ENUM ('strategique', 'commune');
CREATE TYPE public.mouvement_type AS ENUM ('entree', 'sortie', 'correction', 'inventaire');

-- PDR Families
CREATE TABLE public.pdr_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  parent_id uuid REFERENCES public.pdr_families(id),
  approvisionnement public.approvisionnement_type NOT NULL DEFAULT 'local',
  statut_default public.statut_pdr NOT NULL DEFAULT 'commune',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdr_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PDR families viewable by authenticated" ON public.pdr_families FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/maintenance/magasin can manage pdr_families" ON public.pdr_families FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'resp_maintenance') OR has_role(auth.uid(), 'gestionnaire_magasin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'resp_maintenance') OR has_role(auth.uid(), 'gestionnaire_magasin'));

CREATE TRIGGER update_pdr_families_updated_at BEFORE UPDATE ON public.pdr_families
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Alter PDR table
ALTER TABLE public.pdr
  ADD COLUMN family_id uuid REFERENCES public.pdr_families(id),
  ADD COLUMN statut_pdr public.statut_pdr NOT NULL DEFAULT 'commune',
  ADD COLUMN approvisionnement public.approvisionnement_type NOT NULL DEFAULT 'local',
  ADD COLUMN stock_max integer NOT NULL DEFAULT 0,
  ADD COLUMN stock_securite integer NOT NULL DEFAULT 0,
  ADD COLUMN point_commande integer NOT NULL DEFAULT 0,
  ADD COLUMN delai_approvisionnement integer NOT NULL DEFAULT 0,
  ADD COLUMN pmp numeric NOT NULL DEFAULT 0,
  ADD COLUMN devise text NOT NULL DEFAULT 'DA';

-- PDR Suppliers
CREATE TABLE public.pdr_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdr_id uuid NOT NULL REFERENCES public.pdr(id) ON DELETE CASCADE,
  nom text NOT NULL,
  reference_fournisseur text DEFAULT '',
  prix numeric DEFAULT 0,
  delai_jours integer DEFAULT 0,
  is_principal boolean NOT NULL DEFAULT false,
  contact text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdr_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PDR suppliers viewable by authenticated" ON public.pdr_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/maintenance/magasin can manage pdr_suppliers" ON public.pdr_suppliers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'resp_maintenance') OR has_role(auth.uid(), 'gestionnaire_magasin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'resp_maintenance') OR has_role(auth.uid(), 'gestionnaire_magasin'));

-- PDR Stock Movements
CREATE TABLE public.pdr_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdr_id uuid NOT NULL REFERENCES public.pdr(id) ON DELETE CASCADE,
  type public.mouvement_type NOT NULL,
  quantite integer NOT NULL,
  stock_avant integer NOT NULL DEFAULT 0,
  stock_apres integer NOT NULL DEFAULT 0,
  prix_unitaire numeric DEFAULT 0,
  reference_source text DEFAULT '',
  source_type text DEFAULT '',
  source_id uuid,
  motif text DEFAULT '',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdr_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stock movements viewable by authenticated" ON public.pdr_stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stock movements" ON public.pdr_stock_movements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
