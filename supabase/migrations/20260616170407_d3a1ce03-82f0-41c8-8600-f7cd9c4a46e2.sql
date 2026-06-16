INSERT INTO public.validation_permissions (role, view_own, view_all, submit, approve, reject, cancel, configure_rules, view_technical_details)
VALUES
  ('admin', true, true, true, true, true, true, true, true),
  ('resp_maintenance', true, true, true, true, true, true, false, true),
  ('resp_production', true, true, true, true, true, true, false, true),
  ('responsable_controle_qualite', true, true, true, true, true, true, false, true),
  ('chef_ligne', true, true, true, false, false, true, false, false),
  ('controleur_qualite', true, false, true, false, false, true, false, false),
  ('maintenancier', true, false, true, false, false, true, false, false),
  ('gestionnaire_magasin', true, false, true, false, false, true, false, false),
  ('operateur', true, false, true, false, false, true, false, false)
ON CONFLICT (role) DO NOTHING;