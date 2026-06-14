# Données de test Maintenance + tests de shift avec clôture

## Objectif
1. Peupler **toutes les tables des modules Maintenance (GMAO)** avec un jeu de données cohérent.
2. Dérouler des **tests de shift maintenance (ouverture → activité → clôture)**, y compris l'auto-ouverture par rotation d'équipe.
3. **Vérifier les résultats** par requêtes SQL, relever les **anomalies** et proposer des **améliorations UX**.

## État actuel (constaté)
La plupart des tables maintenance sont quasi vides : `machines=1`, `equipements=0`, `organes=0`, `panne_types=0`, `pdr=0`, `preventive_plans=0`, `machine_families=0`. Le moteur de rotation n'a **aucune donnée** : `shift_team_members=0`, `shift_schedules=0` (alors que `shift_teams=3`, `shift_templates=3`). C'est pourquoi, dans la session observée, `open_my_work_session` n'a rien ouvert.

Utilisateurs clés : Yacine Saidi (`maintenancier`), Karim Hadj (`resp_maintenance`), Lamia Cherif (`controleur_qualite`), + admin.

## Phase 1 — Seed des données (outil insert)

### 1. Référentiel équipements
- `machine_families` : 3 familles (Mélange, Conditionnement, Utilités).
- `production_lines` : compléter à 3 lignes actives.
- `machines` : ~6 machines (codes, désignations, criticité A/B/C, statut, family_id).
- `machine_line_assignments` : rattacher chaque machine à 1–2 lignes (priority/sort_order).
- `equipements` : ~10 (types : convoyeur, capteur, actionneur…), rattachés machine/ligne.
- `organes` : ~12 rattachés aux équipements/machines.

### 2. Pannes & pièces
- `panne_types` : 6 types (mécanique, électrique, pneumatique…).
- `pdr` : ~8 pièces de rechange (avec stock) + `pdr_install_positions` sur quelques machines.

### 3. Préventif
- `preventive_plans` : ~5 plans (fréquences variées) liés machines/organes.
- `preventive_plan_assignees` (Yacine), `preventive_plan_pdr` (pièces).
- `preventive_executions` : 2 exécutions passées.

### 4. Tickets & interventions
- `tickets` : ~10 tickets répartis sur les statuts réels de l'enum (`ouvert`, `pris_en_charge`, `en_cours`, `resolu`, `cloture`) et priorités (`critique`→`basse`), liés machine/ligne, déclarant/assignee. Laisser `numero` au trigger d'auto-numérotation.
- `interventions` : ~8 (en_cours/terminée) avec `technicien_id = Yacine`, `date_debut/date_fin` dans des fenêtres de shift.
- `intervention_pdr` : consommations de pièces sur 3 interventions.

### 5. Rotation d'équipe (pour tester l'auto-ouverture)
- `shift_team_members` : Yacine dans une équipe (rôle membre), Lamia dans une équipe ; un membre avec `autorisation_libre=true` pour tester ce cas.
- `shift_schedules` : planning `scope_kind='maintenance'` couvrant aujourd'hui (weekdays incluant le jour courant, lignes du planning) + un planning `quality`.

## Phase 2 — Tests de shift maintenance (clôture incluse)

Réalisés en SQL (l'ouverture/clôture maintenance sont de simples INSERT/UPDATE de table) + appels aux fonctions de contexte :

1. **Auto-ouverture rotation** : vérifier `get_scope_shift_context(Yacine,'maintenance')` (équipe, créneau, on-shift, lignes) et `is_user_on_shift`. Contrôler la cohérence du résultat de `open_my_work_session` (logique : ouvre maintenance si on-shift/autorisation libre, sans doublon).
2. **Ouverture manuelle** : insérer un `maintenance_shifts` actif pour Yacine avec `line_ids` (parcours responsable/self-open).
3. **Activité** : rattacher des interventions/tickets dans la fenêtre du shift.
4. **Clôture** : `UPDATE maintenance_shifts SET is_active=false, heure_fin=now(), observations='…'` (parcours `CloseShiftButton`).
5. **Bilan** : rejouer les requêtes de `ShiftSummaryDialog` (interventions par `technicien_id` dans la fenêtre + tickets clôturés) et comparer aux données réelles.

## Phase 3 — Vérification & anomalies

Requêtes de contrôle après chaque étape (compte des sessions actives, sessions sans observations, interventions hors fenêtre, etc.). Anomalies déjà pressenties à confirmer pendant les tests :

- **Bilan « Tickets clôturés » toujours à 0** : `ShiftSummaryDialog` (ligne 91) filtre `statut='ferme'`, valeur **inexistante** dans l'enum (`cloture`/`resolu`). Bug réel à corriger.
- **Clôture maintenance non protégée côté serveur** : `observations` n'est exigé qu'en UI (trigger seulement sur `quality_shifts`). Risque de sessions clôturées sans bilan / via API.
- **Lien ticket ↔ shift maintenance absent** : `tickets.shift_id` pointe sur `shifts` (production), pas `maintenance_shifts`. Le bilan repose sur une fenêtre temporelle + `technicien_id`, ce qui peut sur/sous-compter (interventions commencées avant l'ouverture mais terminées pendant sont exclues car filtrées sur `date_debut`).
- **Auto-ouverture silencieuse** : sans `shift_schedules`/`shift_team_members`, `open_my_work_session` ne fait rien et l'utilisateur n'a aucun retour (observé en preview). 
- **Pas de RPC de clôture** : open/close en UPDATE direct, sans audit DB ni garde anti-concurrence.

## Phase 4 — Livrable : rapport
Un récapitulatif en chat : données créées (compteurs par table), résultats des tests de shift (ouverture/clôture/bilan), liste des anomalies confirmées avec gravité, et **propositions d'amélioration UX** (ex. : corriger le filtre `ferme→cloture`, trigger serveur exigeant `observations` à la clôture maintenance, toast explicite quand aucune rotation n'est planifiée, lien explicite intervention↔maintenance_shift ou bilan basé sur chevauchement de fenêtre, RPC `close_my_work_session` audité).

## Notes techniques
- Seed via l'outil **insert** (données), pas de migration (aucun changement de schéma en Phase 1–3). Les corrections d'anomalies (trigger, RPC, filtre front) seront proposées dans le rapport et implémentées seulement après validation.
- `numero` des tickets laissé au trigger d'auto-numérotation.
- Toutes les écritures resteront cohérentes avec les enums réels et les colonnes NOT NULL relevées.
