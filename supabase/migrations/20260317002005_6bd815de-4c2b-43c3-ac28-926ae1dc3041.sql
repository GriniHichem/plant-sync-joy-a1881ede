
-- 1. Enrich production_lines table
ALTER TABLE public.production_lines 
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS atelier text DEFAULT '';

-- 2. Create enums for new machine fields
DO $$ BEGIN
  CREATE TYPE public.role_fonctionnel AS ENUM (
    'alimentation', 'transformation', 'dosage', 'melange', 
    'convoyage', 'conditionnement', 'controle', 'evacuation', 'utilite', 'autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.impact_ligne AS ENUM (
    'arret_complet', 'arret_partiel', 'degradation', 'aucun'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.disponibilite_pdr AS ENUM (
    'disponible', 'partiel', 'indisponible'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.criticite_maintenance AS ENUM (
    'faible', 'moyenne', 'elevee', 'critique'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add new columns to machines
ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS role_fonctionnel public.role_fonctionnel DEFAULT 'autre',
  ADD COLUMN IF NOT EXISTS criticite_maintenance public.criticite_maintenance DEFAULT 'moyenne',
  ADD COLUMN IF NOT EXISTS impact_ligne public.impact_ligne DEFAULT 'aucun',
  ADD COLUMN IF NOT EXISTS disponibilite_pdr public.disponibilite_pdr DEFAULT 'disponible';

-- 4. Create machine_line_assignments table
CREATE TABLE IF NOT EXISTS public.machine_line_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  line_id uuid NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (machine_id, line_id),
  UNIQUE (machine_id, priority)
);

-- 5. RLS for machine_line_assignments
ALTER TABLE public.machine_line_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Machine line assignments viewable by authenticated"
  ON public.machine_line_assignments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Maintenance can manage machine line assignments"
  ON public.machine_line_assignments FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'resp_maintenance'::app_role)
    OR has_role(auth.uid(), 'resp_production'::app_role)
  );
