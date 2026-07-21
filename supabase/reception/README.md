# Migration du module Réception Fruits & Légumes — auto-hébergé

Le module **Réception** (rôle `agent_pont_bascule`, tables `reception_*`,
bucket `reception-photos`, RPC `close_reception_ticket`, vue
`v_reception_global`) est arrivé après le baseline principal. Si votre serveur
a été déployé avant, il faut appliquer **une seule fois** ce script idempotent :

```bash
psql "$DATABASE_URL" -f supabase/reception/reception_module.sql
```

Le script :

- ajoute `agent_pont_bascule` à l'enum `app_role` (idempotent) ;
- crée le bucket `reception-photos` + politiques `storage.objects` ;
- crée toutes les tables/séquences/triggers/RPC/vue **si absents**, et les
  met à jour sinon (DROP POLICY IF EXISTS + CREATE POLICY, CREATE OR REPLACE) ;
- pose les `GRANT` Data API pour `authenticated` et `service_role` ;
- insère les entrées `role_permissions` pour que le menu **Réception**
  s'affiche automatiquement chez les rôles qualité + pont-bascule.

Aucune donnée métier n'est insérée. Rejouable sans effet de bord.

## Vérification rapide après exécution

```sql
-- 1) Le rôle est bien dans l'enum ?
SELECT 'agent_pont_bascule'::public.app_role;

-- 2) Les tables et la vue existent ?
SELECT table_name FROM information_schema.tables
 WHERE table_schema='public' AND table_name LIKE 'reception\_%' ESCAPE '\'
 ORDER BY 1;
SELECT to_regclass('public.v_reception_global');

-- 3) Le bucket est présent ?
SELECT id FROM storage.buckets WHERE id='reception-photos';

-- 4) Le menu est activé pour votre rôle ?
SELECT role, can_view FROM public.role_permissions WHERE module='reception';
```

## Régénérer le baseline avec le module intégré

Le module est déjà couvert par les migrations Lovable ; si vous régénérez le
baseline via `scripts/generate-baseline.sh`, il sera automatiquement inclus
dans `supabase/baseline/00000000000000_baseline.sql`.
