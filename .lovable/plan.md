# Qualité — Traçabilité, Rapports, Audit & Notifications

## Current state (verified)

- Routes `/qualite/tracabilite` and `/qualite/rapports` exist but are placeholder pages.
- All other qualité modules already call `logAudit` (indicators, checks, NC decisions/closures, actions create/close, recipe/BOM status RPCs log inside the function). No new audit wiring needed besides the OF quality-decision page (`QualiteOf`) — to verify in implementation.
- Notifications are already triggered by `quality_actions` (assigned/closed) via direct insert. The richer `triggerNotification` helper in `src/lib/notifications.ts` exists and applies rule matching + dedup automatically.
- `consumptions` table currently has no lot/batch columns.
- OFs link to a single shift (`shifts.shift_team_id`, `chef_ligne_id`) — used in the traceability view.

---

## 1. Database (additive)

### Extend `consumptions` (nullable, no defaults that break inserts)
- `lot_number text`
- `batch_number text`
- `supplier_lot text`
- `expiry_date date`

Old rows remain valid (NULL). Existing inserts still work because no field is required.

### No other schema work required
- `bom_id` already added on `ordres_fabrication` in the previous task.
- `set_recipe_status` and `set_bom_status` already audit themselves.

---

## 2. `/qualite/tracabilite` — full traceability view

A list of OFs with filter (search by OF number / product / line / status) and an expandable detail card per OF showing:
- OF: numéro, produit, ligne, statut production, statut qualité, décision qualité.
- Recette utilisée: nom + version (from `ordres_fabrication.recipe_id` → `recipes`).
- Nomenclature: version (from `ordres_fabrication.bom_id` → `bill_of_materials`), or "non lié" if NULL.
- Quantité prévue / produite / rebut.
- Shifts associés (date, équipe, chef de ligne) — read from `shifts` joined on `of_id`.
- Consommations réelles: article, quantité, unité, lot/batch/supplier_lot/expiry si renseignés.
- Contrôles qualité (`quality_checks`) avec verdict / hors tolérance.
- Non-conformités liées (`quality_non_conformities`) avec statut + décision.
- Actions qualité liées (`quality_actions`) avec statut + responsable.

Export CSV "fiche traçabilité" pour un OF (un fichier par OF) listant chaque section.

### Files
- `src/pages/qualite/QualiteTracabilite.tsx` — new full implementation replacing placeholder.
- `src/pages/qualite/components/TracabiliteCard.tsx` — per-OF expandable card.
- `src/pages/qualite/components/TracabiliteCsv.ts` — pure CSV builder (testable).

---

## 3. `/qualite/rapports` — reports & exports

Tabs:
- **Conformité** : taux conformité par produit et par ligne (agrégation côté client à partir de `quality_checks.is_conform`).
- **Non-conformités** : NC par type / par gravité (counts).
- **Contrôles hors tolérance** : table `quality_checks` filtrée `is_conform = false`.
- **Actions en retard** : `quality_actions` où `due_date < today` et statut non final.
- **OFs** : compteurs par `quality_status` (en_attente, libere, bloque, rebut).
- **Théorique vs réel** : pour OFs avec `bom_id`, comparaison `quantity_per_unit * quantite_produite` vs somme des `consumptions` par article. Affiché uniquement quand les données sont disponibles.

Plage de dates (filtre période created_at). Bouton Export CSV par section.

### Files
- `src/pages/qualite/QualiteRapports.tsx`
- `src/pages/qualite/components/RapportsHelpers.ts` — pure aggregation + CSV builders (testable).

---

## 4. Audit

Audit déjà couvert pour : indicateur, contrôle, NC (création/décision/clôture), action (création/clôture), changement statut recette (RPC), changement statut nomenclature (RPC).

À ajouter explicitement :
- `quality_of_decision` quand un utilisateur change `ordres_fabrication.quality_status` depuis la nouvelle vue Traçabilité (action_type `update`, module `qualite`, entity_type `of`).

---

## 5. Notifications

Refactor minimal : tous les nouveaux événements passent par `triggerNotification` (qui applique automatiquement règles + déduplication via `defaultDedupKey = event_type:entity_id`). Pas de spam : dedup window 5 min minimum (déjà en place).

Événements émis :
- `quality.nc_created` — sur création NC, sévérité `info`.
- `quality.nc_critical` — sur création NC avec `severity in (high, critical)`, sévérité `high`.
- `quality.nc_blocked_lot` — quand `decision = 'bloquer_lot'`, sévérité `high`.
- `quality.action_assigned` — déjà émis (préservé).
- `quality.action_overdue` — émis depuis le rapport "Actions en retard" lors du chargement, dedup par jour (`grouped_daily`).
- `quality.check_out_of_tolerance` — quand un contrôle est saisi avec `is_conform = false`.
- `quality.of_quality_pending` — quand un OF passe en `quality_status = 'en_attente'`.
- `quality.recipe_version_approved` — après `set_recipe_status('active')` côté UI (déclenché client-side, dedup par recipe_id).
- `quality.bom_version_changed` — après `set_bom_status` (toute transition).

Tous ces événements utilisent `module: 'qualite'`. Les règles existantes restent valables (configurables dans `/parametres/notifications`).

---

## 6. Tests (`src/test/qualite/`)

- `tracabilite.test.ts` — CSV builder produit en-têtes attendues + lignes par section + échappement des virgules.
- `rapports.test.ts` — agrégations pures : taux de conformité par produit, count NC par type/gravité, détection actions en retard, comparaison théorique vs réel.
- `quality-events.test.ts` — chaque payload `triggerNotification` du nouveau code expose `event_type`, `module='qualite'`, `entity_id`, et n'inclut pas de champ de production (`statut`, `quantite_produite`).

Lancer la suite complète pour vérifier qu'aucun test GMAO/GPAO/PDR/tickets/documents existant n'est cassé. Les 6 tests `gmao-dashboard.test.tsx` déjà rouges (mock `useLocation` préexistant) restent hors scope.

---

## 7. Memory

Mise à jour de `mem://features/qualite-module` (ex-skeleton) pour devenir l'index complet du module qualité avec :
- routes finales, tables, RPCs, événements de notification, conventions audit.

---

## Confirmations attendues après implémentation

- Tables qualité : `quality_indicators`, `quality_indicator_assignments`, `quality_checks`, `quality_non_conformities`, `quality_actions`, `bill_of_materials`, `bom_items`. Recettes étendues. `consumptions` enrichies (lot/batch/supplier_lot/expiry, tous nullable).
- Routes : Dashboard, OF, Indicateurs, Contrôles, Non-conformités, Actions, Recettes & Nomenclatures, **Traçabilité**, **Rapports**.
- Audit complet (création/édition/décision/clôture sur tous les flux qualité + lifecycle recette/BOM + décision qualité OF).
- Notifications via `triggerNotification` avec dedup, événements `quality.*` listés ci-dessus.
- Aucun module stable cassé : Shift Production, GPAO OF, GMAO Dashboard, tickets, PDR, documents continuent à fonctionner.
