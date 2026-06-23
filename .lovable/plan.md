# Utiliser ses pièces en stock depuis le ticket

## Problème
Dans le détail d'un ticket, section **« Pièces utilisées »**, il n'y a qu'un bouton qui renvoie vers le circuit *Demander / prendre des pièces*. Le maintenancier qui détient déjà des pièces dans son **stock maintenance** (holdings, déjà « prises » au magasin) ne peut pas les **voir ni indiquer la quantité réellement consommée** sur cette page. La consommation se fait silencieusement à la résolution, à quantité pleine, sans contrôle.

Le kiosque shift (`MaintenanceShiftIntervention`) gère déjà ça correctement : il affiche les pièces détenues avec un champ quantité consommée. La page ticket classique, elle, ne le fait pas.

## Objectif
Reproduire dans `TicketDetail.tsx`, section « Pièces utilisées », le même comportement que le kiosque : afficher les pièces détenues pour ce ticket et permettre de saisir la quantité consommée, le reliquat retournant au stock.

## Changements (UI uniquement, frontend)

### 1. Charger les holdings du ticket
Dans `src/pages/TicketDetail.tsx`, ajouter un chargement des pièces détenues par l'utilisateur connecté pour les demandes liées à ce ticket (même logique que `loadHoldings` du kiosque) :
- `pdr_requests` où `ticket_id = id`
- → `pdr_request_items`
- → `pdr_maintenance_holdings` (`holder_id = user`, `statut = 'en_main'`) avec `pdr(reference, designation)`
- État local `holdings` + `consumed` (quantité saisie par pièce), initialisé à la quantité détenue.
- Rafraîchissement via `useShiftRealtime` sur `pdr_maintenance_holdings`.

### 2. Affichage dans « Pièces utilisées »
Sous le bouton existant, ajouter un encart (visible seulement si des holdings existent) listant chaque pièce détenue :
- référence, désignation, quantité prise
- un champ numérique « quantité consommée » (0 → quantité détenue)
- note « Le reliquat non consommé est retourné au stock magasin. »

Le bouton « Demander / prendre des pièces » reste, pour les pièces non encore prises.

### 3. Consommation à la résolution
Dans `handleResolve`, remplacer la boucle actuelle (qui consomme toutes les holdings à quantité pleine) par une consommation utilisant la **quantité saisie** dans `consumed`, bornée à la quantité détenue — comme le kiosque. Toujours via le RPC `consumeMaintenanceHolding` (aucun insert direct, le circuit validé est conservé).

## Hors périmètre
- Aucune modification de base de données, RPC ou RLS.
- Pas de changement au circuit demande → préparation → prise.
- Le bypass éventuel d'autres écrans (préventif, sorties manuelles) n'est pas traité ici.

## Détails techniques
- Réutiliser les imports déjà présents (`consumeMaintenanceHolding`, `useShiftRealtime`, `useAuth`).
- La logique de consommation est strictement identique à `MaintenanceShiftIntervention.tsx` (lignes 88-104 et 196-204) pour garantir la cohérence du ledger (stock_actuel / stock_reserve gérés côté RPC).
