import { describe, it, expect } from "vitest";
import {
  computeConformityByGroup,
  countNcBy,
  listOutOfTolerance,
  listOverdueActions,
  countOfsByQualityStatus,
  computeTheoreticalVsReal,
} from "@/pages/qualite/components/RapportsHelpers";

const ofs = [
  { id: "of1", numero: "OF-1", product_id: "p1", line_id: "l1", bom_id: "b1", quantite_produite: 10, quality_status: "libere" },
  { id: "of2", numero: "OF-2", product_id: "p1", line_id: "l2", bom_id: null, quantite_produite: 5, quality_status: "bloque" },
  { id: "of3", numero: "OF-3", product_id: "p2", line_id: "l1", bom_id: "b1", quantite_produite: null, quality_status: null },
];

describe("RapportsHelpers", () => {
  it("computes conformity by product", () => {
    const checks = [
      { id: "c1", of_id: "of1", is_conform: true },
      { id: "c2", of_id: "of1", is_conform: false },
      { id: "c3", of_id: "of2", is_conform: true },
      { id: "c4", of_id: "of3", is_conform: null }, // ignored
    ];
    const r = computeConformityByGroup(checks, ofs as any, "product_id");
    const p1 = r.find((x) => x.group_id === "p1")!;
    expect(p1.total).toBe(3);
    expect(p1.conform).toBe(2);
    expect(p1.rate).toBeCloseTo(2 / 3);
  });

  it("counts NC by type and severity", () => {
    const ncs = [
      { id: "1", nc_type: "produit", severity: "high", status: "open" },
      { id: "2", nc_type: "produit", severity: "low", status: "open" },
      { id: "3", nc_type: "process", severity: "high", status: "closed" },
    ];
    expect(countNcBy(ncs, "nc_type")).toEqual([
      { key: "produit", count: 2 },
      { key: "process", count: 1 },
    ]);
    const sev = countNcBy(ncs, "severity");
    expect(sev.find((x) => x.key === "high")!.count).toBe(2);
  });

  it("lists out-of-tolerance checks only", () => {
    expect(listOutOfTolerance([
      { id: "a", of_id: "of1", is_conform: true },
      { id: "b", of_id: "of1", is_conform: false },
      { id: "c", of_id: "of1", is_conform: null },
    ])).toHaveLength(1);
  });

  it("flags only overdue, non-final actions", () => {
    const today = "2026-04-29";
    const list = listOverdueActions([
      { id: "1", status: "open", due_date: "2026-04-28", responsible_user_id: "u1" }, // overdue
      { id: "2", status: "done", due_date: "2026-04-28", responsible_user_id: "u1" }, // final
      { id: "3", status: "open", due_date: "2026-05-01", responsible_user_id: "u1" }, // future
      { id: "4", status: "in_progress", due_date: null, responsible_user_id: "u1" },  // no date
    ], today);
    expect(list.map((a) => a.id)).toEqual(["1"]);
  });

  it("counts OFs by quality status", () => {
    const r = countOfsByQualityStatus(ofs as any);
    const lib = r.find((x) => x.key === "libere")!;
    expect(lib.count).toBe(1);
  });

  it("computes theoretical vs real consumption (only OFs with bom_id)", () => {
    const items = [
      { bom_id: "b1", article_id: "a1", quantity_per_unit: 2 },
      { bom_id: "b1", article_id: "a2", quantity_per_unit: 0.5 },
    ];
    const cons = [
      { of_id: "of1", article_id: "a1", quantite: 22 }, // theo 20 → gap +2
      { of_id: "of1", article_id: "a2", quantite: 4 },  // theo 5  → gap -1
      { of_id: "of2", article_id: "a1", quantite: 100 }, // ignored, no bom
    ];
    const r = computeTheoreticalVsReal(ofs as any, items, cons);
    expect(r).toHaveLength(2 + 2); // of1 (2 items) + of3 (2 items, produced=0)
    const a1 = r.find((x) => x.of_id === "of1" && x.article_id === "a1")!;
    expect(a1.theoretical).toBe(20);
    expect(a1.real).toBe(22);
    expect(a1.gap).toBe(2);
    expect(a1.gap_pct).toBeCloseTo(0.1);
    const a2of3 = r.find((x) => x.of_id === "of3" && x.article_id === "a2")!;
    expect(a2of3.theoretical).toBe(0);
    expect(a2of3.gap_pct).toBeNull();
  });
});
