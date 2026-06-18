CREATE OR REPLACE FUNCTION public.global_search(q text, modules text[] DEFAULT NULL::text[], date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, limit_per_module integer DEFAULT 10)
 RETURNS TABLE(module text, entity_id uuid, code text, label text, snippet text, severity text, url text, updated_at timestamp with time zone, score real)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  ts_q tsquery;
  trgm_q text;
  want   text[];
BEGIN
  IF q IS NULL OR length(btrim(q)) = 0 THEN RETURN; END IF;

  trgm_q := lower(unaccent(btrim(q)));
  ts_q := websearch_to_tsquery('public.french_unaccent', q);

  want := COALESCE(modules, ARRAY[
    'machines','equipements','organes','lignes','pdr','tickets','interventions',
    'of','products','articles','recipes','preventif','arrets','consommations',
    'audit','notifications','validations','documents','pdr_movements','fournisseurs',
    'quality_nc','quality_actions'
  ]);

  IF 'machines' = ANY(want) THEN
    RETURN QUERY
    SELECT 'machines'::text, m.id, m.code, m.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', m.designation, m.description, m.localisation), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22,MinWords=5'),
           m.criticite::text, '/machines/'||m.id::text, m.updated_at,
           (ts_rank_cd(m.search_vector, ts_q) + similarity(coalesce(m.code,''), trgm_q))::real
    FROM public.machines m
    WHERE (m.search_vector @@ ts_q OR m.code ILIKE '%'||trgm_q||'%' OR m.designation % trgm_q)
      AND (date_from IS NULL OR m.updated_at >= date_from)
      AND (date_to IS NULL OR m.updated_at <= date_to)
    ORDER BY 9 DESC, m.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'equipements' = ANY(want) THEN
    RETURN QUERY
    SELECT 'equipements'::text, e.id, e.code, e.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', e.designation, e.description), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22,MinWords=5'),
           e.criticite::text, '/equipements/'||e.id::text, e.updated_at,
           (ts_rank_cd(e.search_vector, ts_q) + similarity(coalesce(e.code,''), trgm_q))::real
    FROM public.equipements e
    WHERE (e.search_vector @@ ts_q OR e.code ILIKE '%'||trgm_q||'%' OR e.designation % trgm_q)
      AND (date_from IS NULL OR e.updated_at >= date_from)
      AND (date_to IS NULL OR e.updated_at <= date_to)
    ORDER BY 9 DESC, e.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'organes' = ANY(want) THEN
    RETURN QUERY
    SELECT 'organes'::text, o.id, o.code, o.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', o.designation, o.description), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22,MinWords=5'),
           o.criticite::text, '/organes/'||o.id::text, o.updated_at,
           (ts_rank_cd(o.search_vector, ts_q) + similarity(coalesce(o.code,''), trgm_q))::real
    FROM public.organes o
    WHERE (o.search_vector @@ ts_q OR o.code ILIKE '%'||trgm_q||'%' OR o.designation % trgm_q)
      AND (date_from IS NULL OR o.updated_at >= date_from)
      AND (date_to IS NULL OR o.updated_at <= date_to)
    ORDER BY 9 DESC, o.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'lignes' = ANY(want) THEN
    RETURN QUERY
    SELECT 'lignes'::text, l.id, l.code, l.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', l.designation, l.description, l.atelier), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           NULL::text, '/lignes/'||l.id::text, l.updated_at,
           (ts_rank_cd(l.search_vector, ts_q))::real
    FROM public.production_lines l
    WHERE l.search_vector @@ ts_q
      AND (date_from IS NULL OR l.updated_at >= date_from)
      AND (date_to IS NULL OR l.updated_at <= date_to)
    ORDER BY 9 DESC, l.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'pdr' = ANY(want) THEN
    RETURN QUERY
    SELECT 'pdr'::text, p.id, p.reference, p.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', p.designation, p.description, p.fournisseur, p.emplacement), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22,MinWords=5'),
           p.statut_pdr::text, '/pdr/'||p.id::text, p.updated_at,
           (ts_rank_cd(p.search_vector, ts_q) + similarity(coalesce(p.reference,''), trgm_q))::real
    FROM public.pdr p
    WHERE (p.search_vector @@ ts_q OR p.reference ILIKE '%'||trgm_q||'%' OR p.designation % trgm_q)
      AND (date_from IS NULL OR p.updated_at >= date_from)
      AND (date_to IS NULL OR p.updated_at <= date_to)
    ORDER BY 9 DESC, p.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'tickets' = ANY(want) THEN
    RETURN QUERY
    SELECT 'tickets'::text, t.id, t.numero, left(coalesce(t.description,''),80),
           ts_headline('public.french_unaccent', concat_ws(' • ', t.description, t.cause_racine, t.solution), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=24,MinWords=6'),
           t.statut::text, '/tickets/'||t.id::text, t.updated_at,
           (ts_rank_cd(t.search_vector, ts_q) + similarity(coalesce(t.numero,''), trgm_q))::real
    FROM public.tickets t
    WHERE (t.search_vector @@ ts_q OR t.numero ILIKE '%'||trgm_q||'%')
      AND (date_from IS NULL OR t.updated_at >= date_from)
      AND (date_to IS NULL OR t.updated_at <= date_to)
    ORDER BY 9 DESC, t.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'interventions' = ANY(want) THEN
    RETURN QUERY
    SELECT 'interventions'::text, i.id, NULL::text, left(coalesce(i.description,''),80),
           ts_headline('public.french_unaccent', concat_ws(' • ', i.description, i.notes), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=24'),
           i.statut::text, '/tickets/'||i.ticket_id::text, i.updated_at,
           (ts_rank_cd(i.search_vector, ts_q))::real
    FROM public.interventions i
    WHERE i.search_vector @@ ts_q
      AND (date_from IS NULL OR i.updated_at >= date_from)
      AND (date_to IS NULL OR i.updated_at <= date_to)
    ORDER BY 9 DESC, i.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'of' = ANY(want) THEN
    RETURN QUERY
    SELECT 'of'::text, of.id, of.numero, NULL::text,
           ts_headline('public.french_unaccent', of.numero, ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=10'),
           of.statut::text, '/gpao/of/'||of.id::text, of.updated_at,
           (ts_rank_cd(of.search_vector, ts_q) + similarity(coalesce(of.numero,''), trgm_q))::real
    FROM public.ordres_fabrication of
    WHERE (of.search_vector @@ ts_q OR of.numero ILIKE '%'||trgm_q||'%')
      AND (date_from IS NULL OR of.updated_at >= date_from)
      AND (date_to IS NULL OR of.updated_at <= date_to)
    ORDER BY 9 DESC, of.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'products' = ANY(want) THEN
    RETURN QUERY
    SELECT 'products'::text, p.id, p.code, p.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', p.designation, p.description), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           NULL::text, '/gpao/produits/'||p.id::text, p.updated_at,
           (ts_rank_cd(p.search_vector, ts_q) + similarity(coalesce(p.code,''), trgm_q))::real
    FROM public.products p
    WHERE (p.search_vector @@ ts_q OR p.code ILIKE '%'||trgm_q||'%' OR p.designation % trgm_q)
      AND (date_from IS NULL OR p.updated_at >= date_from)
      AND (date_to IS NULL OR p.updated_at <= date_to)
    ORDER BY 9 DESC, p.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'articles' = ANY(want) THEN
    RETURN QUERY
    SELECT 'articles'::text, a.id, a.code, a.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', a.designation, a.description, a.fournisseur), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           NULL::text, '/gpao/articles/'||a.id::text, a.updated_at,
           (ts_rank_cd(a.search_vector, ts_q) + similarity(coalesce(a.code,''), trgm_q))::real
    FROM public.articles a
    WHERE (a.search_vector @@ ts_q OR a.code ILIKE '%'||trgm_q||'%' OR a.designation % trgm_q)
      AND (date_from IS NULL OR a.updated_at >= date_from)
      AND (date_to IS NULL OR a.updated_at <= date_to)
    ORDER BY 9 DESC, a.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'recipes' = ANY(want) THEN
    RETURN QUERY
    SELECT 'recipes'::text, r.id, r.version, r.name,
           ts_headline('public.french_unaccent', concat_ws(' • ', r.name, r.version, r.notes), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           r.status::text, '/gpao/recettes?recipe='||r.id::text, r.updated_at,
           (ts_rank_cd(r.search_vector, ts_q) + similarity(coalesce(r.name,''), trgm_q))::real
    FROM public.recipes r
    WHERE (r.search_vector @@ ts_q OR r.name % trgm_q)
      AND (date_from IS NULL OR r.updated_at >= date_from)
      AND (date_to IS NULL OR r.updated_at <= date_to)
    ORDER BY 9 DESC, r.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'preventif' = ANY(want) THEN
    RETURN QUERY
    SELECT 'preventif'::text, pp.id, NULL::text, pp.title,
           ts_headline('public.french_unaccent', concat_ws(' • ', pp.title, pp.description), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22'),
           pp.statut_plan::text, '/preventif/'||pp.id::text, pp.updated_at,
           (ts_rank_cd(pp.search_vector, ts_q))::real
    FROM public.preventive_plans pp
    WHERE pp.search_vector @@ ts_q
      AND (date_from IS NULL OR pp.updated_at >= date_from)
      AND (date_to IS NULL OR pp.updated_at <= date_to)
    ORDER BY 9 DESC, pp.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'arrets' = ANY(want) THEN
    RETURN QUERY
    SELECT 'arrets'::text, s.id, NULL::text, left(coalesce(s.description,''),80),
           ts_headline('public.french_unaccent', s.description, ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           s.type::text, '/gpao/arrets', s.updated_at,
           (ts_rank_cd(s.search_vector, ts_q))::real
    FROM public.production_stops s
    WHERE s.search_vector @@ ts_q
      AND (date_from IS NULL OR s.updated_at >= date_from)
      AND (date_to IS NULL OR s.updated_at <= date_to)
    ORDER BY 9 DESC, s.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'consommations' = ANY(want) THEN
    RETURN QUERY
    SELECT 'consommations'::text, c.id, NULL::text, left(coalesce(c.notes,''),80),
           ts_headline('public.french_unaccent', c.notes, ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           NULL::text, '/gpao/consommations', c.created_at,
           (ts_rank_cd(c.search_vector, ts_q))::real
    FROM public.consumptions c
    WHERE c.search_vector @@ ts_q
      AND (date_from IS NULL OR c.created_at >= date_from)
      AND (date_to IS NULL OR c.created_at <= date_to)
    ORDER BY 9 DESC, c.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'audit' = ANY(want) THEN
    RETURN QUERY
    SELECT 'audit'::text, a.id, a.entity_code, coalesce(a.action_label, a.action),
           ts_headline('public.french_unaccent', concat_ws(' • ', a.description, a.entity_label, a.user_full_name), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=24'),
           a.severity, '/audit', a.created_at,
           (ts_rank_cd(a.search_vector, ts_q))::real
    FROM public.audit_logs a
    WHERE a.search_vector @@ ts_q
      AND (date_from IS NULL OR a.created_at >= date_from)
      AND (date_to IS NULL OR a.created_at <= date_to)
    ORDER BY 9 DESC, a.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'notifications' = ANY(want) THEN
    RETURN QUERY
    SELECT 'notifications'::text, n.id, n.entity_code, n.title,
           ts_headline('public.french_unaccent', concat_ws(' • ', n.message, n.entity_label), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22'),
           n.severity::text, coalesce(n.action_url, '/notifications'), n.created_at,
           (ts_rank_cd(n.search_vector, ts_q))::real
    FROM public.notifications n
    WHERE n.search_vector @@ ts_q
      AND (date_from IS NULL OR n.created_at >= date_from)
      AND (date_to IS NULL OR n.created_at <= date_to)
    ORDER BY 9 DESC, n.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'validations' = ANY(want) THEN
    RETURN QUERY
    SELECT 'validations'::text, vr.id, vr.entity_code, vr.title,
           ts_headline('public.french_unaccent', concat_ws(' • ', vr.description, vr.justification, vr.validation_comment, vr.entity_label), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22'),
           vr.status::text, '/validations', vr.created_at,
           (ts_rank_cd(vr.search_vector, ts_q))::real
    FROM public.validation_requests vr
    WHERE vr.search_vector @@ ts_q
      AND (date_from IS NULL OR vr.created_at >= date_from)
      AND (date_to IS NULL OR vr.created_at <= date_to)
    ORDER BY 9 DESC, vr.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'documents' = ANY(want) THEN
    RETURN QUERY
    SELECT 'documents'::text, d.id, NULL::text, d.file_name,
           ts_headline('public.french_unaccent', concat_ws(' • ', d.file_name, d.description), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           d.entity_type, d.file_url, d.created_at,
           (ts_rank_cd(d.search_vector, ts_q))::real
    FROM public.entity_documents d
    WHERE d.search_vector @@ ts_q
      AND (date_from IS NULL OR d.created_at >= date_from)
      AND (date_to IS NULL OR d.created_at <= date_to)
    ORDER BY 9 DESC, d.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'pdr_movements' = ANY(want) THEN
    RETURN QUERY
    SELECT 'pdr_movements'::text, m.id, m.ref_document_erp, coalesce(m.motif, m.type::text),
           ts_headline('public.french_unaccent', concat_ws(' • ', m.motif, m.reference_source, m.ref_document_erp), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           m.type::text, '/pdr/'||m.pdr_id::text, m.created_at,
           (ts_rank_cd(m.search_vector, ts_q))::real
    FROM public.pdr_stock_movements m
    WHERE m.search_vector @@ ts_q
      AND (date_from IS NULL OR m.created_at >= date_from)
      AND (date_to IS NULL OR m.created_at <= date_to)
    ORDER BY 9 DESC, m.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'fournisseurs' = ANY(want) THEN
    RETURN QUERY
    SELECT 'fournisseurs'::text, s.id, s.reference_fournisseur, s.nom,
           ts_headline('public.french_unaccent', concat_ws(' • ', s.nom, s.adresse, s.email, s.notes), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22'),
           NULL::text, '/parametres', s.updated_at,
           (ts_rank_cd(s.search_vector, ts_q))::real
    FROM public.pdr_family_suppliers s
    WHERE s.search_vector @@ ts_q
      AND (date_from IS NULL OR s.updated_at >= date_from)
      AND (date_to IS NULL OR s.updated_at <= date_to)
    ORDER BY 9 DESC, s.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'quality_nc' = ANY(want) THEN
    RETURN QUERY
    SELECT 'quality_nc'::text, nc.id, nc.nc_number, nc.title,
           ts_headline('public.french_unaccent', concat_ws(' • ', nc.title, nc.description, nc.root_cause, nc.immediate_action), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=24'),
           nc.severity::text, '/qualite/non-conformites?id='||nc.id::text, nc.updated_at,
           (ts_rank_cd(nc.search_vector, ts_q) + similarity(coalesce(nc.nc_number,''), trgm_q))::real
    FROM public.quality_non_conformities nc
    WHERE (nc.search_vector @@ ts_q OR nc.nc_number ILIKE '%'||trgm_q||'%')
      AND (date_from IS NULL OR nc.updated_at >= date_from)
      AND (date_to IS NULL OR nc.updated_at <= date_to)
    ORDER BY 9 DESC, nc.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'quality_actions' = ANY(want) THEN
    RETURN QUERY
    SELECT 'quality_actions'::text, qa.id, NULL::text, qa.title,
           ts_headline('public.french_unaccent', concat_ws(' • ', qa.title, qa.description, qa.verification_comment), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22'),
           qa.status::text, '/qualite/actions?id='||qa.id::text, qa.updated_at,
           (ts_rank_cd(qa.search_vector, ts_q))::real
    FROM public.quality_actions qa
    WHERE qa.search_vector @@ ts_q
      AND (date_from IS NULL OR qa.updated_at >= date_from)
      AND (date_to IS NULL OR qa.updated_at <= date_to)
    ORDER BY 9 DESC, qa.updated_at DESC LIMIT limit_per_module;
  END IF;
END;
$function$;