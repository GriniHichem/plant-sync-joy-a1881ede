ALTER TABLE public.shift_templates
  ADD COLUMN IF NOT EXISTS shift_mode_id uuid REFERENCES public.shift_modes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shift_templates_mode ON public.shift_templates(shift_mode_id);