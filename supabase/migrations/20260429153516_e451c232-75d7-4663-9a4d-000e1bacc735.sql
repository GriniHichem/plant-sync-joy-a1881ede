-- bill_of_materials
CREATE TABLE IF NOT EXISTS public.bill_of_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  description text DEFAULT '',
  valid_from timestamptz,
  valid_to timestamptz,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, version)
);
CREATE INDEX IF NOT EXISTS idx_bom_product ON public.bill_of_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_status ON public.bill_of_materials(status);

ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BOM viewable by authenticated"
  ON public.bill_of_materials FOR SELECT TO authenticated USING (true);

CREATE POLICY "BOM manageable by qualified roles"
  ON public.bill_of_materials FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'resp_production'::app_role)
    OR has_role(auth.uid(),'bureau_methode'::app_role)
    OR has_role(auth.uid(),'controleur_qualite'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'resp_production'::app_role)
    OR has_role(auth.uid(),'bureau_methode'::app_role)
    OR has_role(auth.uid(),'controleur_qualite'::app_role)
  );

CREATE TRIGGER trg_bom_updated_at
  BEFORE UPDATE ON public.bill_of_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bom_items
CREATE TABLE IF NOT EXISTS public.bom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id uuid NOT NULL REFERENCES public.bill_of_materials(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE RESTRICT,
  item_type text NOT NULL CHECK (item_type IN ('raw_material','packaging','label','carton','pallet','consumable')),
  quantity_per_unit numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'g',
  waste_percent numeric,
  is_mandatory boolean NOT NULL DEFAULT true,
  is_quality_sensitive boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bom_id, article_id, item_type)
);
CREATE INDEX IF NOT EXISTS idx_bom_items_bom ON public.bom_items(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_article ON public.bom_items(article_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_quality ON public.bom_items(is_quality_sensitive) WHERE is_quality_sensitive = true;

ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BOM items viewable by authenticated"
  ON public.bom_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "BOM items manageable by qualified roles"
  ON public.bom_items FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'resp_production'::app_role)
    OR has_role(auth.uid(),'bureau_methode'::app_role)
    OR has_role(auth.uid(),'controleur_qualite'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'resp_production'::app_role)
    OR has_role(auth.uid(),'bureau_methode'::app_role)
    OR has_role(auth.uid(),'controleur_qualite'::app_role)
  );

CREATE TRIGGER trg_bom_items_updated_at
  BEFORE UPDATE ON public.bom_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Optional bom_id on OFs (additive, nullable)
ALTER TABLE public.ordres_fabrication ADD COLUMN IF NOT EXISTS bom_id uuid;

-- RPC: set_bom_status
CREATE OR REPLACE FUNCTION public.set_bom_status(p_bom_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old text;
  v_product uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_status NOT IN ('draft','active','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  IF NOT (
    has_role(v_uid,'admin'::app_role)
    OR has_role(v_uid,'resp_production'::app_role)
    OR has_role(v_uid,'bureau_methode'::app_role)
    OR has_role(v_uid,'controleur_qualite'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to change BOM status';
  END IF;

  SELECT status, product_id INTO v_old, v_product FROM public.bill_of_materials WHERE id = p_bom_id;
  IF v_product IS NULL THEN RAISE EXCEPTION 'BOM not found'; END IF;

  IF p_status = 'active' THEN
    UPDATE public.bill_of_materials
       SET status='active',
           valid_from = COALESCE(valid_from, now()),
           valid_to = NULL,
           approved_by = v_uid,
           approved_at = now()
     WHERE id = p_bom_id;
  ELSIF p_status = 'archived' THEN
    UPDATE public.bill_of_materials
       SET status='archived', valid_to = now()
     WHERE id = p_bom_id;
  ELSE
    UPDATE public.bill_of_materials SET status='draft' WHERE id = p_bom_id;
  END IF;

  INSERT INTO public.audit_logs(
    user_id, action, table_name, record_id, module, entity_type, entity_id,
    action_label, action_type, description, old_values, new_values, severity
  ) VALUES (
    v_uid, 'update_bom_status', 'bill_of_materials', p_bom_id, 'gpao', 'bom', p_bom_id,
    'Changement de statut nomenclature', 'update', COALESCE(p_reason,''),
    jsonb_build_object('status', v_old),
    jsonb_build_object('status', p_status),
    'info'
  );
END $$;