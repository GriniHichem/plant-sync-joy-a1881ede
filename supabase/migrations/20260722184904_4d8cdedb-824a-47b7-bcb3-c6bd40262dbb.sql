
-- 1) Étendre le check constraint statut
ALTER TABLE public.reception_tickets DROP CONSTRAINT IF EXISTS reception_tickets_statut_check;
ALTER TABLE public.reception_tickets ADD CONSTRAINT reception_tickets_statut_check
  CHECK (statut = ANY (ARRAY['ouvert'::text, 'cloture'::text, 'annule'::text, 'pese_importe'::text]));

-- 2) Trigger de verrouillage : autorise le bypass via variable de session
CREATE OR REPLACE FUNCTION public.reception_tickets_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  bypass text;
BEGIN
  bypass := current_setting('prodintime.bypass_lock', true);
  IF bypass = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' AND OLD.statut IN ('cloture','pese_importe') THEN
    RAISE EXCEPTION 'Ticket verrouillé — suppression interdite';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.statut IN ('cloture','pese_importe') THEN
    RAISE EXCEPTION 'Ticket verrouillé — modification interdite';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 3) Import fournisseurs
CREATE OR REPLACE FUNCTION public.import_reception_suppliers(rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r jsonb;
  idx int := 0;
  v_code text; v_nom text; v_region text; v_wilaya text;
  v_contact text; v_tel text; v_adresse text;
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
            adresse = COALESCE(v_adresse, adresse)
        WHERE id = existing_id;
      updated := updated + 1;
    ELSE
      INSERT INTO public.reception_suppliers(code, nom, region, wilaya, contact, telephone, adresse, created_by)
      VALUES (v_code, v_nom, v_region, v_wilaya, v_contact, v_tel, v_adresse, auth.uid());
      created := created + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('total', idx, 'created', created, 'updated', updated, 'errors', errors);
END;
$$;

REVOKE ALL ON FUNCTION public.import_reception_suppliers(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_reception_suppliers(jsonb) TO authenticated;

-- 4) Import tickets
CREATE OR REPLACE FUNCTION public.import_reception_tickets(rows jsonb, on_conflict text DEFAULT 'ignore')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r jsonb;
  idx int := 0;
  imported int := 0; replaced int := 0; skipped int := 0;
  errors jsonb := '[]'::jsonb;
  v_numero text; v_date date; v_sup text; v_prod text;
  v_abat numeric; v_brut numeric;
  v_hd time; v_hf time; v_comment text;
  sup_id uuid; prod_id uuid; camp_id uuid;
  existing_id uuid;
  new_ticket_id uuid;
  weighed_ts timestamptz;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF on_conflict NOT IN ('ignore','replace') THEN
    on_conflict := 'ignore';
  END IF;

  -- Bypass du trigger de verrouillage pour cette transaction
  PERFORM set_config('prodintime.bypass_lock','on', true);

  FOR r IN SELECT * FROM jsonb_array_elements(rows) LOOP
    idx := idx + 1;
    v_numero := NULLIF(btrim(r->>'numero'),'');
    v_sup := NULLIF(btrim(r->>'fournisseur'),'');
    v_prod := NULLIF(btrim(r->>'produit'),'');
    v_hd := NULL; v_hf := NULL;
    v_comment := NULLIF(btrim(r->>'commentaire'),'');

    BEGIN
      v_date := (r->>'date')::date;
    EXCEPTION WHEN OTHERS THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', 'Date invalide');
      CONTINUE;
    END;

    BEGIN
      v_abat := (replace(coalesce(r->>'taux_abattement','0'), ',', '.'))::numeric;
      v_brut := (replace(coalesce(r->>'poids_brut','0'), ',', '.'))::numeric;
    EXCEPTION WHEN OTHERS THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', 'Poids/abattement invalide');
      CONTINUE;
    END;

    IF v_numero IS NULL OR v_date IS NULL OR v_sup IS NULL OR v_prod IS NULL THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', 'Champs obligatoires manquants');
      CONTINUE;
    END IF;

    IF v_brut IS NULL OR v_brut <= 0 THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', 'Poids brut invalide (>0 requis)');
      CONTINUE;
    END IF;

    IF v_abat IS NULL OR v_abat < 0 OR v_abat > 100 THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', 'Taux abattement hors [0,100]');
      CONTINUE;
    END IF;

    BEGIN v_hd := NULLIF(btrim(r->>'heure_debut'),'')::time; EXCEPTION WHEN OTHERS THEN v_hd := NULL; END;
    BEGIN v_hf := NULLIF(btrim(r->>'heure_fin'),'')::time; EXCEPTION WHEN OTHERS THEN v_hf := NULL; END;

    -- Fournisseur
    SELECT id INTO sup_id FROM public.reception_suppliers WHERE lower(code) = lower(v_sup) LIMIT 1;
    IF sup_id IS NULL THEN
      SELECT id INTO sup_id FROM public.reception_suppliers WHERE lower(nom) = lower(v_sup) LIMIT 1;
    END IF;
    IF sup_id IS NULL THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', format('Fournisseur %s introuvable', v_sup));
      CONTINUE;
    END IF;

    -- Produit
    SELECT id INTO prod_id FROM public.reception_products WHERE lower(code) = lower(v_prod) LIMIT 1;
    IF prod_id IS NULL THEN
      SELECT id INTO prod_id FROM public.reception_products WHERE lower(designation) = lower(v_prod) LIMIT 1;
    END IF;
    IF prod_id IS NULL THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', format('Produit %s introuvable', v_prod));
      CONTINUE;
    END IF;

    -- Campagne : couvrant la date, active, du produit ; sinon par défaut du produit
    SELECT id INTO camp_id FROM public.reception_campaigns
      WHERE product_id = prod_id AND actif = true
        AND v_date BETWEEN date_debut AND date_fin
      ORDER BY is_default DESC, date_debut DESC LIMIT 1;
    IF camp_id IS NULL THEN
      SELECT id INTO camp_id FROM public.reception_campaigns
        WHERE product_id = prod_id AND is_default = true LIMIT 1;
    END IF;
    IF camp_id IS NULL THEN
      SELECT id INTO camp_id FROM public.reception_campaigns
        WHERE product_id = prod_id ORDER BY date_debut DESC LIMIT 1;
    END IF;
    IF camp_id IS NULL THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', 'Aucune campagne pour ce produit');
      CONTINUE;
    END IF;

    -- Doublon
    SELECT id INTO existing_id FROM public.reception_tickets WHERE numero = v_numero;
    IF existing_id IS NOT NULL THEN
      IF on_conflict = 'ignore' THEN
        skipped := skipped + 1;
        errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', 'Doublon ignoré');
        CONTINUE;
      ELSE
        DELETE FROM public.reception_ticket_photos WHERE ticket_id = existing_id;
        DELETE FROM public.reception_weighings WHERE ticket_id = existing_id;
        DELETE FROM public.reception_tickets WHERE id = existing_id;
        replaced := replaced + 1;
      END IF;
    END IF;

    weighed_ts := (v_date + COALESCE(v_hf, v_hd, '12:00'::time))::timestamptz;

    INSERT INTO public.reception_tickets(
      numero, campaign_id, product_id, supplier_id, date_ticket,
      heure_debut, heure_fin, taux_abattement, commentaire, statut, created_by
    ) VALUES (
      v_numero, camp_id, prod_id, sup_id, v_date,
      v_hd, v_hf, v_abat, v_comment, 'pese_importe', auth.uid()
    ) RETURNING id INTO new_ticket_id;

    INSERT INTO public.reception_weighings(
      ticket_id, poids_brut_kg, taux_abattement_snapshot, weighed_by, weighed_at
    ) VALUES (
      new_ticket_id, v_brut, v_abat, auth.uid(), weighed_ts
    );

    IF existing_id IS NULL THEN
      imported := imported + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total', idx, 'imported', imported, 'replaced', replaced,
    'skipped', skipped, 'errors', errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_reception_tickets(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_reception_tickets(jsonb, text) TO authenticated;
