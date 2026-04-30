
# Isolation des 3 Shifts en Apps Autonomes — Plan en 3 Phases

## Objectif global

Transformer les 3 écrans Shift (`/gpao/shift`, `/maintenance/shift`, `/qualite/shift`) en **applications opérationnelles isolées** où l'utilisateur en quart agit uniquement sur les tâches/demandes de **son shift actif**, sans accès aux paramétrages ni aux modules transverses.

Principes communs :
- Layout dédié **ShiftLayout** (sans sidebar complète) → focus opérationnel "kiosque".
- Verrou de contexte : toute action (ticket, déclaration, contrôle, NC, conso) **hérite automatiquement** du `shift_id` actif du user.
- Aucune nouvelle table. On exploite l'existant (`shifts`, `quality_shifts`, `tickets`, `interventions`, `quality_checks`, `quality_non_conformities`, `consumptions`, `production_stops`, `preventive_plans`).
- Conformité : audit log sur chaque action, RLS inchangées, rôles existants respectés.

---

## Phase 1 — Fondations communes (layout + garde de shift)

**But** : créer l'infrastructure partagée des 3 apps shift sans changer la logique métier.

### Livrables

1. **`src/components/shift/ShiftLayout.tsx`** — Layout minimal :
   - Topbar compacte : logo + nom du shift app + badge équipe/horaire + bouton "Quitter le shift" (retour `/apps`).
   - Pas de sidebar globale ; navigation interne par onglets/cartes.
   - Footer sticky : compteur live (durée écoulée, KPIs courts).

2. **`src/components/shift/ShiftGuard.tsx`** — Wrapper qui :
   - Vérifie qu'un shift actif existe (production / maintenance / qualité).
   - Si non actif → écran "Démarrer mon shift" (bloque tout le reste).
   - Injecte le contexte shift via React Context → tous les enfants y accèdent.

