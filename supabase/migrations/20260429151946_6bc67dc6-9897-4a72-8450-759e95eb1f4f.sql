
-- Quality Actions (CAPA) module
DO $$ BEGIN
  CREATE TYPE public.quality_action_type AS ENUM ('curative','corrective','preventive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quality_action_status AS ENUM ('open','in_progress','done','verified','closed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quality_action_priority AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.quality_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id uuid NULL,
  of_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  action_type public.quality_action_type NOT NULL,
  priority public.quality_action_priority NOT NULL DEFAULT 'medium',
  status public.quality_action_status NOT NULL DEFAULT 'open',
  responsible_user_id uuid NULL,
  due_date date NULL,
  verification_comment text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz NULL,
  closed_by uuid NULL,
  verified_at timestamptz NULL,
  verified_by uuid NULL,
  search_vector tsvector NULL
);

CREATE INDEX IF NOT EXISTS idx_qa_status ON public.quality_actions(status);
CREATE INDEX IF NOT EXISTS idx_qa_responsible ON public.quality_actions(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_qa_nc ON public.quality_actions(nc_id);
CREATE INDEX IF NOT EXISTS idx_qa_due ON public.quality_actions(due_date);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.quality_actions_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'closed' THEN
    IF NEW.verification_comment IS NULL OR length(btrim(NEW.verification_comment)) = 0 THEN
      RAISE EXCEPTION 'verification_comment requis pour clôturer une action qualité';
    END IF;
    IF NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
    IF NEW.closed_by IS NULL THEN NEW.closed_by := auth.uid(); END IF;
  END IF;
  IF NEW.status = 'verified' THEN
    IF NEW.verified_at IS NULL THEN NEW.verified_at := now(); END IF;
    IF NEW.verified_by IS NULL THEN NEW.verified_by := auth.uid(); END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_qa_validate ON public.quality_actions;
CREATE TRIGGER trg_qa_validate BEFORE INSERT OR UPDATE ON public.quality_actions
FOR EACH ROW EXECUTE FUNCTION public.quality_actions_validate();

-- FTS trigger
CREATE OR REPLACE FUNCTION public.quality_actions_search_refresh()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_vector := public.fts_build(NEW.title, NEW.description, NEW.verification_comment);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_qa_search ON public.quality_actions;
CREATE TRIGGER trg_qa_search BEFORE INSERT OR UPDATE ON public.quality_actions
FOR EACH ROW EXECUTE FUNCTION public.quality_actions_search_refresh();

-- RLS
ALTER TABLE public.quality_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "QA viewable by authenticated" ON public.quality_actions;
CREATE POLICY "QA viewable by authenticated" ON public.quality_actions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "QA insert by authorized" ON public.quality_actions;
CREATE POLICY "QA insert by authorized" ON public.quality_actions
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = created_by AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'resp_production'::app_role)
      OR has_role(auth.uid(), 'chef_ligne'::app_role)
      OR has_role(auth.uid(), 'bureau_methode'::app_role)
      OR has_role(auth.uid(), 'controleur_qualite'::app_role)
    )
  );

DROP POLICY IF EXISTS "QA update by authorized" ON public.quality_actions;
CREATE POLICY "QA update by authorized" ON public.quality_actions
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'resp_production'::app_role)
    OR has_role(auth.uid(), 'chef_ligne'::app_role)
    OR has_role(auth.uid(), 'bureau_methode'::app_role)
    OR has_role(auth.uid(), 'controleur_qualite'::app_role)
    OR responsible_user_id = auth.uid()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "QA delete by admin" ON public.quality_actions;
CREATE POLICY "QA delete by admin" ON public.quality_actions
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
