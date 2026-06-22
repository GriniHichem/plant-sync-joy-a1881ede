-- 1. PDR suppliers: restrict contact details to roles that need them
DROP POLICY IF EXISTS "PDR suppliers viewable by authenticated" ON public.pdr_suppliers;
CREATE POLICY "PDR suppliers viewable by relevant roles"
ON public.pdr_suppliers FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'resp_maintenance'::app_role)
  OR has_role(auth.uid(), 'maintenancier'::app_role)
  OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
  OR has_role(auth.uid(), 'bureau_methode'::app_role)
);

DROP POLICY IF EXISTS "PDR family suppliers viewable by authenticated" ON public.pdr_family_suppliers;
CREATE POLICY "PDR family suppliers viewable by relevant roles"
ON public.pdr_family_suppliers FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'resp_maintenance'::app_role)
  OR has_role(auth.uid(), 'maintenancier'::app_role)
  OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
  OR has_role(auth.uid(), 'bureau_methode'::app_role)
);

-- 2. Profiles: restrict to own profile + admin + IT manager
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by self and admins"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_si'::app_role)
);

-- 3. Storage: require authentication to list bucket objects (public CDN reads still work)
DROP POLICY IF EXISTS "Entity images public read" ON storage.objects;
CREATE POLICY "Entity images read by authenticated"
ON storage.objects FOR SELECT
USING (bucket_id = 'entity-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can view entity documents" ON storage.objects;
CREATE POLICY "Entity documents read by authenticated"
ON storage.objects FOR SELECT
USING (bucket_id = 'entity-documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Machine docs publicly accessible" ON storage.objects;
CREATE POLICY "Machine docs read by authenticated"
ON storage.objects FOR SELECT
USING (bucket_id = 'machine-documents' AND auth.role() = 'authenticated');

-- 4. Set fixed search_path on import_enum
ALTER FUNCTION public.import_enum(text, text[], text) SET search_path = public;

-- 5. Revoke EXECUTE from anon/public on all public functions, and from authenticated on trigger-only functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.prorettype
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.oid::regprocedure::text || ' FROM anon, public';
    IF r.prorettype = 'pg_catalog.trigger'::regtype THEN
      EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.oid::regprocedure::text || ' FROM authenticated';
    END IF;
  END LOOP;
END $$;