# Plan préventif type « demande → exécution avec prêt de pièces »

## Objectif
Aligner le workflow préventif sur le curatif : le **responsable maintenance / méthodes** créent et valident les plans (demandeurs), le **maintenancier affecté** ouvre son plan, **commence les travaux** (statut *En cours*), demande/prend des pièces (prêt → stock maintenance), puis **clôture** en consommant les pièces réellement utilisées — le reliquat étant automatiquement retourné au magasin, exactement comme le curatif.

## Décisions validées
- Demandeur : on garde les droits d'édition actuels et on **ajoute le rôle Méthodes** comme demandeur autorisé.
- Démarrage : bouton **« Commencer »** → l'exécution passe en statut **En cours** (traçabilité début/fin).
- Pièces : **identique au curatif** (demande → préparation magasin → prise → consommation à la clôture, reliquat retourné au magasin).

## Parcours cible

```text
RESP. MAINTENANCE / MÉTHODES (demandeur)
  crée le plan → valide → affecte un maintenancier
                 │
MAINTENANCIER (exécutant)
  ouvre le plan → « Commencer »  ──────────────► exécution EN COURS
        │                                            │
        │  « Demander / prendre des pièces »         │
        │  (demande → magasin prépare → prise)       │
        │                                            ▼
        └── « Terminer » ── saisie durée + pièces consommées
                              reliquat prêté → retour magasin auto
                              → exécution TERMINÉE, prochaine échéance recalculée
```

## Changements

### 1. Base de données (migration)
- **`preventive_executions`** : ajout des colonnes
  - `statut` text (`en_cours` | `terminee`, défaut `terminee` pour l'existant),
  - `heure_debut` timestamptz, `heure_fin` timestamptz, `duree_minutes` int.
- **`intervention_pdr`** : rendre `intervention_id` *nullable* et ajouter `preventive_execution_id uuid` (FK vers `preventive_executions`), avec contrainte « exactement un des deux renseigné ». Cela réutilise le **trigger de mouvement de stock existant** (décrément + écriture `pdr_stock_movements`) sans le dupliquer.
- Nouvelle RPC **`consume_maintenance_holding_preventive(p_holding_id, p_execution_id, p_qte_consomme, …)`** : copie de `consume_maintenance_holding` mais rattachée à l'exécution préventive (insertion dans `intervention_pdr` avec `preventive_execution_id`, reliquat retourné au magasin, holding passé `consomme`). `GRANT EXECUTE` aux rôles maintenance.
- RLS : politiques d'écriture sur `preventive_executions` ouvertes au maintenancier affecté + resp_maintenance/méthodes/admin (création/MAJ de l'exécution en cours).

### 2. Permissions (front)
- Ajouter le rôle **Méthodes** comme demandeur préventif : dans `RolesMatrix.tsx`, donner au rôle méthodes les droits création/édition sur `preventif`.
- `PreventifDetail` : le bouton **Commencer/Terminer** visible pour le maintenancier affecté ; **Créer/Valider/Affecter** restent gouvernés par `canEdit("preventif")` (resp. maintenance + méthodes).

### 3. `PreventifDetail.tsx` — nouvelle logique d'exécution
- Remplacer le dialogue « Exécuter » unique par un cycle **Commencer → Terminer** :
  - **Commencer** : crée une `preventive_executions` `statut=en_cours` (heure_debut = maintenant), bouton réservé au maintenancier affecté quand `statut_plan=valide`.
  - Tant qu'une exécution est en cours : afficher un bandeau « Intervention en cours » avec :
    - bouton **« Demander / prendre des pièces »** → `/maintenance/shift/pieces?plan={id}&exec={execId}&machine={machineId}` (réutilise `MaintenancePieces` / `PdrRequestComposer`, type `preventive`, déjà en place),
    - liste des **pièces prêtées** (holdings rattachées aux demandes du plan) avec quantité consommée éditable,
    - bouton **« Terminer »** : saisie durée, consomme chaque holding via `consume_maintenance_holding_preventive` (reliquat auto-retourné), passe l'exécution `terminee` (heure_fin/durée), met à jour `derniere_execution` + `prochaine_echeance`, journalise l'audit.
- Onglet « Exécutions » : afficher statut, début/fin, durée et pièces réellement consommées.

### 4. Vue shift maintenancier (`MaintenancierShiftView`)
- Sur chaque plan, refléter l'état (À faire / En cours) et router vers `PreventifDetail` pour Commencer/Terminer (déjà lié), avec indication visuelle « En cours » si une exécution ouverte existe.

### 5. Hooks pièces (réutilisation)
- `MaintenancePieces` / `usePdrRequests` gèrent déjà `type=preventive` et `preventive_plan_id`. On propage simplement l'`exec` dans l'URL pour rattacher la consommation à l'exécution courante (les holdings restent liés via les items de demande du plan).

## Hors périmètre
- Pas de changement au circuit magasin (préparation/prise) ni à la logique curative.
- Pas de modification du moteur de génération auto des plans (durée de vie).
- Le kiosque magasinier reste inchangé.

## Détails techniques
- `consume_maintenance_holding_preventive` reprend les mêmes garde-fous que la version curative (rôle, détenteur, quantité ≤ détenue, `set_config('app.pdr_flow','on')` pour autoriser l'insert tracé).
- La consommation transite par `intervention_pdr` (désormais polymorphe ticket/préventif) afin de conserver un point unique de décrément de stock et d'historique `pdr_stock_movements` (audit auteur/motif/valeurs conforme aux règles projet).
- Précision quantités/stock inchangée (unité gramme, 4 décimales).
