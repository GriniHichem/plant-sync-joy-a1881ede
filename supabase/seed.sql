-- =============================================================================
-- Prod-in-Time — DONNÉES DE DÉMONSTRATION / TEST (seed.sql)
-- =============================================================================
--
-- Ce fichier contient EXCLUSIVEMENT des données de test (faux utilisateurs,
-- rôles, instances PDR, plans préventifs, équipes, etc.).
--
-- >>> EN PRODUCTION : NE PAS EXÉCUTER CE FICHIER. <<<
-- Supabase n'applique `seed.sql` que via `supabase db reset` (environnement de
-- développement). Un `supabase db push` ou une migration normale ne le touche
-- jamais. Pour obtenir une usine 100% vierge, ignorez simplement ce fichier.
--
-- Toutes les insertions métier sont encapsulées dans des blocs tolérants aux
-- erreurs : si les entités liées (machines, PDR, utilisateurs) n'existent pas,
-- la section est ignorée avec un NOTICE au lieu de planter le seed.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) ÉQUIPES DE ROTATION (déplacé depuis la migration 20260316183840)
--    En production ces équipes doivent être créées par l'administrateur.
-- -----------------------------------------------------------------------------
INSERT INTO public.shift_teams (name, code, color) VALUES
  ('Équipe A', 'A', '#3b82f6'),
  ('Équipe B', 'B', '#10b981'),
  ('Équipe C', 'C', '#f59e0b'),
  ('Équipe D', 'D', '#ef4444')
ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- 2) RÔLES DE TEST + DONNÉES MÉTIER FICTIVES
--    (déplacé depuis la migration 20260320031539)
--
--    ⚠️  Dépend d'un utilisateur admin existant (UUID figé ci-dessous) et de
--    machines / PDR fictifs qui doivent déjà exister dans la base.
--    Remplacez l'UUID par celui de votre propre compte si vous voulez rejouer
--    ce jeu de données en développement.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_admin uuid := '61d5a0dd-40d9-41f5-aa30-3346ab8eec67';
BEGIN
  -- Rôles supplémentaires sur l'utilisateur de test
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin, 'maintenancier'), (v_admin, 'resp_maintenance')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Durées de vie sur quelques PDR existants
  UPDATE public.pdr SET duree_vie_min_jours = 180, duree_vie_max_jours = 365 WHERE reference = 'CRR-A68';
  UPDATE public.pdr SET duree_vie_min_jours = 90,  duree_vie_max_jours = 180 WHERE reference = 'FLT-HYD';
  UPDATE public.pdr SET duree_vie_min_jours = 30,  duree_vie_max_jours = 60  WHERE reference = 'GRS-EP2';

  -- Instances PDR (actives / passives)
  INSERT INTO public.pdr_instances (pdr_id, machine_id, date_installation, statut, notes) VALUES
    ('d1000000-0000-0000-0000-000000000002','d1000001-0001-0001-0001-000000000002', now() - interval '400 days','active','Courroie installée lors de la révision annuelle'),
    ('d1000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000006', now() - interval '100 days','active','Filtre remplacé suite au ticket TKT-00050'),
    ('d1000000-0000-0000-0000-000000000009','d1000001-0001-0001-0001-000000000010', now() - interval '50 days','active','Graissage des paliers');

  INSERT INTO public.pdr_instances (pdr_id, machine_id, date_installation, date_remplacement, statut, notes) VALUES
    ('d1000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000006', now() - interval '300 days', now() - interval '100 days','passive','Ancien filtre - remplacé pour colmatage');

  -- Plans préventifs
  INSERT INTO public.preventive_plans (id, title, description, machine_id, line_id, frequence, statut_plan, type_maintenance, source, prochaine_echeance) VALUES
    ('a0000001-0000-0000-0000-000000000001','Graissage mensuel broyeur','Graissage complet des paliers et roulements du broyeur','d1000001-0001-0001-0001-000000000002','f1000001-0000-4000-8000-000000000001','mensuel','valide','Graissage paliers + Vérification tension courroie + Contrôle vibrations','manuel', now() + interval '3 days'),
    ('a0000001-0000-0000-0000-000000000002','Changement filtre hydraulique chaudière','Remplacement du filtre hydraulique et vérification circuit','b1000000-0000-0000-0000-000000000006','f1000001-0000-4000-8000-000000000001','trimestriel','valide','Remplacement filtre + Contrôle pression + Purge circuit','manuel', now() - interval '5 days'),
    ('a0000001-0000-0000-0000-000000000004','Inspection autoclave - joints et soupapes','Inspection visuelle des joints d étanchéité et test des soupapes de sécurité','d1000001-0001-0001-0001-000000000010','f1000001-0000-4000-8000-000000000002','semestriel','valide','Inspection joints + Test soupapes + Contrôle manomètre','manuel');

  INSERT INTO public.preventive_plans (id, title, description, machine_id, line_id, frequence, statut_plan, type_maintenance, source, source_pdr_id, prochaine_echeance) VALUES
    ('a0000001-0000-0000-0000-000000000003','Remplacement courroie A68 (dead age atteint)','Plan généré automatiquement: la courroie A68 a dépassé sa durée de vie maximale de 365 jours','d1000001-0001-0001-0001-000000000002','f1000001-0000-4000-8000-000000000001','annuel','brouillon','Remplacement courroie + Alignement poulies + Tension','auto_duree_vie','d1000000-0000-0000-0000-000000000002', now() + interval '1 day');

  -- Affectations + PDR + exécution
  INSERT INTO public.preventive_plan_assignees (plan_id, user_id) VALUES
    ('a0000001-0000-0000-0000-000000000001', v_admin),
    ('a0000001-0000-0000-0000-000000000002', v_admin),
    ('a0000001-0000-0000-0000-000000000003', v_admin),
    ('a0000001-0000-0000-0000-000000000004', v_admin);

  INSERT INTO public.preventive_plan_pdr (plan_id, pdr_id, quantite) VALUES
    ('a0000001-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000009', 2),
    ('a0000001-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000005', 1),
    ('a0000001-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000002', 1),
    ('a0000001-0000-0000-0000-000000000004','d1000000-0000-0000-0000-000000000012', 3);

  INSERT INTO public.preventive_executions (plan_id, executed_by, date_execution, notes, pdr_used) VALUES
    ('a0000001-0000-0000-0000-000000000001', v_admin, now() - interval '30 days','Graissage effectué normalement. RAS.','[{"pdr_id":"d1000000-0000-0000-0000-000000000009","quantite":2}]'::jsonb);

  UPDATE public.preventive_plans SET derniere_execution = now() - interval '30 days' WHERE id = 'a0000001-0000-0000-0000-000000000001';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'seed.sql: données métier de test ignorées (dépendances manquantes: %).', SQLERRM;
END $$;
