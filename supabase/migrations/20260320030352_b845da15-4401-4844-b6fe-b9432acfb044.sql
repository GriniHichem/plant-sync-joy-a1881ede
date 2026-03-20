
-- 1. Add lifetime columns to pdr
ALTER TABLE public.pdr ADD COLUMN IF NOT EXISTS duree_vie_min_jours integer DEFAULT NULL;
ALTER TABLE public.pdr ADD COLUMN IF NOT EXISTS duree_vie_max_jours integer DEFAULT NULL;

-- 2. Create pdr_instances table
CREATE TABLE IF NOT EXISTS public.pdr_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdr_id uuid NOT NULL REFERENCES public.pdr(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  equipement_id uuid REFERENCES public.equipements(id) ON DELETE SET NULL,
  date_installation timestamptz NOT NULL DEFAULT now(),
  date_remplacement timestamptz,
  statut text NOT NULL DEFAULT 'active',
  intervention_id uuid,
  ticket_id uuid,
  installed_by uuid,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pdr_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PDR instances viewable by authenticated" ON public.pdr_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance can manage pdr_instances" ON public.pdr_instances FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_maintenance'::app_role) OR has_role(auth.uid(), 'maintenancier'::app_role) OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_maintenance'::app_role) OR has_role(auth.uid(), 'maintenancier'::app_role) OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role));

-- 3. Add columns to preventive_plans
ALTER TABLE public.preventive_plans ADD COLUMN IF NOT EXISTS line_id uuid REFERENCES public.production_lines(id) ON DELETE SET NULL;
ALTER TABLE public.preventive_plans ADD COLUMN IF NOT EXISTS statut_plan text NOT NULL DEFAULT 'valide';
ALTER TABLE public.preventive_plans ADD COLUMN IF NOT EXISTS type_maintenance text DEFAULT '';
ALTER TABLE public.preventive_plans ADD COLUMN IF NOT EXISTS source text DEFAULT 'manuel';
ALTER TABLE public.preventive_plans ADD COLUMN IF NOT EXISTS source_pdr_id uuid REFERENCES public.pdr(id) ON DELETE SET NULL;

-- 4. Create preventive_plan_pdr
CREATE TABLE IF NOT EXISTS public.preventive_plan_pdr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.preventive_plans(id) ON DELETE CASCADE,
  pdr_id uuid NOT NULL REFERENCES public.pdr(id) ON DELETE CASCADE,
  quantite integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.preventive_plan_pdr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan PDR viewable by authenticated" ON public.preventive_plan_pdr FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance can manage plan PDR" ON public.preventive_plan_pdr FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_maintenance'::app_role) OR has_role(auth.uid(), 'maintenancier'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_maintenance'::app_role) OR has_role(auth.uid(), 'maintenancier'::app_role));

-- 5. Create preventive_plan_assignees
CREATE TABLE IF NOT EXISTS public.preventive_plan_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.preventive_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, user_id)
);

ALTER TABLE public.preventive_plan_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan assignees viewable by authenticated" ON public.preventive_plan_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance can manage plan assignees" ON public.preventive_plan_assignees FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_maintenance'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_maintenance'::app_role));

-- Also allow maintenancier to manage preventive_plans (currently only admin/resp_maintenance)
-- We need maintenanciers to be able to execute plans
DROP POLICY IF EXISTS "Maintenance can manage preventive plans" ON public.preventive_plans;
CREATE POLICY "Maintenance can manage preventive plans" ON public.preventive_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_maintenance'::app_role) OR has_role(auth.uid(), 'maintenancier'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'resp_maintenance'::app_role) OR has_role(auth.uid(), 'maintenancier'::app_role));
