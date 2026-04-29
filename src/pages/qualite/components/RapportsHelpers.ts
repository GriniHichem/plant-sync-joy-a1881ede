// Pure aggregation helpers for /qualite/rapports.
// Intentionally framework-free so they can be unit tested.

export interface CheckRow {
  id: string;
  of_id: string | null;
  is_conform: boolean | null;
  control_time?: string | null;
  created_at?: string | null;
}

export interface NcRow {
  id: string;
  nc_type: string | null;
  severity: string | null;
  status: string | null;
  created_at?: string | null;
}

export interface ActionRow {
  id: string;
  status: string | null;
  due_date: string | null;
  responsible_user_id: string | null;
}

export interface OfLite {
  id: string;
  numero: string;
  product_id: string | null;
  line_id: string | null;
  bom_id: string | null;
  quantite_produite: number | null;
  quality_status: string | null;
}

export interface BomItem {
  bom_id: string;
  article_id: string;
  quantity_per_unit: number;
}

export interface ConsumptionRow {
  of_id: string | null;
  article_id: string | null;
  quantite: number | null;
}

export interface ConformityByGroup {
  group_id: string;
  total: number;
  conform: number;
  rate: number; // 0..1, computed only over rows where is_conform is not null
}

const safeNum = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function computeConformityByGroup(
  checks: CheckRow[],
  ofs: OfLite[],
  by: "product_id" | "line_id"
): ConformityByGroup[] {
  const ofIndex = new Map(ofs.map((o) => [o.id, o]));
  const acc = new Map<string, { total: number; conform: number }>();
  for (const c of checks) {
    if (c.of_id == null || c.is_conform == null) continue;
    const o = ofIndex.get(c.of_id);
    if (!o) continue;
    const key = (o[by] as string | null) ?? "__none__";
    const cur = acc.get(key) ?? { total: 0, conform: 0 };
    cur.total += 1;
    if (c.is_conform) cur.conform += 1;
    acc.set(key, cur);
  }
  return Array.from(acc.entries())
    .map(([group_id, { total, conform }]) => ({
      group_id,
      total,
      conform,
      rate: total > 0 ? conform / total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function countNcBy<K extends "nc_type" | "severity">(
  rows: NcRow[],
  field: K
): Array<{ key: string; count: number }> {
  const acc = new Map<string, number>();
  for (const r of rows) {
    const k = (r[field] as string | null) ?? "__none__";
    acc.set(k, (acc.get(k) ?? 0) + 1);
  }
  return Array.from(acc.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function listOutOfTolerance(checks: CheckRow[]): CheckRow[] {
  return checks.filter((c) => c.is_conform === false);
}

export function listOverdueActions(actions: ActionRow[], today: string): ActionRow[] {
  const final = new Set(["done", "verified", "closed", "cancelled"]);
  return actions.filter((a) => {
    if (!a.due_date) return false;
    if (final.has((a.status ?? "").toLowerCase())) return false;
    return a.due_date < today;
  });
}

export function countOfsByQualityStatus(ofs: OfLite[]): Array<{ key: string; count: number }> {
  const acc = new Map<string, number>();
  for (const o of ofs) {
    const k = o.quality_status ?? "__none__";
    acc.set(k, (acc.get(k) ?? 0) + 1);
  }
  return Array.from(acc.entries()).map(([key, count]) => ({ key, count }));
}

export interface TheoreticalVsRealRow {
  of_id: string;
  of_numero: string;
  article_id: string;
  theoretical: number;
  real: number;
  gap: number; // real - theoretical
  gap_pct: number | null; // null if theoretical = 0
}

export function computeTheoreticalVsReal(
  ofs: OfLite[],
  bomItems: BomItem[],
  consumptions: ConsumptionRow[]
): TheoreticalVsRealRow[] {
  const itemsByBom = new Map<string, BomItem[]>();
  for (const it of bomItems) {
    const arr = itemsByBom.get(it.bom_id) ?? [];
    arr.push(it);
    itemsByBom.set(it.bom_id, arr);
  }
  const consByOfArticle = new Map<string, number>();
  for (const c of consumptions) {
    if (!c.of_id || !c.article_id) continue;
    const k = `${c.of_id}::${c.article_id}`;
    consByOfArticle.set(k, (consByOfArticle.get(k) ?? 0) + safeNum(c.quantite));
  }
  const out: TheoreticalVsRealRow[] = [];
  for (const o of ofs) {
    if (!o.bom_id) continue;
    const items = itemsByBom.get(o.bom_id);
    if (!items?.length) continue;
    const produced = safeNum(o.quantite_produite);
    for (const it of items) {
      const theoretical = produced * safeNum(it.quantity_per_unit);
      const real = consByOfArticle.get(`${o.id}::${it.article_id}`) ?? 0;
      const gap = real - theoretical;
      out.push({
        of_id: o.id,
        of_numero: o.numero,
        article_id: it.article_id,
        theoretical,
        real,
        gap,
        gap_pct: theoretical > 0 ? gap / theoretical : null,
      });
    }
  }
  return out;
}
