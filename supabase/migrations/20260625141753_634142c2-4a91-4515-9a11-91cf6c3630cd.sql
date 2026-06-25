CREATE OR REPLACE FUNCTION public.consume_adhoc_pdr_preventive(p_execution_id uuid, p_pdr_id uuid, p_qte integer, p_position_id uuid DEFAULT NULL::uuid, p_cause text DEFAULT NULL::text, p_commentaire text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'Consommation directe interdite : toute pièce non prévue doit passer par une demande de pièces validée par le magasin.';
END $function$;