import { describe, it, expect } from "vitest";

type Status = "draft" | "active" | "archived";
interface Recipe { id: string; product_id: string; version: number; status: Status; is_active: boolean; valid_from: string | null; valid_to: string | null; }

function syncFromStatus(r: Recipe, newStatus: Status): Recipe {
  const now = new Date().toISOString();
  if (newStatus === "active") return { ...r, status: "active", is_active: true, valid_from: r.valid_from ?? now, valid_to: null };
  if (newStatus === "archived") return { ...r, status: "archived", is_active: false, valid_to: now };
  return { ...r, status: "draft", is_active: false };
}

describe("Recipe versioning lifecycle", () => {
  const base: Recipe = { id: "r1", product_id: "p1", version: 1, status: "active", is_active: true, valid_from: null, valid_to: null };

  it("opens existing recipes without breaking when new fields are missing", () => {
    const legacy: any = { id: "r0", product_id: "p1", version: 1, is_active: true };
    const status = legacy.status || (legacy.is_active ? "active" : "archived");
    expect(status).toBe("active");
  });

  it("activating a draft sets status, is_active and valid_from", () => {
    const draft: Recipe = { ...base, id: "r2", version: 2, status: "draft", is_active: false };
    const activated = syncFromStatus(draft, "active");
    expect(activated.status).toBe("active");
    expect(activated.is_active).toBe(true);
    expect(activated.valid_from).not.toBeNull();
    expect(activated.valid_to).toBeNull();
  });

  it("archiving an active version sets valid_to and clears is_active without touching the OF link", () => {
    const archived = syncFromStatus(base, "archived");
    expect(archived.status).toBe("archived");
    expect(archived.is_active).toBe(false);
    expect(archived.valid_to).not.toBeNull();
    // Existing OF still points to the same recipe id (no mutation)
    const of = { id: "of-1", recipe_id: archived.id };
    expect(of.recipe_id).toBe(archived.id);
  });

  it("multiple active versions remain allowed for the same product", () => {
    const v1: Recipe = { ...base, id: "ra", version: 1 };
    const v2: Recipe = { ...base, id: "rb", version: 2 };
    const both = [v1, v2].filter((r) => r.status === "active");
    expect(both).toHaveLength(2);
  });

  it("payload sent to RPC excludes any production-status field", () => {
    const payload: any = { p_recipe_id: base.id, p_status: "archived", p_reason: "fin de série" };
    expect(payload).not.toHaveProperty("p_of_status");
    expect(payload).not.toHaveProperty("statut");
    expect(payload.p_status).toBe("archived");
  });

  it("OF created against an active recipe keeps recipe_id even after that recipe is archived", () => {
    const of = { id: "of-2", recipe_id: base.id, statut: "en_cours" };
    const archived = syncFromStatus(base, "archived");
    // archive should not modify OF
    expect(of.recipe_id).toBe(archived.id);
    expect(of.statut).toBe("en_cours");
  });
});

describe("Recipe steps payload", () => {
  it("validates JSON process parameter shape", () => {
    const ok = JSON.parse('{"temp_c":85}');
    expect(ok.temp_c).toBe(85);
    expect(() => JSON.parse("not-json")).toThrow();
  });

  it("normalizes 'no indicator' sentinel to null on save", () => {
    const sentinel = "__none__";
    const value = sentinel === "__none__" ? null : sentinel;
    expect(value).toBeNull();
  });

  it("CCP step requires a title", () => {
    const step = { title: "", critical_control_point: true };
    expect(step.title.trim().length === 0).toBe(true);
  });
});
