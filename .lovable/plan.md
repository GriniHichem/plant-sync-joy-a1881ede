# Audit Shift auto-hébergé — cause racine & correctif

## Ce que j'ai trouvé (cause racine)

Le menu **Shift** (et plusieurs autres) s'affiche ou non selon `role_permissions` :
`AppSidebar` filtre chaque item par `canView(module)` → `usePermissions()` lit la table
`role_permissions`. Pour le maintenancier, l'item Shift dépend du module `shift_maintenance`.

Sur la base Lovable (qui marche), la ligne `maintenancier | shift_maintenance | can_view = true`
existe bien. **Mais elle n'a JAMAIS été écrite par une migration** : elle a été créée via
l'écran d'administration « Sécurité & Accès ». Le baseline de déploiement
(`generate-baseline.sh`) est `--schema-only` : il ne copie **aucune donnée**, et les
migrations ne « seedent » qu'un sous-ensemble ancien de modules.

Résultat : après votre migration sur serveur auto-hébergé, **25 modules n'ont aucune ligne
de permission**, donc invisibles pour tous les rôles non-admin. Ce n'est pas limité au Shift.

Modules absents de tout seed de migration (confirmé) :

```text
apps, dashboard, general, gpao_dashboard, historique, inventaire_campagnes,
journal, notifications_rules, qualite_actions, qualite_controles,
qualite_dashboard, qualite_nc, qualite_of, qualite_parametres, qualite_rapports,
qualite_recettes, qualite_shift, qualite_tracabilite, recherche, referentiels,
securite, shift_maintenance, shift_production, smtp, validations_rules
```

Base Lovable de référence : **809 lignes, 53 modules, 16 rôles**.
Un déploiement neuf en récupère une fraction → menus cassés (dont Shift maintenance).

## Correctif proposé

Générer **une migration idempotente unique** qui contient **toute la matrice
`role_permissions` de référence** (les 809 lignes, 53 modules × 16 rôles), sous forme :

```sql
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES (...809 lignes...)
ON CONFLICT (role, module) DO UPDATE
  SET can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete;
```

- Sur Lovable : sans effet réel (valeurs déjà présentes) → aucun risque.
- Sur serveur auto-hébergé : crée toutes les lignes manquantes et aligne les valeurs
  → **Shift maintenance et tous les modules réapparaissent** pour les bons rôles.

Cette même liste sera aussi intégrée au **baseline** (`generate-baseline.sh` + le fichier
`supabase/baseline/00000000000000_baseline.sql`) dans une section « données système /
permissions par rôle », car les permissions sont des lookups indispensables au fonctionnement
(comme déjà documenté dans `DEPLOYMENT.md`), afin qu'un déploiement neuf via baseline soit
également complet.

## Vérification post-correctif

1. Compter les lignes : `SELECT count(*) FROM role_permissions;` doit donner le même total
   que la référence (≈809).
2. Contrôle ciblé Shift :
   `SELECT role, can_view FROM role_permissions WHERE module='shift_maintenance';`
   → `maintenancier`, `resp_maintenance`, `admin` à `true`.
3. Contrôle des autres shifts (`shift_production`, `shift_magasin`, `qualite_shift`) et des
   modules critiques (`dashboard`, `securite`, `journal`).
4. Connexion avec un compte maintenancier de test → l'entrée **Shift** est visible dans la
   barre latérale et la page `/maintenance/shift` s'ouvre.

## Détails techniques

- La correction est **100 % données de configuration** (aucune donnée métier / utilisateur),
  donc conforme à la règle « le baseline ne contient pas de données métier ».
- `role_permissions` a déjà `UNIQUE (role, module)` → `ON CONFLICT (role, module)` est fiable.
- La table est déjà `GRANT`-ée à `authenticated`/`anon`/`service_role` et lisible par tout
  utilisateur authentifié (policy existante) → pas de changement RLS nécessaire.
- Point de décision : `DO UPDATE` **écrase** d'éventuelles personnalisations faites côté
  serveur auto-hébergé via l'écran Accès. Comme votre problème est justement l'absence de
  lignes, l'alignement sur la référence est le comportement voulu. Si vous préférez ne
  jamais écraser l'existant, on peut passer à `DO NOTHING` (crée seulement les lignes
  manquantes) — dites-le moi et j'ajuste.
