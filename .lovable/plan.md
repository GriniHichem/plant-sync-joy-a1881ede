# Plan — Apps Shift LIVE pilotées par les responsables

## Objectif

Rendre les 3 apps shift (`/gpao/shift`, `/maintenance/shift`, `/qualite/shift`) utilisables comme des **postes opérationnels live** :

- Le **responsable production** ouvre/configure la session de shift production → le chef de ligne / opérateur n'a plus qu'à exécuter dedans.
- Le **responsable maintenance** ouvre la session shift maintenance → le maintenancier exécute ses tickets / préventifs dedans.
- Le **responsable / superviseur qualité** ouvre la session shift contrôle → le contrôleur qualité exécute ses contrôles + NC dedans.

L'opérateur connecté à une app shift ne voit **que cette app** (pas de sidebar, pas de paramètres, pas d'autres modules), tout en restant **conforme à la logique existante** (RLS, audit, OF, équipes, indicateurs, tickets, RBAC).

**Pas d'offline / IndexedDB / queue / PDF locale** — tout reste online et live (on retire la couche ajoutée par erreur en Phase 3).

---

## Phase 1 — Nettoyage + rôles "ouvreur de session"

But : remettre les bases au propre et donner aux responsables le pouvoir d'**ouvrir une session shift pour un opérateur**.

