
CREATE TABLE IF NOT EXISTS public.reception_ticket_orientations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.reception_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taux_recommande numeric(5,2) NOT NULL CHECK (taux_recommande >= 0 AND taux_recommande <= 100),
  explication text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rto_ticket ON public.reception_ticket_orientations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_rto_created ON public.reception_ticket_orientations(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_ticket_orientations TO authenticated;
GRANT ALL ON public.reception_ticket_orientations TO service_role;

ALTER TABLE public.reception_ticket_orientations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_reception_consult_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.module = 'reception_global'
      AND (rp.can_view OR rp.can_edit)
  ) OR public.has_role(_user_id, 'admin'::app_role);
$$;

DROP POLICY IF EXISTS rto_select ON public.reception_ticket_orientations;
CREATE POLICY rto_select ON public.reception_ticket_orientations
  FOR SELECT TO authenticated
  USING (public.has_reception_consult_access(auth.uid()));

DROP POLICY IF EXISTS rto_insert ON public.reception_ticket_orientations;
CREATE POLICY rto_insert ON public.reception_ticket_orientations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_reception_consult_access(auth.uid()));

DROP POLICY IF EXISTS rto_update ON public.reception_ticket_orientations;
CREATE POLICY rto_update ON public.reception_ticket_orientations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.has_reception_consult_access(auth.uid()))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rto_delete_admin ON public.reception_ticket_orientations;
CREATE POLICY rto_delete_admin ON public.reception_ticket_orientations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_rto_updated_at ON public.reception_ticket_orientations;
CREATE TRIGGER trg_rto_updated_at BEFORE UPDATE ON public.reception_ticket_orientations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.v_reception_orientations AS
SELECT
  o.id,
  o.ticket_id,
  o.user_id,
  o.taux_recommande,
  o.explication,
  o.created_at,
  o.updated_at,
  t.numero        AS ticket_numero,
  t.date_ticket   AS ticket_date,
  t.product_id,
  t.campaign_id,
  p.designation   AS produit_nom,
  c.libelle       AS campagne_nom,
  COALESCE(NULLIF(TRIM(CONCAT(pr.first_name, ' ', pr.last_name)), ''), 'Utilisateur') AS author_name
FROM public.reception_ticket_orientations o
JOIN public.reception_tickets t   ON t.id = o.ticket_id
LEFT JOIN public.reception_products p  ON p.id = t.product_id
LEFT JOIN public.reception_campaigns c ON c.id = t.campaign_id
LEFT JOIN public.profiles pr ON pr.user_id = o.user_id;

GRANT SELECT ON public.v_reception_orientations TO authenticated;
