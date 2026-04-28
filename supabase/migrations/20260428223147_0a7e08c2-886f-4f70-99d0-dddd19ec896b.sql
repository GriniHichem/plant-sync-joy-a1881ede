-- Table des collaborateurs sur ticket
CREATE TABLE public.ticket_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_label text NOT NULL DEFAULT 'aide',
  added_by uuid,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  removed_by uuid,
  CONSTRAINT ticket_collaborators_role_chk CHECK (role_label IN ('aide','co_intervenant'))
);

CREATE UNIQUE INDEX ticket_collaborators_unique_active
  ON public.ticket_collaborators(ticket_id, user_id)
  WHERE removed_at IS NULL;

CREATE INDEX idx_ticket_collaborators_ticket ON public.ticket_collaborators(ticket_id);
CREATE INDEX idx_ticket_collaborators_user ON public.ticket_collaborators(user_id);

ALTER TABLE public.ticket_collaborators ENABLE ROW LEVEL SECURITY;

-- SELECT: tout authentifié
CREATE POLICY "Ticket collaborators viewable by authenticated"
ON public.ticket_collaborators FOR SELECT
TO authenticated
USING (true);

-- INSERT: admin/resp_maintenance, OU l'assignee du ticket (qui a pris en charge)
CREATE POLICY "Manage ticket collaborators by authorized"
ON public.ticket_collaborators FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'resp_maintenance'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND t.assignee_id = auth.uid()
  )
);

-- UPDATE (soft delete + role change)
CREATE POLICY "Update ticket collaborators by authorized"
ON public.ticket_collaborators FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'resp_maintenance'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND t.assignee_id = auth.uid()
  )
);

-- DELETE (admin uniquement; on privilégie soft delete via removed_at)
CREATE POLICY "Delete ticket collaborators by admin"
ON public.ticket_collaborators FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
