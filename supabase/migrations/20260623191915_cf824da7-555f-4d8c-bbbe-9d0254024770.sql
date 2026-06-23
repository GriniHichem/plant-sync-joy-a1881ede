-- Responsable magasin = admin de la section Stock PDR (accès complet)
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES
  ('responsable_magasin', 'pdr',           true, true, true, true),
  ('responsable_magasin', 'pdr_demandes',  true, true, true, true),
  ('responsable_magasin', 'shift_magasin', true, true, true, true),
  ('responsable_magasin', 'journal_stock', true, true, true, true),
  ('responsable_magasin', 'pdr_stock_config', true, true, true, true),
  -- Gestionnaire magasin : opérationnel (écriture demandes + shift, lecture journal)
  ('gestionnaire_magasin', 'pdr',           true, true, true, true),
  ('gestionnaire_magasin', 'pdr_demandes',  true, true, true, false),
  ('gestionnaire_magasin', 'shift_magasin', true, true, true, false),
  ('gestionnaire_magasin', 'journal_stock', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  can_view   = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit   = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;