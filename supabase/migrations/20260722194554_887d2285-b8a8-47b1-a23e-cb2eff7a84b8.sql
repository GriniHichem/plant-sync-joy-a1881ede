CREATE OR REPLACE FUNCTION public.reception_weighings_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.reception_tickets
    WHERE id = NEW.ticket_id AND statut IN ('cloture','pese_importe')
  ) THEN
    RAISE EXCEPTION 'Le ticket doit être clôturé avant la pesée';
  END IF;
  RETURN NEW;
END; $$;