
-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, module)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Read for all authenticated
CREATE POLICY "role_permissions viewable by authenticated"
ON public.role_permissions FOR SELECT TO authenticated
USING (true);

-- Write for admins only
CREATE POLICY "Admins can manage role_permissions"
ON public.role_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Updated_at trigger
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- check_permission function
CREATE OR REPLACE FUNCTION public.check_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.module = _module
      AND (
        (_action = 'view' AND rp.can_view) OR
        (_action = 'create' AND rp.can_create) OR
        (_action = 'edit' AND rp.can_edit) OR
        (_action = 'delete' AND rp.can_delete)
      )
  )
$$;

-- Seed default permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
-- admin: full access everywhere
('admin','machines',true,true,true,true),
('admin','tickets',true,true,true,true),
('admin','pdr',true,true,true,true),
('admin','preventif',true,true,true,true),
('admin','of',true,true,true,true),
('admin','produits',true,true,true,true),
('admin','articles',true,true,true,true),
('admin','recettes',true,true,true,true),
('admin','arrets',true,true,true,true),
('admin','consommations',true,true,true,true),
('admin','utilisateurs',true,true,true,true),
('admin','parametres',true,true,true,true),
-- resp_maintenance
('resp_maintenance','machines',true,true,true,true),
('resp_maintenance','tickets',true,true,true,true),
('resp_maintenance','pdr',true,true,true,true),
('resp_maintenance','preventif',true,true,true,true),
('resp_maintenance','of',true,false,false,false),
('resp_maintenance','produits',true,false,false,false),
('resp_maintenance','articles',true,false,false,false),
('resp_maintenance','recettes',true,false,false,false),
('resp_maintenance','arrets',true,false,false,false),
('resp_maintenance','consommations',true,false,false,false),
('resp_maintenance','utilisateurs',true,false,false,false),
('resp_maintenance','parametres',true,false,false,false),
-- maintenancier
('maintenancier','machines',true,false,false,false),
('maintenancier','tickets',true,true,true,false),
('maintenancier','pdr',true,true,true,false),
('maintenancier','preventif',true,true,true,false),
('maintenancier','of',true,false,false,false),
('maintenancier','produits',true,false,false,false),
('maintenancier','articles',true,false,false,false),
('maintenancier','recettes',true,false,false,false),
('maintenancier','arrets',true,false,false,false),
('maintenancier','consommations',true,false,false,false),
('maintenancier','utilisateurs',false,false,false,false),
('maintenancier','parametres',false,false,false,false),
-- resp_production
('resp_production','machines',true,false,false,false),
('resp_production','tickets',true,false,false,false),
('resp_production','pdr',true,false,false,false),
('resp_production','preventif',true,false,false,false),
('resp_production','of',true,true,true,true),
('resp_production','produits',true,true,true,true),
('resp_production','articles',true,true,true,true),
('resp_production','recettes',true,true,true,true),
('resp_production','arrets',true,true,true,true),
('resp_production','consommations',true,true,true,true),
('resp_production','utilisateurs',true,false,false,false),
('resp_production','parametres',true,false,false,false),
-- chef_ligne
('chef_ligne','machines',true,false,false,false),
('chef_ligne','tickets',true,true,false,false),
('chef_ligne','pdr',true,false,false,false),
('chef_ligne','preventif',true,false,false,false),
('chef_ligne','of',true,true,false,false),
('chef_ligne','produits',true,false,false,false),
('chef_ligne','articles',true,false,false,false),
('chef_ligne','recettes',true,false,false,false),
('chef_ligne','arrets',true,true,false,false),
('chef_ligne','consommations',true,true,false,false),
('chef_ligne','utilisateurs',false,false,false,false),
('chef_ligne','parametres',false,false,false,false),
-- operateur
('operateur','machines',true,false,false,false),
('operateur','tickets',true,true,false,false),
('operateur','pdr',true,false,false,false),
('operateur','preventif',true,false,false,false),
('operateur','of',true,false,false,false),
('operateur','produits',true,false,false,false),
('operateur','articles',true,false,false,false),
('operateur','recettes',true,false,false,false),
('operateur','arrets',true,false,false,false),
('operateur','consommations',true,true,false,false),
('operateur','utilisateurs',false,false,false,false),
('operateur','parametres',false,false,false,false),
-- gestionnaire_magasin
('gestionnaire_magasin','machines',true,false,false,false),
('gestionnaire_magasin','tickets',true,false,false,false),
('gestionnaire_magasin','pdr',true,true,true,true),
('gestionnaire_magasin','preventif',true,false,false,false),
('gestionnaire_magasin','of',true,false,false,false),
('gestionnaire_magasin','produits',true,false,false,false),
('gestionnaire_magasin','articles',true,true,true,true),
('gestionnaire_magasin','recettes',true,false,false,false),
('gestionnaire_magasin','arrets',true,false,false,false),
('gestionnaire_magasin','consommations',true,false,false,false),
('gestionnaire_magasin','utilisateurs',false,false,false,false),
('gestionnaire_magasin','parametres',false,false,false,false);
