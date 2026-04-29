
ALTER TABLE public.quality_control_points
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global','line','of','mixed'));

CREATE TABLE IF NOT EXISTS public.quality_control_point_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_point_id uuid NOT NULL REFERENCES public.quality_control_points(id) ON DELETE CASCADE,
  production_line_id uuid NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (control_point_id, production_line_id)
);
CREATE INDEX IF NOT EXISTS idx_qcpl_cp ON public.quality_control_point_lines(control_point_id);
CREATE INDEX IF NOT EXISTS idx_qcpl_line ON public.quality_control_point_lines(production_line_id);

CREATE TABLE IF NOT EXISTS public.quality_control_point_ofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_point_id uuid NOT NULL REFERENCES public.quality_control_points(id) ON DELETE CASCADE,
  of_id uuid NOT NULL REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (control_point_id, of_id)
);
CREATE INDEX IF NOT EXISTS idx_qcpo_cp ON public.quality_control_point_ofs(control_point_id);
CREATE INDEX IF NOT EXISTS idx_qcpo_of ON public.quality_control_point_ofs(of_id);

ALTER TABLE public.quality_control_point_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_control_point_ofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qcpl_select_authenticated" ON public.quality_control_point_lines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qcpl_mutate_admin_or_qa" ON public.quality_control_point_lines
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'responsable_si'::app_role)
    OR public.has_quality_permission(auth.uid(),'manage_assignments')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'responsable_si'::app_role)
    OR public.has_quality_permission(auth.uid(),'manage_assignments')
  );

CREATE POLICY "qcpo_select_authenticated" ON public.quality_control_point_ofs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qcpo_mutate_admin_or_qa" ON public.quality_control_point_ofs
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'responsable_si'::app_role)
    OR public.has_quality_permission(auth.uid(),'manage_assignments')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'responsable_si'::app_role)
    OR public.has_quality_permission(auth.uid(),'manage_assignments')
  );
