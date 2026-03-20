
CREATE TABLE public.pdr_family_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.pdr_families(id) ON DELETE CASCADE,
  nom text NOT NULL,
  reference_fournisseur text DEFAULT '',
  prix numeric DEFAULT 0,
  delai_jours integer DEFAULT 0,
  contact text DEFAULT '',
  notes text DEFAULT '',
  is_principal boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdr_family_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PDR family suppliers viewable by authenticated"
  ON public.pdr_family_suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/maintenance/magasin can manage pdr_family_suppliers"
  ON public.pdr_family_suppliers FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'resp_maintenance'::app_role) OR
    has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'resp_maintenance'::app_role) OR
    has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
  );
