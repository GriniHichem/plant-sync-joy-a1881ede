import { describe, it, expect } from "vitest";
import {
  buildAssignmentPayload,
  validateAssignment,
  scopeOf,
  emptyAssignmentForm,
  AssignmentFormState,
} from "@/components/qualite/QualityIndicatorAssignments";

const f = (over: Partial<AssignmentFormState> = {}): AssignmentFormState => ({
  ...emptyAssignmentForm(),
  indicator_id: "ind-1",
  ...over,
});

describe("quality_indicator_assignments — validation", () => {
  it("requires an indicator", () => {
    expect(validateAssignment({ ...emptyAssignmentForm() }, false)).toMatch(/Indicateur/);
  });

  it("requires at least one scope when not explicitly global", () => {
    expect(validateAssignment(f(), false)).toMatch(/cible/i);
  });

  it("accepts product scope", () => {
    expect(validateAssignment(f({ product_id: "p-1" }), false)).toBeNull();
  });

  it("accepts line scope", () => {
    expect(validateAssignment(f({ production_line_id: "l-1" }), false)).toBeNull();
  });

  it("accepts explicit global with no targets", () => {
    expect(validateAssignment(f(), true)).toBeNull();
  });
});

describe("quality_indicator_assignments — payload", () => {
  it("converts __none__ to null", () => {
    const p = buildAssignmentPayload(f({ product_id: "p-1" }));
    expect(p.product_id).toBe("p-1");
    expect(p.product_family_id).toBeNull();
    expect(p.production_line_id).toBeNull();
    expect(p.recipe_id).toBeNull();
  });

  it("converts empty frequency to null (inherit)", () => {
    expect(buildAssignmentPayload(f({ product_id: "p-1" })).frequency_type).toBeNull();
  });

  it("preserves frequency override", () => {
    expect(buildAssignmentPayload(f({ product_id: "p-1", frequency_type: "shift" })).frequency_type).toBe("shift");
  });

  it("trims notes", () => {
    expect(buildAssignmentPayload(f({ product_id: "p-1", notes: "  ok  " })).notes).toBe("ok");
  });
});

describe("scopeOf — priority detection", () => {
  it("returns global when all null", () => {
    expect(scopeOf({ product_id: null, product_family_id: null, production_line_id: null, recipe_id: null })).toBe("global");
  });
  it("recipe wins over product", () => {
    expect(scopeOf({ product_id: "p", product_family_id: null, production_line_id: null, recipe_id: "r" })).toBe("recipe");
  });
  it("product wins over family", () => {
    expect(scopeOf({ product_id: "p", product_family_id: "f", production_line_id: null, recipe_id: null })).toBe("product");
  });
  it("family wins over line", () => {
    expect(scopeOf({ product_id: null, product_family_id: "f", production_line_id: "l", recipe_id: null })).toBe("family");
  });
  it("line is detected", () => {
    expect(scopeOf({ product_id: null, product_family_id: null, production_line_id: "l", recipe_id: null })).toBe("line");
  });
});

