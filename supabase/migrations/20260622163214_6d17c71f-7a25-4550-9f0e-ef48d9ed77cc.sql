CREATE OR REPLACE FUNCTION public.generate_ticket_numero()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.tickets
  WHERE numero ~ '^TKT-[0-9]+$';
  NEW.numero := 'TKT-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;