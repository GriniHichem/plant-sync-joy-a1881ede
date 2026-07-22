// Parseur CSV léger (séparateurs ; ou ,, guillemets, BOM UTF-8)
// + utilitaires de mapping intelligent pour l'import Réception.

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const clean = text.replace(/^\uFEFF/, "");
  if (!clean.trim()) return { headers: [], rows: [] };

  // Détection du séparateur sur la première ligne (hors guillemets)
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  const sep = semi >= comma ? ";" : ",";

  const records: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === sep) { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && clean[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.length > 1 || cur[0] !== "") records.push(cur);
        cur = [];
      } else field += c;
    }
  }
  if (field !== "" || cur.length) { cur.push(field); records.push(cur); }

  if (!records.length) return { headers: [], rows: [] };
  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1)
    .filter((r) => r.some((c) => c && c.trim() !== ""))
    .map((r) => {
      const o: CsvRow = {};
      headers.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
      return o;
    });
  return { headers, rows };
}

/** Normalise pour comparaison : minuscules, sans accents, sans séparateurs. */
export function normalize(s: string): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_\-./]/g, "");
}

export type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
};

/** Devine la colonne CSV pour chaque champ système. */
export function autoMap(fields: FieldDef[], headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const normHeaders = headers.map((h) => ({ raw: h, n: normalize(h) }));
  for (const f of fields) {
    const candidates = [f.key, f.label, ...(f.aliases ?? [])].map(normalize);
    // 1) match exact
    let found = normHeaders.find((h) => candidates.includes(h.n));
    // 2) inclusion
    if (!found) found = normHeaders.find((h) => candidates.some((c) => c && (h.n.includes(c) || c.includes(h.n))));
    if (found) map[f.key] = found.raw;
  }
  return map;
}

/** Applique le mapping à toutes les lignes CSV pour produire des payloads. */
export function applyMapping(rows: CsvRow[], mapping: Record<string, string>): CsvRow[] {
  return rows.map((r) => {
    const o: CsvRow = {};
    for (const [key, src] of Object.entries(mapping)) {
      if (src) o[key] = r[src] ?? "";
    }
    return o;
  });
}

export type ImportError = { row: number; motif: string; [k: string]: any };
export type ImportReport = {
  total: number;
  success: number;
  failed: number;
  extra?: Record<string, number>;
  errors: ImportError[];
};
