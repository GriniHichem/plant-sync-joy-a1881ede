# Extension du module d'importation — Produits finis & Articles de consommation

Ajouter deux entités au module d'importation existant (`/parametres/import`), avec la **même logique** que machines/équipements/organes/PDR : template CSV téléchargeable (UTF-8, séparateur `;`), mapping, aperçu, option de mise à jour des doublons, création automatique des familles/sous-familles manquantes, rapport détaillé et journalisation d'audit.

## Entités ajoutées

Deux nouveaux onglets dans le module (qui passera de 4 à 6 onglets) :
- **Produits finis** (`products`)
- **Articles de consommation** (`articles`)

Les deux partagent la table `product_families` (familles + sous-familles via `parent_id`), créées automatiquement si absentes — comme pour les machines/PDR.

## Templates (colonnes des modèles CSV)

- **Produits finis** : `code*`, `designation*`, `famille`, `sous_famille`, `unite` (défaut g), `unite_base` (défaut g), `poids_unitaire`, `description`, `code_erp`
- **Articles de consommation** : `code*`, `designation*`, `famille`, `sous_famille`, `unite` (défaut g), `stock_actuel`, `stock_min`, `prix_unitaire`, `fournisseur`, `description`, `code_erp`

Champs vides → valeur par défaut de la table. Doublon détecté sur `code`.

## Implémentation technique

### Backend (migration)
- **`import_resolve_prodfamily(_fam, _sub)`** : résout/crée la famille puis la sous-famille dans `product_families` (mêmes audit_logs que les helpers existants).
- **`import_products(_rows jsonb, _update_existing boolean)`** et **`import_articles(_rows jsonb, _update_existing boolean)`** : `SECURITY DEFINER`, contrôle `has_role(auth.uid(),'admin')`, boucle par ligne avec gestion d'erreur, insert/update/skip selon l'option, audit (`module = 'gpao'`), retour `{ created, updated, skipped, errors:[] }`.
- `GRANT EXECUTE` aux `authenticated` pour les deux fonctions.

### Frontend
- **`src/lib/importTemplates.ts`** : ajouter les entrées `products` et `articles` dans `IMPORT_TEMPLATES` (clés, labels, requis, types, défauts/exemples).
- **`src/pages/parametres/ImportData.tsx`** : ajouter `"products"` et `"articles"` à la liste `ENTITIES` (grille d'onglets adaptée à 6 éléments).
- Aucun changement nécessaire dans `EntityImporter.tsx` (générique, piloté par le template).

### Tests
- Étendre `src/test/parametres/import-templates.test.ts` pour couvrir les 6 entités (présence, clé unique, champs requis, génération de modèle).

## Notes
- Aucune table existante modifiée structurellement ; uniquement de nouvelles fonctions RPC.
- Comportement identique au module déjà livré (UTF-8, doublons au choix, familles auto).
