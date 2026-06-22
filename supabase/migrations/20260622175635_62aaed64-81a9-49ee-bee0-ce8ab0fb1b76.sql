-- 1. app_settings: hide secret values from non-admins
DROP POLICY IF EXISTS "App settings viewable by authenticated" ON public.app_settings;
CREATE POLICY "App settings viewable by authenticated"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (is_secret = false OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. audit_logs: remove 'auth' module from resp_maintenance / resp_production access
CREATE OR REPLACE FUNCTION public.has_audit_access(_user_id uuid, _module text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'responsable_si'::app_role)
    OR public.has_role(_user_id, 'auditeur'::app_role)
    OR (
      public.has_role(_user_id, 'resp_maintenance'::app_role)
      AND _module IN (
        'machines','equipements','organes','tickets','interventions',
        'preventif','pdr','pdr_stock','lignes','documents','images'
      )
    )
    OR (
      public.has_role(_user_id, 'resp_production'::app_role)
      AND _module IN (
        'gpao','of','produits','articles','recettes',
        'consommations','arrets','lignes','documents','images'
      )
    )
$function$;

-- 3. notification_email_log: restrict INSERT to admin or own recipient (service role bypasses RLS)
DROP POLICY IF EXISTS "Email log: authenticated can insert" ON public.notification_email_log;
CREATE POLICY "Email log: authenticated can insert"
  ON public.notification_email_log FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR recipient_user_id = auth.uid()
  );

-- 4. user_roles: users see only their own roles; admins see all
DROP POLICY IF EXISTS "Roles viewable by authenticated" ON public.user_roles;
CREATE POLICY "Roles viewable by authenticated"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5. validation_requests: narrow SELECT audience to reduce submitter PII exposure
DROP POLICY IF EXISTS "VR select: stakeholders" ON public.validation_requests;
CREATE POLICY "VR select: stakeholders"
  ON public.validation_requests FOR SELECT
  TO authenticated
  USING (
    submitted_by_user_id = auth.uid()
    OR assigned_validator_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'responsable_si'::app_role)
    OR public.can_validate_request(auth.uid(), id)
  );

-- 6. storage: ownership-scoped delete/update for entity-images and machine-documents
DROP POLICY IF EXISTS "Authenticated can delete entity images" ON storage.objects;
CREATE POLICY "Authenticated can delete entity images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'entity-images' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "Authenticated can update entity images" ON storage.objects;
CREATE POLICY "Authenticated can update entity images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'entity-images' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (bucket_id = 'entity-images' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "Authenticated can delete machine docs" ON storage.objects;
CREATE POLICY "Authenticated can delete machine docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'machine-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "Authenticated can update machine docs" ON storage.objects;
CREATE POLICY "Authenticated can update machine docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'machine-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (bucket_id = 'machine-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)));