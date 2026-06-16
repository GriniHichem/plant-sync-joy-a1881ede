import { describe, it, expect } from "vitest";
import { matchConditions, countConditions } from "@/lib/validation";

describe("matchConditions — native builder format", () => {
  const tree = (combinator: "all" | "any", rules: unknown[]) =>
    ({ combinator, rules } as Record<string, unknown>);

  it("empty rules → always matches", () => {
    expect(matchConditions(tree("all", []), {})).toBe(true);
  });

  it("eq operator (tolerant string/number)", () => {
    expect(matchConditions(tree("all", [{ field: "priority", op: "eq", value: "high" }]), { priority: "high" })).toBe(true);
    expect(matchConditions(tree("all", [{ field: "priority", op: "eq", value: "high" }]), { priority: "low" })).toBe(false);
    expect(matchConditions(tree("all", [{ field: "qty", op: "eq", value: 5 }]), { qty: "5" })).toBe(true);
  });

  it("neq operator", () => {
    expect(matchConditions(tree("all", [{ field: "statut", op: "neq", value: "cloture" }]), { statut: "en_cours" })).toBe(true);
    expect(matchConditions(tree("all", [{ field: "statut", op: "neq", value: "cloture" }]), { statut: "cloture" })).toBe(false);
  });

  it("gt / gte / lt / lte operators", () => {
    expect(matchConditions(tree("all", [{ field: "ecart_pct", op: "gt", value: 10 }]), { ecart_pct: 11 })).toBe(true);
    expect(matchConditions(tree("all", [{ field: "ecart_pct", op: "gt", value: 10 }]), { ecart_pct: 10 })).toBe(false);
    expect(matchConditions(tree("all", [{ field: "ecart_pct", op: "gte", value: 10 }]), { ecart_pct: 10 })).toBe(true);
    expect(matchConditions(tree("all", [{ field: "stock", op: "lt", value: 5 }]), { stock: 2 })).toBe(true);
    expect(matchConditions(tree("all", [{ field: "stock", op: "lt", value: 5 }]), { stock: 5 })).toBe(false);
    expect(matchConditions(tree("all", [{ field: "stock", op: "lte", value: 5 }]), { stock: 5 })).toBe(true);
  });

  it("contains operator (case-insensitive)", () => {
    expect(matchConditions(tree("all", [{ field: "motif", op: "contains", value: "casse" }]), { motif: "Pièce CASSÉE non" })).toBe(false);
    expect(matchConditions(tree("all", [{ field: "motif", op: "contains", value: "casse" }]), { motif: "Boitier casseroles" })).toBe(true);
  });

  it("combinator all = AND, any = OR", () => {
    const rules = [
      { field: "priority", op: "eq", value: "critical" },
      { field: "ecart_pct", op: "gte", value: 20 },
    ];
    expect(matchConditions(tree("all", rules), { priority: "critical", ecart_pct: 25 })).toBe(true);
    expect(matchConditions(tree("all", rules), { priority: "critical", ecart_pct: 5 })).toBe(false);
    expect(matchConditions(tree("any", rules), { priority: "low", ecart_pct: 25 })).toBe(true);
    expect(matchConditions(tree("any", rules), { priority: "low", ecart_pct: 5 })).toBe(false);
  });
});

describe("matchConditions — legacy format still supported", () => {
  it("min_duration_minutes / ecart_seuil_pct / or", () => {
    expect(matchConditions({ min_duration_minutes: 60 }, { duration_minutes: 90 })).toBe(true);
    expect(matchConditions({ ecart_seuil_pct: 10 }, { ecart_pct: -15 })).toBe(true);
    expect(matchConditions({ or: [{ priority: "critical" }] }, { priority: "critical" })).toBe(true);
  });
});

describe("countConditions", () => {
  it("counts native rules, or groups, plain keys", () => {
    expect(countConditions(null)).toBe(0);
    expect(countConditions({ combinator: "all", rules: [{ field: "a", op: "eq", value: 1 }] })).toBe(1);
    expect(countConditions({ or: [{}, {}] })).toBe(2);
    expect(countConditions({ priority: "high", machine_criticality: "A" })).toBe(2);
  });
});
