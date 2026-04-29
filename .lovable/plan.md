# Plan — Module "Qualité & Traçabilité" (structure de base)

Objectif : ajouter uniquement le squelette navigationnel et les permissions de base. Aucune modification aux tables / workflows GPAO, GMAO, tickets, PDR, audit ou notifications.

## 1. Nouvelles pages (squelette)

Créer le dossier `src/pages/qualite/` avec les pages suivantes — toutes basées sur le pattern `Card` + `KpiCard` existant, en français, thème industriel courant :

- `QualiteDashboard.tsx` → `/qualite`
- `QualiteOf.tsx` → `/qualite/of`
- `QualiteIndicateurs.tsx` → `/qualite/indicateurs`
- `QualiteControles.tsx` → `/qualite/controles`
- `QualiteNonConformites.tsx` → `/qualite/non-conformites`
- `QualiteActions.tsx` → `/qualite/actions`
- `QualiteRecettesNomenclatures.tsx` → `/qualite/recettes-nomenclatures`
- `QualiteTracabilite.tsx` → `/qualite/tracabilite`
- `QualiteRapports.tsx` → `/qualite/rapports`

Chaque page (sauf le dashboard) affiche un en-tête (titre + sous-titre) et une `Card` "Module en préparation" avec un message court et un état vide propre. Aucune requête réseau, aucune table touchée.

### Dashboard `/qualite`

Grille de 6 `KpiCard` provisoires (valeur = 0, sous-titre = "Données provisoires") :

| KPI | Icône lucide |
|---|---|
| OF contrôlés | ClipboardCheck |
| Non-conformités ouvertes | AlertTriangle |
| Contrôles en attente | Hourglass |
| Actions qualité en retard | AlarmClock |
| Lots bloqués | Lock |
| Taux conformité | Percent |

Sous la grille : 2 `Card` raccourcis ("Voir les contrôles", "Voir les non-conformités") qui naviguent vers les sous-routes.

## 2. Routage

Dans `src/App.tsx`, ajouter les 9 imports et 9 `<Route>` à l'intérieur de `<ProtectedRoutes>`, regroupés sous un commentaire `{/* Qualité & Traçabilité */}`. Ordre : dashboard puis les 8 sous-routes. Aucune route existante n'est touchée.

## 3. Menu latéral

Dans `src/components/gmao/AppSidebar.tsx`, ajouter un 3ᵉ groupe `renderGroup("Qualité", IconShield, qualiteItems, isQualiteActive)` placé entre Production et la zone Settings, avec son propre divider.

`qualiteItems` (8 entrées visibles + dashboard) :

- Dashboard `/qualite` (IconChart)
- OF qualité `/qualite/of` (IconOrder)
- Indicateurs `/qualite/indicateurs` (IconAnalytics)
- Contrôles `/qualite/controles` (ClipboardCheck via lucide)
- Non-conformités `/qualite/non-conformites` (AlertTriangle)
- Actions `/qualite/actions` (Wrench)
- Recettes & nomenclatures `/qualite/recettes-nomenclatures` (IconRecipe)
- Traçabilité `/qualite/tracabilite` (IconChart)
- Rapports `/qualite/rapports` (FileText)

Icônes : réutiliser `IndustrialIcons` quand disponible, sinon `lucide-react` (déjà utilisé partout). Aucune icône custom n'est requise pour cette étape.

## 4. Permissions

### Migration SQL (additive uniquement)

Insérer dans `role_permissions` un nouveau module `qualite` avec `can_view = true` pour les rôles existants suivants :

- `admin`
- `resp_production`
- `chef_ligne`
- `bureau_methode`
- `gestionnaire_magasin`

```sql
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES
  ('admin', 'qualite', true, true, true, true),
  ('resp_production', 'qualite', true, false, false, false),
  ('chef_ligne', 'qualite', true, false, false, false),
  ('bureau_methode', 'qualite', true, false, false, false),
  ('gestionnaire_magasin', 'qualite', true, false, false, false)
ON CONFLICT (role, module) DO NOTHING;
```

Aucune table modifiée, aucune RLS touchée. Le hook `usePermissions()` exposera automatiquement `canView('qualite')`.

### Rôles `resp_qualite` / `controleur_qualite`

**Non créés dans cette étape.** L'enum `app_role` est référencé par RLS, par `RolesMatrix`, par `AuthContext`, par `has_role()` et par de nombreuses politiques. Ajouter des valeurs via `ALTER TYPE` exigerait :

- mise à jour des libellés dans `RolesMatrix.tsx`
- mise à jour du type TS `AppRole` dans `AuthContext.tsx`
- décisions sur les RLS pour chaque table sensible

Conformément à la consigne ("Si l'ajout de nouveaux rôles risque de casser l'existant, ne pas les créer"), on prépare seulement le module. Les rôles seront ajoutés dans une itération dédiée.

## 5. Filtre menu par permission

Le groupe "Qualité" dans la sidebar n'est rendu que si `canView('qualite')` est vrai (pattern à appliquer via le hook `usePermissions`). Cohérent avec les autres modules.

## 6. Tests de non-régression

Après implémentation, vérifier :

- `bunx vitest run` passe (tests existants intacts)
- Navigation manuelle : `/`, `/machines`, `/tickets`, `/pdr`, `/preventif`, `/gpao`, `/gpao/of`, `/gpao/of/:id`, `/parametres`, `/qualite` et les 8 sous-routes
- Le menu Maintenance et Production se déploient/replient comme avant
- Connexion / déconnexion / permissions inchangées

Ajouter un nouveau test léger `src/test/qualite/qualite-routes.test.ts` qui vérifie que les 9 chemins sont bien déclarés dans `App.tsx` (lecture statique du fichier).

## Fichiers modifiés / créés

Créés :
- `src/pages/qualite/QualiteDashboard.tsx`
- `src/pages/qualite/QualiteOf.tsx`
- `src/pages/qualite/QualiteIndicateurs.tsx`
- `src/pages/qualite/QualiteControles.tsx`
- `src/pages/qualite/QualiteNonConformites.tsx`
- `src/pages/qualite/QualiteActions.tsx`
- `src/pages/qualite/QualiteRecettesNomenclatures.tsx`
- `src/pages/qualite/QualiteTracabilite.tsx`
- `src/pages/qualite/QualiteRapports.tsx`
- `supabase/migrations/<timestamp>_add_qualite_module_permissions.sql`
- `src/test/qualite/qualite-routes.test.ts`
- `mem://features/qualite-module` (mémoire : module skeleton, pas de tables encore)

Modifiés :
- `src/App.tsx` (ajout routes)
- `src/components/gmao/AppSidebar.tsx` (ajout groupe Qualité)
- `mem://index.md` (ajout référence mémoire)

## Confirmation finale (à fournir dans la réponse après implémentation)

- Routes créées : 9 ✅
- Menu ajouté : groupe Qualité avec 9 entrées ✅
- Permissions : module `qualite` avec 5 rôles autorisés en lecture ✅
- Rôles `resp_qualite` / `controleur_qualite` : reportés (risque enum) ✅
- Tests : non-régression vérifiée ✅
