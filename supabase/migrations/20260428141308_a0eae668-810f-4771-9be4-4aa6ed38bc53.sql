
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.validation_enforcement AS ENUM ('post_hoc', 'blocking');
CREATE TYPE public.validation_status_enum AS ENUM (
  'draft', 'submitted', 'pending_post_hoc', 'approved', 'rejected', 'cancelled', 'applied', 'archived'
);
CREATE TYPE public.validation_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- ============================================================
-- TABLE: validation_rules
-- ============================================================
CREATE TABLE public.validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  module TEXT NOT NULL,
  entity_type TEXT,
  action_type TEXT NOT NULL,
  enforcement public.validation_enforcement NOT NULL DEFAULT 'post_hoc',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT true,
  priority public.validation_priority NOT NULL DEFAULT 'medium',
  validator_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  validator_users JSONB DEFAULT '[]'::jsonb,
  conditions JSONB DEFAULT NULL,
  auto_approve_if_low_risk BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_validation_rules_lookup ON public.validation_rules(module, action_type, is_active);

-- ============================================================
-- TABLE: validation_requests
-- ============================================================
CREATE TABLE public.validation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.validation_rules(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_code TEXT,
  entity_label TEXT,
  target_record_id UUID,
  requested_action TEXT NOT NULL,
  status public.validation_status_enum NOT NULL DEFAULT 'submitted',
  enforcement public.validation_enforcement NOT NULL DEFAULT 'post_hoc',
  priority public.validation_priority NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'app',
  is_blocking BOOLEAN NOT NULL DEFAULT false,
  submitted_by_user_id UUID,
  submitted_by_name TEXT,
  submitted_by_email TEXT,
  assigned_validator_role TEXT,
  assigned_validator_user_id UUID,
  validated_by_user_id UUID,
  rejected_by_user_id UUID,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  justification TEXT,
  rejection_reason TEXT,
  validation_comment TEXT,
  old_values JSONB,
  proposed_values JSONB,
  changed_fields JSONB,
  metadata JSONB,
  action_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  validated_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vr_created_at ON public.validation_requests(created_at DESC);
CREATE INDEX idx_vr_status ON public.validation_requests(status);
CREATE INDEX idx_vr_module ON public.validation_requests(module);
CREATE INDEX idx_vr_entity ON public.validation_requests(entity_type, entity_id);
CREATE INDEX idx_vr_submitted_by ON public.validation_requests(submitted_by_user_id);
CREATE INDEX idx_vr_validator ON public.validation_requests(assigned_validator_user_id);
CREATE INDEX idx_vr_priority ON public.validation_requests(priority);
CREATE INDEX idx_vr_enforcement ON public.validation_requests(enforcement);

-- ============================================================
-- TABLE: validation_permissions (granulaire par rôle)
-- ============================================================
CREATE TABLE public.validation_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL UNIQUE,
  view_own BOOLEAN NOT NULL DEFAULT false,
  view_all BOOLEAN NOT NULL DEFAULT false,
  submit BOOLEAN NOT NULL DEFAULT false,
  approve BOOLEAN NOT NULL DEFAULT false,
  reject BOOLEAN NOT NULL DEFAULT false,
  cancel BOOLEAN NOT NULL DEFAULT false,
  configure_rules BOOLEAN NOT NULL DEFAULT false,
  view_technical_details BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COLONNES ADDITIVES (nullable) sur tables existantes
-- ============================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS validation_status TEXT,
  ADD COLUMN IF NOT EXISTS validation_request_id UUID;

ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS validation_status TEXT,
  ADD COLUMN IF NOT EXISTS validation_request_id UUID;

ALTER TABLE public.pdr_stock_movements
  ADD COLUMN IF NOT EXISTS validation_status TEXT,
  ADD COLUMN IF NOT EXISTS validation_request_id UUID,
  ADD COLUMN IF NOT EXISTS applied BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.consumptions
  ADD COLUMN IF NOT EXISTS validation_status TEXT,
  ADD COLUMN IF NOT EXISTS validation_request_id UUID;

-- ============================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_manage_validation_rule(_user_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'responsable_si'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.can_validate_request(_user_id UUID, _request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role JSONB;
  v_user JSONB;
  v_assigned UUID;
  v_validator_user UUID;
BEGIN
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN TRUE; END IF;
  IF public.has_role(_user_id, 'responsable_si'::app_role) THEN RETURN TRUE; END IF;

  SELECT vr.assigned_validator_user_id, r.validator_roles, r.validator_users
    INTO v_assigned, v_role, v_user
  FROM public.validation_requests vr
  LEFT JOIN public.validation_rules r ON r.id = vr.rule_id
  WHERE vr.id = _request_id;

  IF v_assigned = _user_id THEN RETURN TRUE; END IF;

  IF v_user IS NOT NULL THEN
    FOR v_validator_user IN SELECT (jsonb_array_elements_text(v_user))::UUID LOOP
      IF v_validator_user = _user_id THEN RETURN TRUE; END IF;
    END LOOP;
  END IF;

  IF v_role IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(v_role) AS rname
      JOIN public.user_roles ur ON ur.role::text = rname.value
      WHERE ur.user_id = _user_id
    ) THEN RETURN TRUE; END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_permissions ENABLE ROW LEVEL SECURITY;

-- validation_rules
CREATE POLICY "Validation rules viewable by authenticated"
  ON public.validation_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Validation rules manageable by authorized"
  ON public.validation_rules FOR ALL TO authenticated
  USING (public.can_manage_validation_rule(auth.uid(), module))
  WITH CHECK (public.can_manage_validation_rule(auth.uid(), module));

-- validation_requests
CREATE POLICY "VR select: stakeholders"
  ON public.validation_requests FOR SELECT TO authenticated
  USING (
    submitted_by_user_id = auth.uid()
    OR assigned_validator_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'responsable_si'::app_role)
    OR public.has_role(auth.uid(), 'auditeur'::app_role)
    OR public.can_validate_request(auth.uid(), id)
  );

CREATE POLICY "VR insert: authenticated"
  ON public.validation_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by_user_id);

