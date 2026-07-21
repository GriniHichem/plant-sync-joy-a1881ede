/**
 * Détection réseau côté client (astuce UX, non sécurisée).
 * Retourne true si l'utilisateur atteint l'app depuis un hostname "public"
 * (typiquement le domaine Cloudflare), false pour un accès LAN / local.
 */
export function isPublicHost(hostname: string = window.location.hostname): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();

  // Localhost & noms locaux
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".lan") || h.endsWith(".internal")) {
    return false;
  }

  // IPv4 privées: 10.x, 127.x, 192.168.x, 172.16-31.x, 169.254.x (link-local)
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a === 10 || a === 127) return false;
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 169 && b === 254) return false;
    return true; // autre IPv4 = public
  }

  // IPv6 loopback / link-local
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) {
    return false;
  }

  // Tout le reste (FQDN public) => public
  return true;
}
