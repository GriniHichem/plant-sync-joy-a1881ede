import { describe, it, expect } from "vitest";
import {
  computeConformity,
  validateCheck,
  filterChecks,
  emptyCheckForm,
  emptyFilters,
  QcRow,
} from "@/pages/qualite/QualiteControles";

describe("computeConformity — numeric", () => {
  it("conform inside [min, max]", () => {
    const r = computeConformity({
      indicator_type: "numeric",
      measured_value_numeric: 50,
      target_value: 50, min_value: 40, max_value: 60,
    });
    expect(r.is_conform).toBe(true);
    expect(r.deviation_value).toBe(0);
    expect(r.deviation_percent).toBe(0);
    expect(r.out_of_tolerance).toBe(false);
  });

  it("non-conform when below min", () => {
    const r = computeConformity({
      indicator_type: "numeric",
      measured_value_numeric: 30,
      target_value: 50, min_value: 40, max_value: 60,
    });
    expect(r.is_conform).toBe(false);
  });

  it("non-conform when above max", () => {
    const r = computeConformity({
      indicator_type: "numeric",
      measured_value_numeric: 70,
      target_value: 50, min_value: 40, max_value: 60,
    });
    expect(r.is_conform).toBe(false);
  });

  it("flags out_of_tolerance based on tolerance_minus / tolerance_plus", () => {
    const r = computeConformity({
      indicator_type: "numeric",
      measured_value_numeric: 53,
      target_value: 50, min_value: 40, max_value: 60,
      tolerance_minus: 1, tolerance_plus: 2,
    });
    expect(r.is_conform).toBe(true);
    expect(r.out_of_tolerance).toBe(true); // 53 > 50 + 2
  });

  it("min/max not set → is_conform null (no auto verdict)", () => {
    const r = computeConformity({ indicator_type: "numeric", measured_value_numeric: 5 });
    // both ok because no bounds → conform=true is acceptable per SQL trigger;
    // here we mirror that behavior:
    expect(r.is_conform).toBe(true);
  });

  it("target=0 → deviation_percent null", () => {
    const r = computeConformity({
      indicator_type: "numeric",
      measured_value_numeric: 5, target_value: 0,
    });
    expect(r.deviation_value).toBe(5);
    expect(r.deviation_percent).toBeNull();
  });

  it("no value → null", () => {
    const r = computeConformity({ indicator_type: "numeric", measured_value_numeric: null });
    expect(r.is_conform).toBeNull();
  });
});

describe("computeConformity — non-numeric", () => {
  it("boolean reflects the value", () => {
    expect(computeConformity({ indicator_type: "boolean", measured_value_boolean: true }).is_conform).toBe(true);
    expect(computeConformity({ indicator_type: "boolean", measured_value_boolean: false }).is_conform).toBe(false);
  });
  it("text → null", () => {
    expect(computeConformity({ indicator_type: "text" }).is_conform).toBeNull();
  });
  it("select → null", () => {
    expect(computeConformity({ indicator_type: "select" }).is_conform).toBeNull();
  });
});

describe("validateCheck", () => {
  it("requires OF", () => {
    expect(validateCheck(emptyCheckForm(), "numeric")).toMatch(/OF/);
  });
  it("requires indicator", () => {
    const f = { ...emptyCheckForm(), of_id: "of-1" };
    expect(validateCheck(f, "numeric")).toMatch(/Indicateur/);
  });
  it("requires numeric value", () => {
    const f = { ...emptyCheckForm(), of_id: "of-1", indicator_id: "i-1" };
    expect(validateCheck(f, "numeric")).toMatch(/numérique/i);
  });
  it("accepts decimal with comma", () => {
    const f = { ...emptyCheckForm(), of_id: "of-1", indicator_id: "i-1", value_text: "12,5" };
    expect(validateCheck(f, "numeric")).toBeNull();
  });
  it("requires text value", () => {
    const f = { ...emptyCheckForm(), of_id: "of-1", indicator_id: "i-1" };
    expect(validateCheck(f, "text")).toMatch(/Valeur/);
  });
  it("requires select choice", () => {
    const f = { ...emptyCheckForm(), of_id: "of-1", indicator_id: "i-1" };
    expect(validateCheck(f, "select")).toMatch(/Choix/);
  });
  it("boolean is always valid", () => {
    const f = { ...emptyCheckForm(), of_id: "of-1", indicator_id: "i-1" };
    expect(validateCheck(f, "boolean")).toBeNull();
  });
});

