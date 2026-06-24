# Améliorer la consommation des PDR dans le plan préventif

## Problème constaté
Lors d'une intervention préventive, seules les pièces **déjà prises** (holdings `en_main` de l'utilisateur) apparaissent à la clôture. Les pièces **déjà demandées** pour le plan mais encore en cours de préparation au magasin (statut `demandée`/`prête`) sont invisibles dans `PreventifDetail`. Le maintenancier ne voit donc pas qu'il a des pièces à récupérer avant de pouvoir les consommer.

Décision : on **garde le circuit** demande → préparation magasin → prise. On ajoute simplement la visibilité et l'action de prise au bon endroit.

## Objectif
Dans la page du plan préventif, pendant une intervention en cours :
- afficher toutes les pièces demandées pour ce plan avec leur statut (demandée / prête à prendre / prise),
- permettre de **confirmer la prise** d'une pièce prête directement depuis le plan (réutilise le dialog existant),
- garder la consommation des pièces prises au moment de **Terminer**, comme aujourd'hui.

## Parcours cible
```text
Intervention en cours
  ├─ Pièces demandées (vue d'état)
  │     • Demandée   → en attente magasin
  │     • Prête      → [Confirmer la prise]  ──► devient « Prise »
  │     • Prise      → consommable à la clôture
  └─ Terminer → saisie durée + quantités consommées (pièces prises)
                reliquat retourné au magasin (inchangé)
```

## Changements (frontend uniquement, aucune migration)

### 1. `src/pages/PreventifDetail.tsx`
- **Charger les demandes complètes du plan**, pas seulement les holdings. Récupérer `pdr_requests` (filtrées `preventive_plan_id = id`) avec leurs `pdr_request_items` et le `pdr` lié, en plus des holdings actuels.
- **Bandeau « Intervention en cours »** : afficher un récap chiffré (ex. « 2 à prendre · 1 prise ») et lister les pièces avec leur statut.
- Pour chaque item au statut `prête`, bouton **« Confirmer la prise »** ouvrant le `ConfirmTakeDialog` existant (`src/components/pdr/ConfirmTakeDialog.tsx`) et appelant `confirmItemTaken` (déjà exporté par `usePdrRequests`). Après prise, recharger holdings + demandes.
- Pour les items au statut `demandée`, afficher un badge « En préparation (magasin) » non actionnable.
- **Dialog Terminer** : inchangé sur la logique de consommation des holdings, mais ajouter un avertissement si des pièces du plan sont encore `prête`/`demandée` non prises (« X pièce(s) demandée(s) non prise(s) ne seront pas consommées »), sans bloquer la clôture.

### 2. Réutilisation existante
- `confirmItemTaken`, `usePdrRequests` : déjà en place.
- `ConfirmTakeDialog` : déjà en place, accepte `request` + `item`.
- `consumePreventiveHolding` à la clôture : inchangé.

## Hors périmètre
- Aucun changement de base de données.
- Aucun changement au circuit magasin (préparation/prise) ni à la logique curative.
- Pas de consommation directe depuis le stock magasin (le circuit est conservé, conformément au choix).

## Détails techniques
- La liste des demandes réutilise le même `SELECT` que `usePdrRequests` ; on peut filtrer côté requête sur `preventive_plan_id`.
- La prise passe toujours par `confirmItemTaken` (RPC `confirm_request_item_taken`) → crée/alimente le holding `en_main`, qui devient alors consommable à la clôture via `consume_maintenance_holding_preventive`.
- Précision quantités inchangée (gramme, 4 décimales).
