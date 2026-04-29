# Affectation des indicateurs qualité (produit / famille / ligne / recette / OF)

Approche **strictement additive** : nouvelle table d'association + nouvelle fonction SQL en lecture seule. Aucune modification des tables `ordres_fabrication`, `recipes`, `products`, `production_lines`, `product_families`, ni des modules Shift / GPAO / GMAO.

## 1. Migration BD

### Table `quality_indicator_assignments`
```text
id                  uuid PK default gen_random_uuid()
indicator_id        uuid NOT NULL → quality_indicators(id) ON DELETE CASCADE
product_id          uuid NULL → products(id) ON DELETE CASCADE
product_family_id   uuid NULL → product_families(id) ON DELETE CASCADE
production_line_id  uuid NULL → production_lines(id) ON DELETE CASCADE
recipe_id           uuid NULL → recipes(id) ON DELETE CASCADE
is_required         boolean NOT NULL default false
is_blocking         boolean NOT NULL default false
frequency_type      quality_frequency_type NULL  (override de la fréquence indicateur)
notes               text default ''
created_by          uuid NULL
updated_by          uuid NULL
created_at          timestamptz default now()
updated_at          timestamptz default now()
```

Règles & contraintes :
- Trigger `updated_at`.
- Trigger de validation : au moins une cible doit être définie OU toutes nulles (= portée globale explicite). Implémenté via trigger (pas CHECK) pour rester souple.
- Index sur (indicator_id), (product_id), (product_family_id), (production_line_id), (recipe_id).
- RLS :
  - SELECT : authenticated.
  - INSERT/UPDATE/DELETE : `admin`, `bureau_methode`, ou rôle disposant de `qualite_indicators.can_edit` (réutilise le module permission existant).

### Fonction SQL `get_quality_indicators_for_of(p_of_id uuid)`
- `LANGUAGE sql STABLE SECURITY INVOKER` — **lecture seule**, ne touche jamais à l'OF.
- Récupère depuis `ordres_fabrication` : `product_id`, `recipe_id`, `line_id`, et la `family_id` du produit.
- Retourne (TABLE) : toutes les colonnes utiles de `quality_indicators` actifs + colonnes d'assignation (`is_required`, `is_blocking`, `frequency_type` effective, `match_scope` ∈ {global, product, family, line, recipe}).
- Inclut :
  1. Indicateurs **globaux actifs** (= indicateur sans aucune assignation, OU assignation avec toutes cibles nulles).
  2. Indicateurs assignés au `product_id` de l'OF.
  3. Indicateurs assignés à la `family_id` du produit de l'OF.
  4. Indicateurs assignés à la `line_id` de l'OF.
  5. Indicateurs assignés à la `recipe_id` de l'OF.
- DISTINCT par `indicator_id` avec priorité scope `recipe > product > family > line > global` pour `is_required`/`is_blocking`/`frequency_type` effectifs.

## 2. UI — `src/pages/qualite/QualiteIndicateurs.tsx`

Ajout d'un système d'**onglets** (`Tabs` shadcn) :
- **Onglet "Indicateurs"** : page actuelle inchangée.
- **Onglet "Affectations"** :
  - Filtre par indicateur, produit, famille, ligne, recette + bouton reset (RotateCcw).
  - Tableau : Indicateur • Portée (badge: Global/Produit/Famille/Ligne/Recette) • Cible • Requis • Bloquant • Fréquence (override) • Actions.
  - Bouton "+ Nouvelle affectation" → `ResponsiveDialog` :
    - Select Indicateur (obligatoire, depuis `quality_indicators` actifs).
    - Selects optionnels (avec sentinelle `__none__` → null) : Produit, Famille produit, Ligne, Recette.
    - Switches `is_required`, `is_blocking`.
    - Select fréquence override (option vide = hériter).
    - Validation : au moins une cible OU explicite "Global".
  - Édition / suppression avec confirmation.
  - Audit via `logAudit` (module `parametres`, alias `qualite_indicator_assignments`).

## 3. Permissions
Réutilise le module existant `qualite_indicators` — pas de nouveau module nécessaire (les affectations sont gérées par les mêmes profils que les indicateurs).

## 4. Tests (`src/test/qualite/quality-indicator-assignments.test.ts`)
- Validation de payload (au moins une cible ou explicitly global).
- Filtres affectations (par indicateur/produit/ligne).
- Logique de priorité de scope (recipe > product > family > line > global).
- Mock de la fonction `get_quality_indicators_for_of` : retour combinant globaux + scope produit + scope ligne sans doublon.
- Re-validation des routes existantes : `/gpao/of`, `/maintenance/shift`, `/gpao/recettes`, `/notifications`.

## 5. Garantie de non-régression
- **Aucune** modification de `ordres_fabrication`, `recipes`, `products`, `production_declarations`, `shifts`.
- La fonction `get_quality_indicators_for_of` est en `STABLE` / lecture seule, jamais appelée par Shift Production dans cette itération.
- Aucun trigger n'est ajouté sur les tables existantes.
- L'onglet Affectations n'est visible que sous le module `qualite_indicators` déjà gardé.

## Fichiers
- **Nouveau** : `supabase/migrations/<timestamp>_quality_indicator_assignments.sql`
- **Modifié** : `src/pages/qualite/QualiteIndicateurs.tsx` (ajout Tabs + section Affectations)
- **Nouveau** : `src/test/qualite/quality-indicator-assignments.test.ts`
- **Mis à jour** : `mem://features/qualite-module`

## Confirmation finale (livrée après implémentation)
- Table créée ✓
- Fonction `get_quality_indicators_for_of` créée ✓
- Tests exécutés ✓
- Aucun impact sur OF / Shift / Recettes ✓
