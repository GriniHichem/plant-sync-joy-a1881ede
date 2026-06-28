# Console Responsable Maintenance — Tableau de bord opérationnel

## Le problème
La console actuelle (`RespShiftConsole` en mode `maintenance`) n'affiche **que les sessions de shift ouvertes du jour**. Aujourd'hui aucune session n'a été ouverte → la page paraît vide, alors qu'il y a en réalité **7 tickets ouverts** et **5 interventions préventives en cours** dans la base. Le responsable n'a donc aucune visibilité sur l'activité réelle.

## L'objectif
Faire de cette page un vrai poste de pilotage « à l'instant T » qui montre l'activité même sans session ouverte. Mon avis : on garde la gestion des sessions (utile), mais on la met en second plan et on met en avant les indicateurs opérationnels demandés.

## Ce que la console affichera (de haut en bas)

### 1. Bandeau d'indicateurs (KPI temps réel)
Cartes cliquables menant aux listes filtrées :
- **Tickets ouverts** (statut ouvert / pris en charge) + dont **critiques/hautes**
- **Signalés aujourd'hui** (tickets déclarés ce jour)
- **Préventifs en cours** (interventions démarrées, non clôturées)
- **Maintenanciers en activité** (personnes ayant un ticket pris en charge ou une intervention préventive en cours)
- **Mouvements PDR du jour** (sorties/retours liés aux interventions)

### 2. Tickets curatifs en cours — avec état d'avancement
Liste des tickets ouverts/pris en charge, triés par priorité puis ancienneté, montrant pour chacun :
- N° ticket, machine/ligne, priorité, **âge depuis déclaration** (format Xj Yh Zmin)
- **Statut d'avancement** : Ouvert (non pris) → Pris en charge (par qui, depuis quand) → en attente pièces (si demande PDR en cours)
- Déclarant
- Badge d'alerte si ouvert depuis trop longtemps sans prise en charge
- Clic → fiche ticket

### 3. Préventifs déjà commencés — avancement
Liste des interventions préventives `en_cours`, avec :
- N° d'action (numero du plan), machine, maintenancier(s) en train d'intervenir
- Heure de début + durée écoulée
- Échéance / retard éventuel
- Clic → fiche du plan préventif

### 4. Maintenanciers actifs maintenant
Vue par personne : qui travaille sur quoi (ticket ou préventif), depuis quand. Permet de voir la charge répartie.

### 5. Mouvements PDR liés aux interventions en cours
Journal compact des derniers mouvements de pièces (sortie/retour) du jour rattachés aux tickets/plans, avec pièce, quantité, intervention concernée. Réutilise la logique existante de supervision magasin.

### 6. Sessions de shift (replié / secondaire)
On conserve l'ouverture, la supervision et la clôture forcée des sessions, mais dans une section repliable en bas — ce n'est plus le contenu principal.

## Comportement
- **Temps réel** : abonnements sur `tickets`, `preventive_executions`, `preventive_action_sessions`, `pdr_stock_movements`, `maintenance_shifts` → la console se met à jour automatiquement.
- **Sans filtre de session** : les données s'affichent indépendamment de l'existence d'une session de shift, donc la page n'est jamais vide s'il y a de l'activité.
- **Bouton Rafraîchir** conservé.

## Détails techniques
- Nouveau composant `MaintenanceRespDashboard.tsx` rendu par `RespShiftConsole` (ou directement par `ShiftHomePage`) pour le `kind = maintenance`, sans casser production/qualité qui gardent le comportement actuel.
- Nouveau hook `useMaintenanceRespOverview.ts` :
  - tickets ouverts + déclarés aujourd'hui (join machines/lignes/profiles déclarant + assignee)
  - `preventive_executions` en cours (join `preventive_plans`, `preventive_action_sessions`, profils)
  - mouvements `pdr_stock_movements` du jour (réutiliser la forme de `useMagasinActivity`)
  - dérivation « maintenanciers actifs » côté client
- Réutilisation : `formatDuration` (`src/lib/utils.ts`) pour les âges/durées, `EntityThumbnail` pour les vignettes machine, patterns d'`useShiftRealtime`.
- RLS : déjà permissif en lecture pour utilisateurs connectés sur ces tables ; aucune migration nécessaire.
- Aucune logique métier modifiée (lecture seule + actions session déjà existantes).

## Hors périmètre
- Pas de changement aux workflows PDR / préventif existants.
- Pas de nouvelles tables.
