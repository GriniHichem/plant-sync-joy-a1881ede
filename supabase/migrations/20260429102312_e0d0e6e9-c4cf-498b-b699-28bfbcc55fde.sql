-- Create the assignment_status enum (separate from ticket workflow status)
DO $$ BEGIN
  CREATE TYPE public.ticket_assignment_status AS ENUM ('unassigned', 'assigned', 'transferred', 'released');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add nullable column to tickets — does not affect existing filters/KPIs
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS assignment_status public.ticket_assignment_status;

-- One-shot backfill for active tickets only
UPDATE public.tickets
SET assignment_status = 'unassigned'
WHERE assignment_status IS NULL
  AND assignee_id IS NULL
  AND statut = 'ouvert';

UPDATE public.tickets
SET assignment_status = 'assigned'
WHERE assignment_status IS NULL
  AND assignee_id IS NOT NULL
  AND statut IN ('pris_en_charge', 'en_cours');