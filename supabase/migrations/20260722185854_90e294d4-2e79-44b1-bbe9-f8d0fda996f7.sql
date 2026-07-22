CREATE OR REPLACE FUNCTION public.import_reception_suppliers(rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r jsonb;
  idx int := 0;
  v_code text; v_nom text; v_region text; v_wilaya text;
  v_contact text; v_tel text; v_adresse text;
  v_agree boolean; v_actif boolean;
  created int := 0; updated int := 0;
  errors jsonb := '[]'::jsonb;
  existing_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')
          OR has_role(auth.uid(),'directeur_qualite') OR has_role(auth.uid(),'responsable_controle_qualite')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(rows) LOOP
    idx := idx + 1;
    v_code := NULLIF(btrim(r->>'code'),'');
    v_nom := NULLIF(btrim(r->>'nom'),'');
    v_region := NULLIF(btrim(r->>'region'),'');
    v_wilaya := NULLIF(btrim(r->>'wilaya'),'');
    v_contact := NULLIF(btrim(r->>'contact'),'');
    v_tel := NULLIF(btrim(r->>'telephone'),'');
    v_adresse := NULLIF(btrim(r->>'adresse'),'');
    v_agree := COALESCE((r->>'agree')::boolean, false);
    v_actif := COALESCE((r->>'actif')::boolean, true);

    IF v_code IS NULL OR v_nom IS NULL OR v_region IS NULL OR v_wilaya IS NULL THEN
      errors := errors || jsonb_build_object('row', idx, 'code', v_code, 'motif', 'Champs obligatoires manquants');
      CONTINUE;
    END IF;

    SELECT id INTO existing_id FROM public.reception_suppliers WHERE code = v_code;
    IF existing_id IS NOT NULL THEN
      UPDATE public.reception_suppliers
        SET nom = v_nom, region = v_region, wilaya = v_wilaya,
            contact = COALESCE(v_contact, contact),
            telephone = COALESCE(v_tel, telephone),
            adresse = COALESCE(v_adresse, adresse),
            agree = v_agree,
            actif = v_actif
        WHERE id = existing_id;
      updated := updated + 1;
    ELSE
      INSERT INTO public.reception_suppliers(code, nom, region, wilaya, contact, telephone, adresse, agree, actif, created_by)
      VALUES (v_code, v_nom, v_region, v_wilaya, v_contact, v_tel, v_adresse, v_agree, v_actif, auth.uid());
      created := created + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('total', idx, 'created', created, 'updated', updated, 'errors', errors);
END;
$function$;