-- 1. Add opened_by tracking on existing shift tables
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS opened_by uuid REFERENCES auth.users(id);
ALTER TABLE public.quality_shifts ADD COLUMN IF NOT EXISTS opened_by uuid REFERENCES auth.users(id);

-- 2. Create maintenance_shifts table
CREATE TABLE IF NOT EXISTS public.maintenance_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_shift date NOT NULL DEFAULT CURRENT_DATE,
  shift_type text NOT NULL DEFAULT 'matin',
  shift_team_id uuid REFERENCES public.shift_teams(id),
  maintenancier_id uuid NOT NULL REFERENCES auth.users(id),
  line_ids uuid[] NOT NULL DEFAULT '{}',
  heure_debut timestamptz NOT NULL DEFAULT now(),
  heure_fin timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  observations text,
  opened_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_shifts_maintenancier_active
  ON public.maintenance_shifts(maintenancier_id, is_active, date_shift);

ALTER TABLE public.maintenance_shifts ENABLE ROW LEVEL SECURITY;

-- RLS: maintenancier sees own; resp_maintenance/admin see all
CREATE POLICY "Maintenance shifts viewable by owner or managers"
  ON public.maintenance_shifts FOR SELECT
  USING (
    auth.uid() = maintenancier_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'resp_maintenance'::app_role)
    OR public.has_role(auth.uid(), 'auditeur'::app_role)
  );

CREATE POLICY "Maintenance shifts created by managers"
  ON public.maintenance_shifts FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'resp_maintenance'::app_role)
  );

CREATE POLICY "Maintenance shifts updatable by owner or managers"
  ON public.maintenance_shifts FOR UPDATE
  USING (
    auth.uid() = maintenancier_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'resp_maintenance'::app_role)
  );

CREATE POLICY "Maintenance shifts deletable by managers"
  ON public.maintenance_shifts FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'resp_maintenance'::app_role)
  );

CREATE TRIGGER trg_maintenance_shifts_updated_at
  BEFORE UPDATE ON public.maintenance_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live consoles
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_shifts;