-- Self-host hardening: make function EXECUTE grants explicit and portable.
-- On Lovable Cloud, ALTER DEFAULT PRIVILEGES grants EXECUTE to authenticated for
-- new functions; self-hosted Postgres may lack this, so a prior REVOKE FROM public
-- could strip authenticated's access to RLS helpers like has_role(). This restores it.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.prorettype
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    -- Anonymous role never needs execute on internal/public functions
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.oid::regprocedure::text || ' FROM anon, public';

    IF r.prorettype = 'pg_catalog.trigger'::regtype THEN
      -- Trigger functions must not be directly executable by clients
      EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.oid::regprocedure::text || ' FROM authenticated';
    ELSE
      -- Regular functions (RLS helpers + RPCs) must stay callable by signed-in users
      EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.oid::regprocedure::text || ' TO authenticated';
    END IF;

    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.oid::regprocedure::text || ' TO service_role';
  END LOOP;
END $$;

-- Keep scanner resolver callable for anon (QR/barcode scanning before auth), as before
DO $$
BEGIN
  IF to_regprocedure('public.resolve_scanned_code(text)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.resolve_scanned_code(text) TO anon';
  END IF;
END $$;