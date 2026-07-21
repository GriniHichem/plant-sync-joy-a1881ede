// Copiez ce fichier en `/config.js` sur le serveur (dossier servi par Nginx, hors bundle).
// Il permet de changer l'URL Supabase et la clé anon SANS rebuild.
//
// - Laissez SUPABASE_URL vide ("") pour utiliser la même origine que le site
//   (Nginx doit alors proxifier /rest, /auth, /storage, /realtime vers Supabase).
// - Sinon, indiquez une URL absolue (ex: "https://supabase.usine.local").
//
// Ce fichier est chargé AVANT le bundle app via <script src="/config.js"> dans index.html.

window.__RUNTIME_CONFIG__ = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "<remplacer par la clé anon du serveur self-host>"
};
