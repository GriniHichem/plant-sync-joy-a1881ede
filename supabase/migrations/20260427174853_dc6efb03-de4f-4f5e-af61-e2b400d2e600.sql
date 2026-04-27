-- =============================================
-- AUDIT & TRAÇABILITÉ — Extension de audit_logs
-- =============================================

-- 1) Extension non destructive de audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS user_email      text,
  ADD COLUMN IF NOT EXISTS user_full_name  text,
  ADD COLUMN IF NOT EXISTS action_type     text,
  ADD COLUMN IF NOT EXISTS module          text,
  ADD COLUMN IF NOT EXISTS entity_type     text,
  ADD COLUMN IF NOT EXISTS entity_id       uuid,
  ADD COLUMN IF NOT EXISTS entity_code     text,
  ADD COLUMN IF NOT EXISTS entity_label    text,
  ADD COLUMN IF NOT EXISTS action_label    text,
  ADD COLUMN IF NOT EXISTS description     text,
  ADD COLUMN IF NOT EXISTS changed_fields  jsonb,
  ADD COLUMN IF NOT EXISTS ip_address      inet,
  ADD COLUMN IF NOT EXISTS user_agent      text,
  ADD COLUMN IF NOT EXISTS status          text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS severity        text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS source          text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS metadata        jsonb,
  ADD COLUMN IF NOT EXISTS archived_at     timestamptz;

-- 2) Contraintes de validation (drop/create pour idempotence)
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_status_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_status_check
  CHECK (status IN ('success','failed','denied','warning'));

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_severity_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_severity_check
  CHECK (severity IN ('info','low','medium','high','critical'));

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_source_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_source_check
  CHECK (source IN ('app','auth','database','edge_function','system'));

-- 3) Indexes performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at      ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id         ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module          ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type     ON public.audit_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type     ON public.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id       ON public.audit_logs (entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status          ON public.audit_logs (status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity        ON public.audit_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_archived_at     ON public.audit_logs (archived_at);

-- Index trigram pour recherche globale (pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_audit_logs_search_trgm
  ON public.audit_logs USING gin (
    (coalesce(description,'') || ' ' ||
     coalesce(entity_code,'')  || ' ' ||
     coalesce(entity_label,'') || ' ' ||
     coalesce(user_email,'')   || ' ' ||
     coalesce(user_full_name,'')) gin_trgm_ops
  );

-- 4) Fonction de contrôle d'accès par module
CREATE OR REPLACE FUNCTION public.has_audit_access(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'responsable_si'::app_role)
    OR public.has_role(_user_id, 'auditeur'::app_role)
    OR (
      public.has_role(_user_id, 'resp_maintenance'::app_role)
      AND _module IN (
        'auth','machines','equipements','organes','tickets','interventions',
        'preventif','pdr','pdr_stock','lignes','documents','images'
      )
    )
    OR (
      public.has_role(_user_id, 'resp_production'::app_role)
      AND _module IN (
        'auth','gpao','of','produits','articles','recettes',
        'consommations','arrets','lignes','documents','images'
      )
    )
$$;

-- 5) RLS — remplacer la policy SELECT
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs viewable by authorized roles" ON public.audit_logs;

CREATE POLICY "Audit logs viewable by authorized roles"
  ON public.audit_logs FOR SELECT TO authenticated
  USING ( public.has_audit_access(auth.uid(), coalesce(module, 'system')) );

-- 6) Permissions module 'audit'
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES
  ('admin'::app_role,            'audit', true, true, true, true),
  ('responsable_si'::app_role,   'audit', true, true, true, false),
  ('auditeur'::app_role,         'audit', true, true, false, false),
  ('resp_maintenance'::app_role, 'audit', true, false, false, false),
  ('resp_production'::app_role,  'audit', true, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- 7) Paramètre de rétention (informatif)
INSERT INTO public.app_settings (key, label, value, description, is_secret)
VALUES (
  'audit_retention_months',
  'Rétention des journaux d''audit (mois)',
  '24',
  'Durée de conservation par défaut avant archivage des journaux d''audit non critiques.',
  false
)
ON CONFLICT (key) DO NOTHING;