# Cohérence des statuts tickets — audit + champ `assignment_status` dédié

## Constat de l'audit

Le statut principal des tickets est défini par l'enum Postgres `ticket_statut` :

```
ouvert | pris_en_charge | en_cours | resolu | cloture
```

**`pris_en_charge` n'est PAS un nouveau terme** — il existe déjà depuis la migration initiale (`20260316172020`) et est utilisé partout de façon cohérente :

- **DB** : enum `ticket_statut` + colonne `tickets.statut`
- **UI** : `StatusBadge` (libellé "Pris en charge", couleur warning), filtres `TicketsList`, `MaintenancierShiftView`, `InterventionJournal`
- **KPI / Dashboard** : `OPEN_TICKET_STATUSES = ["ouvert", "pris_en_charge", "en_cours"]` dans `useLineSynopticData`, agrégats tests
- **Permissions** : `canResolve` / `canHandover` acceptent `pris_en_charge` OU `en_cours`
- **Tests** : 9 fichiers couvrent les 5 statuts

→ **Aucun conflit existant**. Le workflow reste : `ouvert → pris_en_charge → en_cours (optionnel) → resolu → cloture`.

## Le vrai besoin

Les flux récents (transfert, libération, collaboration) modifient `assignee_id` et créent des sous-statuts d'intervention (`transferee`, `liberee`), mais il n'existe **aucun champ pour tracer le cycle d'affectation lui-même**. Aujourd'hui on doit déduire "transféré" / "libéré" depuis l'historique d'audit.

## Plan

### 1. Migration : ajout d'un champ nullable `assignment_status`

```sql
CREATE TYPE public.ticket_assignment_status AS ENUM (
  'unassigned',   -- assignee_id IS NULL et jamais pris
  'assigned',     -- pris en charge (assignee_id renseigné)
  'transferred',  -- réassigné à un autre maintenancier
  'released'      -- libéré dans le pool (assignee_id remis à NULL)
);

ALTER TABLE public.tickets
  ADD COLUMN assignment_status public.ticket_assignment_status;
```

- **Nullable** : aucune valeur imposée sur les anciens tickets, aucun défaut → zéro impact sur les filtres/KPI existants.
- **Backfill léger** (one-shot) :
  - `assignee_id IS NULL` et `statut IN ('ouvert')` → `unassigned`
  - `assignee_id IS NOT NULL` et `statut IN ('pris_en_charge','en_cours')` → `assigned`
  - autres → laisser `NULL` (statut terminal, info non pertinente)

### 2. Mise à jour `TicketDetail.tsx` (write paths uniquement)

Ajouter `assignment_status` à chaque action **sans toucher à `statut`** :

| Action | `statut` (inchangé) | `assignment_status` (nouveau) |
|---|---|---|
| `handleTakeCharge` | `pris_en_charge` | `assigned` |
| `handleTransfer` | inchangé | `transferred`, puis `assigned` après reprise |
| `handleRelease` | `ouvert` | `released` |
| `handleResolve` | `resolu` | inchangé (NULL ou dernière valeur) |

### 3. UI — affichage non bloquant

- `StatusBadge` reste piloté par `statut` (aucune modification visuelle existante).
- Sur `TicketDetail`, ajouter un petit badge secondaire à côté du badge principal quand `assignment_status` ∈ {`transferred`, `released`} :
  - `Transféré` (bg-info/10)
  - `Libéré` (bg-warning/10)
- **Pas** de nouveau filtre dans `TicketsList` (préserve l'UX existante). Le champ devient queryable pour le dashboard/analytics ultérieurement.

### 4. Garde-fous

- Aucune modification à : `OPEN_TICKET_STATUSES`, filtres `TicketsList`, KPI `Dashboard`, agrégats `AnalyticsPage`, requêtes `MaintenancierShiftView`.
- Aucune modification à l'enum `ticket_statut` ni à l'enum `intervention_statut`.
- Tests existants restent verts (ils n'utilisent pas `assignment_status`).

### 5. Tests

Nouveau fichier `src/test/gmao/ticket-assignment-status.test.ts` :
- transition `unassigned → assigned` lors de la prise en charge
- transition `assigned → transferred → assigned` après transfert
- transition `assigned → released` après libération
- `statut` jamais modifié par ces transitions hors workflow normal

### 6. Mémoire

Mettre à jour `mem://features/gmao-maintenance` : noter que `tickets.statut` (5 valeurs) est immuable et que le cycle d'affectation est porté par `assignment_status` (nullable, séparé).

## Détails techniques

```text
tickets
├── statut           : ticket_statut    NOT NULL  (workflow métier — inchangé)
└── assignment_status: ticket_assignment_status NULL (cycle d'affectation — nouveau)
```

Fichiers touchés :
- `supabase/migrations/<new>.sql` — enum + colonne + backfill
- `src/pages/TicketDetail.tsx` — 3 fonctions (`handleTakeCharge`, `handleTransfer`, `handleRelease`) + badge secondaire
- `src/test/gmao/ticket-assignment-status.test.ts` — nouveau
- `mem://features/gmao-maintenance` — note

`src/integrations/supabase/types.ts` est régénéré automatiquement après migration.
