
# Fusion Recettes (production + qualité) + BOM en une seule recette versionnée

## Objectif

Aujourd'hui le projet a **trois entités parallèles** pour la même réalité « comment on fabrique un produit » :

1. `recipes` (+ `recipe_lines` + `recipe_steps`) — recette de production GPAO (`/gpao/recettes`).
2. `recipes` lue côté Qualité (`/qualite/recettes-nomenclatures` onglet "Recettes") — même table mais consultée via le prisme qualité (CCP, indicateurs).
3. `bill_of_materials` (+ `bom_items`) — nomenclature/BOM dédiée Qualité (onglet "Nomenclatures").

Chaque OF référence indépendamment `recipe_id` **et** `bom_id`. Le BOM est rarement renseigné, ce qui casse les rapports théoriques vs réels et oblige à dupliquer la matière première (déjà décrite dans `recipe_lines`).

**Cible** : une seule entité **Recette versionnée** qui porte à la fois la composition matière (ex-BOM) et le process (étapes/CCP/indicateurs). À la création d'un OF, on choisit **la version de recette à suivre**. L'app Qualité récupère automatiquement cette même version (composants + étapes + indicateurs sensibles), sans configuration séparée.

## Modèle de données — migration additive (pas de drop)

Garder `recipes` comme entité maître. Étendre `recipe_lines` avec les attributs BOM (déjà présents : `quantite`, `unite` ; à ajouter : `item_type`, `waste_percent`, `is_mandatory`, `is_quality_sensitive`). Ne pas casser `bill_of_materials` mais le marquer "legacy" et fournir une vue+RPC qui agrège tout depuis `recipes`/`recipe_lines`.

```sql
-- 1) Étendre recipe_lines avec les champs BOM
ALTER TABLE public.recipe_lines
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'raw_material'
    CHECK (item_type IN ('raw_material','packaging','label','carton','pallet','consumable')),
  ADD COLUMN IF NOT EXISTS waste_percent numeric(6,4),
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_quality_sensitive boolean NOT NULL DEFAULT false;

-- 2) Marquer bill_of_materials comme legacy (lecture seule depuis l'UI)
COMMENT ON TABLE public.bill_of_materials IS
  'LEGACY — fusionné dans recipes/recipe_lines. Conservé pour historique uniquement.';

-- 3) Migration des données existantes : pour chaque BOM "active", copier ses items
--    dans la dernière recette active du même produit (ou créer une recette si aucune).
--    Script de backfill idempotent inclus dans la migration.

-- 4) RPC unique pour la Qualité : composants + étapes + CCP d'une version de recette
CREATE OR REPLACE FUNCTION public.get_recipe_for_of(p_of_id uuid)
RETURNS TABLE (
  recipe_id uuid, recipe_name text, version int, status text,
  components jsonb,  -- [{article_id, code, designation, qty, unit, type, qs}]
  steps jsonb,       -- [{order, title, ccp, indicator_id}]
  quality_sensitive_components jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  -- assemble depuis recipes + recipe_lines + recipe_steps via OF.recipe_id
$$;
```

Ajout d'un trigger d'audit sur `recipe_lines` pour les nouveaux champs (`is_quality_sensitive` notamment).

## OF — choix explicite de la version

Aujourd'hui la création d'OF prend "n'importe quelle recette du produit" (`recipes.find((r) => r.product_id === newProductId)`), sans gérer les versions. À refondre :

