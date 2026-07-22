# Intégration complète des rôles (système + personnalisés) dans la sécurité

## Constat

Deux problèmes distincts se cumulent :

### 1. Rôles système incomplets
Trois rôles déclarés dans `RolesMatrix`/DB mais absents ailleurs :
- `agreeur`, `responsable_inventaire`, `agent_inventaire` — manquent dans `ROLES` (ruleCatalog), `AppRole` (AuthContext, seul `agreeur`), `ROLE_LABELS` (UsersAdmin), `SYSTEM_ROLE_LABELS` (RolesTab).

### 2. Rôles personnalisés non pris en compte
La table `custom_roles` existe (créable via `RolesTab`), mais aucun consommateur ne les intègre :
- `RolesMatrix.tsx` : liste `ROLES` figée en dur → un rôle custom n'apparaît jamais dans la matrice modules × actions.
- `UsersAdmin.tsx` : dialogue d'attribution basé sur `ROLE_LABELS` figé → impossible d'assigner un rôle custom à un utilisateur.
- `ReceptionPermissionsTab`, `QualityPermissionsTab`, `AuditControlTab` : listes de rôles figées.
- `ruleCatalog.ROLES` : utilisé par les éditeurs de règles (validation/notification).

## Modifications

### A. Ajouts rôles système manquants (rapide)

1. `src/lib/ruleCatalog.ts` — ajouter à `ROLES` : `agreeur`, `responsable_inventaire`, `agent_inventaire`.
2. `src/contexts/AuthContext.tsx` — ajouter `"agreeur"` au type `AppRole`.
3. `src/pages/parametres/UsersAdmin.tsx` — ajouter les 3 libellés dans `ROLE_LABELS`.
4. `src/pages/parametres/access-control/RolesTab.tsx` — ajouter les 3 libellés dans `SYSTEM_ROLE_LABELS`.

### B. Intégration des rôles personnalisés

5. **Hook central `useAllRoles`** (nouveau, `src/hooks/useAllRoles.ts`) qui retourne :
   - Rôles système (issus de `ROLES` de `ruleCatalog`) avec libellé et flag `isCustom: false`.
   - Rôles personnalisés actifs (issus de `custom_roles` via `useCustomRoles`), avec `label`, `color`, `inherits_from`, `isCustom: true`.
   - Un dictionnaire `labelsMap` pour remplacer les `ROLE_LABELS` locaux.

6. **`RolesMatrix.tsx`** :
   - Fusionner la liste `ROLES` interne avec les rôles custom (groupe "Personnalisés").
   - Pour un rôle custom sans lignes en DB : générer les presets à partir de `ROLE_DEFAULTS[inherits_from]` (fallback : `NONE`), pour affichage immédiat éditable.
   - La sauvegarde upsert dans `role_permissions` fonctionne déjà par rôle+module → aucun changement backend.

7. **`UsersAdmin.tsx`** :
   - Remplacer `ROLE_LABELS` par le map issu de `useAllRoles`.
   - La liste de sélection dans le dialogue "Attribuer un rôle" affiche système + custom (avec pastille couleur pour les custom).

8. **`ReceptionPermissionsTab.tsx`, `QualityPermissionsTab.tsx`, `AuditControlTab.tsx`** :
   - Remplacer les listes locales par la liste unifiée de `useAllRoles`.

9. **`ruleCatalog.ts`** :
   - Garder `ROLES` (constante système utilisée par le typage), mais exposer un helper `getAllRoleKeys()` (lecture DB) pour les composants dynamiques qui doivent inclure les customs (éditeurs de règles). Alternative si trop invasif : n'exposer les customs que dans l'UI, pas dans le catalogue de règles — à trancher.

## Question de scope

Souhaitez-vous que les rôles personnalisés soient aussi utilisables dans :
- (a) uniquement la matrice + attribution utilisateur (scope minimum, ~4 fichiers touchés) ?
- (b) toutes les surfaces incluant règles de validation / notification / permissions Qualité/Réception/Audit (scope complet, ~8 fichiers) ?

Sans réponse, je pars sur **(b)** pour être cohérent avec la demande "tous les systèmes de sécurité et gestion d'accès".

## Hors périmètre
- Pas de modification du schéma DB : `custom_roles`, `role_permissions`, enum `app_role` restent inchangés (les rôles custom sont stockés en `text`, pas dans l'enum).
- Pas de mécanisme d'héritage runtime : `usePermissions` fonctionne déjà via `role_permissions` en DB. L'héritage `inherits_from` sert uniquement à pré-remplir les presets initiaux dans la matrice.
