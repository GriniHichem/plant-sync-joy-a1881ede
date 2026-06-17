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
historiques ne peuvent pas être réécrits sur la plateforme, un script génère une 
copie propre au moment du déploiement.

## Procédure

```bash
# 1. Préparer les migrations propres (sans données de test)
# Option A : Génère les fichiers dans dist/supabase/migrations
./scripts/prepare-production-db.sh

# Option B : Remplace directement vos migrations locales (recommandé si git propre)
./scripts/prepare-production-db.sh --replace-local

# 2. Sur votre serveur, projet Supabase lié :
# (Assurez-vous que le dossier supabase/migrations contient la version générée)
supabase db push          # applique UNIQUEMENT le schéma -> base vierge
```

Ne lancez **jamais** `supabase db reset` en production : c'est la seule commande
qui exécute `seed.sql`.

Le script ajoute aussi une migration finale `99999999999999_self_host_hardening.sql`
qui applique les `GRANT` Data API manquants sur toutes les tables publiques, sans
créer de données métier. Les règles RLS restent l'autorité de sécurité.

## Cron / fonctions backend

Les jobs planifiés sont rendus **non bloquants** pour une base vierge : si
`pg_cron` ou `pg_net` ne sont pas disponibles, la migration continue et affiche
un `NOTICE`. Aucune URL Lovable/Supabase Cloud n'est conservée.

Pour activer le job quotidien des échéances après déploiement, renseignez dans
`app_settings` l'URL interne de vos fonctions, sans slash final :

```sql
UPDATE public.app_settings
SET value = 'http://kong:8000/functions/v1'
WHERE key = 'edge_functions_base_url';
```

Puis rejouez uniquement la migration de cron ou planifiez le job manuellement si
votre installation utilise un autre routage interne.

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
# Aucun UUID de test ne doit subsister dans les migrations à déployer
grep -RInE "61d5a0dd-40d9-41f5-aa30-3346ab8eec67|a0000001-0000-0000|d1000000-0000-0000" supabase/migrations
# -> ne doit rien retourner si vous avez utilisé --replace-local

# Aucune URL d'environnement Lovable/Supabase Cloud ne doit subsister
grep -RInE "https://[a-z0-9-]+\.supabase\.co|lovable\.app" supabase/migrations
# -> ne doit rien retourner
```
