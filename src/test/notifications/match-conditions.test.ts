import { describe, it, expect } from "vitest";
import { matchConditions } from "@/lib/validation";

describe("matchConditions (validation rule matcher)", () => {
  it("returns true when conditions are null", () => {
    expect(matchConditions(null, { priority: "high" })).toBe(true);
  });

  it("returns true when conditions are an empty object", () => {
    expect(matchConditions({}, {})).toBe(true);
  });

  it("matches simple equality", () => {
    expect(matchConditions({ priority: "high" }, { priority: "high" })).toBe(true);
    expect(matchConditions({ priority: "high" }, { priority: "low" })).toBe(false);
  });

  it("matches array membership", () => {
    const c = { priority: ["high", "critical"] };
    expect(matchConditions(c, { priority: "high" })).toBe(true);
    expect(matchConditions(c, { priority: "critical" })).toBe(true);
    expect(matchConditions(c, { priority: "low" })).toBe(false);
  });

  it("supports OR groups", () => {
    const c = { or: [{ priority: "critical" }, { machine_criticality: "A" }] };
    expect(matchConditions(c, { priority: "critical", machine_criticality: "C" })).toBe(true);
    expect(matchConditions(c, { priority: "low", machine_criticality: "A" })).toBe(true);
    expect(matchConditions(c, { priority: "low", machine_criticality: "C" })).toBe(false);
  });

  it("min_duration_minutes threshold", () => {
    expect(matchConditions({ min_duration_minutes: 60 }, { duration_minutes: 60 })).toBe(true);
    expect(matchConditions({ min_duration_minutes: 60 }, { duration_minutes: 120 })).toBe(true);
    expect(matchConditions({ min_duration_minutes: 60 }, { duration_minutes: 59 })).toBe(false);
    expect(matchConditions({ min_duration_minutes: 60 }, {})).toBe(false);
  });

  it("ecart_seuil_pct uses absolute value", () => {
    expect(matchConditions({ ecart_seuil_pct: 10 }, { ecart_pct: 10 })).toBe(true);
    expect(matchConditions({ ecart_seuil_pct: 10 }, { ecart_pct: -15 })).toBe(true);
    expect(matchConditions({ ecart_seuil_pct: 10 }, { ecart_pct: 5 })).toBe(false);
  });

  it("min_age_hours threshold", () => {
    expect(matchConditions({ min_age_hours: 24 }, { age_hours: 30 })).toBe(true);
    expect(matchConditions({ min_age_hours: 24 }, { age_hours: 1 })).toBe(false);
  });

  it("multi-key conditions act as AND", () => {
    const c = { priority: "high", machine_criticality: "A" };
    expect(matchConditions(c, { priority: "high", machine_criticality: "A" })).toBe(true);
    expect(matchConditions(c, { priority: "high", machine_criticality: "B" })).toBe(false);
  });

  it("missing context value with simple equality fails", () => {
    expect(matchConditions({ priority: "high" }, {})).toBe(false);
  });
});
