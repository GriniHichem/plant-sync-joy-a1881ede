
DROP POLICY IF EXISTS "QC insert by authorized" ON public.quality_checks;
CREATE POLICY "QC insert by authorized"
  ON public.quality_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'bureau_methode'::app_role)
    OR has_role(auth.uid(), 'resp_production'::app_role)
    OR has_role(auth.uid(), 'chef_ligne'::app_role)
    OR has_role(auth.uid(), 'operateur'::app_role)
    OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
    OR has_role(auth.uid(), 'controleur_qualite'::app_role)
    OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
    OR has_role(auth.uid(), 'directeur_qualite'::app_role)
  );

DROP POLICY IF EXISTS "QC update by authorized" ON public.quality_checks;
CREATE POLICY "QC update by authorized"
  ON public.quality_checks FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'bureau_methode'::app_role)
    OR has_role(auth.uid(), 'resp_production'::app_role)
    OR has_role(auth.uid(), 'chef_ligne'::app_role)
    OR has_role(auth.uid(), 'controleur_qualite'::app_role)
    OR has_role(auth.uid(), 'responsable_controle_qualite'::app_role)
    OR has_role(auth.uid(), 'directeur_qualite'::app_role)
    OR (controlled_by = auth.uid())
  );
