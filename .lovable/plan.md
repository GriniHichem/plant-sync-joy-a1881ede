## Objectif

Déplacer la matrice d'accès Réception dans le hub **Sécurité, Rôles & Accès** (juste après l'onglet Qualité) et synchroniser sémantiquement les deux niveaux de matrice : la case au niveau **module** = "toutes les cases des sous-modules cochées".

## Comportement attendu (règle métier)

Pour chaque rôle et chaque action (`can_view`, `can_create`, `can_edit`, `can_delete`) :

- **Matrice modules → Matrice Réception** : cocher `reception.can_view` dans la matrice modules coche automatiquement `can_view` sur les 4 sous-modules Réception (`reception_qualitative`, `reception_quantitative`, `reception_global`, `reception_settings`). Idem pour décocher.
- **Matrice Réception → Matrice modules** : la case `reception.<action>` s'affiche cochée uniquement si **tous** les sous-modules ont cette action à `true`. Si un seul sous-module est décoché, la case module apparaît non cochée (état "partiel" visible via un indicateur tri-state discret).
- Les conventions métier existantes (qualitative sans Modifier/Supprimer, pont-bascule sans Créer, etc.) restent des **valeurs par défaut à l'initialisation**, mais l'admin peut les surcharger.

## Changements

### 1. Nouvel onglet dans `AccessControlHub.tsx`
- Ajouter un onglet **"Réception"** (icône `Truck` ou `PackageCheck`) juste après `quality`.
- Nouveau composant `ReceptionPermissionsTab.tsx` sous `src/pages/parametres/access-control/` : réutilise la logique de `ReceptionAccessMatrixDialog` mais en vue plein-écran (sélecteur de rôle + tableau des 4 sous-modules × 4 actions + Enregistrer). Pas de dialog.

### 2. Synchronisation bidirectionnelle
- **Écriture côté `ReceptionPermissionsTab`** : à la sauvegarde, upsert des 4 lignes sous-modules ET recalcul de la ligne module `reception` (chaque action = AND logique des 4 sous-modules) puis upsert dans `role_permissions`.
- **Écriture côté `RolesMatrix`** : intercepter les toggles sur la ligne `reception` — quand admin coche/décoche `reception.<action>`, propager la même valeur aux 4 sous-modules Réception dans l'état local (et upsert lors du Save existant).
- **Affichage côté `RolesMatrix`** : pour la ligne `reception`, calculer `checked = ALL(submodules[action])` et un flag `partial = SOME && !ALL` pour afficher un style intermédiaire (checkbox grisée / point).

### 3. Nettoyage de l'ancien accès
- Retirer le bouton engrenage "Paramètres avancés" ouvrant `ReceptionAccessMatrixDialog` dans `ReceptionPage.tsx` (remplacer par un lien discret "Gérer les accès" vers `/parametres/access-control?tab=reception` pour les admins).
- Conserver le fichier `ReceptionAccessMatrixDialog.tsx` supprimé pour éviter la duplication (la logique migre dans le nouveau tab).

### 4. Support de la deep-link `?tab=`
- `AccessControlHub` : lire `searchParams.get("tab")` à l'init pour ouvrir directement le bon onglet (utile pour le lien depuis la page Réception).

## Détails techniques

- Sous-modules Réception ciblés : `reception_qualitative`, `reception_quantitative`, `reception_global`, `reception_settings` (déjà présents dans `usePermissions.UMBRELLAS`).
- Table : `role_permissions (role, module, can_view, can_create, can_edit, can_delete)` — upsert `onConflict: "role,module"`.
- Pas de migration SQL : la règle est appliquée en TypeScript aux deux points d'écriture. Ainsi le back reste simple et robuste.
- Aucune modification des hooks `usePermissions` : ils continuent de lire directement le sous-module concerné (ex : `can("reception_qualitative","can_create")`).

## Fichiers touchés

- `src/pages/parametres/AccessControlHub.tsx` (nouvel onglet + deep-link)
- `src/pages/parametres/access-control/ReceptionPermissionsTab.tsx` (nouveau)
- `src/pages/parametres/RolesMatrix.tsx` (sync module ↔ sous-modules pour `reception`, affichage tri-state)
- `src/pages/qualite/reception/ReceptionPage.tsx` (retirer bouton engrenage, lien vers le hub)
- `src/pages/qualite/reception/ReceptionAccessMatrixDialog.tsx` (supprimé)
