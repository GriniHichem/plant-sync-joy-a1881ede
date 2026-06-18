
-- Generic enum value validator: empty -> default, invalid -> raise
CREATE OR REPLACE FUNCTION public.import_enum(_val text, _allowed text[], _default text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v text;
BEGIN
  v := nullif(trim(_val), '');
  IF v IS NULL THEN RETURN _default; END IF;
  v := lower(v);
  IF NOT (v = ANY(_allowed)) THEN
    RAISE EXCEPTION 'Valeur invalide "%" (attendu: %)', _val, array_to_string(_allowed, ', ');
  END IF;
  RETURN v;
END; $$;

-- Resolve / create a machine family (and optional sub-family)
CREATE OR REPLACE FUNCTION public.import_resolve_mfamily(_fam text, _sub text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _f uuid; _s uuid;
BEGIN
  _fam := nullif(trim(_fam), '');
  _sub := nullif(trim(_sub), '');
  IF _fam IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO _f FROM machine_families WHERE lower(name) = lower(_fam) AND parent_id IS NULL LIMIT 1;
  IF _f IS NULL THEN
    INSERT INTO machine_families(name) VALUES (_fam) RETURNING id INTO _f;
    INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
      VALUES (auth.uid(), 'create', 'machine_families', _f, jsonb_build_object('name', _fam), 'create', 'parametres', 'machine_family', _fam, _fam, 'Famille machine créée via import');
  END IF;
  IF _sub IS NULL THEN RETURN _f; END IF;
  SELECT id INTO _s FROM machine_families WHERE lower(name) = lower(_sub) AND parent_id = _f LIMIT 1;
  IF _s IS NULL THEN
    INSERT INTO machine_families(name, parent_id) VALUES (_sub, _f) RETURNING id INTO _s;
    INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
      VALUES (auth.uid(), 'create', 'machine_families', _s, jsonb_build_object('name', _sub, 'parent_id', _f), 'create', 'parametres', 'machine_family', _sub, _sub, 'Sous-famille machine créée via import');
  END IF;
  RETURN _s;
END; $$;

-- Resolve / create a PDR family (and optional sub-family)
CREATE OR REPLACE FUNCTION public.import_resolve_pfamily(_fam text, _sub text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _f uuid; _s uuid;
BEGIN
  _fam := nullif(trim(_fam), '');
  _sub := nullif(trim(_sub), '');
  IF _fam IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO _f FROM pdr_families WHERE lower(name) = lower(_fam) AND parent_id IS NULL LIMIT 1;
  IF _f IS NULL THEN
    INSERT INTO pdr_families(name) VALUES (_fam) RETURNING id INTO _f;
    INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
      VALUES (auth.uid(), 'create', 'pdr_families', _f, jsonb_build_object('name', _fam), 'create', 'parametres', 'pdr_family', _fam, _fam, 'Famille PDR créée via import');
  END IF;
  IF _sub IS NULL THEN RETURN _f; END IF;
  SELECT id INTO _s FROM pdr_families WHERE lower(name) = lower(_sub) AND parent_id = _f LIMIT 1;
  IF _s IS NULL THEN
    INSERT INTO pdr_families(name, parent_id) VALUES (_sub, _f) RETURNING id INTO _s;
    INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
      VALUES (auth.uid(), 'create', 'pdr_families', _s, jsonb_build_object('name', _sub, 'parent_id', _f), 'create', 'parametres', 'pdr_family', _sub, _sub, 'Sous-famille PDR créée via import');
  END IF;
  RETURN _s;
END; $$;

-- ===== IMPORT MACHINES =====
CREATE OR REPLACE FUNCTION public.import_machines(_rows jsonb, _update_existing boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r jsonb; _idx int := 0;
  _created int := 0; _updated int := 0; _skipped int := 0;
  _errors jsonb := '[]'::jsonb;
  _code text; _fam uuid; _existing uuid; _id uuid;
  _crit text; _stat text; _date date;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé : administrateur requis'; END IF;
  FOR _r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    _idx := _idx + 1;
    BEGIN
      _code := nullif(trim(_r->>'code'), '');
      IF _code IS NULL OR nullif(trim(_r->>'designation'), '') IS NULL THEN
        RAISE EXCEPTION 'Code et désignation requis';
      END IF;
      _fam := import_resolve_mfamily(_r->>'famille', _r->>'sous_famille');
      _crit := import_enum(_r->>'criticite', ARRAY['a','b','c'], 'c');
      _stat := import_enum(_r->>'statut', ARRAY['en_marche','arret','maintenance'], 'en_marche');
      _date := nullif(trim(_r->>'date_mise_en_service'), '')::date;
      SELECT id INTO _existing FROM machines WHERE lower(code) = lower(_code) LIMIT 1;
      IF _existing IS NOT NULL THEN
        IF _update_existing THEN
          UPDATE machines SET
            designation = _r->>'designation',
            family_id = COALESCE(_fam, family_id),
            criticite = upper(_crit)::criticite,
            statut = _stat::machine_statut,
            localisation = COALESCE(nullif(trim(_r->>'localisation'),''), localisation),
            marque = COALESCE(nullif(trim(_r->>'marque'),''), marque),
            modele = COALESCE(nullif(trim(_r->>'modele'),''), modele),
            numero_serie = COALESCE(nullif(trim(_r->>'numero_serie'),''), numero_serie),
            date_mise_en_service = COALESCE(_date, date_mise_en_service),
            description = COALESCE(nullif(trim(_r->>'description'),''), description),
            code_erp = COALESCE(nullif(trim(_r->>'code_erp'),''), code_erp),
            updated_at = now()
          WHERE id = _existing;
          _updated := _updated + 1;
          INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
            VALUES (auth.uid(), 'update', 'machines', _existing, to_jsonb(_r), 'update', 'gmao', 'machine', _code, _r->>'designation', 'Machine mise à jour via import');
        ELSE
          _skipped := _skipped + 1;
        END IF;
      ELSE
        INSERT INTO machines(code, designation, family_id, criticite, statut, localisation, marque, modele, numero_serie, date_mise_en_service, description, code_erp)
        VALUES (_code, _r->>'designation', _fam, upper(_crit)::criticite, _stat::machine_statut,
          nullif(trim(_r->>'localisation'),''), nullif(trim(_r->>'marque'),''), nullif(trim(_r->>'modele'),''),
          nullif(trim(_r->>'numero_serie'),''), _date, nullif(trim(_r->>'description'),''), nullif(trim(_r->>'code_erp'),''))
        RETURNING id INTO _id;
        _created := _created + 1;
        INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
          VALUES (auth.uid(), 'create', 'machines', _id, to_jsonb(_r), 'create', 'gmao', 'machine', _code, _r->>'designation', 'Machine créée via import');
      END IF;
    EXCEPTION WHEN others THEN
      _errors := _errors || jsonb_build_object('row', _idx, 'message', SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('created', _created, 'updated', _updated, 'skipped', _skipped, 'errors', _errors);
END; $$;

-- ===== IMPORT EQUIPEMENTS =====
CREATE OR REPLACE FUNCTION public.import_equipements(_rows jsonb, _update_existing boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r jsonb; _idx int := 0;
  _created int := 0; _updated int := 0; _skipped int := 0;
  _errors jsonb := '[]'::jsonb;
  _code text; _fam uuid; _existing uuid; _id uuid;
  _machine uuid; _line uuid; _mcode text; _lcode text;
  _type text; _stat text; _crit text; _critm text; _role text; _date date;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé : administrateur requis'; END IF;
  FOR _r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    _idx := _idx + 1;
    BEGIN
      _code := nullif(trim(_r->>'code'), '');
      IF _code IS NULL OR nullif(trim(_r->>'designation'), '') IS NULL THEN
        RAISE EXCEPTION 'Code et désignation requis';
      END IF;
      _fam := import_resolve_mfamily(_r->>'famille', _r->>'sous_famille');
      _mcode := nullif(trim(_r->>'machine_parent_code'), '');
      _machine := NULL;
      IF _mcode IS NOT NULL THEN
        SELECT id INTO _machine FROM machines WHERE lower(code) = lower(_mcode) LIMIT 1;
        IF _machine IS NULL THEN RAISE EXCEPTION 'Machine parente introuvable: %', _mcode; END IF;
      END IF;
      _lcode := nullif(trim(_r->>'ligne'), '');
      _line := NULL;
      IF _lcode IS NOT NULL THEN
        SELECT id INTO _line FROM production_lines WHERE lower(code) = lower(_lcode) OR lower(designation) = lower(_lcode) LIMIT 1;
        IF _line IS NULL THEN RAISE EXCEPTION 'Ligne de production introuvable: %', _lcode; END IF;
      END IF;
      _type := import_enum(_r->>'type', ARRAY['capteur','actionneur','convoyeur','peripherique','utilite','sous_ensemble','instrument','autre'], 'autre');
      _stat := import_enum(_r->>'statut', ARRAY['en_service','hors_service','en_maintenance','reforme'], 'en_service');
      _crit := import_enum(_r->>'criticite', ARRAY['a','b','c'], 'c');
      _critm := import_enum(_r->>'criticite_maintenance', ARRAY['faible','moyenne','elevee','critique'], 'moyenne');
      _role := import_enum(_r->>'role_fonctionnel', ARRAY['alimentation','transformation','dosage','melange','convoyage','conditionnement','controle','evacuation','utilite','autre'], 'autre');
      _date := nullif(trim(_r->>'date_mise_en_service'), '')::date;
      SELECT id INTO _existing FROM equipements WHERE lower(code) = lower(_code) LIMIT 1;
      IF _existing IS NOT NULL THEN
        IF _update_existing THEN
          UPDATE equipements SET
            designation = _r->>'designation',
            family_id = COALESCE(_fam, family_id),
            machine_id = COALESCE(_machine, machine_id),
            line_id = COALESCE(_line, line_id),
            type = _type::equipement_type,
            statut = _stat::equipement_statut,
            criticite = upper(_crit)::criticite,
            criticite_maintenance = _critm::criticite_maintenance,
            role_fonctionnel = _role::role_fonctionnel,
            marque = COALESCE(nullif(trim(_r->>'marque'),''), marque),
            modele = COALESCE(nullif(trim(_r->>'modele'),''), modele),
            numero_serie = COALESCE(nullif(trim(_r->>'numero_serie'),''), numero_serie),
            localisation = COALESCE(nullif(trim(_r->>'localisation'),''), localisation),
            date_mise_en_service = COALESCE(_date, date_mise_en_service),
            description = COALESCE(nullif(trim(_r->>'description'),''), description),
            code_erp = COALESCE(nullif(trim(_r->>'code_erp'),''), code_erp),
            updated_at = now()
          WHERE id = _existing;
          _updated := _updated + 1;
          INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
            VALUES (auth.uid(), 'update', 'equipements', _existing, to_jsonb(_r), 'update', 'gmao', 'equipement', _code, _r->>'designation', 'Équipement mis à jour via import');
        ELSE
          _skipped := _skipped + 1;
        END IF;
      ELSE
        INSERT INTO equipements(code, designation, family_id, machine_id, line_id, type, statut, criticite, criticite_maintenance, role_fonctionnel, marque, modele, numero_serie, localisation, date_mise_en_service, description, code_erp)
        VALUES (_code, _r->>'designation', _fam, _machine, _line, _type::equipement_type, _stat::equipement_statut, upper(_crit)::criticite, _critm::criticite_maintenance, _role::role_fonctionnel,
          nullif(trim(_r->>'marque'),''), nullif(trim(_r->>'modele'),''), nullif(trim(_r->>'numero_serie'),''), nullif(trim(_r->>'localisation'),''), _date, nullif(trim(_r->>'description'),''), nullif(trim(_r->>'code_erp'),''))
        RETURNING id INTO _id;
        _created := _created + 1;
        INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
          VALUES (auth.uid(), 'create', 'equipements', _id, to_jsonb(_r), 'create', 'gmao', 'equipement', _code, _r->>'designation', 'Équipement créé via import');
      END IF;
    EXCEPTION WHEN others THEN
      _errors := _errors || jsonb_build_object('row', _idx, 'message', SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('created', _created, 'updated', _updated, 'skipped', _skipped, 'errors', _errors);
END; $$;

-- ===== IMPORT ORGANES =====
CREATE OR REPLACE FUNCTION public.import_organes(_rows jsonb, _update_existing boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r jsonb; _idx int := 0;
  _created int := 0; _updated int := 0; _skipped int := 0;
  _errors jsonb := '[]'::jsonb;
  _code text; _existing uuid; _id uuid;
  _machine uuid; _equip uuid; _mcode text; _ecode text;
  _type text; _stat text; _crit text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé : administrateur requis'; END IF;
  FOR _r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    _idx := _idx + 1;
    BEGIN
      _code := nullif(trim(_r->>'code'), '');
      IF _code IS NULL OR nullif(trim(_r->>'designation'), '') IS NULL THEN
        RAISE EXCEPTION 'Code et désignation requis';
      END IF;
      _mcode := nullif(trim(_r->>'machine_parent_code'), '');
      _ecode := nullif(trim(_r->>'equipement_parent_code'), '');
      _machine := NULL; _equip := NULL;
      IF _mcode IS NOT NULL THEN
        SELECT id INTO _machine FROM machines WHERE lower(code) = lower(_mcode) LIMIT 1;
        IF _machine IS NULL THEN RAISE EXCEPTION 'Machine parente introuvable: %', _mcode; END IF;
      END IF;
      IF _ecode IS NOT NULL THEN
        SELECT id INTO _equip FROM equipements WHERE lower(code) = lower(_ecode) LIMIT 1;
        IF _equip IS NULL THEN RAISE EXCEPTION 'Équipement parent introuvable: %', _ecode; END IF;
      END IF;
      IF _machine IS NULL AND _equip IS NULL THEN
        RAISE EXCEPTION 'Parent requis: machine_parent_code ou equipement_parent_code';
      END IF;
      _type := import_enum(_r->>'type', ARRAY['mecanique','electrique','pneumatique','hydraulique','electronique','automatisme','instrumentation','autre'], 'autre');
      _stat := import_enum(_r->>'statut', ARRAY['en_service','en_panne','en_maintenance','hors_service'], 'en_service');
      _crit := import_enum(_r->>'criticite', ARRAY['a','b','c'], 'c');
      SELECT id INTO _existing FROM organes WHERE lower(code) = lower(_code) LIMIT 1;
      IF _existing IS NOT NULL THEN
        IF _update_existing THEN
          UPDATE organes SET
            designation = _r->>'designation',
            machine_id = COALESCE(_machine, machine_id),
            equipement_id = COALESCE(_equip, equipement_id),
            type = _type::organe_type,
            statut = _stat::organe_statut,
            criticite = upper(_crit)::criticite,
            description = COALESCE(nullif(trim(_r->>'description'),''), description),
            updated_at = now()
          WHERE id = _existing;
          _updated := _updated + 1;
          INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
            VALUES (auth.uid(), 'update', 'organes', _existing, to_jsonb(_r), 'update', 'gmao', 'organe', _code, _r->>'designation', 'Organe mis à jour via import');
        ELSE
          _skipped := _skipped + 1;
        END IF;
      ELSE
        INSERT INTO organes(code, designation, machine_id, equipement_id, type, statut, criticite, description)
        VALUES (_code, _r->>'designation', _machine, _equip, _type::organe_type, _stat::organe_statut, upper(_crit)::criticite, nullif(trim(_r->>'description'),''))
        RETURNING id INTO _id;
        _created := _created + 1;
        INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
          VALUES (auth.uid(), 'create', 'organes', _id, to_jsonb(_r), 'create', 'gmao', 'organe', _code, _r->>'designation', 'Organe créé via import');
      END IF;
    EXCEPTION WHEN others THEN
      _errors := _errors || jsonb_build_object('row', _idx, 'message', SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('created', _created, 'updated', _updated, 'skipped', _skipped, 'errors', _errors);
END; $$;

-- ===== IMPORT PDR =====
CREATE OR REPLACE FUNCTION public.import_pdr(_rows jsonb, _update_existing boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r jsonb; _idx int := 0;
  _created int := 0; _updated int := 0; _skipped int := 0;
  _errors jsonb := '[]'::jsonb;
  _ref text; _fam uuid; _existing uuid; _id uuid;
  _statp text; _appro text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé : administrateur requis'; END IF;
  FOR _r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    _idx := _idx + 1;
    BEGIN
      _ref := nullif(trim(_r->>'reference'), '');
      IF _ref IS NULL OR nullif(trim(_r->>'designation'), '') IS NULL THEN
        RAISE EXCEPTION 'Référence et désignation requises';
      END IF;
      _fam := import_resolve_pfamily(_r->>'famille', _r->>'sous_famille');
      _statp := import_enum(_r->>'statut_pdr', ARRAY['strategique','commune'], 'commune');
      _appro := import_enum(_r->>'approvisionnement', ARRAY['local','importation','mixte'], 'local');
      SELECT id INTO _existing FROM pdr WHERE lower(reference) = lower(_ref) LIMIT 1;
      IF _existing IS NOT NULL THEN
        IF _update_existing THEN
          UPDATE pdr SET
            designation = _r->>'designation',
            family_id = COALESCE(_fam, family_id),
            statut_pdr = _statp::statut_pdr,
            approvisionnement = _appro::approvisionnement_type,
            stock_actuel = COALESCE(nullif(trim(_r->>'stock_actuel'),'')::numeric, stock_actuel),
            stock_min = COALESCE(nullif(trim(_r->>'stock_min'),'')::numeric, stock_min),
            stock_max = COALESCE(nullif(trim(_r->>'stock_max'),'')::numeric, stock_max),
            stock_securite = COALESCE(nullif(trim(_r->>'stock_securite'),'')::numeric, stock_securite),
            point_commande = COALESCE(nullif(trim(_r->>'point_commande'),'')::numeric, point_commande),
            delai_approvisionnement = COALESCE(nullif(trim(_r->>'delai_approvisionnement'),'')::integer, delai_approvisionnement),
            pmp = COALESCE(nullif(trim(_r->>'pmp'),'')::numeric, pmp),
            devise = COALESCE(nullif(trim(_r->>'devise'),''), devise),
            updated_at = now()
          WHERE id = _existing;
          _updated := _updated + 1;
          INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
            VALUES (auth.uid(), 'update', 'pdr', _existing, to_jsonb(_r), 'update', 'pdr', 'pdr', _ref, _r->>'designation', 'PDR mis à jour via import');
        ELSE
          _skipped := _skipped + 1;
        END IF;
      ELSE
        INSERT INTO pdr(reference, designation, family_id, statut_pdr, approvisionnement, stock_actuel, stock_min, stock_max, stock_securite, point_commande, delai_approvisionnement, pmp, devise)
        VALUES (_ref, _r->>'designation', _fam, _statp::statut_pdr, _appro::approvisionnement_type,
          COALESCE(nullif(trim(_r->>'stock_actuel'),'')::numeric, 0),
          COALESCE(nullif(trim(_r->>'stock_min'),'')::numeric, 0),
          COALESCE(nullif(trim(_r->>'stock_max'),'')::numeric, 0),
          COALESCE(nullif(trim(_r->>'stock_securite'),'')::numeric, 0),
          COALESCE(nullif(trim(_r->>'point_commande'),'')::numeric, 0),
          COALESCE(nullif(trim(_r->>'delai_approvisionnement'),'')::integer, 0),
          COALESCE(nullif(trim(_r->>'pmp'),'')::numeric, 0),
          COALESCE(nullif(trim(_r->>'devise'),''), 'DA'))
        RETURNING id INTO _id;
        _created := _created + 1;
        INSERT INTO audit_logs(user_id, action, table_name, record_id, new_values, action_type, module, entity_type, entity_code, entity_label, description)
          VALUES (auth.uid(), 'create', 'pdr', _id, to_jsonb(_r), 'create', 'pdr', 'pdr', _ref, _r->>'designation', 'PDR créé via import');
      END IF;
    EXCEPTION WHEN others THEN
      _errors := _errors || jsonb_build_object('row', _idx, 'message', SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('created', _created, 'updated', _updated, 'skipped', _skipped, 'errors', _errors);
END; $$;

GRANT EXECUTE ON FUNCTION public.import_machines(jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_equipements(jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_organes(jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_pdr(jsonb, boolean) TO authenticated;
