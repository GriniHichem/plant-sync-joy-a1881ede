-- Maintenancier must NOT modify preventive plans: only execute them.
-- Planners = admin, resp_maintenance, bureau_methode (Méthodes).

DROP POLICY IF EXISTS "Maintenance can manage preventive plans" ON public.preventive_plans;
CREATE POLICY "Planners can manage preventive plans" ON public.preventive_plans
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'resp_maintenance') OR has_role(auth.uid(), 'bureau_methode'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'resp_maintenance') OR has_role(auth.uid(), 'bureau_methode'));

DROP POLICY IF EXISTS "Maintenance can manage plan PDR" ON public.preventive_plan_pdr;
CREATE POLICY "Planners can manage plan PDR" ON public.preventive_plan_pdr
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'resp_maintenance') OR has_role(auth.uid(), 'bureau_methode'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'resp_maintenance') OR has_role(auth.uid(), 'bureau_methode'));

DROP POLICY IF EXISTS "Maintenance can manage plan assignees" ON public.preventive_plan_assignees;
CREATE POLICY "Planners can manage plan assignees" ON public.preventive_plan_assignees
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'resp_maintenance') OR has_role(auth.uid(), 'bureau_methode'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'resp_maintenance') OR has_role(auth.uid(), 'bureau_methode'));

-- UI permission matrix: maintenancier can only view preventif, not create/edit/delete.
UPDATE public.role_permissions
SET can_create = false, can_edit = false, can_delete = false
WHERE role = 'maintenancier' AND module = 'preventif';