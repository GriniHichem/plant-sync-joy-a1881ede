# Refonte UX/UI responsive — modules critiques mobile

Objectif : rendre confortable l'usage **mobile (≤640px)** et **tablette (641–1024px)** sur les modules utilisés en atelier, sans toucher aux modules d'administration. Tablette traitée comme "desktop compact" (densité réduite, padding adapté), navigation burger conservée.

## Modules ciblés

1. **Shift Maintenance** (`/maintenance/shift`)
2. **Tickets** : liste + détail + dialog création
3. **Synoptique Ligne** (`/lignes/:id/synoptic`) + panneau d'entité
4. **Dashboards** GMAO (`/`) et GPAO (`/gpao`)
5. **Consommations** (`/gpao/consommations`)
6. **Shift Production** (`/gpao/shift`)
7. **TopBar** + **layout** global (paddings, header)

Modules **non touchés** : Paramètres, Audit, Notifications admin, Recettes, Familles, Form longs (Machine/PDR/OF), Journal interventions.

## Principes appliqués partout

- **3 patterns d'en-tête de page** standardisés via une logique commune :
  - Mobile : titre court + sous-titre tronqué, actions principales en barre flottante bottom-sticky (FAB+), actions secondaires dans menu kebab.
  - Tablette/Desktop : header inline actuel conservé, padding réduit (`px-4 md:px-5`).
- **Filtres** : sur mobile, regroupés dans un Sheet "Filtres" déclenché par un bouton compact ; chips actifs visibles au-dessus pour retrait rapide. Tablette/desktop : barre inline existante.
- **Tableaux — règle hybride** :
  - **Cartes empilées** (pattern Tickets) pour : Shift Maintenance, Tickets, Préventif (déjà), Synoptique entité.
  - **Tableau scroll-x + colonne sticky** (`code`/`numéro`) pour : Consommations, Dashboards (listes denses).
- **Touch targets** : conserver règle 48px (h-12) sur boutons d'action critiques mobile, 40px (h-10) ailleurs.
- **Dialogs** : sur mobile, bascule automatique vers `Drawer` (vaul) plein écran depuis le bas pour les dialogues d'action (création ticket, fermeture, choix shift). Conserver `Dialog` desktop.
- **Sticky elements** : barre d'onglets (tabs) sticky sous le header sur mobile pour Shift et Tickets détail, pour ne pas devoir scroller jusqu'en haut.

## Détails par module

### 1. Shift Maintenance
- En-tête condensé mobile (titre + statut shift courant en pill).
- Tabs Curatif/Préventif **sticky** sous header.
- Cartes de tâches : retirer colonnes peu utiles, garder priorité (pulse), machine, durée, action. Bouton action plein largeur en bas de carte mobile.
- Pulse/animations conservées (memory `maintenance-shift-view`).

### 2. Tickets
- **Liste** : conserver le pattern cartes mobile existant, ajouter chips de filtres actifs au-dessus + bouton "Filtres" qui ouvre Sheet.
- **Détail** : tabs sticky, sections collapsables (Infos, Intervention, PDR, Documents, Historique). Boutons d'action principaux (Prendre en charge, Résoudre, Clôturer) en footer-sticky mobile.
- **Création** : remplacer Dialog par Drawer plein hauteur mobile (déjà en partie), inputs h-12 minimum.

### 3. Synoptique Ligne
- Header de ligne compacté, sélecteur de ligne devient Select plein largeur mobile.
- Blocs 240px conservés en scroll horizontal sur mobile (snap-x), barre d'aide en bas.
- `SynopticEntityPanel` : devient Drawer bottom plein hauteur sur mobile au lieu de panneau latéral.

### 4. Dashboards GMAO + GPAO
- KPI grid : passer de `grid-cols-4` à `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` ; cartes KPI plus compactes, valeurs en `text-2xl` mobile.
- Listes Top-N : tableau scroll-x avec colonne 1 sticky.
- DateRangeFilter : passe en bouton compact qui ouvre Popover/Sheet sur mobile.

### 5. Consommations + Shift Production
- Filtres dans Sheet mobile.
- Tableau : scroll-x, colonne `Article`/`Produit` sticky, ligne saisie inline reste accessible (input compact).
- Boutons "Valider/Corriger" toujours visibles en footer-sticky.

### 6. TopBar + AppLayout
- `AppLayout` : `p-4 md:p-6` → `px-3 py-4 md:px-5 md:py-5 lg:p-6` pour gagner ~15px utile sur mobile.
- TopBar : déjà bon (mobile testé). Ajustement mineur : badge rôle masqué <sm, `SearchTrigger` icône reste compacte.

## Composants partagés à créer

- `src/components/responsive/PageHeader.tsx` : header standardisé (titre, sous-titre, actions desktop, fallback FAB mobile).
- `src/components/responsive/FilterSheet.tsx` : wrapper Sheet "Filtres" + chips actifs + bouton reset.
- `src/components/responsive/ResponsiveDialog.tsx` : Dialog desktop / Drawer mobile (basé sur `useIsMobile`).
- `src/components/responsive/StickyActionBar.tsx` : barre d'actions footer-sticky safe-area mobile.
- `src/components/responsive/ScrollTable.tsx` : wrapper Table avec scroll-x + 1ʳᵉ colonne sticky.

## Hors scope (non touché)

- Pages Paramètres, Audit, Notifications admin, Validation rules.
- Formulaires longs (MachineForm, PdrForm, OfForm, EquipmentForm) — peuvent être traités dans une seconde passe si demandé.
- Aucune migration DB. Aucun changement de logique métier.

## Critères de validation

- Sur viewport 375×812 : aucun débordement horizontal, tous les boutons d'action principaux atteignables sans scroll au-delà du fold.
- Sur viewport 820×1180 (tablette) : même UX que desktop avec densité réduite, pas de cartes mobiles.
- Tests Vitest existants doivent rester verts (pas de changement de logique).
