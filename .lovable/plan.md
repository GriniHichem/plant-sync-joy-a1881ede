# Gestion des temps & rotation des shifts par employé

## Objectif
Attribuer à chaque employé un **système de shift** (3-8, 2-8, 1-8, 2-12, Surface), un **motif de cycle** personnalisé et une **date d'ancrage**. Le système calcule à toute date le shift attendu, et **ouvre automatiquement la session** (statut « Présent ») à la connexion si le responsable a activé « Autorisation Libre » et que l'employé se connecte dans son créneau. Couvre les 3 mondes (maintenance, production, qualité). Tous les calculs en fuseau `Africa/Algiers`.

On **remplace** `maintenance_shift_schedules` (+ son UI, son edge function et son cron) par cette logique plus générale.

```text
employee_shift_assignments (par user)
  system → work_shift_systems (+ slots horaires)
  pattern (séquence: matin/midi/nuit/repos)  +  anchor_date
        │
        ▼  compute_expected_shift(user, now)   ← mod(jours écoulés, longueur motif)
        │     • Surface = règle calendaire 5/7 (Lun-Ven travail, Sam/Dim repos)
        ▼
  open_my_work_session()  (RPC, à la connexion)
        • si autorisation_libre ET now ∈ créneau ET pas de session active
        → INSERT dans maintenance_shifts / shifts / quality_shifts (statut Présent)
        ▼
  Dashboard employé : Tâches curatives + Tâches préventives
```

## 1. Base de données (migration)

### `work_shift_systems`
- `code` (unique : `3x8`, `2x8`, `1x8`, `2x12`, `surface`), `label`, `cycle_type` (`rotation` | `fixed_weekly`), `nb_shifts`, `is_active`.

### `work_shift_system_slots`
- `system_id` (FK), `slot_code` (`matin`/`midi`/`nuit`/`jour`), `label`, `heure_debut` (time), `heure_fin` (time), `crosses_midnight` (bool), `sort_order`.
- Seed exact des 5 systèmes :
  - 3x8 : matin 06:00-14:00, midi 14:00-22:00, nuit 22:00-06:00(+1)
  - 2x8 : matin 06:00-14:00, midi 14:00-22:00
  - 1x8 : matin 06:00-14:00
  - 2x12 : matin 06:00-18:00, nuit 18:00-06:00(+1)
  - surface : jour 08:00-16:30

### `employee_shift_assignments`
- `user_id` (unique, FK auth.users), `system_id` (FK), `scope_kind` (`maintenance`|`production`|`quality` — quelle table de session ouvrir), `shift_team_id` (nullable), `line_ids` (uuid[]), `pattern` (jsonb : tableau ordonné de tokens `matin`/`midi`/`nuit`/`repos` ; ignoré pour Surface), `anchor_date` (date), `autorisation_libre` (bool, défaut false), `is_active`, standards + trigger updated_at.

GRANT (`authenticated` lecture, `admin`/responsables écriture via RLS `has_role`), service_role ALL. L'employé peut **lire sa propre** affectation.

### Fonctions
- `compute_expected_shift(_user_id uuid, _at timestamptz)` → `(slot_code text, heure_debut timestamptz, heure_fin timestamptz, is_now boolean)`. STABLE SECURITY DEFINER.
  - Surface : selon weekday (1-5 = `jour`, 6/7 = repos → renvoie vide).
  - Rotation : `idx = (date_at - anchor_date) mod length(pattern)` ; token = `pattern[idx]` ; si `repos` → vide ; sinon slot correspondant, bornes calculées en `Africa/Algiers` (gère `crosses_midnight`). Vérifie aussi le créneau **nuit de la veille** encore en cours après minuit. `is_now` = `_at` ∈ [début, fin].
- `open_my_work_session()` → uuid (id session ou null). SECURITY DEFINER.
  - Récupère l'affectation de `auth.uid()` ; exige `autorisation_libre` + `is_now` ; anti-doublon (session active même jour/créneau) ; INSERT dans la table de session selon `scope_kind` (`maintenance_shifts` / `shifts` / `quality_shifts`) avec `opened_by = auth.uid()`, observation « [Ouverture auto rotation] » ; écrit un `audit_logs`.

### Nettoyage
- `DROP TABLE maintenance_shift_schedules` (+ policies/trigger). Supprimer l'edge function `apply-maintenance-schedules` et son cron `pg_cron`.

## 2. Logique métier (frontend/hooks)
- `src/lib/shiftRotation.ts` : helpers purs (calcul d'index de motif, résolution token→slot, bornes horaires, 5/7 surface) — testables sans DB.
- Hook `useAutoOpenWorkSession()` : appelé au montage de l'app authentifiée ; invoque `open_my_work_session()` puis `refresh()` du contexte shift. Silencieux si rien à ouvrir.

## 3. Interface Manager (configuration)
Nouvelle page `/parametres/rotations` (réservée admin/responsables) :
- Tableau des employés : système attribué, motif (aperçu badges), date d'ancrage, **toggle « Autorisation Libre »**, scope.
- Dialog d'édition : sélection système, **constructeur de motif** (séquence de jours matin/midi/nuit/repos, ajout/suppression/réordonnancement — masqué pour Surface), date d'ancrage, équipe, lignes couvertes, scope.
- Aperçu calculé « prochain shift » à partir du motif + ancrage.
- Audit `logAudit` sur chaque création/modif/toggle.

## 4. Interface Employé (dashboard)
Réutilise/étend `MaintenancierShiftView` :
- Au chargement, auto-ouverture via le hook. Bandeau « Session ouverte automatiquement — Présent ».
- **Tâches curatives** : interventions curatives ouvertes non assignées ou assignées à l'équipe du shift.
- **Tâches préventives** : préventif assigné spécifiquement à l'employé pour ce shift.
- Pour production/qualité : l'auto-ouverture redirige vers leurs kiosques existants (le dashboard curatif/préventif reste maintenance).

## 5. Tests (Vitest)
`src/test/shift/rotation-engine.test.ts` : modulo de motif, bouclage sur date future, repos, règle Surface 5/7, créneau nuit après minuit, gating `autorisation_libre`/`is_now`.

## Détails techniques
- Tous les calculs horaires en `Africa/Algiers` (cohérent avec `ensure_production_shift_session`).
- Sessions toujours insérées dans les tables existantes — aucun changement de leur schéma.
- RLS via `has_role()` ; l'employé lit uniquement sa propre affectation et déclenche sa propre ouverture.
- Mise à jour mémoire projet (remplacement de maintenance_shift_schedules par le moteur de rotation).
