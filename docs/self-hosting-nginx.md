# Self-hosting — configuration Nginx et runtime

Ce document décrit le déploiement de PROD IN TIME sur un serveur Ubuntu local
avec double accès (LAN + tunnel Cloudflare) et une URL Supabase résolue au
runtime (pas de rebuild pour changer d'URL).

## 1. Principe

Le client Supabase (`src/integrations/supabase/client.ts`) résout son URL et sa
clé anon dans cet ordre :

1. `window.__RUNTIME_CONFIG__` (injecté par `/config.js` servi par Nginx).
2. Variables d'env de build (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
3. Fallback : `window.location.origin` (même origine, via proxy Nginx).

Le Realtime (WebSocket) utilise automatiquement la même base — pas de config
séparée.

## 2. Fichier `/config.js` côté serveur

Créez `/var/www/prodintime/config.js` (hors dépôt Git) :

```js
window.__RUNTIME_CONFIG__ = {
  SUPABASE_URL: "",                 // vide => même origine, via proxy Nginx
  SUPABASE_ANON_KEY: "eyJhbGciOi..." // anon key du Supabase self-hosted
};
```

Un exemple est fourni dans `public/config.example.js`.

## 3. Extrait Nginx

```nginx
server {
  listen 8081;
  server_name 192.168.9.222 prodintime.conserverieamour.com;

  root /var/www/prodintime;
  index index.html;

  # Ne PAS mettre en cache /config.js pour permettre la rotation à chaud
  location = /config.js {
    add_header Cache-Control "no-store" always;
    try_files /config.js =404;
  }

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Proxy vers Supabase self-hosted (Kong ou services directs)
  location /rest/     { proxy_pass http://127.0.0.1:8000; include /etc/nginx/snippets/supabase-proxy.conf; }
  location /auth/     { proxy_pass http://127.0.0.1:8000; include /etc/nginx/snippets/supabase-proxy.conf; }
  location /storage/  { proxy_pass http://127.0.0.1:8000; include /etc/nginx/snippets/supabase-proxy.conf; }
  location /realtime/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
  }
  location /functions/ { proxy_pass http://127.0.0.1:8000; include /etc/nginx/snippets/supabase-proxy.conf; }
}
```

`/etc/nginx/snippets/supabase-proxy.conf` :

```nginx
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

## 4. Cloudflare Tunnel

- Activer WebSocket sur le tunnel (indispensable pour Realtime).
- Régler la règle de cache pour bypass `/config.js` (Cache Rules → Bypass cache).
- Le domaine public sert la même app : `window.location.origin` bascule
  automatiquement entre LAN et public sans rebuild.

## 5. Vérification

Ouvrir la console navigateur, on doit voir :

```
[Supabase] URL=https://prodintime.conserverieamour.com (source=origin)
```

ou en LAN :

```
[Supabase] URL=http://192.168.9.222:8081 (source=origin)
```

Si l'URL est absente ou la clé manque, un `console.error` explicite s'affiche
au boot.
