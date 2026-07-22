
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
  v_abat numeric; v_brut numeric; v_net numeric;
  v_hd time; v_hf time; v_comment text;
  s_date text; s_hd text; s_hf text; s_brut text; s_net text; s_abat text;
  sup_id uuid; prod_id uuid; camp_id uuid;
  existing_id uuid;
  new_ticket_id uuid;
  weighed_ts timestamptz;

  FUNCTION_parse_num CONSTANT text := ''; -- placeholder pour lisibilité
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'responsable_si')) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF on_conflict NOT IN ('ignore','replace') THEN
    on_conflict := 'ignore';
  END IF;

  PERFORM set_config('prodintime.bypass_lock','on', true);

  FOR r IN SELECT * FROM jsonb_array_elements(rows) LOOP
    idx := idx + 1;
    v_numero := NULLIF(btrim(r->>'numero'),'');
    v_sup := NULLIF(btrim(r->>'fournisseur'),'');
    v_prod := NULLIF(btrim(r->>'produit'),'');
    v_hd := NULL; v_hf := NULL;
    v_comment := NULLIF(btrim(r->>'commentaire'),'');
    v_brut := NULL; v_net := NULL; v_abat := NULL;

    -- Alias date : accepte 'date', 'date_ticket'
    s_date := COALESCE(NULLIF(btrim(r->>'date'),''), NULLIF(btrim(r->>'date_ticket'),''));
    IF s_date IS NULL THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', 'Date manquante');
      CONTINUE;
    END IF;

    -- Parsing date tolérant : ISO puis JJ/MM/AAAA puis JJ-MM-AAAA
    v_date := NULL;
    BEGIN v_date := s_date::date; EXCEPTION WHEN OTHERS THEN NULL; END;
    IF v_date IS NULL THEN
      BEGIN v_date := to_date(s_date, 'DD/MM/YYYY'); EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    IF v_date IS NULL THEN
      BEGIN v_date := to_date(s_date, 'DD-MM-YYYY'); EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    IF v_date IS NULL THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', format('Date invalide (%s)', s_date));
      CONTINUE;
    END IF;

    -- Alias poids : 'poids_brut' | 'poids_brut_kg' | 'poids_net'
    s_brut := COALESCE(NULLIF(btrim(r->>'poids_brut'),''), NULLIF(btrim(r->>'poids_brut_kg'),''));
    s_net  := NULLIF(btrim(r->>'poids_net'),'');
    s_abat := COALESCE(NULLIF(btrim(r->>'taux_abattement'),''), '0');

    BEGIN v_abat := replace(replace(s_abat, ' ', ''), ',', '.')::numeric; EXCEPTION WHEN OTHERS THEN v_abat := NULL; END;

    IF s_brut IS NOT NULL THEN
      BEGIN v_brut := replace(replace(s_brut, ' ', ''), ',', '.')::numeric; EXCEPTION WHEN OTHERS THEN v_brut := NULL; END;
    ELSIF s_net IS NOT NULL THEN
      -- Poids net fourni : on force abattement = 0 et on utilise le net comme brut
      BEGIN v_net := replace(replace(s_net, ' ', ''), ',', '.')::numeric; EXCEPTION WHEN OTHERS THEN v_net := NULL; END;
      v_brut := v_net;
      v_abat := 0;
    END IF;

    IF v_numero IS NULL OR v_sup IS NULL OR v_prod IS NULL THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', 'Champs obligatoires manquants (N°/Fournisseur/Produit)');
      CONTINUE;
    END IF;

    IF v_brut IS NULL OR v_brut <= 0 THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', format('Poids invalide (%s)', COALESCE(s_brut, s_net)));
      CONTINUE;
    END IF;

    IF v_abat IS NULL OR v_abat < 0 OR v_abat > 100 THEN
      errors := errors || jsonb_build_object('row', idx, 'numero', v_numero, 'motif', format('Taux abattement hors [0,100] (%s)', s_abat));
      CONTINUE;
    END IF;

    -- Heures : nettoyage caractères parasites (ex: '08:m47:12' -> '08:47:12')
    s_hd := NULLIF(btrim(r->>'heure_debut'),'');
    s_hf := NULLIF(btrim(r->>'heure_fin'),'');
    IF s_hd IS NOT NULL THEN
      s_hd := regexp_replace(s_hd, '[^0-9:]', '', 'g');
      BEGIN v_hd := s_hd::time; EXCEPTION WHEN OTHERS THEN v_hd := NULL; END;
    END IF;
    IF s_hf IS NOT NULL THEN
      s_hf := regexp_replace(s_hf, '[^0-9:]', '', 'g');
      BEGIN v_hf := s_hf::time; EXCEPTION WHEN OTHERS THEN v_hf := NULL; END;
    END IF;

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

    -- Campagne
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
    'total', idx,
    'success', imported + replaced,
    'failed', jsonb_array_length(errors) - skipped,
    'created', imported,
    'replaced', replaced,
    'skipped', skipped,
    'errors', errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_reception_tickets(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_reception_tickets(jsonb, text) TO authenticated;
