# Espace Magasin : rôles, kiosque magasinier & tableau de bord responsable

## Contexte
Aujourd'hui le rôle magasinier existe (`gestionnaire_magasin`, libellé « Gest. Magasin ») et la file **Demandes pièces** est seulement une page du menu GMAO (`/pdr/demandes`). Il n'y a **ni kiosque shift magasin, ni rôle responsable magasin, ni tableau de bord magasin**. On comble ces trois manques sans toucher au cycle de validation des pièces (RPC inchangées).

## 1. Nouveau rôle « Responsable Magasin »
- Ajout de la valeur `responsable_magasin` à l'enum de rôles (`n` / `app_role`).
- Intégration partout où les rôles sont déclarés et libellés :
  - `AuthContext` (type des rôles)
  - `RolesMatrix`, `RolesTab`, `UsersAdmin`, `PdrStockPermissionsAdmin`, `DocumentPermissionsAdmin` (libellé « Responsable Magasin », groupe Logistique)
  - `ruleCatalog` (notifications/validations)
- Droits par défaut du responsable magasin : `pdr` (complet), `pdr_demandes`, `articles`, `dashboard`, `inventaire`/`inventaire_campagnes`, lecture machines/équipements/organes, `notifications`, `apps`, `recherche`. Il hérite des capacités magasinier + supervision.
- Le magasinier (`gestionnaire_magasin`) reçoit explicitement l'accès au **module Demandes pièces** (voir §2).

## 2. Module « Demandes pièces » dans la logique d'accès
Actuellement la file réutilise le droit `pdr`. On en fait un **module à part entière** `pdr_demandes` pour piloter finement qui prépare les pièces :
- Ajout du module dans la matrice des rôles (`RolesMatrix`) et la page d'accès (`RolesTab`), avec les autres modules.
- Ajout d'une entrée dans la page **Applications** (`Apps.tsx`) catégorie Maintenance/Logistique.
- Garde de route sur `/pdr/demandes` basée sur `pdr_demandes` (rétro-compatible : magasinier + responsable magasin + admin l'ont).
- Sidebar GMAO : l'entrée « Demandes pièces » passe sur le module `pdr_demandes`.

## 3. Kiosque shift magasinier (plein écran)
Nouvel espace tactile dédié, sur le modèle des kiosques maintenance/production/qualité (sans barre latérale), **sans dépendre d'une session shift** (le magasin n'a pas d'équipes shift) — accès réservé par rôle.
- Route `/magasin/shift` (accueil) :
  - **Magasinier** → kiosque opérationnel plein écran.
  - **Responsable magasin / admin** → console responsable (voir §4).
- Carte dans **Applications** : « Shift Magasin » (badge Live).
- Kiosque magasinier — onglets, cibles 48px, temps réel :
  - **À préparer** : file des demandes ouvertes avec recherche, filtres (statut, type curatif/préventif, priorité), tri (urgence/ancienneté), compteurs en haut, alerte stock insuffisant, « Tout préparer », préparer/refuser ligne par ligne. Reprend la logique déjà construite dans `PdrRequestsQueue`, factorisée pour être réutilisée dans le kiosque.
  - **Sorties / Entrées** : saisie rapide des mouvements de stock du magasinier (réutilise les RPC mouvements existantes selon ses droits `pdr_stock_permissions`).
  - **Historique** : ses demandes traitées / mouvements récents.

## 4. Tableau de bord Responsable Magasin
Console accessible via `/magasin/shift` (responsable/admin) et carte dédiée dans Applications.
- **Vue temps réel de toute l'activité magasin** :
  - Mouvements (entrées / sorties / corrections / inventaire) avec : pièce, quantité, **demandeur**, **ticket / OF / plan lié**, **magasinier ayant exécuté**, **horodatage**, motif/détails.
  - Demandes de pièces en cours (par statut) et délais de préparation.
  - Compteurs synthèse : à préparer, prêtes en attente, en rupture, sorties du jour, entrées du jour.
  - Filtres (période, type de mouvement, magasinier, demandeur, recherche pièce/ticket) + export CSV (composant `ExportCsvButton` existant).
- Lecture seule supervision (pas de double saisie) ; s'appuie sur `pdr_stock_movements`, `pdr_requests`/`pdr_request_items`, jointures profils/tickets/OF.

## Détails techniques
- **Migration** : `ALTER TYPE ... ADD VALUE 'responsable_magasin'` ; insertion des lignes `role_permissions` par défaut pour `responsable_magasin` et ajout du module `pdr_demandes` (et droits magasinier correspondants) ; pas de nouvelle table.
- **RLS** : élargir les policies de lecture des mouvements/demandes pour `responsable_magasin` (mêmes conditions que `gestionnaire_magasin` + supervision lecture globale). Aucune nouvelle capacité d'écriture hors RPC déjà autorisées.
- **Front** : nouveaux fichiers `src/pages/magasin/MagasinShiftHome` (routeur rôle), `MagasinKiosk` (magasinier), `MagasinDashboard` (responsable) ; factorisation de la file existante en composant partagé. Routes ajoutées dans `App.tsx`. Thème industriel, IBM Plex Sans, cibles 48px, tokens existants.
- **Aucune modification du circuit réservation/sortie** : préparation/prise/consommation passent toujours par `set_request_item_ready` / `refuse_request_item` / `confirm_request_item_taken` / `consume_maintenance_holding`.

## Hors périmètre
- Pas de système d'équipes/rotations shift pour le magasin (accès par rôle, pas par session).
- Pas de refonte du catalogue PDR ni des mouvements de stock existants.

## Questions ouvertes (je pars sur ces hypothèses sauf avis contraire)
- Le kiosque magasinier ne requiert **pas** de session shift ouverte.
- Le responsable magasin a une **vue lecture** globale (il ne prépare pas lui-même, sauf s'il a aussi le rôle magasinier).
