ALTER TABLE public.consumptions
  ADD COLUMN IF NOT EXISTS lot_number text,
  ADD COLUMN IF NOT EXISTS batch_number text,
  ADD COLUMN IF NOT EXISTS supplier_lot text,
  ADD COLUMN IF NOT EXISTS expiry_date date;

CREATE INDEX IF NOT EXISTS idx_consumptions_lot_number ON public.consumptions(lot_number) WHERE lot_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consumptions_batch_number ON public.consumptions(batch_number) WHERE batch_number IS NOT NULL;