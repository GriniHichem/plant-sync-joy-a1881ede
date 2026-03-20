
ALTER TABLE public.pdr_family_suppliers 
  ALTER COLUMN prix DROP DEFAULT,
  ALTER COLUMN prix SET DEFAULT NULL,
  DROP COLUMN contact,
  ADD COLUMN email text DEFAULT '',
  ADD COLUMN tel text DEFAULT '',
  ADD COLUMN adresse text DEFAULT '',
  ADD COLUMN url1 text DEFAULT '',
  ADD COLUMN url2 text DEFAULT '';

ALTER TABLE public.pdr_suppliers
  DROP COLUMN contact,
  ADD COLUMN email text DEFAULT '',
  ADD COLUMN tel text DEFAULT '',
  ADD COLUMN adresse text DEFAULT '',
  ADD COLUMN url1 text DEFAULT '',
  ADD COLUMN url2 text DEFAULT '';
