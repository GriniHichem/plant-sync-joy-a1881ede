# Gestion des demandes de pièces (PDR) en shift maintenance

Ajout d'un circuit complet **demande → préparation magasin → prise confirmée maintenance → consommation**, avec réservation du stock, stock maintenance intermédiaire, double validation, audit et notifications. Couvre le curatif (ticket) et le préventif (plan).

## Cycle de vie d'une demande

```text
 MAINTENANCE                 MAGASIN (gestionnaire_magasin)        MAINTENANCE
 ───────────                 ──────────────────────────────       ───────────
 [Demandée] ──réserve qty──> [Prête] (qté préparée) ───────────> [Prise] (taked)
     │                           │                                  │ sortie stock
     │                           └──> [Refusée] (motif)             └──> + stock maintenance
     └──> [Annulée] (par le demandeur)        (libère la réservation)
```

- **Réservation à la demande** : `pdr.stock_reserve += qté`. Affichage `Disponible = stock_actuel − stock_reserve`.
- **Prise confirmée** : libère la réservation, génère une **sortie de consommation** (`pdr_stock_movements type=sortie`, `stock_actuel −= qté`) et crédite le **stock maintenance intermédiaire**.
- **Clôture intervention** : les pièces réellement posées sont consommées depuis le stock maintenance (lien `intervention_pdr`, sans re-décrémenter le stock principal) ; le reliquat est **retourné** au stock principal (mouvement `entrée`).
- Refus / annulation : libèrent la réservation, aucun mouvement de stock.

## Préventif
- Le **resp. maintenance** (depuis le plan / méthode) **et** le **maintenancier** peuvent créer une demande préventive (`type=preventive`, liée au `preventive_plan_id`).
- Le maintenancier **valide la pose** (respect) lors de l'exécution : confirmation de la prise + consommation à la clôture.

## Fenêtres / écrans

1. **Côté maintenance — Demander des pièces** (dans le kiosque shift, onglet « Pièces »)
   - Filtres **Famille → Sous-famille** (`pdr_families` + `pdr.sous_famille`), recherche réf/désignation.
   - Pour chaque pièce : saisie **quantité voulue**, badge **Disponible (n)** ou **Non disponible** (calculé sur `stock_actuel − stock_reserve`).
   - Panier multi-lignes, rattaché au ticket (curatif) ou au plan (préventif).
2. **Côté magasin — File des demandes (temps réel)** (`/pdr/demandes`)
   - Liste live (realtime) des demandes en cours, triées par priorité/ancienneté.
   - Actions par ligne : **Prête** (qté préparée) ou **Refusée** (motif).
3. **Côté maintenance — Mes pièces à prendre**
   - Liste des lignes `Prête` ; bouton **Confirmer la prise (taked)** → sortie + stock maintenance.
   - Vue du **stock maintenance** détenu (par pièce) avec retour possible.

Statuts affichés via badges (convention Matte Ceramic existante), pastilles pulse pour le temps réel.

## Modèle de données (migration)

- `pdr.stock_reserve` (integer, default 0) — quantité réservée.
- **`pdr_requests`** : `numero` (auto), `type` (curative|preventive), `ticket_id?`, `preventive_plan_id?`, `intervention_id?`, `machine_id?`, `ligne_id?`, `requested_by`, `priorite`, `statut` (demandee|prete|partielle|prise|refusee|annulee), `commentaire`, `created_by/updated_by`.
- **`pdr_request_items`** : `request_id`, `pdr_id`, `quantite_demandee`, `quantite_preparee`, `quantite_prise`, `statut`, `dispo_snapshot` (bool), `position_id?`, `cause_remplacement?`, `commentaire`, traçabilité magasin (`prepared_by/at`) et maintenance (`taken_by/at`), `refused_reason?`.
- **`pdr_maintenance_holdings`** : ledger du stock maintenance — `pdr_id`, `request_item_id`, `holder_id`, `quantite`, `statut` (en_main|consomme|retourne), traçabilité.

Toutes les tables : `GRANT` (authenticated + service_role), RLS via `has_role()`, colonnes `created_at/updated_at` + trigger, auto-numérotation `numero` (pattern existant).

## Logique serveur (fonctions SECURITY DEFINER + triggers)
- `create_pdr_request(...)` : crée demande + lignes, **réserve** le stock, audit.
- `set_request_item_ready(item_id, qte_preparee)` : rôle `gestionnaire_magasin`, statut→prete, audit + notif demandeur.
- `confirm_request_item_taken(item_id, qte_prise)` : rôle maintenance, libère réserve, **sortie** stock + holding maintenance, statut→prise, audit + notif.
- `refuse_request_item(item_id, motif)` / `cancel_pdr_request(id)` : libèrent la réserve, audit + notif.
- `consume_maintenance_holding(...)` à la clôture : lie `intervention_pdr`, marque holding consommé, retourne le reliquat (entrée). Mise à jour de l'écran de clôture pour utiliser le stock maintenance au lieu de la saisie libre.
- Agrégation du statut de la demande (prete/partielle/prise) recalculée par trigger sur les lignes.

## Permissions & rôles
- Demander : `maintenancier`, `resp_maintenance`, `admin`.
- Préparer / refuser : `gestionnaire_magasin`, `admin`.
- Confirmer la prise : `maintenancier`, `resp_maintenance`, `admin`.
- Réutilise `pdr_stock_permissions` (`can_create_exit`) pour borner la génération de sortie.

## Audit, notifications & temps réel
- Chaque transition écrit un `audit_logs` (auteur, raison, anciennes/nouvelles valeurs) — règle mémoire.
- Notifications in-app : demande créée → magasin ; prête → demandeur ; prise/refus → parties concernées (via le module notifications, jamais depuis lui-même).
- Realtime Supabase sur `pdr_requests` / `pdr_request_items` pour les deux files.

## Fichiers concernés (indicatif)
- Migration SQL (tables, colonne, RLS, GRANT, fonctions, triggers, numérotation).
- Hooks : `usePdrRequests`, `usePdrMaintenanceStock` (+ realtime).
- UI : nouvel onglet « Pièces » dans le kiosque shift + composant de demande (filtres famille/sous-famille, dispo), page magasin `/pdr/demandes`, vue « prise » maintenance.
- Adaptation de `MaintenanceShiftIntervention` (clôture → consommation depuis stock maintenance) et `PreventifDetail`/exécution (demande + validation pose).
- Sidebar/route + permissions.

## Étapes
1. Migration BD (schéma + réservation + fonctions + RLS/GRANT + numérotation).
2. Hooks données + realtime.
3. Écran « Demander » (maintenance) avec filtres famille/sous-famille et disponibilité.
4. File magasin temps réel (prête/refusée).
5. Confirmation prise + stock maintenance.
6. Intégration clôture intervention → consommation auto + retour reliquat.
7. Branche préventif (resp. maintenance demande, maintenancier valide).
8. Audit + notifications + tests Vitest (transitions, réservation, sortie).
