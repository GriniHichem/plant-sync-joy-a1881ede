
CREATE OR REPLACE FUNCTION public.admin_delete_reception_ticket(p_ticket_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé — administrateur requis';
  END IF;

  SELECT * INTO v_ticket FROM public.reception_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket introuvable';
  END IF;

  -- Bypass locks/guards on weighings for this admin operation
  PERFORM set_config('prodintime.bypass_lock', 'on', true);

  DELETE FROM public.reception_weighings WHERE ticket_id = p_ticket_id;
  -- photos and orientations cascade automatically
  DELETE FROM public.reception_tickets WHERE id = p_ticket_id;

  INSERT INTO public.audit_logs (
    action, entity_type, entity_id, actor_id, reason, old_values
  ) VALUES (
    'admin_delete', 'reception_ticket', p_ticket_id, auth.uid(),
    COALESCE(NULLIF(trim(p_reason), ''), 'Suppression administrateur'),
    to_jsonb(v_ticket)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_reception_ticket(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_delete_reception_ticket(uuid, text) TO authenticated;
