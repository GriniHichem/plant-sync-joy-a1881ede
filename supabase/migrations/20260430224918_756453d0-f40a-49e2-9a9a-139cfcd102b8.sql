-- 1. Add missing columns
ALTER TABLE public.equipements
  ADD COLUMN IF NOT EXISTS code_erp text,
  ADD COLUMN IF NOT EXISTS qr_code text;

ALTER TABLE public.organes
  ADD COLUMN IF NOT EXISTS qr_code text,
  ADD COLUMN IF NOT EXISTS code_barres text;

-- 2. Partial indexes (fast scan resolution)
CREATE INDEX IF NOT EXISTS idx_machines_code_erp ON public.machines (lower(code_erp)) WHERE code_erp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_machines_qr_code  ON public.machines (lower(qr_code))  WHERE qr_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_equipements_code_erp ON public.equipements (lower(code_erp)) WHERE code_erp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipements_qr_code  ON public.equipements (lower(qr_code))  WHERE qr_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organes_code_erp     ON public.organes (lower(code_erp))     WHERE code_erp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organes_qr_code      ON public.organes (lower(qr_code))      WHERE qr_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organes_code_barres  ON public.organes (lower(code_barres))  WHERE code_barres IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pdr_code_erp     ON public.pdr (lower(code_erp))     WHERE code_erp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdr_qr_code      ON public.pdr (lower(qr_code))      WHERE qr_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdr_code_barres  ON public.pdr (lower(code_barres))  WHERE code_barres IS NOT NULL;

-- 3. Update FTS triggers to include new fields
CREATE OR REPLACE FUNCTION public.equipements_search_refresh()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector := public.fts_build(
    NEW.code, NEW.designation, NEW.description, NEW.localisation,
    NEW.marque, NEW.modele, NEW.numero_serie, NEW.code_erp, NEW.qr_code
  );
  RETURN NEW;
END$function$;

CREATE OR REPLACE FUNCTION public.organes_search_refresh()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector := public.fts_build(
    NEW.code, NEW.designation, NEW.description,
    NEW.marque, NEW.modele, NEW.fabricant,
    NEW.reference_constructeur, NEW.numero_serie, NEW.code_erp,
    NEW.qr_code, NEW.code_barres
  );
  RETURN NEW;
END$function$;

-- Refresh existing rows so new fields become searchable
UPDATE public.equipements SET updated_at = updated_at WHERE code_erp IS NOT NULL OR qr_code IS NOT NULL;
UPDATE public.organes     SET updated_at = updated_at WHERE qr_code IS NOT NULL OR code_barres IS NOT NULL;

-- 4. Scan resolver RPC
CREATE OR REPLACE FUNCTION public.resolve_scanned_code(p_code text)
 RETURNS TABLE(
   entity_type text,
   entity_id uuid,
   code text,
   label text,
   matched_field text,
   url text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  q text;
BEGIN
  IF p_code IS NULL OR length(btrim(p_code)) = 0 THEN RETURN; END IF;
  q := lower(btrim(p_code));

  -- PDR
  RETURN QUERY
  SELECT 'pdr'::text, p.id, p.reference, p.designation,
         CASE
           WHEN lower(p.code_erp) = q THEN 'code_erp'
           WHEN lower(p.qr_code) = q THEN 'qr_code'
           WHEN lower(p.code_barres) = q THEN 'code_barres'
           WHEN lower(p.reference) = q THEN 'reference'
           ELSE 'other'
         END,
         '/pdr/'||p.id::text
  FROM public.pdr p
  WHERE lower(p.code_erp) = q
     OR lower(p.qr_code) = q
     OR lower(p.code_barres) = q
     OR lower(p.reference) = q;

  -- Machines
  RETURN QUERY
  SELECT 'machine'::text, m.id, m.code, m.designation,
         CASE
           WHEN lower(m.code_erp) = q THEN 'code_erp'
           WHEN lower(m.qr_code) = q THEN 'qr_code'
           WHEN lower(m.code) = q THEN 'code'
           ELSE 'other'
         END,
         '/machines/'||m.id::text
  FROM public.machines m
  WHERE lower(m.code_erp) = q
     OR lower(m.qr_code) = q
     OR lower(m.code) = q;

  -- Equipements
  RETURN QUERY
  SELECT 'equipement'::text, e.id, e.code, e.designation,
         CASE
           WHEN lower(e.code_erp) = q THEN 'code_erp'
           WHEN lower(e.qr_code) = q THEN 'qr_code'
           WHEN lower(e.code) = q THEN 'code'
           ELSE 'other'
         END,
         '/equipements/'||e.id::text
  FROM public.equipements e
  WHERE lower(e.code_erp) = q
     OR lower(e.qr_code) = q
     OR lower(e.code) = q;

  -- Organes
  RETURN QUERY
  SELECT 'organe'::text, o.id, o.code, o.designation,
         CASE
           WHEN lower(o.code_erp) = q THEN 'code_erp'
           WHEN lower(o.qr_code) = q THEN 'qr_code'
           WHEN lower(o.code_barres) = q THEN 'code_barres'
           WHEN lower(o.code) = q THEN 'code'
           ELSE 'other'
         END,
         '/organes/'||o.id::text
  FROM public.organes o
  WHERE lower(o.code_erp) = q
     OR lower(o.qr_code) = q
     OR lower(o.code_barres) = q
     OR lower(o.code) = q;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.resolve_scanned_code(text) TO authenticated, anon;