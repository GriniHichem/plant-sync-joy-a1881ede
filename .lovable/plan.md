# Correction du flux PDR — Plan préventif

## Contexte / audit

Deux anomalies confirmées dans `src/pages/PreventifDetail.tsx` :

1. **Faille de contournement du cycle** : le dialogue « Terminer » contient une section « Ajouter une pièce non prévue » avec un menu déroulant sur tout le catalogue PDR. Elle appelle `consume_adhoc_pdr_preventive`, qui **décrémente directement le stock magasin sans demande ni validation**. C'est contraire au cycle obligatoire Demande → Préparation magasin → Prise → Consommation.

2. **Onglet PDR pauvre** : il n'affiche que la nomenclature planifiée (`preventive_plan_pdr`), vide pour 21 plans sur 25. Aucune visibilité sur l'état réel (demandée / prête / prise / consommée).

## Décisions retenues

- **Imprévus** : toujours via demande. Le maintenancier ne décrémente jamais le stock magasin directement. Pour toute pièce non planifiée, il utilise « Demander / prendre des pièces ».
- **Onglet PDR** : afficher le prévu (nomenclature) **et** l'état réel du cycle pour chaque pièce.

## Modifications

### 1. Dialogue « Terminer » — retirer la consommation directe
Dans `PreventifDetail.tsx` :
- Supprimer toute la section UI « Ajouter une pièce non prévue » (Select catalogue, recherche, quantité, lignes ad-hoc, alertes stock).
- Supprimer les états associés : `adhocLines`, `pdrCatalog`, `adhocSearch`, `adhocPdrId`, `adhocQte`, et les fonctions `addAdhocLine` / `removeAdhocLine`.
- Retirer le chargement du catalogue dans `openExecDialog` (plus de `select` sur `pdr`).
- Dans `submitExecution`, supprimer la boucle d'appel à `consumeAdhocPdrPreventive` et la fusion `adhocLines` dans `consumedList`.
- Retirer l'import `consumeAdhocPdrPreventive` (et icônes devenues inutiles : `Plus`, `Trash2`, `AlertTriangle`, `Select*`, `Input` si plus utilisé).
- Conserver tel quel : la confirmation des quantités consommées sur les pièces **prises** (holdings), avec retour du reliquat au magasin.
- Ajouter dans le dialogue un message clair : « Pièce manquante ? Fermez et utilisez Demander / prendre des pièces. » avec un bouton/raccourci vers `/maintenance/shift/pieces?plan=…&exec=…`.

### 2. Onglet PDR — prévu + état réel
Refondre l'onglet `pdr` pour afficher, par pièce, une fusion de :
- La **nomenclature planifiée** (`preventive_plan_pdr` → quantité prévue).
- L'**état réel** issu des demandes (`planRequests` déjà chargé) : quantité demandée, préparée, prise, et statut (demandée / prête / prise / refusée).
- La **quantité consommée** (depuis `consumptions` déjà chargé) et le **reliquat** (prévu − consommé).

Présentation : tableau avec colonnes Référence · Désignation · Prévu · Demandé · Pris · Consommé · État (badge couleur). Les pièces planifiées sans demande apparaissent en « Non demandée ». Message vide explicite si aucune pièce planifiée ni demandée.

### 3. Garde-fou backend (sécurité)
Neutraliser la voie de contournement côté base pour que la suppression UI ne soit pas contournable :
- Migration : retirer le type de source `pdr_adhoc` du garde-fou autorisé dans `guard_pdr_stock_movements`, et faire échouer `consume_adhoc_pdr_preventive` (RPC) avec une erreur explicite « consommation directe interdite : passez par une demande de pièces », OU la supprimer. Cela garantit qu'aucune consommation préventive ne se fait hors du circuit demande/validation.

## Validation
- `tsgo` (typecheck) après modifications front.
- Vérification visuelle (Playwright) : dialogue Terminer sans dropdown, onglet PDR affichant prévu + état.
- Test manuel : tenter une consommation ad-hoc → bloquée ; cycle normal (demande → prête → prise → consommée) → OK et tracé dans Historique PDR.

## Détails techniques
- Fichier principal : `src/pages/PreventifDetail.tsx`.
- Hook : `src/hooks/usePdrRequests.ts` — l'export `consumeAdhocPdrPreventive` devient inutilisé (à supprimer).
- Données déjà disponibles dans le composant : `planPdr`, `planRequests`, `consumptions` — pas de nouvelle requête nécessaire pour l'onglet PDR.
- Migration SQL pour le garde-fou / RPC `consume_adhoc_pdr_preventive`.
