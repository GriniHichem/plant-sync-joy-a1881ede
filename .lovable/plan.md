
# Plan — Référentiel des indicateurs qualité

Étape strictement additive : création d'une nouvelle table isolée, d'une page CRUD et de permissions. Aucune modification des modules GPAO (OF, recettes, déclarations), GMAO, notifications, audit ou validations.

## 1. Migration SQL

Créer `supabase/migrations/<timestamp>_quality_indicators.sql` :

### Enums
```sql
CREATE TYPE public.quality_indicator_type AS ENUM ('numeric','boolean','text','select');
CREATE TYPE public.quality_frequency_type AS ENUM ('hourly','shift','daily','per_of','per_lot','manual');
CREATE TYPE public.quality_indicator_category AS ENUM (
  'produit_fini','emballage','process','hygiene','poids','controle_visuel','autre'
);
```

### Table `quality_indicators`
Colonnes : `id uuid pk default gen_random_uuid()`, `code text unique not null`, `name text not null`, `description text`, `indicator_type quality_indicator_type not null`, `unit text`, `target_value numeric`, `min_value numeric`, `max_value numeric`, `tolerance_minus numeric`, `tolerance_plus numeric`, `frequency_type quality_frequency_type not null default 'manual'`, `category quality_indicator_category not null default 'autre'`, `select_options jsonb` (pour le type `select`, pas demandé explicitement mais nécessaire), `is_required boolean default false`, `is_blocking boolean default false`, `is_active boolean default true`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`, `created_by uuid`, `updated_by uuid`.

Trigger `updated_at` : réutiliser `public.update_updated_at_column()`.

Validation trigger `quality_indicators_validate` :
- si `indicator_type = 'numeric'` et `min_value` et `max_value` non null → `min_value <= max_value`
- `tolerance_minus >= 0`, `tolerance_plus >= 0`

### RLS
- Activer RLS.
- SELECT : `has_role(auth.uid(),'admin') OR check_permission(auth.uid(),'qualite','view')`.
- INSERT/UPDATE/DELETE : `has_role(auth.uid(),'admin') OR check_permission(auth.uid(),'qualite_indicators','edit')` (nouveau module dédié, voir §2).

### Search vector (optionnel, cohérent avec les autres tables)
Non ajouté à `global_search` dans cette étape pour rester strictement isolé.

## 2. Permissions (data-only, via insert tool)

Ajouter le module `qualite_indicators` dans `role_permissions` :

| Rôle existant | view | create | edit | delete |
|---|---|---|---|---|
| admin | ✅ | ✅ | ✅ | ✅ |
| bureau_methode | ✅ | ✅ | ✅ | ❌ |
| resp_production | ✅ | ❌ | ❌ | ❌ |
| chef_ligne | ✅ | ❌ | ❌ | ❌ |
| gestionnaire_magasin | ✅ | ❌ | ❌ | ❌ |

Rôles `resp_qualite` / `controleur_qualite` non créés (cf. décision précédente — l'enum `app_role` ne les contient pas encore). Note ajoutée à la mémoire pour les inclure quand ces rôles seront créés.

Le module global `qualite` (déjà existant) reste utilisé pour la visibilité du groupe sidebar et des autres sous-pages.

## 3. Page `/qualite/indicateurs`

Remplacer le placeholder actuel par une vraie page :

`src/pages/qualite/QualiteIndicateurs.tsx` :

- En-tête : titre + sous-titre + bouton "Nouvel indicateur" (si `canCreate('qualite_indicators')`).
- Barre de filtres :
  - Recherche texte (sur `code`, `name`, `description`)
  - Select Catégorie (7 valeurs + "Toutes")
  - Select Type (4 valeurs + "Tous")
  - Select Statut (Actif / Inactif / Tous)
  - Bouton `RotateCcw` "Réinitialiser" visible uniquement si au moins un filtre actif (convention `ui-reset-convention`)
  - Bouton "Exporter CSV" (utilise `exportToCsv` existant)
- Tableau : Code · Nom · Catégorie · Type · Unité · Cible · Min/Max · Tolérance · Fréquence · Requis · Bloquant · Actif · Actions (Éditer, Activer/Désactiver).

### Dialog création/édition
`ResponsiveDialog` existant. Champs :
- code (obligatoire, unique, format `[A-Z0-9_-]+`)
- name (obligatoire)
- description
- indicator_type (Select)
- category (Select)
- frequency_type (Select)
- unit (visible si type = numeric)
- target_value, min_value, max_value, tolerance_minus, tolerance_plus (visibles si numeric)
- select_options (textarea CSV → array, visible si type = select)
- is_required, is_blocking, is_active (Switch/Checkbox)
- Toujours utiliser le sentinel `__none__` pour les Selects optionnels (convention mémoire).

Conversion décimale dot/comma via util existante.

### Audit
Chaque insert/update/delete émet un `audit_logs` (action `quality_indicator_created/updated/deactivated/deleted`, module `qualite`, severity `info` ou `warning` pour deactivation).

## 4. Sidebar

Aucun changement structurel : l'entrée "Indicateurs" existe déjà dans le groupe Qualité et pointe sur `/qualite/indicateurs`.

## 5. Tests

Créer `src/test/qualite/quality-indicators.test.ts` (logique pure, pas de Supabase) :

1. Validation `min_value <= max_value` côté front.
2. Création indicateur numérique avec unité `g` → payload correct.
3. Création indicateur boolean → champs numériques nullifiés.
4. Modification indicateur → diff payload.
5. Désactivation → `is_active = false`.
6. Filtre combinaison catégorie + type + actif.
7. Reset filtres → tous repassent à valeur par défaut.
8. Export CSV → colonnes attendues présentes.

Pas de test e2e nécessaire (table isolée). Vérification manuelle :
- `/gpao/of`, `/gpao/of/:id`, `/gpao/recettes`, `/maintenance/shift`, `/notifications`, `/qualite`, `/qualite/indicateurs` → aucune régression.
- `bunx vitest run` complet.

## 6. Mémoire

Mettre à jour `mem://features/qualite-module` (ajouter référentiel indicateurs + table + module permission `qualite_indicators`).

## Fichiers créés / modifiés

Créés :
- `supabase/migrations/<ts>_quality_indicators.sql`
- `src/test/qualite/quality-indicators.test.ts`

Modifiés :
- `src/pages/qualite/QualiteIndicateurs.tsx` (placeholder → page CRUD complète)
- `mem://features/qualite-module`

Données insérées (insert tool) :
- 5 lignes dans `role_permissions` (module `qualite_indicators`)

## Confirmation finale

- Table `quality_indicators` + 3 enums créés ✅
- Page `/qualite/indicateurs` opérationnelle (CRUD, filtres, reset, export CSV) ✅
- Permissions `qualite_indicators` distribuées sur 5 rôles existants ✅
- Pas de modification de OF, recettes, déclarations, GMAO, notifications ✅
- Tests unitaires + non-régression vérifiés ✅