CREATE POLICY "VR update: validators or owner"
  ON public.validation_requests FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'responsable_si'::app_role)
    OR public.can_validate_request(auth.uid(), id)
    OR submitted_by_user_id = auth.uid()
  );

CREATE POLICY "VR delete: admin"
  ON public.validation_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- validation_permissions
CREATE POLICY "Validation permissions viewable by authenticated"
  ON public.validation_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Validation permissions manageable by admin"
  ON public.validation_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE TRIGGER trg_validation_rules_updated
  BEFORE UPDATE ON public.validation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_validation_requests_updated
  BEFORE UPDATE ON public.validation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_validation_permissions_updated
  BEFORE UPDATE ON public.validation_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SEED: validation_permissions par rôle
-- ============================================================
INSERT INTO public.validation_permissions (role, view_own, view_all, submit, approve, reject, cancel, configure_rules, view_technical_details) VALUES
  ('admin',                true, true,  true, true,  true,  true,  true,  true),
  ('responsable_si',       true, true,  true, true,  true,  true,  true,  true),
  ('resp_maintenance',     true, true,  true, true,  true,  true,  false, true),
  ('resp_production',      true, true,  true, true,  true,  true,  false, true),
  ('gestionnaire_magasin', true, false, true, true,  false, true,  false, false),
  ('maintenancier',        true, false, true, false, false, true,  false, false),
  ('chef_ligne',           true, false, true, false, false, true,  false, false),
  ('operateur',            true, false, true, false, false, true,  false, false),
  ('bureau_methode',       true, false, true, false, false, true,  false, false),
  ('auditeur',             true, true,  false,false, false, false, false, true);

-- ============================================================
-- SEED: 10 règles par défaut
-- ============================================================
INSERT INTO public.validation_rules (name, description, module, entity_type, action_type, enforcement, priority, is_required, validator_roles, conditions) VALUES
  ('Sortie PDR liée à intervention/ticket',
   'Validation a posteriori des sorties PDR utilisées en intervention curative.',
   'pdr_stock', 'pdr_movement', 'exit_intervention', 'post_hoc', 'medium', true,
   '["resp_maintenance","gestionnaire_magasin"]'::jsonb, NULL),

  ('Résolution technique ticket critique',
   'Validation a posteriori de la résolution d''un ticket critique (priorité haute, machine critique ou ligne arrêtée).',
   'tickets', 'ticket', 'resolve', 'post_hoc', 'high', true,
   '["resp_maintenance","admin"]'::jsonb,
   '{"or":[{"priority":["haute","high"]},{"machine_criticite":["critique"]},{"impact_ligne":["arret_complet"]}]}'::jsonb),

  ('Intervention curative terminée',
   'Validation a posteriori de la clôture d''une intervention curative.',
   'interventions', 'intervention', 'close', 'post_hoc', 'medium', true,
   '["resp_maintenance"]'::jsonb, NULL),

  ('Déclaration arrêt long',
   'Validation a posteriori des arrêts de production de longue durée.',
   'arrets', 'arret', 'create', 'post_hoc', 'high', true,
   '["resp_production"]'::jsonb,
   '{"min_duration_minutes":60}'::jsonb),

  ('Clôture shift avec écart consommation',
   'Validation a posteriori des clôtures de shift présentant un écart de consommation important.',
   'gpao', 'shift', 'close', 'post_hoc', 'medium', true,
   '["resp_production"]'::jsonb,
   '{"ecart_seuil_pct":10}'::jsonb),

  ('Correction stock manuelle',
   'Validation bloquante des corrections de stock manuelles hors intervention.',
   'pdr_stock', 'pdr_movement', 'correction', 'blocking', 'high', true,
   '["admin","resp_maintenance","gestionnaire_magasin"]'::jsonb, NULL),

  ('Annulation mouvement stock',
   'Validation bloquante de l''annulation d''un mouvement de stock PDR.',
   'pdr_stock', 'pdr_movement', 'cancel_movement', 'blocking', 'critical', true,
   '["admin","resp_maintenance"]'::jsonb, NULL),

  ('Inventaire stock PDR avec écart',
   'Validation bloquante des inventaires avec écart supérieur au seuil.',
   'pdr_stock', 'pdr_movement', 'inventory', 'blocking', 'high', true,
   '["gestionnaire_magasin","resp_maintenance"]'::jsonb,
   '{"ecart_seuil_pct":5}'::jsonb),

  ('Correction consommation déjà validée',
   'Validation bloquante de la modification d''une consommation production déjà validée.',
   'consommations', 'consumption', 'correction', 'blocking', 'high', true,
   '["resp_production","admin"]'::jsonb, NULL),

  ('Modification rétroactive production (>24h)',
   'Validation bloquante des modifications de données production de plus de 24h.',
   'gpao', 'production', 'retroactive_update', 'blocking', 'high', true,
   '["resp_production","admin"]'::jsonb,
   '{"min_age_hours":24}'::jsonb);