describe("get_quality_indicators_for_of — resolver semantics (logical model)", () => {
  type Assignment = {
    indicator_id: string;
    product_id: string | null;
    product_family_id: string | null;
    production_line_id: string | null;
    recipe_id: string | null;
    is_required: boolean;
    is_blocking: boolean;
    frequency_type: string | null;
  };
  type Indicator = { id: string; is_active: boolean; is_required: boolean; is_blocking: boolean; frequency_type: string };

  function resolveForOf(of: { product_id: string | null; family_id: string | null; line_id: string | null; recipe_id: string | null },
                       indicators: Indicator[], assignments: Assignment[]) {
    const priority = (a: Assignment) =>
      a.recipe_id ? 5 : a.product_id ? 4 : a.product_family_id ? 3 : a.production_line_id ? 2 : 1;

    const matches: { ind: Indicator; a: Assignment | null; prio: number; scope: string }[] = [];

    for (const a of assignments) {
      const ind = indicators.find((i) => i.id === a.indicator_id && i.is_active);
      if (!ind) continue;
      const matched =
        (a.product_id && a.product_id === of.product_id) ||
        (a.product_family_id && a.product_family_id === of.family_id) ||
        (a.production_line_id && a.production_line_id === of.line_id) ||
        (a.recipe_id && a.recipe_id === of.recipe_id) ||
        (!a.product_id && !a.product_family_id && !a.production_line_id && !a.recipe_id);
      if (!matched) continue;
      matches.push({ ind, a, prio: priority(a), scope: ["global","line","family","product","recipe"][priority(a)-1] });
    }

    for (const i of indicators) {
      if (!i.is_active) continue;
      if (!assignments.some((a) => a.indicator_id === i.id)) {
        matches.push({ ind: i, a: null, prio: 1, scope: "global" });
      }
    }

    const map = new Map<string, typeof matches[0]>();
    for (const m of matches) {
      const cur = map.get(m.ind.id);
      if (!cur || m.prio > cur.prio) map.set(m.ind.id, m);
    }
    return [...map.values()].map((m) => ({
      indicator_id: m.ind.id,
      effective_is_required: (m.a?.is_required ?? false) || m.ind.is_required,
      effective_is_blocking: (m.a?.is_blocking ?? false) || m.ind.is_blocking,
      effective_frequency_type: m.a?.frequency_type ?? m.ind.frequency_type,
      match_scope: m.scope,
    }));
  }

  const indicators: Indicator[] = [
    { id: "I_GLOBAL", is_active: true, is_required: false, is_blocking: false, frequency_type: "manual" },
    { id: "I_PROD",   is_active: true, is_required: false, is_blocking: false, frequency_type: "shift" },
    { id: "I_LINE",   is_active: true, is_required: false, is_blocking: false, frequency_type: "hourly" },
    { id: "I_OFF",    is_active: false, is_required: false, is_blocking: false, frequency_type: "manual" },
  ];

  it("includes globals, product-scoped and line-scoped, excludes inactives", () => {
    const assignments: Assignment[] = [
      { indicator_id: "I_PROD", product_id: "P1", product_family_id: null, production_line_id: null, recipe_id: null, is_required: true, is_blocking: false, frequency_type: null },
      { indicator_id: "I_LINE", product_id: null, product_family_id: null, production_line_id: "L1", recipe_id: null, is_required: false, is_blocking: true, frequency_type: "daily" },
    ];
    const r = resolveForOf({ product_id: "P1", family_id: null, line_id: "L1", recipe_id: null }, indicators, assignments);
    const ids = r.map((x) => x.indicator_id).sort();
    expect(ids).toEqual(["I_GLOBAL", "I_LINE", "I_PROD"]);
    expect(r.find((x) => x.indicator_id === "I_PROD")!.match_scope).toBe("product");
    expect(r.find((x) => x.indicator_id === "I_LINE")!.match_scope).toBe("line");
    expect(r.find((x) => x.indicator_id === "I_LINE")!.effective_frequency_type).toBe("daily");
  });

  it("product scope overrides family scope for the same indicator", () => {
    const assignments: Assignment[] = [
      { indicator_id: "I_PROD", product_id: null, product_family_id: "F1", production_line_id: null, recipe_id: null, is_required: false, is_blocking: false, frequency_type: "manual" },
      { indicator_id: "I_PROD", product_id: "P1", product_family_id: null, production_line_id: null, recipe_id: null, is_required: true, is_blocking: true, frequency_type: "shift" },
    ];
    const r = resolveForOf({ product_id: "P1", family_id: "F1", line_id: null, recipe_id: null }, indicators, assignments);
    const prod = r.find((x) => x.indicator_id === "I_PROD")!;
    expect(prod.match_scope).toBe("product");
    expect(prod.effective_is_required).toBe(true);
    expect(prod.effective_is_blocking).toBe(true);
    expect(prod.effective_frequency_type).toBe("shift");
  });

  it("OF without any matching scope still receives globals", () => {
    const r = resolveForOf({ product_id: "PX", family_id: null, line_id: null, recipe_id: null }, indicators, []);
    expect(r.map((x) => x.indicator_id).sort()).toEqual(["I_GLOBAL", "I_LINE", "I_PROD"]);
    expect(r.every((x) => x.match_scope === "global")).toBe(true);
  });
});
