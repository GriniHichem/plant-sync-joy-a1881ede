# Consolidation Shifts / Rotations / Autorisations temporelles — Fondation (DB + Contexte)

Cette première étape pose **uniquement** la fondation : schéma de base de données et logique du contexte global « Shift Actif ». L'UI unifiée et le durcissement complet des Guards viendront dans une phase ultérieure, après validation.

## Décisions validées
- **Rotation par Équipe** (et non plus par employé). On supprime le moteur `employee_shift_assignments` au profit d'un rattachement utilisateur→équipe + planning équipe↔modèle.
- **Nouvelle table `shift_templates`** comme source unique des modèles de créneaux (Matin/Soir/Nuit…), migrée depuis `shift_time_slots`.
- **Nouvelle table de planning par période** (date_debut/date_fin), distincte de l'ancienne `shift_rotation` (par date unique).
- **Guard On-Shift** à 3 niveaux : `autorisation_libre` (accès permanent), sinon avertissement, sinon override par un responsable de section.

## Les trois piliers
```text
shift_templates (Modèles)        shift_teams (Équipes)
   Matin 06-14                       ── shift_team_members (user ↔ équipe, rôle)
   Soir  14-22                              │
   Nuit  22-06                              │
        └──────────────┬────────────────────┘
                       ▼
            shift_schedules (Rotations / plannings)
            équipe + modèle + période + jours actifs
                       │
                       ▼  get_active_shift_context(_user, _now)
            → équipe active, modèle en cours, is_on_shift
                       ▼
        ActiveShiftContext (prod / maintenance / qualité)
        Guards : action critique autorisée si on-shift OU autorisation_libre OU override responsable
```

## 1. Schéma de base de données (migration unique)

### `shift_templates` (modèles de créneaux)
- `code` (unique), `label`, `heure_debut` (time), `heure_fin` (time), `crosses_midnight` (bool), `couleur`, `sort_order`, `is_active`, standards + trigger updated_at.
- **Seed** depuis `shift_time_slots` existant (matin/apres_midi/nuit), avec calcul de `crosses_midnight` pour la nuit.

### `shift_team_members` (membres d'équipe)
- `team_id` (FK `shift_teams`), `user_id` (FK auth.users), `role_in_team` (text: `membre`/`responsable`), `autorisation_libre` (bool, défaut false), `is_active`, standards.
- Unique `(team_id, user_id)`.
- `autorisation_libre` porté ici (par membre) : un membre « libre » peut intervenir hors de son créneau sans blocage.

### `shift_schedules` (rotations / plannings)
- `team_id` (FK), `template_id` (FK `shift_templates`), `scope_kind` (`maintenance`|`production`|`quality`|`all`), `line_ids` (uuid[], défaut `{}`), `date_debut` (date), `date_fin` (date nullable = ouvert), `weekdays` (smallint[] ISO 1-7, vide = tous les jours), `is_active`, standards.
- Trigger de validation : `date_fin >= date_debut` si renseigné (pas de CHECK sur dates).

