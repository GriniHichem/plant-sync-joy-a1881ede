
-- =============================================
-- PHASE 2 - MODULE GPAO
-- =============================================

-- Enum statut OF
DO $$ BEGIN
  CREATE TYPE public.of_statut AS ENUM ('planifie', 'en_cours', 'termine', 'annule');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum statut shift
DO $$ BEGIN
  CREATE TYPE public.shift_type AS ENUM ('matin', 'apres_midi', 'nuit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum type arrêt production
DO $$ BEGIN
  CREATE TYPE public.arret_type AS ENUM ('panne', 'changement_serie', 'pause', 'nettoyage', 'attente_matiere', 'qualite', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- TABLES GPAO
-- =============================================

-- Lignes de production
CREATE TABLE IF NOT EXISTS public.production_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  designation TEXT NOT NULL,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lines viewable by authenticated" ON public.production_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/prod can manage lines" ON public.production_lines FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production'));

CREATE TRIGGER update_production_lines_updated_at
  BEFORE UPDATE ON public.production_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Produits finis
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  designation TEXT NOT NULL,
  unite TEXT NOT NULL DEFAULT 'kg',
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products viewable by authenticated" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/prod can manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production'));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Articles / matières premières
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  designation TEXT NOT NULL,
  unite TEXT NOT NULL DEFAULT 'kg',
  stock_actuel NUMERIC(12,3) NOT NULL DEFAULT 0,
  stock_min NUMERIC(12,3) NOT NULL DEFAULT 0,
  prix_unitaire NUMERIC(12,2) DEFAULT 0,
  fournisseur TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Articles viewable by authenticated" ON public.articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/prod/magasin can manage articles" ON public.articles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production') OR public.has_role(auth.uid(), 'gestionnaire_magasin'));

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recettes / Nomenclatures
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, version)
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipes viewable by authenticated" ON public.recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/prod can manage recipes" ON public.recipes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production'));

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lignes de recette (composants)
CREATE TABLE IF NOT EXISTS public.recipe_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL NOT NULL,
  quantite NUMERIC(12,3) NOT NULL DEFAULT 0,
  unite TEXT NOT NULL DEFAULT 'kg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipe lines viewable by authenticated" ON public.recipe_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/prod can manage recipe lines" ON public.recipe_lines FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production'));

-- Ordres de fabrication
CREATE TABLE IF NOT EXISTS public.ordres_fabrication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  line_id UUID REFERENCES public.production_lines(id) ON DELETE SET NULL,
  quantite_prevue NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantite_produite NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantite_rebut NUMERIC(12,3) NOT NULL DEFAULT 0,
  unite TEXT NOT NULL DEFAULT 'kg',
  statut of_statut NOT NULL DEFAULT 'planifie',
  date_debut_prevue DATE,
  date_fin_prevue DATE,
  date_debut_reelle TIMESTAMPTZ,
  date_fin_reelle TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ordres_fabrication ENABLE ROW LEVEL SECURITY;
CREATE POLICY "OFs viewable by authenticated" ON public.ordres_fabrication FOR SELECT TO authenticated USING (true);
CREATE POLICY "Prod can create OFs" ON public.ordres_fabrication FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production') OR public.has_role(auth.uid(), 'chef_ligne'));
CREATE POLICY "Prod can update OFs" ON public.ordres_fabrication FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production') OR public.has_role(auth.uid(), 'chef_ligne'));
CREATE POLICY "Admin can delete OFs" ON public.ordres_fabrication FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ofs_updated_at
  BEFORE UPDATE ON public.ordres_fabrication FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Numéro séquentiel OF
CREATE OR REPLACE FUNCTION public.generate_of_numero()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM public.ordres_fabrication;
  NEW.numero := 'OF-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_of_numero
  BEFORE INSERT ON public.ordres_fabrication
  FOR EACH ROW WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION public.generate_of_numero();

-- Shifts (postes de travail)
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  of_id UUID REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE NOT NULL,
  line_id UUID REFERENCES public.production_lines(id) ON DELETE SET NULL NOT NULL,
  shift_type shift_type NOT NULL,
  date_shift DATE NOT NULL,
  chef_ligne_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  heure_debut TIMESTAMPTZ NOT NULL,
  heure_fin TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shifts viewable by authenticated" ON public.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Prod can manage shifts" ON public.shifts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production') OR public.has_role(auth.uid(), 'chef_ligne'));

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Déclarations production horaire
CREATE TABLE IF NOT EXISTS public.production_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES public.shifts(id) ON DELETE CASCADE NOT NULL,
  of_id UUID REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE NOT NULL,
  heure_production TIMESTAMPTZ NOT NULL,
  quantite_produite NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantite_rebut NUMERIC(12,3) NOT NULL DEFAULT 0,
  declared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.production_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Declarations viewable by authenticated" ON public.production_declarations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Prod can manage declarations" ON public.production_declarations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production') OR public.has_role(auth.uid(), 'chef_ligne') OR public.has_role(auth.uid(), 'operateur'));
CREATE POLICY "Prod can update declarations" ON public.production_declarations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production') OR public.has_role(auth.uid(), 'chef_ligne'));

CREATE TRIGGER update_declarations_updated_at
  BEFORE UPDATE ON public.production_declarations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Consommations matières
CREATE TABLE IF NOT EXISTS public.consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  of_id UUID REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE NOT NULL,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL NOT NULL,
  quantite NUMERIC(12,3) NOT NULL DEFAULT 0,
  unite TEXT NOT NULL DEFAULT 'kg',
  declared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Consumptions viewable by authenticated" ON public.consumptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Prod can manage consumptions" ON public.consumptions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production') OR public.has_role(auth.uid(), 'chef_ligne') OR public.has_role(auth.uid(), 'operateur'));
CREATE POLICY "Prod can update consumptions" ON public.consumptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production'));

CREATE TRIGGER update_consumptions_updated_at
  BEFORE UPDATE ON public.consumptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Arrêts de production
CREATE TABLE IF NOT EXISTS public.production_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES public.shifts(id) ON DELETE CASCADE NOT NULL,
  of_id UUID REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE NOT NULL,
  line_id UUID REFERENCES public.production_lines(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  type arret_type NOT NULL DEFAULT 'autre',
  description TEXT DEFAULT '',
  heure_debut TIMESTAMPTZ NOT NULL DEFAULT now(),
  heure_fin TIMESTAMPTZ,
  duree_minutes INTEGER,
  declared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.production_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stops viewable by authenticated" ON public.production_stops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Prod can manage stops" ON public.production_stops FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_production') OR public.has_role(auth.uid(), 'chef_ligne'));

CREATE TRIGGER update_stops_updated_at
  BEFORE UPDATE ON public.production_stops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update tickets table: add foreign keys for GPAO columns
-- of_id, shift_id, ligne_id already exist as UUID columns, add FK constraints
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_of_id_fkey FOREIGN KEY (of_id) REFERENCES public.ordres_fabrication(id) ON DELETE SET NULL;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_ligne_id_fkey FOREIGN KEY (ligne_id) REFERENCES public.production_lines(id) ON DELETE SET NULL;
