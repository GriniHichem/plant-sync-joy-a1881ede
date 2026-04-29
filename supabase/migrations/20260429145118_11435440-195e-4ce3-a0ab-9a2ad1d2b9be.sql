-- Quality status on production orders (additive, nullable)
DO $$ BEGIN
  CREATE TYPE public.of_quality_status AS ENUM (
    'non_demarre','en_controle','conforme','conforme_sous_reserve',
    'non_conforme','bloque','libere','rebute','a_retraiter'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ordres_fabrication
  ADD COLUMN IF NOT EXISTS quality_status public.of_quality_status NULL;

-- RPC to update quality status without touching production statut
CREATE OR REPLACE FUNCTION public.set_of_quality_status(
  p_of_id uuid,
  p_status public.of_quality_status,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old public.of_quality_status;
  v_numero text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'resp_production'::app_role)
    OR public.has_role(v_uid, 'chef_ligne'::app_role)
    OR public.has_role(v_uid, 'controleur_qualite'::app_role)
    OR public.has_role(v_uid, 'bureau_methode'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to update quality status';
  END IF;

  SELECT quality_status, numero INTO v_old, v_numero
  FROM public.ordres_fabrication WHERE id = p_of_id;

  IF v_numero IS NULL THEN
    RAISE EXCEPTION 'OF not found';
  END IF;

  UPDATE public.ordres_fabrication
    SET quality_status = p_status, updated_at = now()
    WHERE id = p_of_id;

  INSERT INTO public.audit_logs(
    user_id, action, table_name, record_id, module, entity_type, entity_id, entity_code,
    action_label, action_type, description, old_values, new_values, severity
  ) VALUES (
    v_uid, 'update_quality_status', 'ordres_fabrication', p_of_id, 'qualite', 'ordre_fabrication', p_of_id, v_numero,
    'Mise à jour statut qualité OF', 'update',
    COALESCE(p_reason, ''),
    jsonb_build_object('quality_status', v_old),
    jsonb_build_object('quality_status', p_status),
    'info'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_of_quality_status(uuid, public.of_quality_status, text) TO authenticated;