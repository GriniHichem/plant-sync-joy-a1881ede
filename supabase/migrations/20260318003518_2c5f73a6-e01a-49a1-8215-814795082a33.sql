-- Familles produits (hiérarchiques)
CREATE TABLE IF NOT EXISTS public.product_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  parent_id uuid REFERENCES public.product_families(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product families viewable by authenticated" ON public.product_families
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/prod can manage product families" ON public.product_families
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_production'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_production'::app_role));

CREATE TRIGGER update_product_families_updated_at
  BEFORE UPDATE ON public.product_families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enrichir products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.product_families(id),
  ADD COLUMN IF NOT EXISTS code_erp text DEFAULT '',
  ADD COLUMN IF NOT EXISTS poids_unitaire numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unite_base text DEFAULT 'kg';

-- Enrichir articles
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.product_families(id),
  ADD COLUMN IF NOT EXISTS code_erp text DEFAULT '';

-- Niveaux de conditionnement
CREATE TABLE IF NOT EXISTS public.packaging_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('product','article')),
  entity_id uuid NOT NULL,
  level_order integer NOT NULL DEFAULT 0,
  unite_name text NOT NULL,
  coefficient numeric NOT NULL DEFAULT 1,
  poids numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.packaging_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Packaging levels viewable by authenticated" ON public.packaging_levels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/prod can manage packaging levels" ON public.packaging_levels
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_production'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_production'::app_role));

-- Liaison lignes - produits
CREATE TABLE IF NOT EXISTS public.line_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(line_id, product_id)
);

ALTER TABLE public.line_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Line products viewable by authenticated" ON public.line_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/prod can manage line products" ON public.line_products
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_production'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_production'::app_role));