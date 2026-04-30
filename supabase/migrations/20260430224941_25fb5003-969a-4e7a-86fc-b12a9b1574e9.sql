REVOKE EXECUTE ON FUNCTION public.resolve_scanned_code(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.resolve_scanned_code(text) TO authenticated;