3. **`src/contexts/ActiveShiftContext.tsx`** — Contexte unifié :
   ```ts
   { kind: "production" | "maintenance" | "quality", shift, refresh, close }
   ```
   Maintenance = vue dérivée (pas d'objet shift en base, on s'appuie sur l'utilisateur connecté + assignations).

4. **Routes wrappées** dans `App.tsx` :
   - `/gpao/shift/*` → `ShiftLayout` + `ShiftGuard kind="production"`
   - `/maintenance/shift/*` → `ShiftLayout` + `ShiftGuard kind="maintenance"`
   - `/qualite/shift/*` → `ShiftLayout` + `ShiftGuard kind="quality"`

5. **Page `/apps`** : marquer les 3 shifts comme "Apps Live" et ajouter un message d'avertissement sur clic ("Vous entrez en mode opérationnel — vos actions seront liées à votre shift").

### Sécurité / conformité
- RLS inchangées.
- Audit : un événement `shift_app_entered` / `shift_app_exited` par session.

---

## Phase 2 — Actions in-shift cadrées (héritage automatique du contexte) ✅ LIVRÉE

**Livré** :
- `ShiftDock` (bottom dock 56px touch targets) intégré au `ShiftLayout`.
- Production : `/gpao/shift/declarer` (auto-déclaration heure-1), `/gpao/shift/arret`, `/gpao/shift/ticket` — tous auto-injectent `shift_id`, `line_id`, `of_id`.
- Maintenance : `/maintenance/shift/intervention[/:ticketId]` — liste de tickets ouverts/assignés + formulaire plein-écran avec checkbox "clôturer maintenant" (cause racine + solution obligatoires si coché).
- Qualité : `/qualite/shift/check` (auto `quality_shift_id`+`team_id`+`shift_id`+`production_line_id`, support numeric/boolean/select/text via `get_quality_indicators_for_of`), `/qualite/shift/nc`, `/qualite/shift/lignes`.
- Toutes les actions tracées via `logAudit` avec `entity_type` métier et label "(kiosque shift)".



**But** : tous les "actes métier" lancés depuis une app shift sont auto-rattachés et limités au périmètre du shift.

### Shift Production (`/gpao/shift`)
Sous-routes ajoutées (rendues dans le layout shift, sans quitter l'app) :
- **Déclaration horaire** (existe — extraire en sous-page `/gpao/shift/declarer`).
- **Conso** (existe — `/gpao/shift/conso`), pré-filtrée sur l'OF du shift.
- **Déclarer un arrêt** (`/gpao/shift/arret`) → auto `shift_id`, `line_id`, `of_id`.
- **Ouvrir un ticket maintenance** (`/gpao/shift/ticket`) → ticket avec lien `production_shift_id`, machine/ligne pré-remplies.
- **Clôture** : observations obligatoires (existant) + bilan auto.

Restrictions :
- Aucun lien vers `/parametres`, `/machines`, `/recettes` etc. (cachés par le layout).
- Le sélecteur d'OF/ligne se limite à ceux du shift démarré.

### Shift Maintenance (`/maintenance/shift`)
Sous-routes :
- **Curatif** (existe) — Tickets ouverts/assignés au user.
- **Préventif** (existe) — Plans assignés.
- **Démarrer / clore une intervention** (`/maintenance/shift/intervention/:ticketId`) → formulaire dédié plein écran avec champs minimums (durée, cause, solution, PDR consommées).
- **Demande PDR rapide** (`/maintenance/shift/pdr/:ticketId`) → mouvement de stock pré-rempli.
- **Bilan de quart** : à la fin, page récap (interventions clôturées, durée totale, PDR consommées) + export PDF/CSV optionnel.

Restrictions :
- Pas d'accès aux fiches machine/équipement/PDR en édition. Lecture seule via drawer in-app.

### Shift Qualité (`/qualite/shift`)
Sous-routes :
- **Saisir un contrôle** (`/qualite/shift/controle`) — formulaire pré-rempli avec `quality_shift_id`, `shift_id` lié, `team_id`, OF déduit des lignes couvertes.
- **Déclarer une NC** (`/qualite/shift/nc`) — pré-rempli idem.
- **Plan de contrôles dus** : liste des indicateurs requis pour les OFs en cours sur les lignes couvertes (utilise `get_quality_indicators_for_of`).
- **Rafraîchir liens production** (existe).
- **Bilan quart** : KPIs (existe) + export.

Restrictions :
- Pas d'accès admin qualité (référentiels, indicateurs, assignments).
- L'écran ne montre que les OFs/lignes du shift.

### Sécurité / conformité
- Côté serveur : triggers existants (`quality_shift_lines_attach_links`, `quality_shifts_close_validate`) suffisent. Ajouter (si absent) un trigger qui **interdit** la création d'un `quality_check` / NC sans `quality_shift_id` quand l'auteur a un shift actif → migration SQL légère.
- Triggers similaires côté production : un ticket créé depuis l'app production-shift doit porter `production_shift_id` (champ déjà existant si présent, sinon ajouté en migration).
- Audit : chaque action porte la mention "via shift app" dans `metadata`.

---

## Phase 3 — Polish opérationnel (UX kiosque + offline-friendly) ✅ LIVRÉE

**Livré** :
- `src/lib/shiftOfflineQueue.ts` — file IndexedDB (idb-keyval) avec `enqueue`, `flush`, `insertOrQueue` (fallback automatique online → queue si réseau down).
- `src/hooks/useShiftOfflineQueue.ts` — vue réactive + auto-flush sur l'évènement `online` + polling 15s.
- `src/components/shift/ShiftQueueBadge.tsx` — badge "X en attente" + bouton sync, intégré dans la topbar `ShiftLayout`.
- `src/lib/shiftReportPdf.ts` — bilan PDF (jsPDF + autotable) générique pour les 3 types de shift, multi-sections + KPIs + observations.
- `src/hooks/useShiftSessionTimeout.ts` — toast d'avertissement après 8h (jamais d'auto-clôture).
- Tests : `src/test/shift/offline-queue.test.ts` (6 ✓), `src/test/shift/report-pdf.test.ts` (2 ✓).

**Reste optionnel** : intégration des appels `insertOrQueue` dans les sous-pages shift existantes (les inserts y sont actuellement directs), mode plein écran déjà présent dans `ShiftLayout`.

**But** : rendre les apps utilisables en atelier, écrans tablette, conditions de bruit et coupures réseau.

### Livrables

1. **UX kiosque**
   - Mode plein écran (bouton "Plein écran" → `requestFullscreen()`).
   - Cibles tactiles ≥ 56px, typographie agrandie, contrastes renforcés (déjà cohérent avec mémoire "Industrial Aesthetic").
   - Dock d'actions rapides en bas d'écran (FAB segmenté : Déclarer / Ticket / Arrêt / Clôturer).
   - Verrouillage de session : timeout 8h auto-clôture avec confirmation.

2. **Live & feedback**
   - Realtime sur la table du shift courant (`shifts` ou `quality_shifts`) → KPIs en direct.
   - Toasts succès courts et discrets ; jamais de modal bloquante hors clôture.
   - Indicateur connectivité (pastille verte/rouge dans la topbar).

3. **Résilience réseau**
   - File d'attente locale (IndexedDB via `idb-keyval`) pour les déclarations, contrôles, NC saisis hors-ligne.
   - Synchronisation au retour réseau, badge "X actions en attente".
   - Pas de modification de schéma — c'est purement client.

4. **Bilan & export**
   - À la clôture : page récap exportable (PDF via jsPDF déjà installé, ou CSV).
   - Email automatique au responsable hiérarchique (utilise edge function `send-email` existante).

5. **Tests**
   - `src/test/shift/shift-guard.test.tsx` — bloque sans shift actif.
   - `src/test/shift/shift-context-inheritance.test.ts` — création ticket/check porte bien le `shift_id`.
   - `src/test/shift/shift-app-isolation.test.tsx` — pas de liens vers paramétrage rendus.

### Documentation
- Maj `MANUAL.md` : 3 sections "Comment utiliser l'app Shift X".
- Maj mémoires : nouvelle entrée `mem://features/shift-apps-isolation`.

---

## Découpage technique (récap fichiers)

```
Phase 1
  src/components/shift/ShiftLayout.tsx         (new)
  src/components/shift/ShiftGuard.tsx          (new)
  src/contexts/ActiveShiftContext.tsx          (new)
  src/hooks/useActiveProductionShift.ts        (new, miroir de useActiveQualityShift)
  src/hooks/useActiveMaintenanceContext.ts     (new)
  src/App.tsx                                   (routes wrappées)
  src/pages/Apps.tsx                            (mention mode opérationnel)

Phase 2
  src/pages/gpao/shift/ShiftHome.tsx           (refactor de ShiftScreen actuel)
  src/pages/gpao/shift/ShiftDeclare.tsx        (sous-page)
  src/pages/gpao/shift/ShiftConso.tsx
  src/pages/gpao/shift/ShiftTicket.tsx
  src/pages/gpao/shift/ShiftStop.tsx
  src/pages/maintenance/shift/ShiftHome.tsx    (refactor MaintenancierShiftView)
  src/pages/maintenance/shift/InterventionRun.tsx
  src/pages/maintenance/shift/PdrQuickConsume.tsx
  src/pages/qualite/shift/QualiteShiftHome.tsx (refactor QualiteShiftScreen)
  src/pages/qualite/shift/CheckEntry.tsx
  src/pages/qualite/shift/NcEntry.tsx
  supabase/migrations/<ts>_shift_context_enforcement.sql
                                               (triggers anti-orphelin + colonnes manquantes éventuelles)

Phase 3
  src/components/shift/ShiftQuickDock.tsx
  src/components/shift/ShiftConnectivityBadge.tsx
  src/lib/shiftOfflineQueue.ts                 (IndexedDB)
  src/lib/shiftReportPdf.ts
  src/test/shift/*.test.{ts,tsx}
  MANUAL.md                                    (sections shift apps)
```

---

## Hors scope
- Aucune refonte du modèle de rôles / permissions.
- Aucune nouvelle table métier (uniquement éventuellement 1–2 colonnes pour traçabilité shift).
- Pas de modification des écrans complets `Tickets`, `Contrôles`, `NC` hors-shift — ils restent pour les responsables.

## Validation suggérée
Après chaque phase, on déploie + on fait tester par un opérateur réel sur tablette avant d'attaquer la suivante.
