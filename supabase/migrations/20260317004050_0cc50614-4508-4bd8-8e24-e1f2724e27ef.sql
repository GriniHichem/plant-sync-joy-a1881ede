
-- Add sort_order to machine_line_assignments for process flow ordering within a line
ALTER TABLE public.machine_line_assignments ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
