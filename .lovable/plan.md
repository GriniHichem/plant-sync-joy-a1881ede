## Objectif

Garantir une **couverture 100%** de la matrice de permissions : chaque écran/route de l'app doit avoir un module configurable, regroupé logiquement, avec une logique d'héritage propre (umbrella) pour éviter de devoir cocher 40 cases pour le seul module Qualité.

## Constat actuel

Modules présents dans la matrice (18) :
- GMAO : machines, equipements, organes, lignes, pdr, tickets, preventif
- GPAO : of, produits, articles, recettes, arrets, consommations
- Qualité : `qualite` (1 seul, granularité 0)
- Inventaire : `inventaire` (1 seul)
- Système : analytiques, utilisateurs, parametres, audit, validations, notifications

**Routes/écrans non couverts** par un module configurable (vérifié dans `App.tsx`, `AppSidebar.tsx`, `Apps.tsx`) :
- Maintenance : Dashboard `/`, Shift Maintenance, Journal d'interventions, Historique, Apps `/apps`
- Production : Dashboard GPAO, Shift Production
- Qualité : 9 sous-modules (Dashboard, OF Qualité, Indicateurs, Contrôles, Non-conformités, Actions, Recettes/BOM, Traçabilité, Rapports, Shift contrôle) — actuellement tous fusionnés sous `qualite`
- Inventaire : Campagnes (1 seul écran codé pour `inventaire`)
- Configuration / référentiels : Familles, Familles Produits, Familles PDR, Pannes, Lignes admin, Shifts admin, Catégories documents, Permissions documents, Permissions PDR/Stock, SMTP, Général, Images, Recherche, Sécurité hub, Paramètres Qualité (NC, actions, unités, points de contrôle, défauts, raisons, plan shift)
- Workflows : Règles de validation, Règles de notification (sont des sous-pages séparées des modules `validations` / `notifications`)

## Plan d'implémentation

### 1. Refonte de `MODULE_GROUPS` (matrice 100%)

