-- =====================================================================
-- 1. ENUMS (idempotents)
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.energie_type AS ENUM ('electrique','pneumatique','hydraulique','vapeur','gaz','mixte','autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.organe_impact_panne AS ENUM ('arret_complet','arret_partiel','degradation','aucun');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 2. MACHINES — ajouts nullables
-- =====================================================================
ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS fabricant text,
  ADD COLUMN IF NOT EXISTS reference_constructeur text,
  ADD COLUMN IF NOT EXISTS code_erp text,
  ADD COLUMN IF NOT EXISTS code_immobilisation text,
  ADD COLUMN IF NOT EXISTS qr_code text,
  ADD COLUMN IF NOT EXISTS annee_fabrication integer,
  ADD COLUMN IF NOT EXISTS puissance_kw numeric,
  ADD COLUMN IF NOT EXISTS tension_v numeric,
  ADD COLUMN IF NOT EXISTS frequence_hz numeric,
  ADD COLUMN IF NOT EXISTS pression_service_bar numeric,
  ADD COLUMN IF NOT EXISTS cadence_nominale numeric,
  ADD COLUMN IF NOT EXISTS unite_cadence text,
  ADD COLUMN IF NOT EXISTS capacite_nominale numeric,
  ADD COLUMN IF NOT EXISTS unite_capacite text,
  ADD COLUMN IF NOT EXISTS longueur_mm numeric,
  ADD COLUMN IF NOT EXISTS largeur_mm numeric,
  ADD COLUMN IF NOT EXISTS hauteur_mm numeric,
  ADD COLUMN IF NOT EXISTS poids_kg numeric,
  ADD COLUMN IF NOT EXISTS matiere_principale text,
  ADD COLUMN IF NOT EXISTS energie_utilisee public.energie_type,
  ADD COLUMN IF NOT EXISTS niveau_risque text,
  ADD COLUMN IF NOT EXISTS conditions_utilisation text,
  ADD COLUMN IF NOT EXISTS consignes_securite text,
  ADD COLUMN IF NOT EXISTS zone_installation text,
  ADD COLUMN IF NOT EXISTS commentaire_technique text,
  ADD COLUMN IF NOT EXISTS caracteristiques_techniques jsonb DEFAULT '{}'::jsonb;

-- =====================================================================
-- 3. ORGANES — ajouts nullables
-- =====================================================================
ALTER TABLE public.organes
  ADD COLUMN IF NOT EXISTS fabricant text,
  ADD COLUMN IF NOT EXISTS marque text,
  ADD COLUMN IF NOT EXISTS modele text,
  ADD COLUMN IF NOT EXISTS reference_constructeur text,
  ADD COLUMN IF NOT EXISTS numero_serie text,
  ADD COLUMN IF NOT EXISTS code_erp text,
  ADD COLUMN IF NOT EXISTS code_immobilisation text,
  ADD COLUMN IF NOT EXISTS longueur numeric,
  ADD COLUMN IF NOT EXISTS largeur numeric,
  ADD COLUMN IF NOT EXISTS hauteur numeric,
  ADD COLUMN IF NOT EXISTS diametre_ext numeric,
  ADD COLUMN IF NOT EXISTS diametre_int numeric,
  ADD COLUMN IF NOT EXISTS epaisseur numeric,
  ADD COLUMN IF NOT EXISTS poids numeric,
  ADD COLUMN IF NOT EXISTS unite_dimension text DEFAULT 'mm',
  ADD COLUMN IF NOT EXISTS unite_poids text DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS puissance numeric,
  ADD COLUMN IF NOT EXISTS tension numeric,
  ADD COLUMN IF NOT EXISTS intensite numeric,
  ADD COLUMN IF NOT EXISTS frequence numeric,
  ADD COLUMN IF NOT EXISTS pression numeric,
  ADD COLUMN IF NOT EXISTS debit numeric,
  ADD COLUMN IF NOT EXISTS vitesse_rotation numeric,
  ADD COLUMN IF NOT EXISTS temperature_min numeric,
  ADD COLUMN IF NOT EXISTS temperature_max numeric,
  ADD COLUMN IF NOT EXISTS matiere text,
  ADD COLUMN IF NOT EXISTS type_connexion text,
  ADD COLUMN IF NOT EXISTS filetage text,
  ADD COLUMN IF NOT EXISTS impact_panne public.organe_impact_panne,
  ADD COLUMN IF NOT EXISTS duree_vie_estimee_jours integer,
  ADD COLUMN IF NOT EXISTS frequence_inspection_jours integer,
  ADD COLUMN IF NOT EXISTS consignes_securite text,
  ADD COLUMN IF NOT EXISTS commentaire_technique text,
  ADD COLUMN IF NOT EXISTS caracteristiques_techniques jsonb DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.organes_search_refresh()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_vector := public.fts_build(
    NEW.code, NEW.designation, NEW.description,
    NEW.marque, NEW.modele, NEW.fabricant,
    NEW.reference_constructeur, NEW.numero_serie, NEW.code_erp
  );
  RETURN NEW;
END$$;

-- =====================================================================
-- 4. PDR — ajouts nullables
-- =====================================================================
ALTER TABLE public.pdr
  ADD COLUMN IF NOT EXISTS fabricant text,
  ADD COLUMN IF NOT EXISTS marque text,
  ADD COLUMN IF NOT EXISTS modele text,
  ADD COLUMN IF NOT EXISTS reference_constructeur text,
  ADD COLUMN IF NOT EXISTS code_erp text,
  ADD COLUMN IF NOT EXISTS code_barres text,
  ADD COLUMN IF NOT EXISTS qr_code text,
  ADD COLUMN IF NOT EXISTS sous_famille text,
  ADD COLUMN IF NOT EXISTS unite_stock text DEFAULT 'unité',
  ADD COLUMN IF NOT EXISTS criticite public.criticite DEFAULT 'C'::public.criticite,
  ADD COLUMN IF NOT EXISTS longueur numeric,
  ADD COLUMN IF NOT EXISTS largeur numeric,
  ADD COLUMN IF NOT EXISTS hauteur numeric,
  ADD COLUMN IF NOT EXISTS diametre_ext numeric,
  ADD COLUMN IF NOT EXISTS diametre_int numeric,
  ADD COLUMN IF NOT EXISTS epaisseur numeric,
  ADD COLUMN IF NOT EXISTS poids numeric,
  ADD COLUMN IF NOT EXISTS unite_dimension text DEFAULT 'mm',
  ADD COLUMN IF NOT EXISTS unite_poids text DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS matiere text,
  ADD COLUMN IF NOT EXISTS couleur text,
  ADD COLUMN IF NOT EXISTS tension numeric,
  ADD COLUMN IF NOT EXISTS puissance numeric,
  ADD COLUMN IF NOT EXISTS intensite numeric,
  ADD COLUMN IF NOT EXISTS frequence numeric,
  ADD COLUMN IF NOT EXISTS pression numeric,
  ADD COLUMN IF NOT EXISTS debit numeric,
  ADD COLUMN IF NOT EXISTS temperature_min numeric,
  ADD COLUMN IF NOT EXISTS temperature_max numeric,
  ADD COLUMN IF NOT EXISTS vitesse_rotation numeric,
  ADD COLUMN IF NOT EXISTS nombre_dents integer,
  ADD COLUMN IF NOT EXISTS pas numeric,
  ADD COLUMN IF NOT EXISTS filetage text,
  ADD COLUMN IF NOT EXISTS type_connexion text,
  ADD COLUMN IF NOT EXISTS type_signal text,
  ADD COLUMN IF NOT EXISTS commentaire_technique text,
  ADD COLUMN IF NOT EXISTS caracteristiques_techniques jsonb DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.pdr_search_refresh()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_vector := public.fts_build(
    NEW.reference, NEW.designation, NEW.description,
    NEW.fournisseur, NEW.emplacement,
    NEW.marque, NEW.modele, NEW.fabricant,
    NEW.reference_constructeur, NEW.code_erp, NEW.code_barres,
    NEW.sous_famille, NEW.matiere
  );
  RETURN NEW;
END$$;

-- =====================================================================
-- 5. PDR_SUPPLIERS — extension
-- =====================================================================
ALTER TABLE public.pdr_suppliers
  ADD COLUMN IF NOT EXISTS supplier_designation text,
  ADD COLUMN IF NOT EXISTS manufacturer_reference text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'DA',
  ADD COLUMN IF NOT EXISTS moq numeric,
  ADD COLUMN IF NOT EXISTS packaging_unit text,
  ADD COLUMN IF NOT EXISTS last_purchase_price numeric,
  ADD COLUMN IF NOT EXISTS last_purchase_date date,
  ADD COLUMN IF NOT EXISTS supplier_url text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_pdr_suppliers_pdr ON public.pdr_suppliers(pdr_id);

CREATE OR REPLACE FUNCTION public.pdr_suppliers_unique_principal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_principal IS TRUE THEN
    UPDATE public.pdr_suppliers
       SET is_principal = false, updated_at = now()
     WHERE pdr_id = NEW.pdr_id
       AND id <> NEW.id
       AND is_principal = true;
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_pdr_suppliers_unique_principal ON public.pdr_suppliers;
CREATE TRIGGER trg_pdr_suppliers_unique_principal
AFTER INSERT OR UPDATE OF is_principal ON public.pdr_suppliers
FOR EACH ROW EXECUTE FUNCTION public.pdr_suppliers_unique_principal();

-- =====================================================================
-- 6. PDR_ENTITY_LINKS — extension
-- =====================================================================
ALTER TABLE public.pdr_entity_links
  ADD COLUMN IF NOT EXISTS criticite_sur_actif public.criticite,
  ADD COLUMN IF NOT EXISTS position_installation text;

-- =====================================================================
-- 7. PDR_EQUIVALENCES — nouvelle table
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pdr_equivalences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdr_id uuid NOT NULL REFERENCES public.pdr(id) ON DELETE CASCADE,
  equivalent_pdr_id uuid REFERENCES public.pdr(id) ON DELETE SET NULL,
  external_reference text,
  manufacturer text,
  brand text,
  equivalence_type text NOT NULL DEFAULT 'equivalent'
    CHECK (equivalence_type IN ('equivalent','compatible','remplacement','depannage')),
  validation_status text NOT NULL DEFAULT 'non_valide'
    CHECK (validation_status IN ('non_valide','valide','rejete')),
  validated_by uuid,
  validated_at timestamptz,
  notes text DEFAULT '',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pdr_equivalences_target_xor CHECK (
    equivalent_pdr_id IS NOT NULL OR (external_reference IS NOT NULL AND length(btrim(external_reference)) > 0)
  ),
  CONSTRAINT pdr_equivalences_no_self CHECK (equivalent_pdr_id IS NULL OR equivalent_pdr_id <> pdr_id)
);