1. **Retirer la couche offline non demandée**
   - Supprimer : `src/lib/shiftOfflineQueue.ts`, `src/hooks/useShiftOfflineQueue.ts`, `src/components/shift/ShiftQueueBadge.tsx`, `src/lib/shiftReportPdf.ts`, `src/test/shift/offline-queue.test.ts`, `src/test/shift/report-pdf.test.ts`.
   - Retirer `idb-keyval`, `jspdf`, `jspdf-autotable` de `package.json`.
   - Nettoyer `ShiftLayout.tsx` (retirer `ShiftQueueBadge` + `useShiftSessionTimeout` lié à l'offline).
   - Garder uniquement : badge LIVE, équipe, durée écoulée, indicateur Wifi online/offline (visuel seul), bouton plein écran, bouton Quitter.

2. **Logique "ouverture de session par responsable"**
   - **Production** : table `shifts` existe déjà avec `chef_ligne_id`. Permettre à `resp_production` (et `admin`) d'ouvrir un shift **pour** un chef_ligne donné (sélection user + équipe + ligne + OF + créneau). Le chef_ligne, en se connectant, retrouve sa session déjà ouverte via `useActiveProductionShift` (déjà filtré par `chef_ligne_id = user.id`).
   - **Qualité** : `quality_shifts` existe avec `controleur_id`. Permettre à `resp_controle_qualite` / `directeur_qualite` (et `admin`) d'ouvrir un shift **pour** un contrôleur donné.
   - **Maintenance** : pas de table dédiée — créer `maintenance_shifts` (id, date_shift, shift_type, shift_team_id, maintenancier_id, line_ids[], heure_debut, heure_fin, is_active, observations, opened_by, audit). RLS : maintenancier voit son shift, resp_maintenance/admin voit tout. Ouvert par `resp_maintenance`.

3. **UI "Console responsable"** (dans le module standard, pas dans le kiosque)
   - `/gpao/shift` (vue responsable) : tableau des sessions du jour + bouton "Ouvrir une session pour…".
   - `/maintenance/shift` (vue responsable) : idem pour les maintenanciers de service.
   - `/qualite/shift` (vue responsable) : idem pour les contrôleurs.
   - L'écran kiosque (mode plein) reste séparé sur les mêmes URLs mais s'affiche **seulement si l'utilisateur est l'opérateur cible** d'une session ouverte. Sinon on affiche la console responsable.

4. **Garde-fou rôles**
   - `ShiftGuard` : déjà présent. Étendre pour distinguer "rôle responsable" → console, "rôle opérateur avec session active" → kiosque, "opérateur sans session" → écran "demandez à votre responsable d'ouvrir votre shift".

**Livrables Phase 1** : code offline supprimé, table `maintenance_shifts` créée + RLS, 3 dialogs "Ouvrir session" pour les 3 responsables, routing kiosque/console basé sur rôle + session active.

---

## Phase 2 — Apps shift LIVE finalisées

But : que chaque opérateur, dans son app, fasse **tout son travail de shift** sans toucher au reste.

1. **App Shift Production (chef_ligne)**
   - Header LIVE déjà OK.
   - Onglets/dock : Déclarer heure / Arrêt / Ticket maintenance / Consommations / Observations.
   - Toutes les actions héritent automatiquement : `shift_id`, `team_id`, `line_id`, `of_id`.
   - Bouton "Clôturer mon shift" → demande confirmation + observations, puis remet l'utilisateur sur écran "session terminée, contactez votre responsable".

2. **App Shift Maintenance (maintenancier)**
   - Onglets : Mes tickets ouverts / Mes plans préventifs du jour / Créer ticket / Journal du shift.
   - Liste filtrée sur `assigned_to = user.id` + lignes de la session.
   - Intervention : ouvre ticket → saisie cause/solution/PDR consommées → clôture (audit lié au `maintenance_shift_id`).
   - Bouton "Clôturer mon shift".

3. **App Shift Qualité (contrôleur)**
   - Onglets : Contrôles à faire / Saisir contrôle / Déclarer NC / Mes lignes.
   - Liste contrôles dérivée des indicateurs assignés aux OF actifs des lignes du shift.
   - Tous les inserts → `quality_shift_id`, `team_id`, `production_line_id`, `of_id` auto-injectés (déjà fait, à garder).
   - Bouton "Clôturer mon shift".

4. **Cohérence transverse**
   - Tous les inserts passent par les `supabase.from(...).insert(...)` standards (pas de queue), avec `logAudit(...)` et le label `(shift live)`.
   - Realtime : abonner les listes (tickets, contrôles, déclarations) via `supabase.channel` pour rafraîchissement live sans rechargement.
   - Conserver les tests existants, retirer ceux liés à l'offline.

**Livrables Phase 2 (✅ FAIT)** : 3 apps shift complètes, opérationnelles, live, isolées du reste de l'app.
- Bouton "Clôturer mon shift" (`CloseShiftButton`) dans le `ShiftLayout` pour les 3 kiosques.
- Realtime activé (`useShiftRealtime`) sur `production_declarations`, `tickets`, `ordres_fabrication` (tables ajoutées à `supabase_realtime`).
- Dock dynamique : Maintenance ajoute "Préventif" + tab disabled si pas de shift maintenance actif.
- Auto-injection des IDs de contexte (shift, équipe, ligne, OF) déjà en place.

---

## Phase 3 — Supervision live côté responsables + clôture

But : donner aux responsables une **vue temps réel** de leurs équipes en shift et la main sur la clôture.

1. **Console responsable enrichie** (3 modules)
   - KPIs live : nb sessions ouvertes, déclarations/heure, tickets ouverts, NC déclarées, taux conformité.
   - Tableau sessions actives avec : opérateur, équipe, ligne(s), OF, durée, dernière action, bouton "Voir le détail" / "Forcer clôture".
   - Realtime sur `shifts`, `quality_shifts`, `maintenance_shifts` + tables filles.

2. **Clôture & bilan**
   - Clôture par l'opérateur OU par le responsable (forçage avec motif → audit obligatoire).
   - Bilan de fin de shift généré **côté serveur via une vue / RPC** (`shift_summary`, `quality_shift_summary`, `maintenance_shift_summary`) — affiché en HTML imprimable navigateur (window.print) au lieu d'une PDF locale. Pas de jsPDF.

3. **Notifications**
   - Réutiliser le système existant : règles auto pour `shift_opened`, `shift_closed`, `shift_overrun` (>9h), `shift_no_declaration` (>2h sans déclaration). Les responsables sont notifiés via le bell existant.

4. **Audit & RBAC**
   - Vérifier que `resp_production`, `resp_maintenance`, `resp_controle_qualite` ont bien `can_create` sur les tables shift correspondantes ; mise à jour `RolesMatrix` si besoin.
   - Toute ouverture/clôture/forçage logguée dans `audit_logs` avec `reason` obligatoire pour les forçages.

**Livrables Phase 3** : supervision live, clôture contrôlée, bilan imprimable HTML, notifications + audit alignés.

---

## Détails techniques

```text
Routing
/gpao/shift           ──▶ si resp_production/admin  ─▶ Console responsable production
                          si chef_ligne + session   ─▶ Kiosque ShiftLayout (LIVE)
                          sinon                     ─▶ "Pas de session ouverte"

/maintenance/shift    ──▶ idem avec resp_maintenance / maintenancier
/qualite/shift        ──▶ idem avec resp_controle_qualite / controleur_qualite
```

```text
Tables touchées
shifts                    (existante, +colonne opened_by uuid)
quality_shifts            (existante, +colonne opened_by uuid)
maintenance_shifts        (NOUVELLE) + RLS via has_role()
audit_logs                (réutilisée)
```

Composants à supprimer : `ShiftQueueBadge`, `useShiftOfflineQueue`, `shiftOfflineQueue.ts`, `shiftReportPdf.ts`, tests offline + pdf.
Composants à créer : `RespShiftConsole.tsx` (×3 ou générique avec `kind`), `OpenShiftDialog.tsx` (×3 ou générique), `ShiftLiveStats.tsx`.

Aucun changement structurel sur la sidebar standard, les paramètres, le RBAC global, ou les autres modules : les apps shift restent un overlay isolé via `ProtectedShiftRoute` déjà en place.
