
CREATE TABLE public.scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  raw_value text NOT NULL,
  normalized_value text,
  source text NOT NULL DEFAULT 'camera',
  code_format text,
  outcome text NOT NULL,
  match_quality text,
  matches_count integer NOT NULL DEFAULT 0,
  entity_type text,
  entity_id uuid,
  entity_code text,
  entity_label text,
  context text,
  error_message text,
  search_vector tsvector
);

CREATE INDEX idx_scan_history_user_date ON public.scan_history (user_id, scanned_at DESC);
CREATE INDEX idx_scan_history_outcome ON public.scan_history (outcome);
CREATE INDEX idx_scan_history_entity ON public.scan_history (entity_type, entity_id);
CREATE INDEX idx_scan_history_search ON public.scan_history USING gin (search_vector);
CREATE INDEX idx_scan_history_scanned_at ON public.scan_history (scanned_at DESC);

CREATE OR REPLACE FUNCTION public.scan_history_search_refresh()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := public.fts_build(
    NEW.raw_value, NEW.normalized_value, NEW.code_format,
    NEW.outcome, NEW.entity_code, NEW.entity_label, NEW.context, NEW.error_message
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_scan_history_search
BEFORE INSERT OR UPDATE ON public.scan_history
FOR EACH ROW EXECUTE FUNCTION public.scan_history_search_refresh();

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own scans"
ON public.scan_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins and SI view all scans"
ON public.scan_history FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'responsable_si'::app_role)
);

CREATE POLICY "Users insert their own scans"
ON public.scan_history FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
