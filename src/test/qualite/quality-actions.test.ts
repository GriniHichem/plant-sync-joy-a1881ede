import { describe, it, expect } from "vitest";
import {
  emptyQaForm, validateQaForm, buildQaInsertPayload, buildQaStatusUpdatePayload,
  isQaOverdue, filterActions, emptyQaFilters, hasActiveQaFilters,
  buildAssignmentNotificationPayload, buildClosedNotificationPayload,
  qaPriorityMeta, type QaRow,
} from "@/pages/qualite/QualiteActions";

describe("QA – form validation", () => {
  it("requires title", () => {
    expect(validateQaForm(emptyQaForm())).toBe("Titre obligatoire");
  });
  it("passes when title + type set", () => {
    expect(validateQaForm({ ...emptyQaForm(), title: "Nettoyer ligne" })).toBeNull();
  });
});

describe("QA – insert payload (from NC)", () => {
  it("builds payload with nc_id/of_id and default status=open", () => {
    const f = { ...emptyQaForm(), title: "T", nc_id: "nc-1", of_id: "of-1", responsible_user_id: "u-2" };
    const p = buildQaInsertPayload(f, "u-1");
    expect(p.nc_id).toBe("nc-1");
    expect(p.of_id).toBe("of-1");
    expect(p.status).toBe("open");
    expect(p.created_by).toBe("u-1");
    expect(p.responsible_user_id).toBe("u-2");
  });
  it("nullifies empty optional links", () => {
    const p = buildQaInsertPayload({ ...emptyQaForm(), title: "T" }, "u-1");
    expect(p.nc_id).toBeNull();
    expect(p.of_id).toBeNull();
    expect(p.responsible_user_id).toBeNull();
    expect(p.due_date).toBeNull();
  });
});

describe("QA – status update", () => {
  it("requires verification_comment to close", () => {
    expect(buildQaStatusUpdatePayload({ status: "closed" }, "u")).toBe("Commentaire de vérification obligatoire pour clôturer");
    expect(buildQaStatusUpdatePayload({ status: "closed", verification_comment: "  " }, "u")).toMatch(/obligatoire/);
  });
  it("closes with stamps", () => {
    const r = buildQaStatusUpdatePayload({ status: "closed", verification_comment: "ok" }, "u-1") as Record<string, any>;
    expect(r.status).toBe("closed");
    expect(r.closed_by).toBe("u-1");
    expect(typeof r.closed_at).toBe("string");
    expect(r.statut).toBeUndefined();
  });
  it("verifies with stamps", () => {
    const r = buildQaStatusUpdatePayload({ status: "verified" }, "u-1") as Record<string, any>;
    expect(r.verified_by).toBe("u-1");
    expect(typeof r.verified_at).toBe("string");
  });
  it("never touches production statut or tickets", () => {
    const r = buildQaStatusUpdatePayload({ status: "in_progress", responsible_user_id: "u-2" }, "u") as Record<string, any>;
    expect(Object.keys(r)).not.toContain("statut");
    expect(Object.keys(r)).not.toContain("ticket_id");
    expect(Object.keys(r)).not.toContain("intervention_id");
  });
});

describe("QA – overdue detector", () => {
  const past = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);
  const future = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
  it("flags overdue when past + open", () => {
    expect(isQaOverdue(past, "open")).toBe(true);
    expect(isQaOverdue(past, "in_progress")).toBe(true);
  });
  it("not overdue when closed/done/verified/cancelled", () => {
    expect(isQaOverdue(past, "done")).toBe(false);
    expect(isQaOverdue(past, "closed")).toBe(false);
    expect(isQaOverdue(past, "cancelled")).toBe(false);
  });
  it("not overdue when no due_date or future", () => {
    expect(isQaOverdue(null, "open")).toBe(false);
    expect(isQaOverdue(future, "open")).toBe(false);
  });
});

describe("QA – filters", () => {
  const rows: QaRow[] = [
    { id: "1", nc_id: "nc-1", of_id: null, title: "Nettoyer", description: null, action_type: "curative", priority: "high", status: "open", responsible_user_id: "u-1", due_date: "2026-04-01", verification_comment: null, created_by: "u-0", created_at: "2026-04-01T00:00:00Z", closed_at: null },
    { id: "2", nc_id: null, of_id: null, title: "Former équipe", description: null, action_type: "preventive", priority: "low", status: "closed", responsible_user_id: "u-2", due_date: "2026-05-01", verification_comment: "ok", created_by: "u-0", created_at: "2026-04-02T00:00:00Z", closed_at: "2026-04-10T00:00:00Z" },
  ];
  const ncMap = { "nc-1": "NC-00001" };
  it("filter by status/priority/responsible", () => {
    expect(filterActions(rows, { ...emptyQaFilters(), status: "open" }, ncMap)).toHaveLength(1);
    expect(filterActions(rows, { ...emptyQaFilters(), priority: "low" }, ncMap)).toHaveLength(1);
    expect(filterActions(rows, { ...emptyQaFilters(), responsible: "u-2" }, ncMap)).toHaveLength(1);
  });
  it("filter by NC label and date range", () => {
    expect(filterActions(rows, { ...emptyQaFilters(), nc_id: "00001" }, ncMap)).toHaveLength(1);
    expect(filterActions(rows, { ...emptyQaFilters(), dueFrom: "2026-04-15" }, ncMap)).toHaveLength(1);
  });
  it("text search on title", () => {
    expect(filterActions(rows, { ...emptyQaFilters(), q: "Nettoyer" }, ncMap)).toHaveLength(1);
  });
  it("hasActiveQaFilters detects state", () => {
    expect(hasActiveQaFilters(emptyQaFilters())).toBe(false);
    expect(hasActiveQaFilters({ ...emptyQaFilters(), q: "x" })).toBe(true);
  });
});

describe("QA – notifications", () => {
  it("assignment targets responsible_user_id and never tickets", () => {
    const n = buildAssignmentNotificationPayload({ id: "a-1", title: "T", responsible_user_id: "u-2", priority: "critical" })!;
    expect(n.recipient_user_id).toBe("u-2");
    expect(n.module).toBe("qualite");
    expect(n.is_critical).toBe(true);
    expect(n.severity).toBe("high");
    expect(Object.keys(n)).not.toContain("ticket_id");
  });
  it("returns null if no responsible", () => {
    expect(buildAssignmentNotificationPayload({ id: "a", title: "T", responsible_user_id: null, priority: "low" })).toBeNull();
  });
  it("closed notification targets created_by", () => {
    const n = buildClosedNotificationPayload({ id: "a", title: "T", created_by: "u-0" })!;
    expect(n.recipient_user_id).toBe("u-0");
    expect(n.notification_type).toBe("qualite_action_closed");
  });
});

describe("QA – audit severity mapping", () => {
  it("critical/high → medium, others → info", () => {
    expect(qaPriorityMeta("critical").audit).toBe("medium");
    expect(qaPriorityMeta("high").audit).toBe("medium");
    expect(qaPriorityMeta("low").audit).toBe("info");
    expect(qaPriorityMeta("medium").audit).toBe("info");
  });
});
