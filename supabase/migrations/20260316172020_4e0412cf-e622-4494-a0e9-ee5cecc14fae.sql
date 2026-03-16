
-- =============================================
-- PHASE 1 - ÉTAPE 1 : FONDATION TECHNIQUE
-- =============================================

-- 1. Enum pour les rôles applicatifs
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin',
    'resp_maintenance',
    'maintenancier',
    'resp_production',
    'chef_ligne',
    'operateur',
    'gestionnaire_magasin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Enum pour criticité machine
DO $$ BEGIN
  CREATE TYPE public.criticite AS ENUM ('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Enum pour statut machine
DO $$ BEGIN
  CREATE TYPE public.machine_statut AS ENUM ('en_marche', 'arret', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Enum pour priorité ticket
DO $$ BEGIN
  CREATE TYPE public.ticket_priorite AS ENUM ('critique', 'haute', 'normale', 'basse');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Enum pour statut ticket
DO $$ BEGIN
  CREATE TYPE public.ticket_statut AS ENUM ('ouvert', 'pris_en_charge', 'en_cours', 'resolu', 'cloture');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Enum pour statut intervention
DO $$ BEGIN
  CREATE TYPE public.intervention_statut AS ENUM ('en_cours', 'terminee', 'annulee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Enum pour fréquence préventif
DO $$ BEGIN
  CREATE TYPE public.frequence_preventif AS ENUM ('quotidien', 'hebdomadaire', 'mensuel', 'trimestriel', 'semestriel', 'annuel');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- TABLES FONDATION
-- =============================================

-- Fonction update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  poste TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Table user_roles (séparée - sécurité)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles viewable by authenticated"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Fonction has_role (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin can manage roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TABLES GMAO
-- =============================================

-- Familles machines (arborescence)
CREATE TABLE IF NOT EXISTS public.machine_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  parent_id UUID REFERENCES public.machine_families(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.machine_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Families viewable by authenticated" ON public.machine_families FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage families" ON public.machine_families FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance'));

CREATE TRIGGER update_machine_families_updated_at
  BEFORE UPDATE ON public.machine_families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Machines
CREATE TABLE IF NOT EXISTS public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  designation TEXT NOT NULL,
  family_id UUID REFERENCES public.machine_families(id) ON DELETE SET NULL,
  criticite criticite NOT NULL DEFAULT 'C',
  statut machine_statut NOT NULL DEFAULT 'en_marche',
  localisation TEXT DEFAULT '',
  date_mise_en_service DATE,
  description TEXT DEFAULT '',
  marque TEXT DEFAULT '',
  modele TEXT DEFAULT '',
  numero_serie TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Machines viewable by authenticated" ON public.machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance can manage machines" ON public.machines FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance'));

CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents machine (storage)
CREATE TABLE IF NOT EXISTS public.machine_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  description TEXT DEFAULT '',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.machine_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Documents viewable by authenticated" ON public.machine_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance can manage documents" ON public.machine_documents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance'));

-- Types de panne
CREATE TABLE IF NOT EXISTS public.panne_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.panne_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Panne types viewable by authenticated" ON public.panne_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage panne types" ON public.panne_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance'));

-- PDR (Pièces de rechange)
CREATE TABLE IF NOT EXISTS public.pdr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  designation TEXT NOT NULL,
  stock_actuel INTEGER NOT NULL DEFAULT 0,
  stock_min INTEGER NOT NULL DEFAULT 0,
  prix_unitaire NUMERIC(12,2) DEFAULT 0,
  fournisseur TEXT DEFAULT '',
  emplacement TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PDR viewable by authenticated" ON public.pdr FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance/magasin can manage PDR" ON public.pdr FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance') OR public.has_role(auth.uid(), 'gestionnaire_magasin'));

CREATE TRIGGER update_pdr_updated_at
  BEFORE UPDATE ON public.pdr FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Liaison machine <-> PDR
CREATE TABLE IF NOT EXISTS public.machine_pdr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  pdr_id UUID REFERENCES public.pdr(id) ON DELETE CASCADE NOT NULL,
  quantite_recommandee INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(machine_id, pdr_id)
);

ALTER TABLE public.machine_pdr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Machine PDR viewable by authenticated" ON public.machine_pdr FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance can manage machine PDR" ON public.machine_pdr FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance'));

-- Tickets maintenance
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL NOT NULL,
  panne_type_id UUID REFERENCES public.panne_types(id) ON DELETE SET NULL,
  priorite ticket_priorite NOT NULL DEFAULT 'normale',
  statut ticket_statut NOT NULL DEFAULT 'ouvert',
  description TEXT NOT NULL DEFAULT '',
  cause_racine TEXT DEFAULT '',
  solution TEXT DEFAULT '',
  declarant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  heure_declaration TIMESTAMPTZ NOT NULL DEFAULT now(),
  heure_prise_en_charge TIMESTAMPTZ,
  heure_resolution TIMESTAMPTZ,
  heure_cloture TIMESTAMPTZ,
  temps_arret_minutes INTEGER,
  temps_intervention_minutes INTEGER,
  of_id UUID,
  shift_id UUID,
  ligne_id UUID,
  is_from_gpao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tickets viewable by authenticated" ON public.tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Maintenance can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Séquence numéro ticket
CREATE OR REPLACE FUNCTION public.generate_ticket_numero()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 5) AS INTEGER)), 0) + 1
  INTO next_num FROM public.tickets;
  NEW.numero := 'TKT-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_ticket_numero
  BEFORE INSERT ON public.tickets
  FOR EACH ROW WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION public.generate_ticket_numero();