Passer de 18 → ~38 modules organisés en 6 familles. Les nouveaux umbrella conservent les anciennes clés (`qualite`, `inventaire`) pour rétro-compatibilité avec le code existant ; les sous-modules sont **additifs** (le code peut s'y brancher progressivement).

```text
Maintenance (GMAO)
  dashboard           Tableau de bord GMAO
  machines            Machines
  equipements         Équipements
  organes             Organes
  lignes              Lignes & synoptique
  pdr                 Pièces de rechange
  tickets             Tickets
  preventif           Préventif
  shift_maintenance   Shift Maintenance
  journal             Journal d'interventions
  historique          Historique interventions
  analytiques         Analyse & KPI maintenance

Production (GPAO)
  gpao_dashboard      Tableau de bord GPAO
  of                  Ordres de fabrication
  produits            Produits
  articles            Articles
  recettes            Recettes / BOM
  shift_production    Shift Production
  consommations       Consommations
  arrets              Arrêts

Qualité  (umbrella `qualite` reste présent)
  qualite             Module Qualité (umbrella — ouvre tout par défaut)
  qualite_dashboard   Dashboard Qualité
  qualite_of          OF Qualité
  qualite_indicateurs Indicateurs
  qualite_controles   Contrôles
  qualite_nc          Non-conformités
  qualite_actions     Actions correctives/préventives
  qualite_recettes    Recettes & nomenclatures (qualité)
  qualite_tracabilite Traçabilité
  qualite_rapports    Rapports
  qualite_shift       Shift contrôle

Inventaire  (umbrella `inventaire` reste présent)
  inventaire          Module Inventaire (umbrella)
  inventaire_campagnes Campagnes (double comptage)

Gouvernance
  audit               Audit & traçabilité
  validations         Validations (workflow)
  validations_rules   Règles de validation
  notifications       Centre de notifications
  notifications_rules Règles de notification
  securite            Sécurité & accès (hub)

Configuration
  parametres          Paramètres (hub)
  utilisateurs        Utilisateurs
  referentiels        Référentiels (familles, pannes, lignes, shifts)
  documents           Documents (catégories + permissions)
  pdr_stock_config    Permissions PDR & Stock
  qualite_parametres  Paramètres Qualité (NC, défauts, unités, plan shift…)
  smtp                SMTP & emails
  general             Général & branding
  images              Images & médias
  recherche           Recherche globale
  apps                Catalogue d'applications
```

### 2. Logique umbrella dans `usePermissions`

Pour éviter de devoir cocher chaque sous-module qualité quand `qualite` est coché :

```ts
// après le merge OR par module
const UMBRELLAS: Record<string, string[]> = {
  qualite: ["qualite_dashboard","qualite_of","qualite_indicateurs",
            "qualite_controles","qualite_nc","qualite_actions",
            "qualite_recettes","qualite_tracabilite","qualite_rapports","qualite_shift"],
  inventaire: ["inventaire_campagnes"],
};
// si umbrella = true et sous-module non défini → hérite des droits umbrella
```

Effet : aucun rebuild des écrans existants n'est nécessaire ; le code peut migrer écran par écran vers la clé granulaire.

### 3. Mise à jour des `ROLE_DEFAULTS`

Étendre les presets pour les 20 nouveaux modules :
- **admin / responsable_si** : FULL partout (incluant nouveaux).
- **auditeur** : RO partout.
- **resp_maintenance** : FULL maintenance complète + dashboard/shift/journal/historique, RO production & qualité (umbrella), RW validations/notifications.
- **maintenancier** : RW maintenance + FULL tickets, RO journal/historique/analytiques, RO shift_maintenance.
- **bureau_methode** : idem maintenancier + FULL preventif et recettes (côté méthode).
- **resp_production** : FULL production + gpao_dashboard + shift_production, RO maintenance, RO qualité, RW validations/notifications.
- **chef_ligne / operateur** : RW restreint production, RO machines/lignes, accès shift_production, lecture tickets.
- **directeur_qualite** : FULL umbrella `qualite` + tous les `qualite_*`, RO production/maintenance, RW validations/notifications, RO audit, RW qualite_parametres.
- **resp_controle_qualite** : FULL qualite + qualite_*, RO production basique.
- **controleur_qualite** : RW qualite_controles, qualite_nc, qualite_shift, RO autres qualite_*.
- **gestionnaire_magasin** : FULL pdr, RW articles/inventaire, RO equipements.
- **responsable_inventaire** : FULL inventaire + campagnes, RW pdr, RO articles/machines, RO analytiques.
- **agent_inventaire** : RW inventaire_campagnes, RO pdr/articles.
- Configuration (`parametres`, `utilisateurs`, `documents`, `referentiels`, `securite`, etc.) : réservé `admin` + `responsable_si` (et lecture pour `auditeur`).

### 4. Cohérence & contrôle qualité

- Conserver l'auto-coherence (activer C/M/S → force `can_view`).
- Ajouter un **bandeau d'inférence** quand un umbrella est actif : « 10 sous-modules Qualité hérités de `qualite` ».
- Ajouter un **filtre de recherche par module** (en plus du filtre par rôle) et un compteur "X/38 modules couverts" par rôle.
- Garder l'`upsert (role, module)` (déjà sûr).

### 5. Brancher l'app sur les nouveaux modules (non destructif)

- `Apps.tsx` : ajouter `permissionModule` aux tuiles qui n'en avaient pas (Dashboard, Shifts, Journal, Historique, Lignes, GPAO Dashboard, Recettes, Inventaire dashboard/campagnes, Sécurité, Paramètres, Notifications, etc.) pour que la visibilité respecte la matrice (umbrella couvrira les anciens utilisateurs).
- `AppSidebar.tsx` : remplacer les `roles.includes(...)` codés en dur (ex. inventaire, qualité) par `canView("inventaire")` / `canView("qualite")` ; ajouter `canView` pour les groupes Configuration/Gouvernance.

### 6. Tests

- Mettre à jour `src/test/parametres/roles-matrix-logic.test.ts` :
  - cas umbrella : `qualite=true` ⇒ `canView("qualite_controles")===true`.
  - cas override : si `qualite_controles=false` explicite et `qualite=true`, l'umbrella ne doit **pas** réécraser un `false` explicite (on n'écrit pas `false`, on ne fait qu'hériter quand non défini).
  - presets : tous les rôles ont au moins `can_view` cohérent (pas de C/M/S sans V).

## Fichiers modifiés

- `src/pages/parametres/RolesMatrix.tsx` — extension `MODULE_GROUPS`, presets, filtre par module, compteur de couverture, bandeau umbrella.
- `src/hooks/usePermissions.ts` — logique d'héritage umbrella.
- `src/pages/Apps.tsx` — ajout `permissionModule` manquants.
- `src/components/gmao/AppSidebar.tsx` — visibilité via `canView` au lieu des rôles codés en dur (groupes Qualité, Inventaire, Admin).
- `src/test/parametres/roles-matrix-logic.test.ts` — couverture umbrella + cohérence presets.

Aucune migration DB nécessaire (la contrainte unique `(role, module)` existe déjà).
