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

import {
  approveValidationRequest,
  rejectValidationRequest,
  cancelValidationRequest,
} from "@/lib/validation";

const setRequest = (over: Record<string, unknown>) => {
  mockState.singleByTable.validation_requests = {
    data: {
      id: "vrq-1",
      enforcement: "blocking",
      entity_type: null,
      target_record_id: null,
      submitted_by_user_id: "user-1",
      title: "T",
      ...over,
    },
    error: null,
  };
};

beforeEach(() => resetMockState());

describe("approveValidationRequest", () => {
  it("blocking → applied + applied_at", async () => {
    setRequest({ enforcement: "blocking" });
    const ok = await approveValidationRequest("vrq-1", "ok");
    expect(ok).toBe(true);
    const upd = mockState.updates.find((u) => u.table === "validation_requests");
    expect(upd?.payload.status).toBe("applied");
    expect(upd?.payload.applied_at).toBeTruthy();
  });

  it("post_hoc → approved + marks target record on mapped table", async () => {
    setRequest({ enforcement: "post_hoc", entity_type: "ticket", target_record_id: "tkt-9" });
    const ok = await approveValidationRequest("vrq-1");
    expect(ok).toBe(true);
    const reqUpd = mockState.updates.find((u) => u.table === "validation_requests");
    expect(reqUpd?.payload.status).toBe("approved");
    const targetUpd = mockState.updates.find((u) => u.table === "tickets");
    expect(targetUpd?.payload.validation_status).toBe("approved");
  });

  it("no user → false", async () => {
    mockState.user = null;
    setRequest({});
    expect(await approveValidationRequest("vrq-1")).toBe(false);
  });

  it("update error → false", async () => {
    setRequest({ enforcement: "blocking" });
    mockState.updateError = { message: "boom" };
    expect(await approveValidationRequest("vrq-1")).toBe(false);
  });
});

describe("rejectValidationRequest", () => {
  it("sets rejected + reason and marks target rejected", async () => {
    setRequest({ enforcement: "post_hoc", entity_type: "consumption", target_record_id: "c-1" });
    const ok = await rejectValidationRequest("vrq-1", "non justifié");
    expect(ok).toBe(true);
    const reqUpd = mockState.updates.find((u) => u.table === "validation_requests");
    expect(reqUpd?.payload.status).toBe("rejected");
    expect(reqUpd?.payload.rejection_reason).toBe("non justifié");
    const targetUpd = mockState.updates.find((u) => u.table === "consumptions");
    expect(targetUpd?.payload.validation_status).toBe("rejected");
  });
});

describe("cancelValidationRequest", () => {
  it("cancels and scopes to submitter (submitted_by_user_id filter)", async () => {
    const ok = await cancelValidationRequest("vrq-1");
    expect(ok).toBe(true);
    const upd = mockState.updates.find((u) => u.table === "validation_requests");
    expect(upd?.payload.status).toBe("cancelled");
    expect(upd?.filters.some((f) => f.col === "submitted_by_user_id" && f.val === "user-1")).toBe(true);
  });

  it("no user → false", async () => {
    mockState.user = null;
    expect(await cancelValidationRequest("vrq-1")).toBe(false);
  });
});
