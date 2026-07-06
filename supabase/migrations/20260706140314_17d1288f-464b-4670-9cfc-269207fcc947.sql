
CREATE OR REPLACE FUNCTION public.get_maintenance_context_for_of(p_of_id uuid)
RETURNS TABLE (
  kind text,
  id uuid,
  numero text,
  label text,
  statut text,
  priorite text,
  machine_id uuid,
  ligne_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH of_ctx AS (
    SELECT o.id, o.line_id, pl.machine_id
    FROM public.ordres_fabrication o
    LEFT JOIN public.production_lines pl ON pl.id = o.line_id
    WHERE o.id = p_of_id
  )
  SELECT 'ticket'::text AS kind,
         t.id,
         t.numero,
         COALESCE(t.description, '') AS label,
         t.statut::text,
         t.priorite::text,
         t.machine_id,
         t.ligne_id
  FROM public.tickets t, of_ctx c
  WHERE t.statut::text NOT IN ('cloture', 'resolu', 'annule')
    AND (
      t.of_id = p_of_id
      OR (c.line_id IS NOT NULL AND t.ligne_id = c.line_id)
      OR (c.machine_id IS NOT NULL AND t.machine_id = c.machine_id)
    )
  UNION ALL
  SELECT 'preventive'::text AS kind,
         pp.id,
         pp.numero,
         COALESCE(pp.title, '') AS label,
         pp.statut_plan::text,
         NULL::text AS priorite,
         pp.machine_id,
         pp.line_id
  FROM public.preventive_plans pp, of_ctx c
  WHERE pp.statut_plan::text = 'actif'
    AND (
      (c.line_id IS NOT NULL AND pp.line_id = c.line_id)
      OR (c.machine_id IS NOT NULL AND pp.machine_id = c.machine_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_maintenance_context_for_of(uuid) TO authenticated;
