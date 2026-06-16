import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetMockState, mockState } from "./_validation-mocks";

vi.mock("@/integrations/supabase/client", async () => {
  const mod = await import("./_validation-mocks");
  return { supabase: mod.createConfigurableSupabase() };
});
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(async () => {}),
  sanitizeValues: (v: unknown) => v,
  computeChangedFields: () => [],
}));
vi.mock("@/lib/notifications", () => ({ triggerNotification: vi.fn(async () => {}) }));

import { checkValidationRequired, type ValidationRule } from "@/lib/validation";

const baseRule = (over: Partial<ValidationRule>): ValidationRule => ({
  id: "r",
  name: "rule",
  description: null,
  module: "pdr_stock",
  entity_type: null,
  action_type: "correction",
  enforcement: "blocking",
  is_active: true,
  is_required: true,
  priority: "medium",
  validator_roles: ["admin"],
  validator_users: [],
  conditions: null,
  auto_approve_if_low_risk: false,
  ...over,
});

describe("checkValidationRequired — deterministic selection", () => {
  beforeEach(() => resetMockState());

  it("no active rule → none", async () => {
    mockState.rules = [];
    const res = await checkValidationRequired({ module: "pdr_stock", action_type: "correction" });
    expect(res).toEqual({ rule: null, enforcement: "none" });
  });

  it("single matching rule → returned with its enforcement", async () => {
    mockState.rules = [baseRule({ id: "r1", enforcement: "post_hoc" })];
    const res = await checkValidationRequired({ module: "pdr_stock", action_type: "correction" });
    expect(res.rule?.id).toBe("r1");
    expect(res.enforcement).toBe("post_hoc");
  });

  it("higher priority wins", async () => {
    mockState.rules = [
      baseRule({ id: "low", priority: "low" }),
      baseRule({ id: "crit", priority: "critical" }),
      baseRule({ id: "med", priority: "medium" }),
    ];
    const res = await checkValidationRequired({ module: "pdr_stock", action_type: "correction" });
    expect(res.rule?.id).toBe("crit");
  });

  it("equal priority → rule with entity_type (more specific) wins", async () => {
    mockState.rules = [
      baseRule({ id: "generic", priority: "high", entity_type: null }),
      baseRule({ id: "specific", priority: "high", entity_type: "pdr_movement" }),
    ];
    const res = await checkValidationRequired({ module: "pdr_stock", action_type: "correction", entity_type: "pdr_movement" });
    expect(res.rule?.id).toBe("specific");
  });

  it("equal priority+specificity → more conditions wins", async () => {
    mockState.rules = [
      baseRule({ id: "one", priority: "high", conditions: { combinator: "all", rules: [{ field: "a", op: "eq", value: 1 }] } as never }),
      baseRule({ id: "two", priority: "high", conditions: { combinator: "all", rules: [{ field: "a", op: "eq", value: 1 }, { field: "b", op: "gte", value: 2 }] } as never }),
    ];
    const res = await checkValidationRequired({ module: "pdr_stock", action_type: "correction", context: { a: 1, b: 5 } });
    expect(res.rule?.id).toBe("two");
  });

  it("rule whose conditions do not match the context is excluded", async () => {
    mockState.rules = [
      baseRule({ id: "nomatch", conditions: { combinator: "all", rules: [{ field: "ecart_pct", op: "gte", value: 50 }] } as never }),
    ];
    const res = await checkValidationRequired({ module: "pdr_stock", action_type: "correction", context: { ecart_pct: 3 } });
    expect(res).toEqual({ rule: null, enforcement: "none" });
  });

  it("backend error → safe fallback none (no throw)", async () => {
    mockState.rulesReject = true;
    const res = await checkValidationRequired({ module: "pdr_stock", action_type: "correction" });
    expect(res).toEqual({ rule: null, enforcement: "none" });
  });
});
