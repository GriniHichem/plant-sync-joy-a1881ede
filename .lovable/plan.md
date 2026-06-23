## Objectif

Avant que le maintenancier confirme la prise d'une pièce (bouton « Confirmer la prise » de l'onglet **À prendre** dans `/maintenance/shift/pieces`), afficher un récapitulatif clair pour vérifier d'un coup d'œil — sans alourdir ni bloquer le flux.

## Comportement

Au clic sur « Confirmer la prise », on ouvre une petite fenêtre récap au lieu de confirmer directement. Elle montre :

```text
┌─────────────────────────────────────────────┐
│ Confirmer la prise — DPR-00042               │
├─────────────────────────────────────────────┤
│ Réf.        ROUL-6204                         │
│ Désignation Roulement 6204 2RS               │
│ Famille     Roulements › Billes              │
│                                              │
│ Demandée    3      Disponible   5            │
│ Préparée    3      Reliquat     0            │
├─────────────────────────────────────────────┤
│ Qté à prendre : [ 3 ]                         │
│            [ Annuler ]   [ Confirmer ]        │
└─────────────────────────────────────────────┘
```

Champs affichés :
- **Famille / sous-famille** : libellés résolus depuis `pdr_families` (chaîne « Famille › Sous-famille »).
- **Quantité demandée** (`quantite_demandee`).
- **Quantité préparée** par le magasin (`quantite_preparee`, défaut = demandée).
- **Quantité disponible** en stock (`stock_actuel − stock_reserve` du PDR).
- **Reliquat attendu** = `quantite_demandee − quantite_prise` (ici la qté à prendre), affiché en orange si > 0.
- **Qté à prendre** : champ pré-rempli avec la qté préparée, modifiable (borné entre 1 et la qté préparée). Permet une prise partielle.

Confirmation : appelle `confirmItemTaken(item.id, qteAPrendre)` (logique existante inchangée), puis ferme la fenêtre et affiche le toast existant. « Annuler » referme sans rien faire.

## Principe « simple et rapide »

- Une seule pièce à la fois (la ligne cliquée), pas de récap global multi-lignes.
- Aucune nouvelle table, aucune RPC, aucun changement de logique serveur.
- Le défaut est déjà bon (qté préparée) : le maintenancier peut confirmer en un clic supplémentaire, ou ajuster s'il prend moins.

## Détails techniques

- Nouveau composant `src/components/pdr/ConfirmTakeDialog.tsx` (basé sur `Dialog`) recevant `request`, `item` et un callback `onConfirm(qte)`.
- Les libellés de famille : charger une fois la liste `pdr_families (id, name, parent_id)` dans `MaintenancePieces` (ou le dialog) et construire la chaîne famille › sous-famille à partir de `item.pdr.family_id`. (Le champ `family_id` est déjà présent sur `pdr`.)
- `MaintenancePieces.tsx` : remplacer l'appel direct `handleTake` du bouton « Confirmer la prise » par l'ouverture du dialog avec l'item sélectionné ; `handleTake(itemId, qte)` reste la fonction appelée à la confirmation.
- Aucun changement dans `usePdrRequests`, les migrations ou les politiques.

## Fichiers touchés

- `src/components/pdr/ConfirmTakeDialog.tsx` (nouveau)
- `src/pages/shift/MaintenancePieces.tsx` (brancher le dialog sur l'onglet « À prendre »)
