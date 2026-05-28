
DROP POLICY IF EXISTS "Quality indicators delete by admin" ON public.quality_indicators;
DROP POLICY IF EXISTS "Quality indicators insert by authorized" ON public.quality_indicators;
DROP POLICY IF EXISTS "Quality indicators update by authorized" ON public.quality_indicators;
DROP POLICY IF EXISTS "Quality indicators viewable by qualite module" ON public.quality_indicators;

CREATE POLICY "Quality indicators viewable by qualite module"
  ON public.quality_indicators FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR check_permission(auth.uid(), 'qualite'::text, 'view'::text)
    OR check_permission(auth.uid(), 'qualite_indicateurs'::text, 'view'::text)
  );

CREATE POLICY "Quality indicators insert by authorized"
  ON public.quality_indicators FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR check_permission(auth.uid(), 'qualite_indicateurs'::text, 'create'::text)
  );

CREATE POLICY "Quality indicators update by authorized"
  ON public.quality_indicators FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR check_permission(auth.uid(), 'qualite_indicateurs'::text, 'edit'::text)
  );

CREATE POLICY "Quality indicators delete by admin"
  ON public.quality_indicators FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR check_permission(auth.uid(), 'qualite_indicateurs'::text, 'delete'::text)
  );
