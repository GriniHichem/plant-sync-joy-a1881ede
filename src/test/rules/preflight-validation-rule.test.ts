import { describe, it, expect } from "vitest";
import { preflightValidationRule } from "@/lib/ruleValidation";

const base = {
  name: "Règle V",
  module: "pdr_stock",
  action_type: "correction",
  enforcement: "blocking" as const,
  validator_roles: ["resp_maintenance"],
  conditions: null,
};

describe("preflightValidationRule", () => {
  it("accepts a valid rule", () => {
    const r = preflightValidationRule(base);
    expect(r.errors).toHaveLength(0);
  });

  it("flags missing required fields", () => {
    const r = preflightValidationRule({ ...base, name: "", module: "", action_type: "" });
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects unknown module without allowCustom", () => {
    const r = preflightValidationRule({ ...base, module: "alien" });
    expect(r.errors.some((e) => e.includes("alien"))).toBe(true);
  });

  it("warns on non-standard action for known module", () => {
    const r = preflightValidationRule({ ...base, action_type: "made_up_action" });
    expect(r.warnings.some((w) => w.includes("made_up_action"))).toBe(true);
  });

  it("ERRORS on blocking enforcement without any validator", () => {
    const r = preflightValidationRule({ ...base, validator_roles: [], validator_users: [] });
    expect(r.errors.some((e) => /bloquant/i.test(e))).toBe(true);
  });

  it("warns on blocking + field-terrain module", () => {
    const r = preflightValidationRule({ ...base, module: "tickets", action_type: "reopen" });
    expect(r.warnings.some((w) => /terrain/i.test(w))).toBe(true);
  });

  it("post_hoc without validator only warns (not blocks)", () => {
    const r = preflightValidationRule({
      ...base, enforcement: "post_hoc", validator_roles: [], validator_users: [],
    });
    expect(r.errors).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("validator_users alone satisfies validator requirement", () => {
    const r = preflightValidationRule({
      ...base, validator_roles: [], validator_users: ["user-1"],
    });
    expect(r.errors).toHaveLength(0);
  });
});