-- Interventions
CREATE TABLE IF NOT EXISTS public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  technicien_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  statut intervention_statut NOT NULL DEFAULT 'en_cours',
  date_debut TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_fin TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interventions viewable by authenticated" ON public.interventions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance can manage interventions" ON public.interventions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance') OR public.has_role(auth.uid(), 'maintenancier'));

CREATE TRIGGER update_interventions_updated_at
  BEFORE UPDATE ON public.interventions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PDR consommées par intervention
CREATE TABLE IF NOT EXISTS public.intervention_pdr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID REFERENCES public.interventions(id) ON DELETE CASCADE NOT NULL,
  pdr_id UUID REFERENCES public.pdr(id) ON DELETE SET NULL NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intervention_pdr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Intervention PDR viewable by authenticated" ON public.intervention_pdr FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance can manage intervention PDR" ON public.intervention_pdr FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance') OR public.has_role(auth.uid(), 'maintenancier'));

-- Plans préventifs
CREATE TABLE IF NOT EXISTS public.preventive_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  frequence frequence_preventif NOT NULL DEFAULT 'mensuel',
  checklist JSONB DEFAULT '[]'::jsonb,
  derniere_execution TIMESTAMPTZ,
  prochaine_echeance TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.preventive_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Preventive plans viewable by authenticated" ON public.preventive_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance can manage preventive plans" ON public.preventive_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance'));

CREATE TRIGGER update_preventive_plans_updated_at
  BEFORE UPDATE ON public.preventive_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Exécutions préventif
CREATE TABLE IF NOT EXISTS public.preventive_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.preventive_plans(id) ON DELETE CASCADE NOT NULL,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  date_execution TIMESTAMPTZ NOT NULL DEFAULT now(),
  checklist_results JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  pdr_used JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.preventive_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Preventive executions viewable by authenticated" ON public.preventive_executions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maintenance can manage preventive executions" ON public.preventive_executions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resp_maintenance') OR public.has_role(auth.uid(), 'maintenancier'));

-- Storage bucket pour documents machines
INSERT INTO storage.buckets (id, name, public)
VALUES ('machine-documents', 'machine-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Machine docs publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'machine-documents');

CREATE POLICY "Authenticated can upload machine docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'machine-documents');

CREATE POLICY "Authenticated can update machine docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'machine-documents');

CREATE POLICY "Authenticated can delete machine docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'machine-documents');