CREATE INDEX IF NOT EXISTS idx_pdr_equivalences_pdr ON public.pdr_equivalences(pdr_id);
CREATE INDEX IF NOT EXISTS idx_pdr_equivalences_status ON public.pdr_equivalences(validation_status);

ALTER TABLE public.pdr_equivalences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PDR equivalences viewable by authenticated" ON public.pdr_equivalences;
CREATE POLICY "PDR equivalences viewable by authenticated"
  ON public.pdr_equivalences FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Maintenance/magasin/bureau can insert equivalences" ON public.pdr_equivalences;
CREATE POLICY "Maintenance/magasin/bureau can insert equivalences"
  ON public.pdr_equivalences FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'resp_maintenance'::app_role)
    OR has_role(auth.uid(), 'maintenancier'::app_role)
    OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
    OR has_role(auth.uid(), 'bureau_methode'::app_role)
  );

DROP POLICY IF EXISTS "Validation by admin/maintenance/bureau" ON public.pdr_equivalences;
CREATE POLICY "Validation by admin/maintenance/bureau"
  ON public.pdr_equivalences FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'resp_maintenance'::app_role)
    OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
    OR has_role(auth.uid(), 'bureau_methode'::app_role)
  );

DROP POLICY IF EXISTS "Admins can delete equivalences" ON public.pdr_equivalences;
CREATE POLICY "Admins can delete equivalences"
  ON public.pdr_equivalences FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.pdr_equivalences_enforce_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'resp_maintenance'::app_role)
    OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
    OR has_role(auth.uid(), 'bureau_methode'::app_role)
  ) THEN
    NEW.validation_status := 'non_valide';
    NEW.validated_by := NULL;
    NEW.validated_at := NULL;
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_pdr_equivalences_proposal ON public.pdr_equivalences;
CREATE TRIGGER trg_pdr_equivalences_proposal
BEFORE INSERT ON public.pdr_equivalences
FOR EACH ROW EXECUTE FUNCTION public.pdr_equivalences_enforce_proposal();

DROP TRIGGER IF EXISTS trg_pdr_equivalences_updated_at ON public.pdr_equivalences;
CREATE TRIGGER trg_pdr_equivalences_updated_at
BEFORE UPDATE ON public.pdr_equivalences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 8. CATEGORIES DOCUMENTS — seed idempotent (sans contrainte unique)
-- =====================================================================
INSERT INTO public.document_categories (name, description, sort_order)
SELECT v.name, v.description, v.sort_order
FROM (VALUES
  ('fiche_technique', 'Fiche technique constructeur', 10),
  ('manuel_constructeur', 'Manuel constructeur / utilisateur', 20),
  ('schema_electrique', 'Schéma électrique', 30),
  ('schema_mecanique', 'Schéma mécanique / plan', 40),
  ('plan_pneumatique', 'Plan pneumatique / hydraulique', 50),
  ('certificat', 'Certificat / conformité', 60),
  ('photo_plaque_signaletique', 'Photo plaque signalétique', 70),
  ('notice_montage', 'Notice de montage', 80)
) AS v(name, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_categories dc WHERE dc.name = v.name
);