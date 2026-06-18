
-- Resolve / create a product family (and optional sub-family)
CREATE OR REPLACE FUNCTION public.import_resolve_prodfamily(_fam text, _sub text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _f uuid; _s uuid;
BEGIN
  _fam := nullif(trim(_fam), '');
  _sub := nullif(trim(_sub), '');
  IF _fam IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO _f FROM product_families WHERE lower(name) = lower(_fam) AND parent_id IS NULL LIMIT 1;
  IF _f IS NULL THEN
    INSERT INTO product_families(name) VALUES (_fam) RETURNING id INTO _f;
    INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
      VALUES (auth.uid(), 'create', 'product_families', _f, jsonb_build_object('name', _fam), 'create', 'parametres', 'product_family', _fam, _fam, 'Famille produit créée via import');
  END IF;
  IF _sub IS NULL THEN RETURN _f; END IF;
  SELECT id INTO _s FROM product_families WHERE lower(name) = lower(_sub) AND parent_id = _f LIMIT 1;
  IF _s IS NULL THEN
    INSERT INTO product_families(name, parent_id) VALUES (_sub, _f) RETURNING id INTO _s;
    INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
      VALUES (auth.uid(), 'create', 'product_families', _s, jsonb_build_object('name', _sub, 'parent_id', _f), 'create', 'parametres', 'product_family', _sub, _sub, 'Sous-famille produit créée via import');
  END IF;
  RETURN _s;
END; $$;

-- ===== IMPORT PRODUCTS (produits finis) =====
CREATE OR REPLACE FUNCTION public.import_products(_rows jsonb, _update_existing boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r jsonb; _idx int := 0;
  _created int := 0; _updated int := 0; _skipped int := 0;
  _errors jsonb := '[]'::jsonb;
  _code text; _fam uuid; _existing uuid; _id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé : administrateur requis'; END IF;
  FOR _r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    _idx := _idx + 1;
    BEGIN
      _code := nullif(trim(_r->>'code'), '');
      IF _code IS NULL OR nullif(trim(_r->>'designation'), '') IS NULL THEN
        RAISE EXCEPTION 'Code et désignation requis';
      END IF;
      _fam := import_resolve_prodfamily(_r->>'famille', _r->>'sous_famille');
      SELECT id INTO _existing FROM products WHERE lower(code) = lower(_code) LIMIT 1;
      IF _existing IS NOT NULL THEN
        IF _update_existing THEN
          UPDATE products SET
            designation = _r->>'designation',
            family_id = COALESCE(_fam, family_id),
            unite = COALESCE(nullif(trim(_r->>'unite'),''), unite),
            unite_base = COALESCE(nullif(trim(_r->>'unite_base'),''), unite_base),
            poids_unitaire = COALESCE(nullif(trim(_r->>'poids_unitaire'),'')::numeric, poids_unitaire),
            description = COALESCE(nullif(trim(_r->>'description'),''), description),
            code_erp = COALESCE(nullif(trim(_r->>'code_erp'),''), code_erp),
            updated_at = now()
          WHERE id = _existing;
          _updated := _updated + 1;
          INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
            VALUES (auth.uid(), 'update', 'products', _existing, to_jsonb(_r), 'update', 'gpao', 'product', _code, _r->>'designation', 'Produit mis à jour via import');
        ELSE
          _skipped := _skipped + 1;
        END IF;
      ELSE
        INSERT INTO products(code, designation, family_id, unite, unite_base, poids_unitaire, description, code_erp)
        VALUES (_code, _r->>'designation', _fam,
          COALESCE(nullif(trim(_r->>'unite'),''), 'g'),
          COALESCE(nullif(trim(_r->>'unite_base'),''), 'g'),
          COALESCE(nullif(trim(_r->>'poids_unitaire'),'')::numeric, 0),
          nullif(trim(_r->>'description'),''), nullif(trim(_r->>'code_erp'),''))
        RETURNING id INTO _id;
        _created := _created + 1;
        INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
          VALUES (auth.uid(), 'create', 'products', _id, to_jsonb(_r), 'create', 'gpao', 'product', _code, _r->>'designation', 'Produit créé via import');
      END IF;
    EXCEPTION WHEN others THEN
      _errors := _errors || jsonb_build_object('row', _idx, 'message', SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('created', _created, 'updated', _updated, 'skipped', _skipped, 'errors', _errors);
END; $$;

-- ===== IMPORT ARTICLES (items de consommation) =====
CREATE OR REPLACE FUNCTION public.import_articles(_rows jsonb, _update_existing boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r jsonb; _idx int := 0;
  _created int := 0; _updated int := 0; _skipped int := 0;
  _errors jsonb := '[]'::jsonb;
  _code text; _fam uuid; _existing uuid; _id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé : administrateur requis'; END IF;
  FOR _r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    _idx := _idx + 1;
    BEGIN
      _code := nullif(trim(_r->>'code'), '');
      IF _code IS NULL OR nullif(trim(_r->>'designation'), '') IS NULL THEN
        RAISE EXCEPTION 'Code et désignation requis';
      END IF;
      _fam := import_resolve_prodfamily(_r->>'famille', _r->>'sous_famille');
      SELECT id INTO _existing FROM articles WHERE lower(code) = lower(_code) LIMIT 1;
      IF _existing IS NOT NULL THEN
        IF _update_existing THEN
          UPDATE articles SET
            designation = _r->>'designation',
            family_id = COALESCE(_fam, family_id),
            unite = COALESCE(nullif(trim(_r->>'unite'),''), unite),
            stock_actuel = COALESCE(nullif(trim(_r->>'stock_actuel'),'')::numeric, stock_actuel),
            stock_min = COALESCE(nullif(trim(_r->>'stock_min'),'')::numeric, stock_min),
            prix_unitaire = COALESCE(nullif(trim(_r->>'prix_unitaire'),'')::numeric, prix_unitaire),
            fournisseur = COALESCE(nullif(trim(_r->>'fournisseur'),''), fournisseur),
            description = COALESCE(nullif(trim(_r->>'description'),''), description),
            code_erp = COALESCE(nullif(trim(_r->>'code_erp'),''), code_erp),
            updated_at = now()
          WHERE id = _existing;
          _updated := _updated + 1;
          INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
            VALUES (auth.uid(), 'update', 'articles', _existing, to_jsonb(_r), 'update', 'gpao', 'article', _code, _r->>'designation', 'Article mis à jour via import');
        ELSE
          _skipped := _skipped + 1;
        END IF;
      ELSE
        INSERT INTO articles(code, designation, family_id, unite, stock_actuel, stock_min, prix_unitaire, fournisseur, description, code_erp)
        VALUES (_code, _r->>'designation', _fam,
          COALESCE(nullif(trim(_r->>'unite'),''), 'g'),
          COALESCE(nullif(trim(_r->>'stock_actuel'),'')::numeric, 0),
          COALESCE(nullif(trim(_r->>'stock_min'),'')::numeric, 0),
          nullif(trim(_r->>'prix_unitaire'),'')::numeric,
          nullif(trim(_r->>'fournisseur'),''), nullif(trim(_r->>'description'),''), nullif(trim(_r->>'code_erp'),''))
        RETURNING id INTO _id;
        _created := _created + 1;
        INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
          VALUES (auth.uid(), 'create', 'articles', _id, to_jsonb(_r), 'create', 'gpao', 'article', _code, _r->>'designation', 'Article créé via import');
      END IF;
    EXCEPTION WHEN others THEN
      _errors := _errors || jsonb_build_object('row', _idx, 'message', SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('created', _created, 'updated', _updated, 'skipped', _skipped, 'errors', _errors);
END; $$;

GRANT EXECUTE ON FUNCTION public.import_resolve_prodfamily(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_products(jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_articles(jsonb, boolean) TO authenticated;
