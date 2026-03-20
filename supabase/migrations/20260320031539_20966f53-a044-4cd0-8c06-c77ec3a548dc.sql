
-- Add maintenancier role to the existing admin user for testing
INSERT INTO public.user_roles (user_id, role) 
VALUES ('61d5a0dd-40d9-41f5-aa30-3346ab8eec67', 'maintenancier')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also add resp_maintenance role
INSERT INTO public.user_roles (user_id, role)
VALUES ('61d5a0dd-40d9-41f5-aa30-3346ab8eec67', 'resp_maintenance')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update some PDR with duree de vie
UPDATE public.pdr SET duree_vie_min_jours = 180, duree_vie_max_jours = 365 WHERE reference = 'CRR-A68';
UPDATE public.pdr SET duree_vie_min_jours = 90, duree_vie_max_jours = 180 WHERE reference = 'FLT-HYD';
UPDATE public.pdr SET duree_vie_min_jours = 30, duree_vie_max_jours = 60 WHERE reference = 'GRS-EP2';

-- Create PDR instances (active and passive)
-- Active instance for CRR-A68 on machine BRO-01, installed 400 days ago (expired!)
INSERT INTO public.pdr_instances (pdr_id, machine_id, date_installation, statut, notes)
VALUES (
  'd1000000-0000-0000-0000-000000000002',
  'd1000001-0001-0001-0001-000000000002',
  now() - interval '400 days',
  'active',
  'Courroie installée lors de la révision annuelle'
);

-- Active instance for FLT-HYD on machine CHAUD-001, installed 100 days ago (warning zone)
INSERT INTO public.pdr_instances (pdr_id, machine_id, date_installation, statut, notes)
VALUES (
  'd1000000-0000-0000-0000-000000000005',
  'b1000000-0000-0000-0000-000000000006',
  now() - interval '100 days',
  'active',
  'Filtre remplacé suite au ticket TKT-00050'
);

-- Passive instance for FLT-HYD (old one replaced)
INSERT INTO public.pdr_instances (pdr_id, machine_id, date_installation, date_remplacement, statut, notes)
VALUES (
  'd1000000-0000-0000-0000-000000000005',
  'b1000000-0000-0000-0000-000000000006',
  now() - interval '300 days',
  now() - interval '100 days',
  'passive',
  'Ancien filtre - remplacé pour colmatage'
);

-- Active instance for GRS-EP2 on AUT-01, installed 50 days ago (warning)
INSERT INTO public.pdr_instances (pdr_id, machine_id, date_installation, statut, notes)
VALUES (
  'd1000000-0000-0000-0000-000000000009',
  'd1000001-0001-0001-0001-000000000010',
  now() - interval '50 days',
  'active',
  'Graissage des paliers'
);

-- Create preventive plans
-- Plan 1: Validated, assigned to user, on BRO-01 / L1
INSERT INTO public.preventive_plans (id, title, description, machine_id, line_id, frequence, statut_plan, type_maintenance, source, prochaine_echeance)
VALUES (
  'a0000001-0000-0000-0000-000000000001',
  'Graissage mensuel broyeur',
  'Graissage complet des paliers et roulements du broyeur',
  'd1000001-0001-0001-0001-000000000002',
  'f1000001-0000-4000-8000-000000000001',
  'mensuel',
  'valide',
  'Graissage paliers + Vérification tension courroie + Contrôle vibrations',
  'manuel',
  now() + interval '3 days'
);

-- Plan 2: Validated, overdue, on CHAUD-001 / L1
INSERT INTO public.preventive_plans (id, title, description, machine_id, line_id, frequence, statut_plan, type_maintenance, source, prochaine_echeance)
VALUES (
  'a0000001-0000-0000-0000-000000000002',
  'Changement filtre hydraulique chaudière',
  'Remplacement du filtre hydraulique et vérification circuit',
  'b1000000-0000-0000-0000-000000000006',
  'f1000001-0000-4000-8000-000000000001',
  'trimestriel',
  'valide',
  'Remplacement filtre + Contrôle pression + Purge circuit',
  'manuel',
  now() - interval '5 days'
);

-- Plan 3: Brouillon (auto-generated from dead age), on BRO-01
INSERT INTO public.preventive_plans (id, title, description, machine_id, line_id, frequence, statut_plan, type_maintenance, source, source_pdr_id, prochaine_echeance)
VALUES (
  'a0000001-0000-0000-0000-000000000003',
  'Remplacement courroie A68 (dead age atteint)',
  'Plan généré automatiquement: la courroie A68 a dépassé sa durée de vie maximale de 365 jours',
  'd1000001-0001-0001-0001-000000000002',
  'f1000001-0000-4000-8000-000000000001',
  'annuel',
  'brouillon',
  'Remplacement courroie + Alignement poulies + Tension',
  'auto_duree_vie',
  'd1000000-0000-0000-0000-000000000002',
  now() + interval '1 day'
);

-- Plan 4: Validated, no specific date, on AUT-01 / L2
INSERT INTO public.preventive_plans (id, title, description, machine_id, line_id, frequence, statut_plan, type_maintenance, source)
VALUES (
  'a0000001-0000-0000-0000-000000000004',
  'Inspection autoclave - joints et soupapes',
  'Inspection visuelle des joints d étanchéité et test des soupapes de sécurité',
  'd1000001-0001-0001-0001-000000000010',
  'f1000001-0000-4000-8000-000000000002',
  'semestriel',
  'valide',
  'Inspection joints + Test soupapes + Contrôle manomètre',
  'manuel'
);

-- Assign plans to user
INSERT INTO public.preventive_plan_assignees (plan_id, user_id) VALUES
  ('a0000001-0000-0000-0000-000000000001', '61d5a0dd-40d9-41f5-aa30-3346ab8eec67'),
  ('a0000001-0000-0000-0000-000000000002', '61d5a0dd-40d9-41f5-aa30-3346ab8eec67'),
  ('a0000001-0000-0000-0000-000000000003', '61d5a0dd-40d9-41f5-aa30-3346ab8eec67'),
  ('a0000001-0000-0000-0000-000000000004', '61d5a0dd-40d9-41f5-aa30-3346ab8eec67');

-- Link PDR to plans
INSERT INTO public.preventive_plan_pdr (plan_id, pdr_id, quantite) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000009', 2),
  ('a0000001-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000005', 1),
  ('a0000001-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002', 1),
  ('a0000001-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000012', 3);

-- Add a preventive execution history for plan 1
INSERT INTO public.preventive_executions (plan_id, executed_by, date_execution, notes, pdr_used)
VALUES (
  'a0000001-0000-0000-0000-000000000001',
  '61d5a0dd-40d9-41f5-aa30-3346ab8eec67',
  now() - interval '30 days',
  'Graissage effectué normalement. RAS.',
  '[{"pdr_id":"d1000000-0000-0000-0000-000000000009","quantite":2}]'::jsonb
);

-- Update plan 1 derniere_execution
UPDATE public.preventive_plans SET derniere_execution = now() - interval '30 days' WHERE id = 'a0000001-0000-0000-0000-000000000001';
