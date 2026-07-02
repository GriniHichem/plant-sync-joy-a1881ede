# Module Qualité — plan de contrôle, saisie en ligne & console responsable

Le module Qualité existe déjà et couvre l'essentiel de la demande. On **améliore l'existant** au lieu de créer `qualite_parametres / qualite_plans_controle / qualite_saisies` en double.

## Correspondance avec l'existant

| Spec demandée | Existant réutilisé |
|---|---|
| `qualite_parametres` | `quality_indicators` (code, name, unit, `indicator_type`, `category`, min/max/target/tolérances) |
| `qualite_plans_controle` | `quality_indicator_assignments` (produit/famille/recette/ligne, `is_required`, `is_blocking`, `frequency_type`) |
| `qualite_saisies` | `quality_checks` (of_id, product_id, indicator_id, valeurs num/texte/bool, `is_conform`, `control_time`, `controlled_by`, commentaire) |
| Conformité backend | **Déjà fait** : trigger `quality_checks_compute_conformity` (BEFORE INSERT/UPDATE) calcule `is_conform` + déviations |
| RLS | Déjà en place sur les 3 tables |

## Écarts à combler

### 1. Base de données (migration)
- Ajouter `frequency_minutes integer` (nullable) sur `quality_indicator_assignments` **et** `quality_indicators` (valeur par défaut du plan, surchargée par l'affectation). Contrôle `> 0`.
- Étendre l'enum `quality_indicator_category` avec `physico_chimique`, `conditionnement`, `organoleptique` (les valeurs actuelles produit_fini/emballage/… restent valides).
- Aucune nouvelle table ; le trigger de conformité reste inchangé (gère déjà numérique min/max, booléen, texte).

### 2. Données de test (via l'outil d'insertion, pas migration)
Seed idempotent (`ON CONFLICT (code)`) des indicateurs standards conserverie, chacun avec catégorie, unité, type et fréchéance conseillée :
- `BRIX` Degré Brix (%, numérique, physico_chimique)
- `PH` pH (pH, numérique, physico_chimique)
- `BOSTWICK` Viscosité Bostwick (cm/30s, numérique, physico_chimique)
- `PDS_NET` Poids net (g, numérique, conditionnement)
- `ESP_TETE` Espace de tête (mm, numérique, conditionnement)
- `VIDE` Vide intérieur (cmHg, numérique, conditionnement)
- `CROISURE` Croisure du serti (%, numérique, conditionnement)
- `CROCHET_CORPS` Longueur crochet corps (mm, numérique, conditionnement)

### 3. Interfaces (React / shadcn, thème industriel existant)

**A. Plan de contrôle par produit (Admin)** — enrichir `QualityIndicatorAssignments.tsx`
- Ajouter le champ **Fréquence (minutes)** au formulaire et à la colonne du tableau, à côté de `frequency_type`.
- Cible/Min/Max restent gérés sur l'indicateur ; l'affectation garde requis/bloquant + fréquence.

**B. Saisie en ligne pilotée par l'OF (Opérateur / Qualiticien)** — nouvel écran calqué sur le shift Production
- Sélection d'un **OF** → résolution du produit → chargement de **tous les contrôles obligatoires** applicables (résolution de portée recette > produit > famille > ligne).
- Pour chaque contrôle : affichage de la **cible / min / max**, de la **fréquence (min)**, et d'un **indicateur d'échéance** (dernière saisie sur cet OF → « à saisir maintenant / dans N min / en retard ») calculé à partir de `quality_checks.control_time`.
- Saisie de la valeur avec **verdict instantané Conforme (vert) / Non conforme (rouge)** en frontend, confirmé par le trigger au submit.
- Trace automatique : `controlled_by = auth.uid()`, `control_time = now()`, plus `of_id`, `product_id`, contexte shift auto-rempli comme dans le kiosque actuel.

**C. Console Responsable Contrôle (Supervision)** — nouvel écran
- Vue de pilotage pour le responsable : OF en cours, contrôles **dus / en retard** par OF et par ligne, **taux de conformité**, dernières **non-conformités**, et activité par contrôleur (qui a saisi quoi / quand).
- Tableau de traçabilité filtrable par **OF, produit, date**, lignes **Non conformes surlignées** (complète/renforce `QualiteTracabilite.tsx` existant).

## Détails techniques
- Réutilise `usePermissions` (module `qualite_*`), `logAudit`, `ResponsiveDialog`, tables shadcn, `parseDecimal` (virgule/point).
- La résolution des contrôles applicables suit `scopeOf()` déjà présent dans `QualityIndicatorAssignments.tsx`.
- Les échéances sont calculées côté client à partir des saisies existantes ; pas de job serveur nécessaire.
- Types Supabase régénérés après la migration avant d'écrire le code qui dépend de `frequency_minutes`.

## Hors périmètre
- Pas de suppression du module NC / actions / shifts qualité existant.
- Pas de nouvelles tables `qualite_*`.
