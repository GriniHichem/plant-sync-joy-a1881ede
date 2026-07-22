
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
  ('admin', 'reception_qualitative', true, true, true, true),
  ('admin', 'reception_quantitative', true, true, true, true),
  ('admin', 'reception_global', true, true, true, true),
  ('admin', 'reception_settings', true, true, true, true),
  ('controleur_qualite', 'reception_qualitative', true, true, false, false),
  ('controleur_qualite', 'reception_quantitative', false, false, false, false),
  ('controleur_qualite', 'reception_global', true, false, false, false),
  ('controleur_qualite', 'reception_settings', false, false, false, false),
  ('responsable_controle_qualite', 'reception_qualitative', true, true, false, false),
  ('responsable_controle_qualite', 'reception_quantitative', true, false, true, false),
  ('responsable_controle_qualite', 'reception_global', true, false, true, true),
  ('responsable_controle_qualite', 'reception_settings', true, true, true, true),
  ('directeur_qualite', 'reception_qualitative', true, true, false, false),
  ('directeur_qualite', 'reception_quantitative', true, false, true, false),
  ('directeur_qualite', 'reception_global', true, false, true, true),
  ('directeur_qualite', 'reception_settings', true, true, true, true),
  ('agent_pont_bascule', 'reception_qualitative', false, false, false, false),
  ('agent_pont_bascule', 'reception_quantitative', true, false, true, false),
  ('agent_pont_bascule', 'reception_global', true, false, false, false),
  ('agent_pont_bascule', 'reception_settings', false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;
