
-- Enable custom roles to be stored in enum-typed role columns by auto-adding
-- their code to app_role. ALTER TYPE ADD VALUE IF NOT EXISTS is idempotent
-- and safe; new values are visible in subsequent transactions.

CREATE OR REPLACE FUNCTION public.ensure_app_role_value(_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean text;
BEGIN
  clean := lower(regexp_replace(coalesce(_code, ''), '\s+', '_', 'g'));
  IF clean = '' THEN
    RAISE EXCEPTION 'Empty role code';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = clean
  ) THEN
    EXECUTE format('ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS %L', clean);
  END IF;
END;
$$;

-- Trigger: whenever a row lands in custom_roles, guarantee the enum value exists.
CREATE OR REPLACE FUNCTION public.custom_roles_sync_enum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.code := lower(regexp_replace(coalesce(NEW.code, ''), '\s+', '_', 'g'));
  PERFORM public.ensure_app_role_value(NEW.code);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_custom_roles_sync_enum ON public.custom_roles;
CREATE TRIGGER trg_custom_roles_sync_enum
  BEFORE INSERT OR UPDATE OF code ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.custom_roles_sync_enum();

-- Backfill for any existing custom_roles whose code is not yet in the enum.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT code FROM public.custom_roles LOOP
    PERFORM public.ensure_app_role_value(r.code);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_app_role_value(text) TO authenticated, service_role;
