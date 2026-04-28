/**
 * Parseur de requêtes avancées pour la recherche globale.
 *
 * Opérateurs supportés :
 *   mot1 mot2          → AND (FTS naturel)
 *   "phrase exacte"    → match phrase
 *   -mot               → exclusion
 *   module:tickets     → filtre module unique
 *   module:pdr,machines → filtre multi-modules
 *   statut:ouvert      → filtre statut
 *   crit:A             → filtre criticité
 *   priorité:haute     → filtre priorité
 *   from:2026-01-01    → date min (updated_at)
 *   to:2026-04-30      → date max
 *   auteur:jdupont     → filtre auteur (login/nom)
 *   numero:TKT-00123   → numéro / code exact
 */

export interface ParsedQuery {
  /** Texte FTS (mots libres + phrases) à passer à plainto_tsquery */
  fts: string;
  /** Mots ou phrases exclus (préfixe `-`) — appliqués côté client sur snippet */
  excluded: string[];
  /** Phrases exactes (entre guillemets) */
  phrases: string[];
  /** Modules cibles (vide → tous) */
  modules: string[];
  /** Filtres simples k → v[] (statut, crit, priorité, auteur, numero) */
  filters: Record<string, string[]>;
  /** Bornes de date (ISO YYYY-MM-DD) */
  dateFrom: string | null;
  dateTo: string | null;
  /** Requête brute saisie par l'utilisateur */
  raw: string;
}

const FILTER_KEYS = new Set([
  "module",
  "statut",
  "status",
  "crit",
  "criticite",
  "criticité",
  "priorite",
  "priorité",
  "priority",
  "auteur",
  "author",
  "numero",
  "numéro",
  "from",
  "to",
]);

/** Normalise les clés de filtres FR/EN/sans accent. */
function normaliseKey(k: string): string {
  const lower = k.toLowerCase();
  if (lower === "status") return "statut";
  if (lower === "criticité" || lower === "criticite") return "crit";
  if (lower === "priorité" || lower === "priority") return "priorite";
  if (lower === "author") return "auteur";
  if (lower === "numéro") return "numero";
  return lower;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseSearchQuery(input: string): ParsedQuery {
  const result: ParsedQuery = {
    fts: "",
    excluded: [],
    phrases: [],
    modules: [],
    filters: {},
    dateFrom: null,
    dateTo: null,
    raw: input ?? "",
  };

  if (!input || !input.trim()) return result;

  const ftsTokens: string[] = [];
  // Tokeniser : phrases entre guillemets puis mots
  const tokenRegex = /"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;

  while ((m = tokenRegex.exec(input)) !== null) {
    const phrase = m[1];
    const word = m[2];

    if (phrase !== undefined) {
      const trimmed = phrase.trim();
      if (trimmed) {
        result.phrases.push(trimmed);
        ftsTokens.push(trimmed);
      }
      continue;
    }

    if (!word) continue;

    // Filtre clé:valeur
    const colonIdx = word.indexOf(":");
    if (colonIdx > 0 && colonIdx < word.length - 1) {
      const rawKey = word.slice(0, colonIdx);
      const rawVal = word.slice(colonIdx + 1);
      const key = normaliseKey(rawKey);

      if (FILTER_KEYS.has(rawKey.toLowerCase()) || FILTER_KEYS.has(key)) {
        if (key === "from" && ISO_DATE.test(rawVal)) {
          result.dateFrom = rawVal;
          continue;
        }
        if (key === "to" && ISO_DATE.test(rawVal)) {
          result.dateTo = rawVal;
          continue;
        }
        if (key === "module") {
          result.modules.push(
            ...rawVal
              .split(",")
              .map((v) => v.trim().toLowerCase())
              .filter(Boolean),
          );
          continue;
        }
        const values = rawVal
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        if (values.length > 0) {
          result.filters[key] = [...(result.filters[key] ?? []), ...values];
        }
        continue;
      }
    }

    // Exclusion -mot
    if (word.startsWith("-") && word.length > 1) {
      result.excluded.push(word.slice(1).toLowerCase());
      continue;
    }

    ftsTokens.push(word);
  }

  // Dédoublonner modules
  result.modules = Array.from(new Set(result.modules));

  // Bornes de date inversées → swap
  if (result.dateFrom && result.dateTo && result.dateFrom > result.dateTo) {
    const tmp = result.dateFrom;
    result.dateFrom = result.dateTo;
    result.dateTo = tmp;
  }

  result.fts = ftsTokens.join(" ").trim();
  return result;
}

/** Reconstitue une chaîne lisible (utile pour debug / URL share). */
export function stringifyParsedQuery(p: ParsedQuery): string {
  const parts: string[] = [];
  if (p.fts) parts.push(p.fts);
  for (const ex of p.excluded) parts.push(`-${ex}`);
  if (p.modules.length) parts.push(`module:${p.modules.join(",")}`);
  for (const [k, vs] of Object.entries(p.filters)) {
    parts.push(`${k}:${vs.join(",")}`);
  }
  if (p.dateFrom) parts.push(`from:${p.dateFrom}`);
  if (p.dateTo) parts.push(`to:${p.dateTo}`);
  return parts.join(" ");
}
