
DROP FUNCTION IF EXISTS public.resolve_scanned_code(text);

CREATE OR REPLACE FUNCTION public.resolve_scanned_code(p_code text)
RETURNS TABLE(
  entity_type text,
  entity_id uuid,
  code text,
  label text,
  matched_field text,
  match_quality text,
  url text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  raw text;
  q text;
  qn text;
  uuid_val uuid;
  url_seg text;
  url_id uuid;
  found_any boolean := false;
BEGIN
  IF p_code IS NULL OR length(btrim(p_code)) = 0 THEN RETURN; END IF;
  raw := btrim(p_code);
  q := lower(raw);
  qn := regexp_replace(lower(unaccent(raw)), '[\s\-_/\\]+', '', 'g');

  -- 1) URL pattern in QR payload
  url_seg := substring(q from '/(pdr|machines|equipements|organes)/[0-9a-f-]{36}');
  IF url_seg IS NOT NULL THEN
    BEGIN
      url_id := substring(q from '/(?:pdr|machines|equipements|organes)/([0-9a-f-]{36})')::uuid;
    EXCEPTION WHEN others THEN url_id := NULL; END;
    IF url_id IS NOT NULL THEN
      IF url_seg LIKE '/pdr/%' THEN
        RETURN QUERY SELECT 'pdr'::text, p.id, p.reference, p.designation, 'url'::text, 'url'::text, '/pdr/'||p.id::text FROM public.pdr p WHERE p.id = url_id;
      ELSIF url_seg LIKE '/machines/%' THEN
        RETURN QUERY SELECT 'machine'::text, x.id, x.code, x.designation, 'url'::text, 'url'::text, '/machines/'||x.id::text FROM public.machines x WHERE x.id = url_id;
      ELSIF url_seg LIKE '/equipements/%' THEN
        RETURN QUERY SELECT 'equipement'::text, x.id, x.code, x.designation, 'url'::text, 'url'::text, '/equipements/'||x.id::text FROM public.equipements x WHERE x.id = url_id;
      ELSIF url_seg LIKE '/organes/%' THEN
        RETURN QUERY SELECT 'organe'::text, x.id, x.code, x.designation, 'url'::text, 'url'::text, '/organes/'||x.id::text FROM public.organes x WHERE x.id = url_id;
      END IF;
      GET DIAGNOSTICS found_any = ROW_COUNT;
      IF found_any THEN RETURN; END IF;
    END IF;
  END IF;

  -- 2) Raw UUID
  IF raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    uuid_val := raw::uuid;
    RETURN QUERY SELECT 'pdr'::text, p.id, p.reference, p.designation, 'id'::text, 'uuid'::text, '/pdr/'||p.id::text FROM public.pdr p WHERE p.id = uuid_val;
    RETURN QUERY SELECT 'machine'::text, x.id, x.code, x.designation, 'id'::text, 'uuid'::text, '/machines/'||x.id::text FROM public.machines x WHERE x.id = uuid_val;
    RETURN QUERY SELECT 'equipement'::text, x.id, x.code, x.designation, 'id'::text, 'uuid'::text, '/equipements/'||x.id::text FROM public.equipements x WHERE x.id = uuid_val;
    RETURN QUERY SELECT 'organe'::text, x.id, x.code, x.designation, 'id'::text, 'uuid'::text, '/organes/'||x.id::text FROM public.organes x WHERE x.id = uuid_val;
  END IF;

  -- 3) Exact match (case + accent + separators insensitive)
  RETURN QUERY
  SELECT 'pdr'::text, p.id, p.reference, p.designation,
         CASE
           WHEN lower(p.code_erp) = q OR regexp_replace(lower(unaccent(coalesce(p.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_erp'
           WHEN lower(p.qr_code) = q OR regexp_replace(lower(unaccent(coalesce(p.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'qr_code'
           WHEN lower(p.code_barres) = q OR regexp_replace(lower(unaccent(coalesce(p.code_barres,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_barres'
           ELSE 'reference'
         END,
         'exact'::text,
         '/pdr/'||p.id::text
  FROM public.pdr p
  WHERE lower(p.code_erp) = q OR lower(p.qr_code) = q OR lower(p.code_barres) = q OR lower(p.reference) = q
     OR regexp_replace(lower(unaccent(coalesce(p.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(p.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(p.code_barres,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(p.reference,''))), '[\s\-_/\\]+', '', 'g') = qn;

  RETURN QUERY
  SELECT 'machine'::text, x.id, x.code, x.designation,
         CASE
           WHEN lower(x.code_erp) = q OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_erp'
           WHEN lower(x.qr_code) = q OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'qr_code'
           ELSE 'code'
         END,
         'exact'::text,
         '/machines/'||x.id::text
  FROM public.machines x
  WHERE lower(x.code_erp) = q OR lower(x.qr_code) = q OR lower(x.code) = q
     OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.code,''))), '[\s\-_/\\]+', '', 'g') = qn;

  RETURN QUERY
  SELECT 'equipement'::text, x.id, x.code, x.designation,
         CASE
           WHEN lower(x.code_erp) = q OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_erp'
           WHEN lower(x.qr_code) = q OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'qr_code'
           ELSE 'code'
         END,
         'exact'::text,
         '/equipements/'||x.id::text
  FROM public.equipements x
  WHERE lower(x.code_erp) = q OR lower(x.qr_code) = q OR lower(x.code) = q
     OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.code,''))), '[\s\-_/\\]+', '', 'g') = qn;

  RETURN QUERY
  SELECT 'organe'::text, x.id, x.code, x.designation,
         CASE
           WHEN lower(x.code_erp) = q OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_erp'
           WHEN lower(x.qr_code) = q OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'qr_code'
           WHEN lower(x.code_barres) = q OR regexp_replace(lower(unaccent(coalesce(x.code_barres,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_barres'
           ELSE 'code'
         END,
         'exact'::text,
         '/organes/'||x.id::text
  FROM public.organes x
  WHERE lower(x.code_erp) = q OR lower(x.qr_code) = q OR lower(x.code_barres) = q OR lower(x.code) = q
     OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.code_barres,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.code,''))), '[\s\-_/\\]+', '', 'g') = qn;

  GET DIAGNOSTICS found_any = ROW_COUNT;
  IF found_any THEN RETURN; END IF;

  -- 4) Prefix fallback (>= 4 chars)
  IF length(q) >= 4 THEN
    RETURN QUERY
    SELECT 'pdr'::text, p.id, p.reference, p.designation, 'reference'::text, 'prefix'::text, '/pdr/'||p.id::text
    FROM public.pdr p
    WHERE lower(p.reference) LIKE q || '%' OR lower(coalesce(p.code_erp,'')) LIKE q || '%' OR lower(coalesce(p.code_barres,'')) LIKE q || '%'
    LIMIT 5;

    RETURN QUERY
    SELECT 'machine'::text, x.id, x.code, x.designation, 'code'::text, 'prefix'::text, '/machines/'||x.id::text
    FROM public.machines x
    WHERE lower(x.code) LIKE q || '%' OR lower(coalesce(x.code_erp,'')) LIKE q || '%'
    LIMIT 5;

    RETURN QUERY
    SELECT 'equipement'::text, x.id, x.code, x.designation, 'code'::text, 'prefix'::text, '/equipements/'||x.id::text
    FROM public.equipements x
    WHERE lower(x.code) LIKE q || '%' OR lower(coalesce(x.code_erp,'')) LIKE q || '%'
    LIMIT 5;

    RETURN QUERY
    SELECT 'organe'::text, x.id, x.code, x.designation, 'code'::text, 'prefix'::text, '/organes/'||x.id::text
    FROM public.organes x
    WHERE lower(x.code) LIKE q || '%' OR lower(coalesce(x.code_erp,'')) LIKE q || '%' OR lower(coalesce(x.code_barres,'')) LIKE q || '%'
    LIMIT 5;
  END IF;
END;
$function$;
