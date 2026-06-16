# Déploiement auto-hébergé — Base de données vierge

Ce guide explique comment déployer **Prod-in-Time** sur votre propre serveur
Ubuntu avec une instance Supabase locale, en partant d'une base **100% vide**.

## Principe : schéma vs données

| Élément | Contenu | En production |
|---|---|---|
| `supabase/migrations/*.sql` | **Structure uniquement** : tables, RLS, fonctions, triggers + lookups système (statuts, unités, catégories, permissions de rôles) | ✅ À appliquer |
| `supabase/seed.sql` | **Données de test** : faux utilisateurs/rôles, équipes, PDR fictifs, plans préventifs de démo | ❌ À **ignorer** |

> Les "lookup tables" essentielles (unités de mesure, catégories de défauts,
> permissions par rôle, modèles de shift, etc.) restent dans les migrations car
> l'application ne fonctionne pas sans elles. Tout le reste (utilisateurs,
> équipes, lignes, PDR, shifts, OF, pannes) est **vide par défaut**.

## Contrainte plateforme

Sur Lovable, l'historique des migrations déjà appliquées est **immuable**. Deux
migrations historiques contenaient des données de test mélangées au schéma :

- `20260320031539_*.sql` — entièrement des données de test (rôles liés à un UUID
  admin figé, instances PDR, plans préventifs, exécutions de démo) ;
- `20260316183840_*.sql` — un bloc d'insertion des équipes « A/B/C/D ».

Ces données ont été **déplacées vers `supabase/seed.sql`**. Comme les fichiers
historiques ne peuvent pas être réécrits ici, un script génère une copie propre
au moment du déploiement.

## Procédure

```bash
# 1. Générer des migrations propres (schéma seul, sans données de test)
./scripts/prepare-production-db.sh

# 2. Sur votre serveur, projet Supabase lié :
cp -r dist/supabase/migrations supabase/migrations
supabase db push          # applique UNIQUEMENT le schéma -> base vierge
```

Ne lancez **jamais** `supabase db reset` en production : c'est la seule commande
qui exécute `seed.sql`.

## Premier utilisateur administrateur

La base étant vierge, aucun rôle n'est pré-attribué (la sécurité repose
entièrement sur `auth.uid()` + la table `user_roles` via `has_role()`).
Après le premier `sign-up`, attribuez le rôle admin manuellement :

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<UUID-de-votre-compte>', 'admin');
```

## Vérification « usine vide »

```bash
# Aucun UUID de test ne doit subsister dans les migrations de production
grep -RInE "61d5a0dd-40d9-41f5-aa30-3346ab8eec67|a0000001-0000-0000|d1000000-0000-0000" dist/supabase/migrations
# -> ne doit rien retourner
```
