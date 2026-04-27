# Synoptique de ligne — Vue de supervision industrielle

Refonte de `LineSynoptic.tsx` et `LineConfig.tsx` pour transformer la vue actuelle en vraie console de supervision GMAO/GPAO, sans rien casser de l'existant (mêmes routes, mêmes tables).

## 1. Données chargées en une passe

Une seule fonction `loadLine()` charge en parallèle, avec un skeleton loader et un bouton **Actualiser** :

- `production_lines` (entête)
- `machine_line_assignments` triés par `sort_order` + jointure `machines(*)` + image principale
- `equipements` rattachés à la ligne (avec ou sans `machine_id`)
- `organes` (par machine et par équipement de la ligne, en un seul `in()`)
- `tickets` ouverts/pris_en_charge sur ces machines/équipements/organes
- `preventive_plans` actifs+validés sur ces machines/équipements/organes (avec `prochaine_echeance`)
- `pdr_entity_links` + jointure `pdr(stock_actuel, stock_min, stock_securite, statut_pdr)` pour les machines/équipements/organes
- `entity_images` (primaires) en batch via `useEntityPrimaryImages`

Les compteurs (tickets, préventifs en retard, PDR critiques/rupture) sont agrégés **côté client** en `useMemo` par entité.

## 2. KPI rapides (en haut de page)

Bandeau `KpiCard` :

- Total machines · En service · En panne · En maintenance
- Tickets ouverts (ligne) · Préventifs en retard · PDR critiques/rupture
- Disponibilité estimée = `% machines en marche` (parmi celles non-`hors_service`)

Les KPI se recalculent selon les filtres actifs.

## 3. Filtres (au-dessus du flow)

Barre de filtres avec `RotateCcw` standard :

- Statut (multi-select : en marche, arrêt, maintenance, hors service)
- Criticité (A/B/C)
- Toggle **Anomalies seulement** (machine en panne/maint OR ticket ouvert OR PDR rupture/critique OR préventif en retard)
- Toggle **PDR critiques**
- Toggle **Préventifs en retard**
- Toggle **Tickets ouverts**
- Bouton Réinitialiser

Le filtre s'applique à la fois aux machines et aux équipements autonomes.

## 4. Cartes machine enrichies

Chaque carte (largeur 260px desktop, full-width mobile) garde le design actuel et ajoute :

- Image principale (miniature 40x40) à côté du code
- Bandeau rouge **« Arrêt complet »** si `impact_ligne = arret_complet` ET `statut != en_marche`
- Badges sous la carte :
  - `Tickets: N` (rouge si > 0, avec icône `AlertTriangle`)
  - `Préventif retard: N` (orange)
  - `PDR rupture: N` (rouge) / `PDR critique: N` (orange)
- Contour rouge épaissi si au moins un ticket de priorité `critique` ou `haute` est ouvert
- Section **Organes principaux** sous la carte : 3 organes max + bouton « Voir tous (X) » qui ouvre le panneau latéral sur l'onglet organes
  - Chaque chip organe : code, type, point de couleur statut, badge ticket/PDR si applicable

## 5. Équipements autonomes

Section dédiée **« Équipements autonomes de la ligne »** (bloc séparé sous le flow), affichant les équipements `line_id = ligne` ET dont la `machine_id` n'est pas une machine de la ligne. Mêmes badges (statut, criticité, tickets, préventifs, organes).

Les équipements rattachés à une machine de la ligne restent affichés sous leur machine (existant).

## 6. Panneau latéral (Sheet) au clic

Au clic sur une **machine**, un **équipement** ou un **organe** : `Sheet` côté droit (à la place de la navigation directe) avec :

- En-tête : code, désignation, statut, criticité, image
- Onglets : **Résumé** · **Tickets** · **Préventif** · **PDR** · **Organes** (machines/équipements seulement) · **Documents**
- Boutons d'action :
  - Voir fiche complète (navigate avec `from`)
  - Créer ticket (pré-remplit `machine_id`/`equipement_id`/`organe_id`)
  - Voir tickets / Voir préventif / Voir PDR liées (filtres URL)

Le panneau réutilise les données déjà chargées (pas de nouveau fetch).

## 7. Mode tablette / mobile

Breakpoint `md` :

- Desktop : flow horizontal scrollable existant
- Tablette/mobile : liste verticale, cartes pleine largeur, organes pliables (`Collapsible`), bouton flottant **+ Ticket** en bas à droite
- Touch targets 48px (Core rule)

## 8. Configuration (`LineConfig.tsx`)

Ajouts :

- **Drag & drop** des machines (via `@dnd-kit/sortable` déjà compatible avec le stack) en plus des flèches up/down (gardées en fallback accessibilité)
- Section **« Équipements autonomes »** : ajouter/retirer un équipement de la ligne (UPDATE `equipements.line_id`)
- Sauvegarde automatique du nouvel ordre après drop

## 9. Couleurs

Strictement les tokens sémantiques existants :

- vert : `bg-green-500` (déjà en usage local pour statut machine)
- orange : `bg-amber-500` / `text-amber-600`
- rouge : `bg-destructive` / `text-destructive`
- gris : `text-muted-foreground` / `bg-muted`
- bleu : `bg-primary` / `text-primary`

## 10. Détails techniques

- Fichiers modifiés : `src/pages/LineSynoptic.tsx`, `src/pages/LineConfig.tsx`
- Nouveaux composants :
  - `src/components/gmao/LineSynopticFilters.tsx`
  - `src/components/gmao/SynopticEntityPanel.tsx` (le Sheet polymorphe)
  - `src/components/gmao/SynopticMachineCard.tsx`
  - `src/components/gmao/SynopticEquipmentCard.tsx`
  - `src/components/gmao/SynopticOrganeChip.tsx`
- Nouveau hook : `src/hooks/useLineSynopticData.ts` (fetch unique + agrégations mémoïsées + `refetch()`)
- Création de ticket depuis le panneau : ouverture d'un Dialog inline qui POST sur `tickets` avec audit_log (auteur, valeurs)
- Aucune migration SQL — toutes les colonnes nécessaires existent déjà (`organes.machine_id/equipement_id`, `pdr_entity_links`, `preventive_plans.equipement_id/organe_id`)
- Drag & drop : `bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

## 11. Préservation

- Routes inchangées : `/lignes/:id` (synoptique) et `/lignes/:id/config`
- Boutons retour conservent `useSmartBack`
- Données existantes intactes (lecture seule sauf nouveaux UPDATE sort_order et equipements.line_id)
- Tests existants non-impactés (le hook isole la logique testable séparément)

## Résultat attendu

Page `/lignes/:id` devient le tableau de bord central de la ligne : structure visuelle ordonnée, état temps réel de chaque actif, anomalies mises en évidence, panneau latéral riche, filtres puissants, utilisable en atelier sur tablette.
