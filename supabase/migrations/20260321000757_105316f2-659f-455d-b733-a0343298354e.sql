
-- Table de permissions granulaires PDR/Stock
CREATE TABLE IF NOT EXISTS public.pdr_stock_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  -- Fournisseurs
  can_view_suppliers boolean NOT NULL DEFAULT false,
  can_create_supplier boolean NOT NULL DEFAULT false,
  can_edit_supplier boolean NOT NULL DEFAULT false,
  can_delete_supplier boolean NOT NULL DEFAULT false,
  -- Mouvements stock
  can_create_entry boolean NOT NULL DEFAULT false,
  can_create_exit boolean NOT NULL DEFAULT false,
  can_correct_stock boolean NOT NULL DEFAULT false,
  can_inventory boolean NOT NULL DEFAULT false,
  can_cancel_movement boolean NOT NULL DEFAULT false,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role)
);

-- RLS
ALTER TABLE public.pdr_stock_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PDR stock permissions viewable by authenticated"
  ON public.pdr_stock_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage pdr_stock_permissions"
  ON public.pdr_stock_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER set_pdr_stock_permissions_updated_at
  BEFORE UPDATE ON public.pdr_stock_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed realistic data
INSERT INTO public.pdr_stock_permissions (role, can_view_suppliers, can_create_supplier, can_edit_supplier, can_delete_supplier, can_create_entry, can_create_exit, can_correct_stock, can_inventory, can_cancel_movement)
VALUES
  ('admin', true, true, true, true, true, true, true, true, true),
  ('resp_maintenance', true, true, true, true, true, true, true, true, true),
  ('maintenancier', true, false, false, false, false, true, false, false, false),
  ('resp_production', true, false, false, false, false, false, false, false, false),
  ('chef_ligne', true, false, false, false, false, false, false, false, false),
  ('operateur', false, false, false, false, false, false, false, false, false),
  ('gestionnaire_magasin', true, true, true, false, true, true, true, true, false),
  ('bureau_methode', true, false, false, false, false, false, false, false, false)
ON CONFLICT (role) DO NOTHING;

-- Add audit columns to pdr_stock_movements
ALTER TABLE public.pdr_stock_movements
  ADD COLUMN IF NOT EXISTS modified_by uuid,
  ADD COLUMN IF NOT EXISTS modified_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add audit columns to pdr_suppliers
ALTER TABLE public.pdr_suppliers
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Add audit columns to pdr_family_suppliers
ALTER TABLE public.pdr_family_suppliers
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;