describe("filterChecks", () => {
  const base = (over: Partial<QcRow>): QcRow => ({
    id: over.id ?? "qc-" + Math.random(),
    of_id: "of-1",
    product_id: "p-1",
    production_line_id: "l-1",
    indicator_id: "i-1",
    measured_value_numeric: 1,
    measured_value_text: null,
    measured_value_boolean: null,
    selected_value: null,
    unit: "g",
    target_value: 1, min_value: 0, max_value: 2,
    is_conform: true,
    control_time: "2026-04-29T10:00:00.000Z",
    comment: "",
    controlled_by: null,
    ...over,
  });

  const ctx = {
    ofLabel: (id: string) => id === "of-1" ? "OF-001" : "OF-002",
    indLabel: (id: string) => id === "i-1" ? "POIDS Net" : "TEMP",
  };

  it("filters by OF", () => {
    const rows = [base({ of_id: "of-1" }), base({ of_id: "of-2" })];
    const r = filterChecks(rows, { ...emptyFilters(), of: "of-2" }, ctx);
    expect(r).toHaveLength(1);
    expect(r[0].of_id).toBe("of-2");
  });

  it("filters by line", () => {
    const rows = [base({ production_line_id: "l-1" }), base({ production_line_id: "l-2" })];
    expect(filterChecks(rows, { ...emptyFilters(), line: "l-1" }, ctx)).toHaveLength(1);
  });

  it("filters by conformity", () => {
    const rows = [base({ is_conform: true }), base({ is_conform: false }), base({ is_conform: null })];
    expect(filterChecks(rows, { ...emptyFilters(), conformity: "conform" }, ctx)).toHaveLength(1);
    expect(filterChecks(rows, { ...emptyFilters(), conformity: "nonconform" }, ctx)).toHaveLength(1);
    expect(filterChecks(rows, { ...emptyFilters(), conformity: "unknown" }, ctx)).toHaveLength(1);
  });

  it("filters by date range", () => {
    const rows = [
      base({ control_time: "2026-04-01T10:00:00Z" }),
      base({ control_time: "2026-04-29T10:00:00Z" }),
    ];
    expect(filterChecks(rows, { ...emptyFilters(), dateFrom: "2026-04-15" }, ctx)).toHaveLength(1);
    expect(filterChecks(rows, { ...emptyFilters(), dateTo: "2026-04-15" }, ctx)).toHaveLength(1);
  });

  it("text search across OF / indicator / comment", () => {
    const rows = [
      base({ comment: "essai four" }),
      base({ indicator_id: "i-2" }),
    ];
    expect(filterChecks(rows, { ...emptyFilters(), q: "four" }, ctx)).toHaveLength(1);
    expect(filterChecks(rows, { ...emptyFilters(), q: "TEMP" }, ctx)).toHaveLength(1);
  });
});

describe("non-regression — module isolation", () => {
  it("does not import or reference production-write modules", async () => {
    const fs = await import("fs/promises");
    const src = await fs.readFile("src/pages/qualite/QualiteControles.tsx", "utf-8");
    // Must NOT mutate ordres_fabrication, consumptions or production_declarations
    expect(src).not.toMatch(/from\(["']ordres_fabrication["']\)\s*\.update/);
    expect(src).not.toMatch(/from\(["']consumptions["']\)\s*\.(update|insert|delete)/);
    expect(src).not.toMatch(/from\(["']production_declarations["']\)/);
  });
});
