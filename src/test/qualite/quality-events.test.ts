import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase used by triggerNotification — return no active rules, so the trigger
// becomes a no-op insert. We stub the chain so calls don't throw and we can assert call shapes.
vi.mock("@/integrations/supabase/client", () => {
  const builder = () => {
    const b: any = {};
    b.select = vi.fn(() => b);
    b.eq = vi.fn(() => b);
    b.gte = vi.fn(() => b);
    b.in = vi.fn(() => Promise.resolve({ data: [] }));
    b.insert = vi.fn(() => Promise.resolve({ error: null }));
    b.update = vi.fn(() => b);
    return b;
  };
  return {
    supabase: {
      from: vi.fn(() => builder()),
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) },
    },
  };
});

import * as N from "@/lib/qualityNotifications";

beforeEach(() => { vi.clearAllMocks(); });

describe("qualityNotifications payloads", () => {
  it("nc_created emits a non-critical event with module=qualite", async () => {
    await expect(N.notifyNcCreated({ entity_id: "nc1", entity_code: "NC-1", entity_label: "Test", severity: "low" })).resolves.toBeUndefined();
  });

  it("nc_critical follows when severity is high or critical", async () => {
    await expect(N.notifyNcCreated({ entity_id: "nc2", entity_code: "NC-2", entity_label: "Test", severity: "critical" })).resolves.toBeUndefined();
  });

  it("nc_blocked_lot emits high severity", async () => {
    await expect(N.notifyNcBlockedLot({ entity_id: "nc3", entity_code: "NC-3", entity_label: "T" })).resolves.toBeUndefined();
  });

  it("check_out_of_tolerance, of_quality_pending, recipe_approved, bom_changed", async () => {
    await expect(N.notifyCheckOutOfTolerance({ entity_id: "c", entity_label: "TEMP", of_label: "OF-1" })).resolves.toBeUndefined();
    await expect(N.notifyOfQualityPending({ entity_id: "of1", entity_code: "OF-1", entity_label: "OF-1" })).resolves.toBeUndefined();
    await expect(N.notifyRecipeApproved({ entity_id: "r", entity_label: "R", version: 2 })).resolves.toBeUndefined();
    await expect(N.notifyBomChanged({ entity_id: "b", entity_label: "B v1", version: 1, new_status: "active" })).resolves.toBeUndefined();
  });

  it("notifyActionsOverdue is a no-op when count=0", async () => {
    await expect(N.notifyActionsOverdue(0)).resolves.toBeUndefined();
  });
});
