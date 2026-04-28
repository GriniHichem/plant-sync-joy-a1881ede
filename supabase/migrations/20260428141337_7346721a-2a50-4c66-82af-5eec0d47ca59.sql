
REVOKE EXECUTE ON FUNCTION public.can_manage_validation_rule(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_validate_request(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_validation_rule(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_validate_request(UUID, UUID) TO authenticated, service_role;
