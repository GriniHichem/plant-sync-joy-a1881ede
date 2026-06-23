# Tableau magasinier des demandes de pièces — refonte fonctionnelle

Le tableau existe déjà : **Demandes pièces** (`/pdr/demandes`, menu GMAO), en temps réel. On le rend complet et rapide pour le magasinier, **sans toucher au cycle de validation** (les actions passent toujours par les RPC `set_request_item_ready` / `refuse_request_item`).

## Ce qui change (uniquement `src/pages/pdr/PdrRequestsQueue.tsx` + petit ajout hook)

### 1. Barre de recherche & filtres (en haut, sticky)
- **Recherche instantanée** : réf pièce, désignation, n° de demande, n° de ticket, code machine.
- **Filtre statut** : Demandée / Prête / Partielle / Prise / Refusée / Annulée.
- **Filtre type & priorité** : Curatif/Préventif + niveau (critique, haute, normale, basse).
- **Bouton reset** (RotateCcw) visible seulement si un filtre est actif (convention projet).

### 2. Deux onglets
- **À traiter** (par défaut) : demandes ouvertes (`demandee`, `prete`, `partielle`).
- **Historique** : demandes clôturées (`prise`, `refusee`, `annulee`) — via `usePdrRequestQueue(true)` (le hook accepte déjà `includeClosed`). Lecture seule.

### 3. Compteurs en haut (cartes synthèse)
- **À préparer** (lignes `demandee`), **Prêtes en attente de prise** (`prete`), **En rupture** (lignes où `quantité demandée > stock disponible`).

### 4. Tri de la file
- Par **urgence** (priorité critique → basse) ou par **ancienneté** (plus ancienne d'abord). Sélecteur simple, défaut = urgence puis date.

### 5. Actions rapides de préparation
- **Alerte stock insuffisant** : badge rouge sur la ligne quand `quantité demandée > stock_actuel − stock_reserve`, et le dialogue « Prête » plafonne/avertit sur la quantité.
- **Tout préparer en un clic** : sur une demande dont toutes les lignes ont assez de stock, bouton « Tout préparer » qui appelle `set_request_item_ready` pour chaque ligne `demandee` (séquentiellement). Désactivé si une ligne est en rupture.
- Les actions ligne par ligne (Prête / Refuser) restent inchangées.

## Détails techniques
- Filtrage/tri/recherche **côté client** (mémoïsé avec `useMemo`) sur les données déjà chargées en temps réel — rapide, pas de requêtes supplémentaires.
- Onglet Historique : un second appel `usePdrRequestQueue(true)` filtré sur statuts clôturés (limité aux ~100 récents).
- Compteurs dérivés des lignes des demandes ouvertes.
- Respect du thème industriel (IBM Plex Sans, cibles tactiles 48px, badges existants), aucun style codé en dur.
- Aucune modification de schéma ni de RLS : le magasinier garde exactement les mêmes droits, on n'ajoute que de l'ergonomie d'affichage et le batch « Tout préparer » qui réutilise le RPC autorisé.

## Hors périmètre
- Pas de changement du circuit de réservation/sortie de stock.
- Pas de nouveaux droits ni de nouvelles tables.
