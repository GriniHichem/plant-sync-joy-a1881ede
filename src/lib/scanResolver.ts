/**
 * Résolution d'un code scanné (QR / code-barres) vers une entité métier.
 *
 * Logique:
 *  - Normalise localement (trim, retire BOM/zéros invisibles, slice URL si nécessaire).
 *  - Reconnaît plusieurs formats: URL absolue de l'app, chemin `/pdr/<uuid>`,
 *    UUID brut, code ERP/QR/barres/référence.
 *  - Appelle le RPC `resolve_scanned_code` qui gère exact + préfixe + accents/séparateurs.
 *  - Filtre côté client par `allowedTypes`, dédupe et trie par qualité (url > uuid > exact > prefix).
 */
import { supabase } from "@/integrations/supabase/client";

export type ScannableEntityType = "pdr" | "machine" | "organe" | "equipement";
export type MatchQuality = "url" | "uuid" | "exact" | "prefix";

export interface ResolvedScan {
  entity_type: ScannableEntityType;
  entity_id: string;
  code: string | null;
  label: string | null;
  matched_field: string | null;
  match_quality: MatchQuality | null;
  url: string | null;
}

const ROUTE_TO_TYPE: Record<string, ScannableEntityType> = {
  pdr: "pdr",
  machines: "machine",
  equipements: "equipement",
  organes: "organe",
};

/** Nettoie le payload brut d'un scan: retire BOM/invisibles, espaces, et extrait
 *  le pathname si le payload est une URL absolue. */
export function normalizeScanInput(raw: string): string {
  if (!raw) return "";
  // Retire BOM, zero-width, espaces de contrôle.
  let s = raw.replace(/[\u200B-\u200F\uFEFF\u00A0]/g, "").trim();
  // Si c'est une URL absolue, on garde uniquement path + search (utile pour scan de
  // QR généré par l'app: https://app.example.com/pdr/<uuid>).
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      s = (u.pathname + u.search).trim();
    }
  } catch {
    // ignore parse error, garde la chaîne d'origine
  }
  return s;
}

const QUALITY_ORDER: Record<MatchQuality, number> = { url: 0, uuid: 1, exact: 2, prefix: 3 };

export async function resolveScannedCode(
  raw: string,
  allowedTypes?: ScannableEntityType[],
): Promise<ResolvedScan[]> {
  const code = normalizeScanInput(raw);
  if (!code) return [];

  const { data, error } = await supabase.rpc("resolve_scanned_code" as any, {
    p_code: code,
  });
  if (error) throw new Error(`Scan: ${error.message}`);

  let rows = ((data ?? []) as ResolvedScan[]).filter(Boolean);

  if (allowedTypes?.length) {
    rows = rows.filter((r) => allowedTypes.includes(r.entity_type));
  }

  // Dédupe par (type,id) en gardant la meilleure qualité.
  const dedup = new Map<string, ResolvedScan>();
  for (const r of rows) {
    const key = `${r.entity_type}:${r.entity_id}`;
    const prev = dedup.get(key);
    if (!prev) {
      dedup.set(key, r);
      continue;
    }
    const a = QUALITY_ORDER[(r.match_quality ?? "prefix") as MatchQuality] ?? 9;
    const b = QUALITY_ORDER[(prev.match_quality ?? "prefix") as MatchQuality] ?? 9;
    if (a < b) dedup.set(key, r);
  }

  return Array.from(dedup.values()).sort((a, b) => {
    const qa = QUALITY_ORDER[(a.match_quality ?? "prefix") as MatchQuality] ?? 9;
    const qb = QUALITY_ORDER[(b.match_quality ?? "prefix") as MatchQuality] ?? 9;
    if (qa !== qb) return qa - qb;
    return (a.code ?? "").localeCompare(b.code ?? "");
  });
}

/** Détermine s'il faut considérer le résultat comme "auto-sélectionnable":
 *  un seul résultat ET qualité forte (url, uuid ou exact). */
export function isAutoSelectable(rows: ResolvedScan[]): boolean {
  if (rows.length !== 1) return false;
  const q = rows[0].match_quality ?? "prefix";
  return q === "url" || q === "uuid" || q === "exact";
}
