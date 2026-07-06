ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS quality_risk boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quality_risk_level text,
  ADD COLUMN IF NOT EXISTS quality_risk_note text,
  ADD COLUMN IF NOT EXISTS quality_production_decision text,
  ADD COLUMN IF NOT EXISTS quality_risk_declared_by uuid,
  ADD COLUMN IF NOT EXISTS quality_risk_declared_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_shift_id uuid,
  ADD COLUMN IF NOT EXISTS quality_check_id uuid,
  ADD COLUMN IF NOT EXISTS quality_nc_id uuid;

CREATE INDEX IF NOT EXISTS idx_tickets_quality_risk ON public.tickets (quality_risk) WHERE quality_risk = true;

CREATE OR REPLACE FUNCTION public.attach_quality_risk_to_ticket(
  p_ticket_id uuid,
  p_level text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_decision text DEFAULT NULL,
  p_shift_id uuid DEFAULT NULL,
  p_check_id uuid DEFAULT NULL,
  p_nc_id uuid DEFAULT NULL
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.tickets;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'controleur_qualite'::app_role)
    OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
    OR has_role(auth.uid(), 'directeur_qualite'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Accès refusé : rôle qualité requis';
  END IF;

  IF p_level IS NOT NULL AND p_level NOT IN ('mineur', 'majeur', 'critique') THEN
    RAISE EXCEPTION 'Gravité invalide';
  END IF;
  IF p_decision IS NOT NULL AND p_decision NOT IN ('arret', 'maintien') THEN
    RAISE EXCEPTION 'Décision production invalide';
  END IF;

  UPDATE public.tickets
  SET quality_risk = true,
      quality_risk_level = COALESCE(p_level, quality_risk_level),
      quality_risk_note = COALESCE(p_note, quality_risk_note),
      quality_production_decision = COALESCE(p_decision, quality_production_decision),
      quality_shift_id = COALESCE(p_shift_id, quality_shift_id),
      quality_check_id = COALESCE(p_check_id, quality_check_id),
      quality_nc_id = COALESCE(p_nc_id, quality_nc_id),
      quality_risk_declared_by = auth.uid(),
      quality_risk_declared_at = now(),
      updated_at = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Ticket introuvable';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_quality_risk_to_ticket(uuid, text, text, text, uuid, uuid, uuid) TO authenticated;