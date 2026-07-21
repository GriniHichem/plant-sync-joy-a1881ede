
# Client Supabase à URL dynamique (self-hosting)

Objectif : rendre l’URL de l’API Supabase et la clé anon résolubles **au runtime** côté navigateur, pour que la même image applicative fonctionne :
- en LAN via `http://192.168.9.222:8081` (Nginx local),
- en public via `https://prodintime.conserverieamour.com` (tunnel Cloudflare),
- et en dev/preview Lovable Cloud (comportement inchangé).

Aucun changement de logique métier, aucun changement de schéma. Frontend et fichiers d’infra uniquement.

## Ordre de résolution de l’URL/clé (priorité décroissante)

1. `window.__RUNTIME_CONFIG__.SUPABASE_URL` / `SUPABASE_ANON_KEY` — injecté par un fichier `/config.js` servi par Nginx (modifiable sans rebuild).
2. `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — build-time (utilisé par le preview Lovable).
3. Fallback : `window.location.origin` pour l’URL (Nginx proxifie `/rest/v1`, `/auth/v1`, `/storage/v1`, `/realtime/v1`). Si aucune clé anon n’est trouvée, on log une erreur claire au boot au lieu d’un `Failed to fetch` opaque.

Le Realtime (WebSocket) utilise la même base : `supabase-js` dérive automatiquement `ws(s)://` depuis l’URL fournie, donc pas de config séparée à faire — on évite ainsi tout Mixed Content.

## Changements fichiers

1. **`src/integrations/supabase/client.ts`** (exception faite à la règle « auto-généré » car self-hosting explicitement demandé) :
   - Résolveur `resolveSupabaseConfig()` appliquant l’ordre ci-dessus.
   - `createClient(url, key, { auth: { storage: localStorage, persistSession: true, autoRefreshToken: true, storageKey: 'sb-prodintime-auth' }, global: { headers: { 'X-Client-Info': 'prodintime-web' } }, realtime: { params: { eventsPerSecond: 10 } } })`.
   - Export additionnel `SUPABASE_BASE_URL` (utile pour storage.getPublicUrl côté proxy).
   - Guard : si `url` finit par se résoudre à `window.location.origin` mais qu’on est en dev Vite (`import.meta.env.DEV`), on garde le comportement env pour ne pas casser le preview.

2. **`index.html`** :
   - Ajout d’un `<script src="/config.js"></script>` **avant** le bundle app, non-bloquant sur 404 (Lovable Cloud n’a pas ce fichier, l’absence retombe sur l’env var).

3. **`public/config.example.js`** (nouveau, documentation) :
   ```js
   window.__RUNTIME_CONFIG__ = {
     SUPABASE_URL: "", // vide => même origine (proxy Nginx)
     SUPABASE_ANON_KEY: "<anon key du serveur self-host>"
   };
   ```
   Le fichier réel `/config.js` est déposé côté serveur (hors repo) et servi par Nginx.

4. **`docs/self-hosting-nginx.md`** (nouveau) : extrait Nginx type avec `location /rest/`, `/auth/`, `/storage/`, `/realtime/` (upgrade WebSocket) proxifiés vers le Supabase local, plus la note Cloudflare (WebSocket activé, `no-cache` sur `/config.js`).

## Sécurité & garde-fous

- Aucune clé service_role dans le client (inchangé).
- Headers `Authorization` gérés par `supabase-js` uniquement — on ne les surcharge pas.
- Si `SUPABASE_ANON_KEY` est manquante au boot, on affiche un toast bloquant + `console.error` explicite ("Configuration Supabase absente — vérifier /config.js").
- Le `storageKey` est fixé (`sb-prodintime-auth`) pour que le fallback dynamique ne change pas la clé localStorage entre déploiements et évite les déconnexions silencieuses.

## Impact

- Preview Lovable : identique (les env vars gagnent avant le fallback origin).
- LAN et public self-host : plus besoin de rebuilder pour changer d’URL, un `/config.js` suffit.
- Bascule Cloudflare ⇄ LAN : plus de Mixed Content car tout est relatif à l’origine visitée.

## Détails techniques

```ts
// resolveSupabaseConfig (extrait)
const runtime = (globalThis as any).__RUNTIME_CONFIG__ ?? {};
const url =
  runtime.SUPABASE_URL?.trim() ||
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');
const anon =
  runtime.SUPABASE_ANON_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
```

Est-ce que je pars sur ce plan tel quel, ou tu veux aussi que j’ajoute un petit écran de diagnostic `/parametres/diagnostic-reseau` qui affiche l’URL résolue + ping `/rest/v1/` pour t’aider à déboguer les bascules réseau ?