- Champ obligatoire **"Version de recette à suivre"** dans le dialog `OfList → handleCreate`, peuplé avec les recettes `status='active'` du produit choisi (par défaut la plus récente). Possibilité de choisir une version `draft` pour OF de R&D (avec badge d'avertissement).
- Stockage : `ordres_fabrication.recipe_id` (déjà existant). Le champ `bom_id` devient inutile : on le rend nullable+deprecated, et on le remplit automatiquement par trigger pour la rétro-compat des rapports actuels (`bom_id := (SELECT id FROM bill_of_materials WHERE product_id=NEW.product_id AND status='active' LIMIT 1)` — uniquement tant que `bill_of_materials` existe, sinon NULL).
- Une fois l'OF créé, la version est figée : pas de changement automatique si une nouvelle version de recette est activée plus tard. Un bouton "Aligner sur la dernière version" est proposé (avec audit + raison) tant que l'OF est `planifie`.

## Côté Qualité — lecture transparente

Tous les écrans qualité qui lisaient `bill_of_materials`/`bom_items` lisent désormais `recipes`/`recipe_lines` via la RPC `get_recipe_for_of(of_id)` :

- `OfQualityTab` → nouvelle section "Recette suivie" (nom, version, badge statut, lien vers la recette) + tableau des composants qualité-sensibles attendus.
- `QualiteTracabilite` → remplace les jointures `bom_id/bom_items` par la RPC.
- `QualiteRapports` (théorique vs réel) → utilise les `recipe_lines` de la recette de l'OF au lieu des `bom_items`.
- `QualitySensitiveItemsTab` → liste les `recipe_lines` avec `is_quality_sensitive=true`, regroupées par produit/version.
- `BomCompareTab` → devient "Comparer deux versions de recette" (composants + étapes côte à côte).
- `RecipesQualityTab` (lecture qualité actuelle) → enrichi avec colonne "Composants" (déjà présente) + colonnes "type / qualité-sensible / perte%".

## Refonte de l'écran Recettes (`/gpao/recettes`)

`RecipesPage.tsx` reste l'écran maître mais étendu :

- Dans la table des composants d'une version, ajouter les colonnes : **Type** (matière/emballage/…), **Qté/u**, **Unité**, **Perte %**, **Obligatoire**, **Qualité sensible**.
- Bouton "Dupliquer en nouvelle version" copie aussi les nouveaux champs.
- Onglet/section "Étapes & contrôles" inchangée (déjà en place).
- Permission de publier une version `active` reste : `admin` | `resp_production` | `bureau_methode` (RPC `set_recipe_status` existe déjà).

## Hub Qualité `/qualite/recettes-nomenclatures`

- Renommer en **"Recettes (Qualité)"**.
- Supprimer l'onglet "Nomenclatures" (devenu redondant) et l'onglet "Articles qualité sensibles" passe en filtre/colonne dans l'onglet Recettes.
- Garder l'onglet "Comparaison" (versions de recette).
- Bandeau d'info : "La nomenclature fait partie de la recette. Pour la modifier, allez dans GPAO → Recettes."

## Sidebar / paramètres

- Le hub `/parametres/qualite` reste mais retire toute mention BOM séparée.
- Aucune nouvelle entrée de menu : tout passe par `/gpao/recettes` (édition) et `/qualite/recettes-nomenclatures` (lecture qualité).

## Audit & notifications

- Audit `recipe_lines.update` capture les bascules `is_quality_sensitive`.
- Notification existante `notifyRecipeApproved` reste — `notifyBomChanged` devient obsolète (déclencheur supprimé).

## Tests

- Mettre à jour `src/test/qualite/rapports.test.ts` : la conso théorique se calcule depuis `recipe_lines`, plus depuis `bom_items`.
- Nouveau test : `get_recipe_for_of(of_id)` retourne bien la version figée à la création de l'OF, même après publication d'une v+1.
- Test UI : la création d'OF refuse de continuer sans version de recette sélectionnée.

## Fichiers impactés

**Migration** : `supabase/migrations/<ts>_merge_recipes_bom.sql` (ALTER + backfill + RPC `get_recipe_for_of` + trigger `bom_id` rétro-compat).

**Modifié** :
- `src/pages/gpao/RecipesPage.tsx` — nouvelles colonnes BOM dans le formulaire d'ajout de ligne et dans la table.
- `src/pages/gpao/OfList.tsx` — sélecteur de version de recette obligatoire dans le dialog de création.
- `src/pages/gpao/OfDetail.tsx` — bandeau "Recette suivie : v3 (active)" + bouton "Aligner sur dernière version".
- `src/components/qualite/OfQualityTab.tsx` — nouvelle section "Recette suivie" + composants qualité-sensibles via RPC.
- `src/pages/qualite/QualiteRecettesNomenclatures.tsx` — supprimer onglets Nomenclatures + Articles sensibles autonomes.
- `src/pages/qualite/components/RecipesQualityTab.tsx` — afficher type/QS/perte sur les composants.
- `src/pages/qualite/components/BomCompareTab.tsx` — renommer/refacto en "Comparer versions de recette".
- `src/pages/qualite/QualiteTracabilite.tsx`, `QualiteRapports.tsx`, `components/RapportsHelpers.ts` — lire depuis recipe_lines.
- `src/test/qualite/rapports.test.ts` + nouveaux tests.

**Conservé en lecture seule (legacy)** :
- `src/pages/qualite/components/BomTab.tsx`, `QualitySensitiveItemsTab.tsx`, `BomHelpers.ts` — soit supprimés, soit archivés sous `_legacy/`.

## Hors-scope

- Migration définitive (drop) de `bill_of_materials` : reportée à une PR ultérieure une fois la stabilité validée en prod.
- Comparaison **inter-produits** de recettes.
- Versionnage des étapes indépendant de la version recette.
