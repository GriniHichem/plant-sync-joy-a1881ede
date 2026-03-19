
-- Document permissions table per role per entity
CREATE TABLE IF NOT EXISTS public.document_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  entity_type text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_upload boolean NOT NULL DEFAULT false,
  can_download boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_edit_metadata boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, entity_type)
);

ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document_permissions"
  ON public.document_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Document permissions viewable by authenticated"
  ON public.document_permissions FOR SELECT TO authenticated
  USING (true);

-- Document audit logs
CREATE TABLE IF NOT EXISTS public.document_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  document_id uuid REFERENCES public.entity_documents(id) ON DELETE SET NULL,
  document_name text NOT NULL DEFAULT '',
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view document audit logs"
  ON public.document_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert document audit logs"
  ON public.document_audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Security definer function for document permissions
CREATE OR REPLACE FUNCTION public.check_document_permission(
  _user_id uuid,
  _entity_type text,
  _action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.document_permissions dp ON dp.role = ur.role::text
    WHERE ur.user_id = _user_id
      AND dp.entity_type = _entity_type
      AND (
        (_action = 'view' AND dp.can_view) OR
        (_action = 'upload' AND dp.can_upload) OR
        (_action = 'download' AND dp.can_download) OR
        (_action = 'delete' AND dp.can_delete) OR
        (_action = 'edit_metadata' AND dp.can_edit_metadata)
      )
  )
$$;

-- Seed default permissions
INSERT INTO public.document_permissions (role, entity_type, can_view, can_upload, can_download, can_delete, can_edit_metadata)
VALUES
  -- Admin: full access
  ('admin', 'machine', true, true, true, true, true),
  ('admin', 'equipement', true, true, true, true, true),
  ('admin', 'pdr', true, true, true, true, true),
  ('admin', 'produit', true, true, true, true, true),
  ('admin', 'article', true, true, true, true, true),
  -- Resp. maintenance
  ('resp_maintenance', 'machine', true, true, true, true, true),
  ('resp_maintenance', 'equipement', true, true, true, true, true),
  ('resp_maintenance', 'pdr', true, true, true, false, true),
  ('resp_maintenance', 'produit', true, false, true, false, false),
  ('resp_maintenance', 'article', true, false, true, false, false),
  -- Maintenancier
  ('maintenancier', 'machine', true, true, true, false, false),
  ('maintenancier', 'equipement', true, true, true, false, false),
  ('maintenancier', 'pdr', true, false, true, false, false),
  ('maintenancier', 'produit', true, false, true, false, false),
  ('maintenancier', 'article', true, false, true, false, false),
  -- Resp. production
  ('resp_production', 'machine', true, false, true, false, false),
  ('resp_production', 'equipement', true, false, true, false, false),
  ('resp_production', 'pdr', true, false, true, false, false),
  ('resp_production', 'produit', true, true, true, true, true),
  ('resp_production', 'article', true, true, true, true, true),
  -- Chef de ligne
  ('chef_ligne', 'machine', true, false, true, false, false),
  ('chef_ligne', 'equipement', true, false, true, false, false),
  ('chef_ligne', 'pdr', true, false, true, false, false),
  ('chef_ligne', 'produit', true, true, true, false, false),
  ('chef_ligne', 'article', true, true, true, false, false),
  -- Opérateur
  ('operateur', 'machine', true, false, false, false, false),
  ('operateur', 'equipement', true, false, false, false, false),
  ('operateur', 'pdr', true, false, false, false, false),
  ('operateur', 'produit', true, false, false, false, false),
  ('operateur', 'article', true, false, false, false, false),
  -- Gestionnaire magasin
  ('gestionnaire_magasin', 'machine', true, false, true, false, false),
  ('gestionnaire_magasin', 'equipement', true, false, true, false, false),
  ('gestionnaire_magasin', 'pdr', true, true, true, false, true),
  ('gestionnaire_magasin', 'produit', true, false, true, false, false),
  ('gestionnaire_magasin', 'article', true, true, true, false, true),
  -- Bureau méthode
  ('bureau_methode', 'machine', true, true, true, false, true),
  ('bureau_methode', 'equipement', true, true, true, false, true),
  ('bureau_methode', 'pdr', true, true, true, false, true),
  ('bureau_methode', 'produit', true, true, true, false, true),
  ('bureau_methode', 'article', true, true, true, false, true)
ON CONFLICT (role, entity_type) DO NOTHING;
