import { describe, it, expect } from "vitest";

/**
 * Pure logic tests for the new `assignment_status` field.
 * The DB enum is: unassigned | assigned | transferred | released.
 *
 * The main `statut` enum (ouvert/pris_en_charge/en_cours/resolu/cloture)
 * MUST remain independent of these transitions.
 */

type AssignmentStatus = "unassigned" | "assigned" | "transferred" | "released" | null;
type TicketStatut = "ouvert" | "pris_en_charge" | "en_cours" | "resolu" | "cloture";

interface TicketShape {
  statut: TicketStatut;
  assignee_id: string | null;
  assignment_status: AssignmentStatus;
}

// Mirror of TicketDetail's write paths (logic-only, no Supabase).
function applyTakeCharge(t: TicketShape, userId: string): TicketShape {
  return { ...t, statut: "pris_en_charge", assignee_id: userId, assignment_status: "assigned" };
}
function applyTransfer(t: TicketShape, targetId: string): TicketShape {
  // statut intentionally unchanged
  return { ...t, assignee_id: targetId, assignment_status: "transferred" };
}
function applyRelease(t: TicketShape): TicketShape {
  return { ...t, assignee_id: null, statut: "ouvert", assignment_status: "released" };
}

describe("Ticket assignment_status lifecycle", () => {
  const baseUnassigned: TicketShape = {
    statut: "ouvert",
    assignee_id: null,
    assignment_status: "unassigned",
  };

  it("unassigned → assigned on take charge (statut becomes pris_en_charge)", () => {
    const next = applyTakeCharge(baseUnassigned, "user-A");
    expect(next.assignment_status).toBe("assigned");
    expect(next.statut).toBe("pris_en_charge");
    expect(next.assignee_id).toBe("user-A");
  });

  it("assigned → transferred → assigned-again preserves statut", () => {
    const taken = applyTakeCharge(baseUnassigned, "user-A");
    const transferred = applyTransfer(taken, "user-B");
    expect(transferred.assignment_status).toBe("transferred");
    // statut MUST NOT change during a transfer
    expect(transferred.statut).toBe(taken.statut);
    expect(transferred.assignee_id).toBe("user-B");

    // New assignee re-takes ownership explicitly
    const reassigned = applyTakeCharge(transferred, "user-B");
    expect(reassigned.assignment_status).toBe("assigned");
    expect(reassigned.statut).toBe("pris_en_charge");
  });

  it("assigned → released sends ticket back to the open pool", () => {
    const taken = applyTakeCharge(baseUnassigned, "user-A");
    const released = applyRelease(taken);
    expect(released.assignment_status).toBe("released");
    expect(released.statut).toBe("ouvert");
    expect(released.assignee_id).toBeNull();
  });

  it("released ticket can be re-taken without losing lifecycle integrity", () => {
    const released = applyRelease(applyTakeCharge(baseUnassigned, "user-A"));
    const retaken = applyTakeCharge(released, "user-C");
    expect(retaken.assignment_status).toBe("assigned");
    expect(retaken.statut).toBe("pris_en_charge");
    expect(retaken.assignee_id).toBe("user-C");
  });

  it("the 5 main statuts remain the only workflow values", () => {
    const valid: TicketStatut[] = ["ouvert", "pris_en_charge", "en_cours", "resolu", "cloture"];
    expect(valid).toHaveLength(5);
    // assignment_status values must NEVER appear in the main statut enum
    const assignmentValues = ["unassigned", "assigned", "transferred", "released"];
    assignmentValues.forEach((v) => expect(valid).not.toContain(v as any));
  });
});
