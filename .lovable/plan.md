# Plan — Action préventive partagée & sécurisée

## Objectif
Quand plusieurs maintenanciers sont affectés au même plan préventif, ils travaillent sur **une seule action commune** mais chacun reste responsable de **sa note** et de **sa consommation de stock**. Empêcher les fausses déclarations et les ré-ouvertures abusives, sans bloquer le travail en 2x8 / 3x8.

## Décisions retenues
- Action **partagée**, mais **chacun clôture sa propre contribution** (note + consommation).
- Après clôture de l'action : **verrou** — impossible de relancer avant la prochaine échéance ; **le responsable maintenance peut débloquer** (motif audité).
- **Transmission entre shifts** : une action ouverte reste reprenable et clôturable par un autre maintenancier d'un autre shift.
- Clôture finale par **un affecté OU le responsable**, en **conservant tout l'historique détaillé** de chaque intervenant.

## Modèle de données (technique)

### Nouvelle table `preventive_action_sessions` (l'action commune)
Une session = un cycle d'intervention pour un plan, rattachée à une échéance.
- `plan_id`, `echeance_cible` (date d'échéance couverte), `statut` (`en_cours` / `terminee`), `opened_by`, `opened_at`, `closed_by`, `closed_at`, `reopened_by`, `reopen_reason`.
- Index unique partiel : **une seule session non terminée par plan** (empêche les doublons / ré-ouvertures concurrentes).
- GRANT + RLS : lecture pour tout authentifié (consultation/historique), écriture via fonctions métier ; déblocage réservé à `admin` / `resp_maintenance` via `has_role`.

### Évolution de `preventive_executions` (contribution par personne)
- Ajout `session_id` (FK vers la session). Une ligne = la contribution d'**un** maintenancier (sa note `notes`, son `pdr_used`, ses `duree_minutes`, `statut` par personne).
- La consommation des holdings reste **par holder** (déjà le cas via `pdr_maintenance_holdings.holder_id`), donc chacun ne consomme que son propre stock pris.

### Règles de verrou (triggers / fonctions)
- `start_or_join_preventive_action(plan_id)` : ouvre la session si aucune n'est ouverte ; sinon **rejoint** la session existante en créant la contribution du user. Refuse si `prochaine_echeance` non atteinte ET dernière session du cycle déjà terminée (verrou).
- `close_preventive_contribution(execution_id)` : clôture la contribution d'une personne.
- `close_preventive_action(session_id)` : clôture l'action commune (affecté ou responsable), met à jour `derniere_execution` + recalcule `prochaine_echeance`, verrouille.
- `reopen_preventive_action(session_id, reason)` : réservé responsable, audité.

## Changements UI (`src/pages/PreventifDetail.tsx`)
1. **En-tête action** : bouton « Commencer » → ouvre/rejoint la session commune. Affiche « Action en cours — N intervenant(s) » avec la liste des affectés présents.
2. **Bloc contributions** : une ligne par maintenancier (nom, statut sa part, durée), pour rendre visible qui a fait quoi.
3. **Note par personne** : dans le dialogue de clôture, chacun ne saisit/voit que **sa** note ; les notes des autres restent en lecture seule dans l'historique.
4. **Consommation par personne** : la section holdings affiche uniquement les pièces prises **par le user connecté** (déjà filtré par `holder_id`) — confirmation que chacun consomme son stock.
5. **Bouton « Terminer »** : clôture *ma contribution* ; un second bouton « Clôturer l'action » (visible si affecté ou responsable) ferme l'action commune.
6. **Verrou visuel** : si action clôturée et échéance non atteinte → « Commencer » désactivé avec mention « Prochaine intervention le {date} ». Bouton « Débloquer (responsable) » avec saisie de motif pour `admin` / `resp_maintenance`.
7. **Onglet Exécutions / Historique PDR** : afficher toutes les contributions de toutes les sessions (intervenant, note, durée, PDR consommées) — historique complet conservé.

## Autres scénarios sécurisés couverts
1. **Un seul maintenancier** : comportement actuel inchangé (1 session, 1 contribution).
2. **Reprise inter-shift** : maintenancier du shift 2 rejoint l'action ouverte au shift 1, ajoute sa note + sa consommation, puis clôture.
3. **Double déclaration empêchée** : l'index unique + le verrou échéance interdisent deux actions ouvertes ou une relance hâtive.
4. **Abandon / oubli d'une action ouverte** : un job de fermeture (réutilise `auto-close-stale-shifts`) peut marquer une session restée ouverte au-delà d'un délai et notifier le responsable (option à confirmer).
5. **Déblocage exceptionnel** : panne récurrente avant échéance → le responsable rouvre avec motif tracé (audit_logs).
6. **Consommation sans prise** : impossible — chacun ne peut consommer que ce qu'il a réellement pris (holdings), reliquat retourné au magasin à la clôture.
7. **Affecté retiré en cours** : sa contribution déjà saisie reste dans l'historique (immuable).

## Vérification
- TypeScript (`tsgo`) + tests Vitest existants.
- Test manuel : 2 comptes maintenancier sur le même plan (session partagée, notes séparées, verrou après clôture, déblocage responsable).

Souhaitez-vous que j'inclus aussi l'auto-fermeture des actions oubliées (scénario 4) dans cette itération, ou on garde ça pour plus tard ?