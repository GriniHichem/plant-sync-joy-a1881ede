## Problème identifié

Le mode "Voir comme" ne reflète pas fidèlement les permissions de la matrice. Audit du code :

### Bugs trouvés

1. **`usePermissions.ts`** — l'effet ne **réinitialise pas** `permissions` avant de re-fetch quand les rôles changent (start/stop impersonation). Pendant le re-fetch, l'UI affiche les **permissions du rôle précédent** (admin réel) au lieu de celles de la cible.
2. **`usePermissions.ts`** — la dépendance `[roles]` est un *nouveau tableau à chaque render* d'AuthContext (calculé inline depuis `impersonation`), ce qui peut provoquer des re-fetchs en rafale et des états incohérents.
3. **`useInventoryPermissions.ts`** — `roles.includes("admin")` lit les rôles effectifs : OK, mais aucune normalisation : si la cible n'a aucun rôle, `isInventoryOnly` peut devenir `true` à tort selon la logique → vérifier.
4. **Bypass admin disséminés** — plusieurs pages (`TicketDetail`, `PreventifList`, `gpao/OfDetail`, `parametres/*Admin`, `RolesMatrix`, `UsersAdmin`, `qualite/*`) utilisent `hasRole("admin")` au lieu de `canEdit/canView`. C'est cohérent avec l'impersonation (rôles effectifs) mais **ne reflète pas la matrice** : si un admin retire son propre droit `tickets` dans la matrice, il garde quand même tout par bypass — donc impossible de tester correctement « voir comme un admin restreint ».
5. **Aucun test** ne couvre le scénario impersonation × matrice.

### Cause racine du symptôme utilisateur

Combinaison des bugs 1 + 4 : quand l'admin réel passe en "Voir comme operateur", le sidebar/topbar affiche brièvement les anciennes perms admin (bug 1), puis pour les pages déjà ouvertes les actions restent visibles car gates en `hasRole("admin")` (bug 4) — l'effective role contient l'admin du target seulement si la cible est admin.

Attendez — re-vérification : `hasRole("admin")` utilise les rôles effectifs (cible). Donc si la cible n'est pas admin, `hasRole("admin")` retourne `false`. Le bypass ne s'applique pas. Le vrai bug visible utilisateur = **bug 1** (perms stales pendant la transition) + **bug 2** (refetch en boucle qui réinjecte parfois les perms cumulées).

## Plan de correction

### 1. `src/hooks/usePermissions.ts`
- Réinitialiser `permissions` à `[]` et `loading` à `true` **dès** que `roles` change.
- Stabiliser la clé d'effet : utiliser `roles.slice().sort().join("|")` comme dépendance pour éviter les refetchs sur identité de référence.
- Ajouter un flag `cancelled` dans l'effet pour ignorer les réponses obsolètes (race condition switch impersonation rapide).
- Exposer `loading` clair pour que les UIs puissent attendre avant de calculer la visibilité.

### 2. `src/contexts/AuthContext.tsx`
- Mémoïser `effectiveRoles` (`useMemo` sur `[impersonation?.targetRoles, realRoles]`) pour fournir une référence stable, supprimant le refetch en boucle dans `usePermissions`.

### 3. UI : respecter strictement la matrice (bonus, ciblé)
- Sidebar/Topbar/Apps : ne plus court-circuiter par `isAdmin = hasRole("admin")`. Laisser uniquement `canView(module)` décider, en garantissant que la matrice par défaut donne `view=true` à `admin` sur tous les modules (déjà le cas dans `ROLE_DEFAULTS`). Cela rend "Voir comme admin restreint" testable et fidèle.
- Garder un *fallback* : si `loading` → rendre temporaireement le menu vide (squelette) plutôt que tout-visible, pour éviter le flash.

### 4. Banner & Guard
- `ImpersonationBanner` : afficher en plus le **résumé des modules autorisés** (compteur "X modules visibles") pour vérification rapide visuelle.
- `impersonationGuard.ts` : OK actuellement (bloque writes). Ajouter un test unitaire pour confirmer.

### 5. Tests fiables (Vitest, mock supabase)
Créer `src/test/parametres/impersonation-permissions.test.ts` :
- **T1** : real=admin, target=operateur → `canView('utilisateurs')`=false, `canView('dashboard')`=true.
- **T2** : real=admin, target=resp_maintenance → `canView('preventif')`=true, `canEdit('utilisateurs')`=false.
- **T3** : Switch impersonation A→B : permissions de B remplacent celles de A (pas de fuite).
- **T4** : Stop impersonation → permissions reviennent au real (admin → tout).
- **T5** : Race : deux switches rapides → seul le dernier état est appliqué (cancelled flag).
- **T6** : Umbrella `qualite` accordée à la cible → tous les `qualite_*` deviennent visibles, sauf override explicite.
- **T7** : Guard impersonation actif bloque `from().insert()`, `rpc()`, `functions.invoke()` et laisse passer `from().select()`.

### 6. Fichiers modifiés
- `src/hooks/usePermissions.ts` — clear-on-change + cancel + clé stable
- `src/contexts/AuthContext.tsx` — `useMemo` sur `effectiveRoles`
- `src/components/gmao/AppSidebar.tsx` — retirer bypass admin, gérer loading
- `src/components/gmao/AppTopBar.tsx` — idem
- `src/pages/Apps.tsx` — idem
- `src/components/admin/ImpersonationBanner.tsx` — compteur modules visibles
- `src/test/parametres/impersonation-permissions.test.ts` — nouveau (T1–T6)
- `src/test/parametres/impersonation-guard.test.ts` — nouveau (T7)

Aucune migration DB. Aucune dépendance ajoutée.
