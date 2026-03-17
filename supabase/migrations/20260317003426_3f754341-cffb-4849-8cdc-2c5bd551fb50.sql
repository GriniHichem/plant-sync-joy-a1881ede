
-- Create equipment status enum
CREATE TYPE public.equipement_statut AS ENUM ('en_service', 'hors_service', 'en_maintenance', 'reforme');

-- Create equipment type enum
CREATE TYPE public.equipement_type AS ENUM ('capteur', 'actionneur', 'convoyeur', 'peripherique', 'utilite', 'sous_ensemble', 'instrument', 'autre');

-- Create equipements table
CREATE TABLE public.equipements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  designation TEXT NOT NULL,
  description TEXT DEFAULT '',
  type public.equipement_type NOT NULL DEFAULT 'autre',
  statut public.equipement_statut NOT NULL DEFAULT 'en_service',
  family_id UUID REFERENCES public.machine_families(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  line_id UUID REFERENCES public.production_lines(id) ON DELETE SET NULL,
  marque TEXT DEFAULT '',
  modele TEXT DEFAULT '',
  numero_serie TEXT DEFAULT '',
  localisation TEXT DEFAULT '',
  date_mise_en_service DATE,
  criticite public.criticite NOT NULL DEFAULT 'C',
  criticite_maintenance public.criticite_maintenance DEFAULT 'moyenne',
  role_fonctionnel public.role_fonctionnel DEFAULT 'autre',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Equipements viewable by authenticated"
  ON public.equipements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Maintenance can manage equipements"
  ON public.equipements FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'resp_maintenance'::app_role)
  );