### Grants & RLS (chaque table)
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` ; `GRANT ALL ... TO service_role` ; `GRANT SELECT TO anon` **uniquement** sur `shift_templates` (lecture publique des créneaux non sensible) — sinon pas d'anon.
- RLS : lecture `authenticated` ; écriture réservée via `has_role()` (admin + responsables de section : `resp_maintenance`, `responsable_si`, `directeur_qualite`, etc., à aligner sur les rôles existants).
- `shift_team_members` : un user peut lire sa propre appartenance ; écriture par admin/responsables.

### Fonctions SQL
- **`get_active_shift_context(_user_id uuid, _at timestamptz)`** → `(team_id uuid, team_name text, template_id uuid, template_code text, heure_debut timestamptz, heure_fin timestamptz, is_on_shift boolean, autorisation_libre boolean)`. STABLE SECURITY DEFINER, calculs en `Africa/Algiers`.
  - Récupère les équipes du user (`shift_team_members.is_active`).
  - Pour chaque `shift_schedules` actif couvrant la date (`date_debut..date_fin`, `weekdays`), résout les bornes du `template` (gère `crosses_midnight` + créneau nuit de la veille encore en cours).
  - `is_on_shift = _at ∈ [début, fin]`. Renvoie la ligne on-shift en priorité, sinon la prochaine.
- **`is_user_on_shift(_user_id uuid, _scope text, _at timestamptz)`** → boolean. STABLE SECURITY DEFINER. `true` si on-shift pour le scope OU si `autorisation_libre` du membre. Utilisée par les Guards (et exploitable plus tard côté RLS/triggers).
- **`open_my_work_session()`** : réécrite pour s'appuyer sur `get_active_shift_context` (équipe/template) au lieu de `employee_shift_assignments`. Ouvre la session (`maintenance_shifts`/`shifts`/`quality_shifts`) si on-shift, anti-doublon, `opened_by = auth.uid()`, audit log.

### Nettoyage
- `DROP` de `employee_shift_assignments`, `work_shift_systems`, `work_shift_system_slots` (+ leurs policies/triggers) et de la fonction `compute_expected_shift`.
- Conservation de `shift_rotation` ancienne ? → **supprimée** (remplacée par `shift_schedules`) si non utilisée hors migrations (vérifié : seulement migrations + types).

## 2. Logique du contexte global (frontend)

### `src/lib/shiftSchedule.ts` (helpers purs, testables)
- Remplace `src/lib/shiftRotation.ts`. Calcul des bornes d'un template pour une date locale, gestion `crosses_midnight`, règle `weekdays`, et résolution « template actif à l'instant T » — miroir de `get_active_shift_context`.

### `src/hooks/useActiveShiftContext.ts` (nouveau)
- Appelle `get_active_shift_context(auth.uid(), now())`, expose `{ team, template, isOnShift, autorisationLibre, loading, refresh }`.
- Rafraîchissement périodique léger (ex. à intervalle régulier) pour basculer automatiquement de créneau.

### `src/contexts/ActiveShiftContext.tsx` (mise à jour)
- Intègre `useActiveShiftContext` et expose `activeTeam`, `activeTemplate`, `isOnShift` en plus de l'existant.
- `useAutoOpenWorkSession` conservé mais branché sur la nouvelle logique (la RPC `open_my_work_session` réécrite).
- **Non-régression** : `useActiveProductionShift` / `useActiveMaintenanceShift` / `useActiveQualityShift` restent inchangés dans leur lecture des tables de session — on ajoute la couche équipe/template par-dessus, sans modifier les flux de déclaration production/maintenance.

### `src/hooks/useAutoOpenWorkSession.ts`
- Conservé tel quel (appelle la RPC) ; bénéficie automatiquement de la RPC réécrite.

## 3. Préparation des Guards (sans changer l'UI encore)
- Ajout d'un helper `useOnShiftGuard(scope)` qui lit `isOnShift` + `autorisationLibre` du contexte et renvoie `{ allowed, needsOverride }`. Branchement effectif dans `ShiftGuard` et les actions critiques traité en **phase 2 (UI)**.

## 4. Tests (Vitest)
- `src/test/shift/shift-schedule.test.ts` : bornes de template, nuit traversant minuit, règle `weekdays`, sélection du créneau actif vs prochain, gating `autorisation_libre`.

## Détails techniques
- Tous les calculs horaires en `Africa/Algiers` (cohérent avec `ensure_production_shift_session`).
- Sessions toujours insérées dans les tables existantes — aucun changement de leur schéma.
- Audit `audit_logs` sur toute écriture (équipes, membres, modèles, plannings) conformément aux règles projet.
- Mise à jour de la mémoire projet (remplacement du moteur par-employé par le moteur par-équipe).

## Hors périmètre de cette étape (phase 2, après validation)
- Page paramètres unifiée (Équipes + Membres + Modèles + Plannings) remplaçant `RotationsAdmin` / `ShiftsAdmin`.
- Durcissement effectif des Guards et du workflow d'override responsable dans prod/maintenance/qualité.
- Mise à jour de la documentation `MANUAL.md`.
