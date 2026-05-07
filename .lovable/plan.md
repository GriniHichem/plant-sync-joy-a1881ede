## Objectif

Rendre toutes les nouveautés récentes (bandeau « Voir comme », bouton Export CSV universel, Hub Accès, page Apps, top bar) parfaitement utilisables sur mobile (≤640px) et tablette (≤1024px), puis auditer chaque module pour corriger les problèmes responsive bloquants.

## Périmètre — composants nouveaux à adapter

### 1. `ExportCsvButton` (`src/components/common/ExportCsvButton.tsx`)
- Sur mobile, le label « Exporter CSV » prend trop de place quand il est posé à côté du bouton « Nouveau … ».
- Ajouter un mode responsive : icône seule sur `<sm`, label complet à partir de `sm`. Prop `responsive?: boolean` (true par défaut) → `<span className="hidden sm:inline">Exporter CSV</span>`, `aria-label` toujours présent, `size="icon"` automatique sur mobile.
- Hauteur cohérente avec les autres boutons d'action (`h-10` mobile, `h-12` desktop quand utilisé à côté d'un CTA `h-12`).

### 2. En-têtes de listes (`flex items-center justify-between` rigide)
Pages concernées (toutes équipées d'`ExportCsvButton`) :
`LinesList`, `EquipmentsList`, `OrganesList`, `PreventifList`, `NotificationsPage`, `InterventionHistory`, `InterventionJournal`, `SearchPage`, `ValidationsPage`, `gpao/StopsPage`, `gpao/ConsumptionPage`, `gpao/RecipesPage`, `inventaire/InventoryCampaignsList`, `parametres/FamillesAdmin`, `parametres/LignesAdmin`, `parametres/PannesAdmin`, `parametres/PdrFamiliesAdmin`, `parametres/ProductFamiliesAdmin`.

Patron cible :
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div>{title + count}</div>
  <div className="flex items-center gap-2 flex-wrap">
    <ExportCsvButton ... />
    {canCreate && <Button>Nouveau ...</Button>}
  </div>
</div>
```
Une seule passe d'édition par fichier, identique partout.

### 3. Bandeau « Voir comme » (`ImpersonationBanner`)
- Le bloc « N modules visibles » est `hidden md:inline`, OK. Le nom + rôle peut déborder : ajouter `min-w-0 truncate` au span (déjà partiel) et empiler nom/rôle sur 2 lignes en mobile :
```tsx
<span className="flex-1 min-w-0">
  <span className="block truncate"><strong>{name}</strong></span>
  <span className="block truncate text-[11px] opacity-70 sm:inline sm:text-[13px]">— {roles}</span>
</span>
```
- Bouton « Quitter » : `size="sm"` + texte caché en `<sm` (`<span className="hidden sm:inline">Quitter</span>`).

### 4. Top bar (`AppTopBar`)
- Le bouton « Voir comme » (admin) garde son icône en mobile (texte déjà `hidden lg:inline`) — OK.
- Vérifier que la sidebar mobile (`MobileNav`) liste bien : Maintenance, Production, Qualité, Inventaire, Configuration. Vérifié — OK.
- Ajouter la suppression de surplus : sur mobile, masquer `SearchTrigger variant="input"` (déjà fait via `hidden md:flex`) et garder seulement l'icône. OK.

### 5. Hub Accès (`parametres/AccessControlHub`)
- `TabsList flex-wrap` sur 10 onglets devient un mur d'onglets sur mobile. Cible : conserver `flex-wrap` mais réduire la taille (`text-xs h-9 px-2`) et masquer le label sous `<sm` (icône seule + tooltip via `title`).
- `Card > CardContent p-2 overflow-x-auto` → garder `overflow-x-auto` pour fallback.

### 6. Page Apps (`Apps.tsx`)
- Grille `grid-cols-2 sm:grid-cols-3 …` OK déjà.
- La toolbar `md:flex-row md:justify-between` empile bien en mobile — OK.
- Vérifier que les chips de catégories scrollent horizontalement si trop nombreuses : ajouter wrapper `overflow-x-auto -mx-1 px-1` autour des `<Button>` catégories.

## Audit responsive global — autres modules

Lecture rapide pour confirmer que les pages clés ne sont pas cassées en mobile/tablette. Pour chaque souci, application de la règle :
1. En-têtes : `flex-col sm:flex-row` + `gap-3`.
2. Tables hors `<Card>` p-0 doivent être englobées d'un `overflow-x-auto`.
3. Filtres : déjà `flex-wrap` partout — OK.

Pages à scanner (lecture seule) : `MachinesList`, `TicketsList`, `PdrList`, `gpao/OfList`, `gpao/ProductsList`, `gpao/ArticlesList`, `qualite/QualiteControles`, `qualite/QualiteNonConformites`, `qualite/QualiteActions`, `qualite/QualiteIndicateurs`, `qualite/QualiteOf`, `qualite/QualiteRapports`, `qualite/QualiteTracabilite`, `inventaire/InventoryDashboard`, `inventaire/InventoryCampaignDetail`, `parametres/UsersAdmin`, `parametres/ShiftsAdmin`, `parametres/RolesMatrix`, `parametres/DocumentPermissionsAdmin`, `parametres/PdrStockPermissionsAdmin`.

Corrections appliquées seulement si un problème évident est trouvé (header non flex-col, table sans scroll horizontal). Les pages déjà conformes (`hidden md:table-cell` sur colonnes secondaires + `overflow-x-auto`) ne sont pas touchées.

## Tests

- Étendre `src/test/common/export-csv-button.test.tsx` pour vérifier que `aria-label` est présent quand `responsive` masque le label.
- Aucune autre modification logique → pas de régression attendue sur les tests existants.

## Hors périmètre

- Pas de refonte design générale (couleurs, polices).
- Pas de migration vers `ScrollTable` partout (déjà géré par `overflow-x-auto` ad hoc).
- Pas de modification des comportements `permissionModule` / matrice de rôles.

## Récapitulatif des fichiers modifiés (estimation)

- 1 composant : `src/components/common/ExportCsvButton.tsx`
- 1 banner : `src/components/admin/ImpersonationBanner.tsx`
- 1 hub : `src/pages/parametres/AccessControlHub.tsx`
- 1 page apps : `src/pages/Apps.tsx`
- ~18 pages liste : passage de l'en-tête au patron `flex-col sm:flex-row`
- 1 test étendu : `src/test/common/export-csv-button.test.tsx`

Total : ~22 fichiers, principalement des changements localisés à 5–8 lignes par fichier.