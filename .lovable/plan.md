# Onglet « Historique PDR » dans le plan préventif

## Objectif
Ajouter un onglet dans la page d'un plan préventif (`PreventifDetail`) qui retrace, sous forme de chronologie, **chaque événement du cycle de vie des pièces** liées au plan :
- **Demande** (quantité demandée, par qui, quand)
- **Préparation magasin** (quantité préparée, par qui, quand)
- **Prise** (quantité prise, par qui, quand, + reliquat non fourni)
- **Consommation** à la clôture (quantité consommée, exécution liée, + reliquat retourné magasin)

Aucune migration : toutes les données existent déjà.

## Sources de données (déjà en base)
```text
pdr_requests          → numero, created_at, created_by/requested_by, statut
pdr_request_items     → quantite_demandee, prepared_at/by + quantite_preparee,
                        taken_at/by + quantite_prise, pdr(reference, designation)
intervention_pdr      → quantite, created_at, preventive_execution_id  (consommation préventive)
preventive_executions → pour relier la consommation à une exécution datée
profiles              → first_name, last_name pour afficher les utilisateurs
```

Reliquats calculés :
- **Reliquat de prise** = `quantite_demandee − quantite_prise` (pièce demandée non entièrement fournie)
- **Reliquat retourné magasin** = `quantite_prise − quantite_consommée` (déduit à la clôture)

## Parcours cible
```text
Onglet « Historique PDR »
  Réf. PIECE-001 — Roulement
   ● 24/06 09:12  Demandée    ×4   par M. Dupont   (DEM-2026-014)
   ● 24/06 09:40  Préparée    ×4   par Magasinier
   ● 24/06 10:05  Prise       ×3   par M. Dupont   reliquat 1 non fourni
   ● 24/06 11:30  Consommée   ×2   exéc. du 24/06  reliquat 1 retourné magasin
```

## Changements (frontend uniquement)

### `src/pages/PreventifDetail.tsx`
1. **Nouvel onglet** `historique` dans la `TabsList` (icône `History`), après « Exécutions ».
2. **Chargement** dans `loadAll` :
   - Réutiliser `planRequests` déjà chargé (contient items + dates + quantités).
   - Charger `intervention_pdr` filtré sur les `preventive_execution_id` des `executions` du plan, avec `pdr(reference, designation)`, pour la consommation.
   - Étendre le `SELECT` de `loadPlanRequests` pour inclure `prepared_by`, `prepared_at`, `quantite_preparee`, `taken_by`, `taken_at`, `quantite_prise` (déjà présents via `*`).
   - Récupérer les profils de tous les `user_id` impliqués (requested_by, prepared_by, taken_by) en plus des assignés, dans une map id→nom.
3. **Construction de la chronologie** (helper local, pur, dans le composant) :
   - Grouper par pièce (`pdr_id` + référence).
   - Pour chaque item : produire les événements `demandée`, `préparée` (si `prepared_at`), `prise` (si `taken_at`) avec date, utilisateur, quantité.
   - Pour chaque `intervention_pdr` (consommation) : événement `consommée` avec date, quantité, exécution liée.
   - Trier les événements par date au sein de chaque pièce.
4. **Rendu** : une carte par pièce avec une liste verticale d'événements ; chaque ligne = badge type (couleur par type), date formatée `fr-FR`, quantité `tabular-nums`, nom utilisateur, et mention reliquat le cas échéant. État vide « Aucun mouvement de pièce pour ce plan ».

### Réutilisation
- Pas de nouveau hook ni de RPC : lecture directe via le client `supabase` comme le reste du fichier.
- Formatage dates/quantités identique à l'existant (gramme, 4 décimales, `toLocaleString fr-FR`).

## Hors périmètre
- Aucune migration ni changement de schéma.
- Aucun changement au circuit demande → préparation → prise → consommation.
- Aucun export CSV (peut être ajouté ultérieurement si souhaité).

## Détails techniques
- La consommation préventive est tracée dans `intervention_pdr.preventive_execution_id` (alimentée par la RPC `consume_maintenance_holding_preventive`). On relie ces lignes au plan via les exécutions du plan déjà chargées dans `executions`.
- Les utilisateurs sont résolus côté client via une map `profiles` (un seul `select ... in (userIds)`), pour éviter les jointures auth interdites.
- Le reliquat de prise et le reliquat retourné sont calculés en mémoire à partir des quantités, pas stockés.
