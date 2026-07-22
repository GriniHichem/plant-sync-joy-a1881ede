ALTER TABLE public.reception_tickets DROP CONSTRAINT IF EXISTS reception_tickets_statut_check;
ALTER TABLE public.reception_tickets ADD CONSTRAINT reception_tickets_statut_check CHECK (statut = ANY (ARRAY['ouvert'::text, 'cloture'::text, 'annule'::text]));
ALTER TABLE public.reception_tickets ADD COLUMN IF NOT EXISTS motif_annulation text;
ALTER TABLE public.reception_tickets ADD COLUMN IF NOT EXISTS annule_at timestamptz;
ALTER TABLE public.reception_tickets ADD COLUMN IF NOT EXISTS annule_by uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.cancel_reception_ticket(_ticket_id uuid, _motif text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statut text;
BEGIN
  IF _motif IS NULL OR length(btrim(_motif)) < 3 THEN
    RAISE EXCEPTION 'Motif d''annulation requis';
  END IF;
  SELECT statut INTO v_statut FROM public.reception_tickets WHERE id = _ticket_id FOR UPDATE;
  IF v_statut IS NULL THEN RAISE EXCEPTION 'Ticket introuvable'; END IF;
  IF v_statut <> 'ouvert' THEN RAISE EXCEPTION 'Seul un ticket ouvert peut être annulé'; END IF;

  DELETE FROM public.reception_ticket_photos WHERE ticket_id = _ticket_id;
  UPDATE public.reception_tickets
     SET statut = 'annule',
         motif_annulation = btrim(_motif),
         annule_at = now(),
         annule_by = auth.uid()
   WHERE id = _ticket_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_reception_ticket(uuid, text) TO authenticated;