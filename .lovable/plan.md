

## Plan: Suppression de Produits et Articles (si jamais utilisés)

### Principe
Ajouter un bouton "Supprimer" sur les pages de détail Produit et Article. Avant suppression, vérifier que l'entité n'a jamais été utilisée dans aucune table liée. Si elle est utilisée, bloquer et afficher un message explicatif.

### Vérifications de dépendances

**Produit** — bloquer si trouvé dans :
- `recipes` (product_id)
- `ordres_fabrication` (product_id)
- `line_products` (product_id)

**Article** — bloquer si trouvé dans :
- `recipe_lines` (article_id)
- `consumptions` (article_id)

### Fichiers modifiés

1. **`src/pages/gpao/ProductDetail.tsx`**
   - Ajouter un bouton "Supprimer" (icône Trash2, rouge) dans le header, visible si `canDelete("produits")`
   - Au clic, vérifier en parallèle les 3 tables (`recipes`, `ordres_fabrication`, `line_products`) pour des lignes avec ce `product_id`
   - Si aucune dépendance : afficher un AlertDialog de confirmation, puis `DELETE FROM products WHERE id = ...`
   - Si dépendances trouvées : toast d'erreur listant où le produit est utilisé (ex: "Ce produit est utilisé dans 2 recettes et 1 OF")
   - Après suppression réussie, naviguer vers `/gpao/produits`

2. **`src/pages/gpao/ArticleDetail.tsx`**
   - Même logique avec bouton "Supprimer" si `canDelete("articles")`
   - Vérifier `recipe_lines` (article_id) et `consumptions` (article_id)
   - Même AlertDialog de confirmation et navigation vers `/gpao/articles` après suppression

3. **Imports à ajouter** dans les deux fichiers :
   - `usePermissions` hook
   - `AlertDialog` composants
   - `Trash2` icon de lucide-react

### UX
- Bouton rouge discret dans le header à côté du bouton Sauvegarder
- Dialog de confirmation : "Êtes-vous sûr de vouloir supprimer définitivement ce produit/article ? Cette action est irréversible."
- Message de blocage clair si dépendances détectées (ex: "Impossible de supprimer : utilisé dans 3 recettes, 1 OF")

### Sécurité
- Les RLS existantes couvrent déjà la suppression pour les rôles admin/resp_production/gestionnaire_magasin
- Le contrôle `canDelete()` côté frontend empêche l'affichage du bouton pour les rôles non autorisés

