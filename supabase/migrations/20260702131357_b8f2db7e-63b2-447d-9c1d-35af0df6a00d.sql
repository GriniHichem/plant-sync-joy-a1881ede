ALTER TYPE public.quality_indicator_category ADD VALUE IF NOT EXISTS 'physico_chimique';
ALTER TYPE public.quality_indicator_category ADD VALUE IF NOT EXISTS 'conditionnement';
ALTER TYPE public.quality_indicator_category ADD VALUE IF NOT EXISTS 'organoleptique';

ALTER TABLE public.quality_indicators
  ADD COLUMN IF NOT EXISTS frequency_minutes integer;

ALTER TABLE public.quality_indicator_assignments
  ADD COLUMN IF NOT EXISTS frequency_minutes integer;

ALTER TABLE public.quality_indicators
  DROP CONSTRAINT IF EXISTS quality_indicators_frequency_minutes_check;
ALTER TABLE public.quality_indicators
  ADD CONSTRAINT quality_indicators_frequency_minutes_check
  CHECK (frequency_minutes IS NULL OR frequency_minutes > 0);

ALTER TABLE public.quality_indicator_assignments
  DROP CONSTRAINT IF EXISTS quality_indicator_assignments_frequency_minutes_check;
ALTER TABLE public.quality_indicator_assignments
  ADD CONSTRAINT quality_indicator_assignments_frequency_minutes_check
  CHECK (frequency_minutes IS NULL OR frequency_minutes > 0);