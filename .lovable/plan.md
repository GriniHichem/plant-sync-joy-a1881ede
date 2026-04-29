# Ajout des rôles qualité (additif)

## Contexte

L'enum `app_role` contient déjà : `admin, resp_maintenance, maintenancier, resp_production, chef_ligne, operateur, gestionnaire_magasin, bureau_methode, responsable_si, auditeur, controleur_qualite`.

Il manque deux valeurs demandées : `responsable_controle_qualite` et `directeur_qualite`. De plus, plusieurs rôles existants (responsable_si, auditeur, controleur_qualite) ne sont **pas affichés** dans la matrice des rôles (`/parametres/roles`) ni étiquetés dans la liste des utilisateurs (`/parametres/users`). Le plan corrige les deux points sans toucher aux permissions existantes.

## Étapes

### 1. Migration SQL (additive uniquement)

- `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'responsable_controle_qualite';`
- `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_qualite';`
- **Aucun INSERT** dans `role_permissions` pour ces nouveaux rôles → ils démarrent sans aucun droit (à configurer ensuite via la matrice).
- **Aucune modification** des lignes `role_permissions` existantes pour les autres rôles.

### 2. Type TS dans `src/contexts/AuthContext.tsx`

Étendre `AppRole` avec `| "responsable_controle_qualite" | "directeur_qualite"`. Le fichier `src/integrations/supabase/types.ts` est régénéré automatiquement.

### 3. `src/pages/parametres/RolesMatrix.tsx`

Ajouter au tableau `ROLES` les **5 rôles manquants** (3 déjà en base + 2 nouveaux) avec libellés et couleurs :

- `responsable_si` → "Responsable SI"
- `auditeur` → "Auditeur"
- `controleur_qualite` → "Contrôleur Qualité"
- `responsable_controle_qualite` → "Resp. Contrôle Qualité"
- `directeur_qualite` → "Directeur Qualité"

Étendre `AppRoleType` en conséquence. Aucun changement de logique (la matrice affiche les permissions actuelles : zéro pour les nouveaux, conservées pour les anciens).

### 4. `src/pages/parametres/UsersAdmin.tsx`

Compléter `ROLE_LABELS` avec les 5 mêmes entrées pour un affichage propre des badges et de la liste de sélection (le `Select` utilise déjà `Constants.public.Enums.app_role` qui inclura automatiquement les nouvelles valeurs après régénération des types).

### 5. Catalogue de règles `src/lib/ruleCatalog.ts`

Ajouter les 2 nouveaux rôles (et compléter ceux manquants : controleur_qualite) à la liste `ROLES` utilisée par les éditeurs de règles de notification/validation, pour qu'on puisse les cibler.

### 6. Tests Vitest

Nouveau `src/test/parametres/roles-quality-additive.test.ts` :

- Vérifie que les 5 rôles cibles figurent dans la liste `ROLES` de `RolesMatrix`.
- Vérifie que `ROLE_LABELS` de `UsersAdmin` contient des libellés non vides pour les 5 rôles.
- Vérifie qu'aucune permission par défaut n'est attribuée aux 3 rôles qualité dans la migration (regex sur le SQL).

Les tests existants (GMAO, GPAO, OF, Shift, Tickets, PDR, Notifications, Audit, RBAC) ne sont pas modifiés et doivent continuer à passer puisque rien n'est retiré.

## Sécurité / RLS

- Les politiques RLS s'appuient sur `has_role(uid, 'role')`. Ajouter une valeur d'enum sans politique associée ne donne **aucun droit** : un utilisateur avec uniquement `directeur_qualite` ne peut accéder à rien tant que la matrice n'est pas configurée. C'est conforme à la demande "ne pas donner de droits qualité automatiquement aux autres rôles".
- Les fonctions `has_audit_access`, `can_manage_notification_rule`, `can_manage_validation_rule` ne sont pas modifiées → comportement inchangé pour les rôles existants.

## Validation manuelle après build

1. `/parametres/users` : créer un utilisateur, attribuer chacun des 3 nouveaux rôles, vérifier que le badge affiche le libellé propre.
2. `/parametres/roles` : déplier les 5 rôles ajoutés, cocher quelques permissions sur `directeur_qualite`, sauvegarder, recharger → persistance OK.
3. Smoke check des modules existants : GMAO Dashboard, GPAO Dashboard, OfList, ShiftScreen, TicketsList, PdrList, NotificationsPage, AuditPage chargent sans erreur avec un compte admin.

## Fichiers touchés

- `supabase/migrations/<timestamp>_add_quality_roles.sql` (nouveau)
- `src/contexts/AuthContext.tsx`
- `src/pages/parametres/RolesMatrix.tsx`
- `src/pages/parametres/UsersAdmin.tsx`
- `src/lib/ruleCatalog.ts`
- `src/test/parametres/roles-quality-additive.test.ts` (nouveau)
