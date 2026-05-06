import { describe, it, expect } from "vitest";

// Replicate umbrella inheritance logic from usePermissions.ts
const UMBRELLAS: Record<string, string[]> = {
  qualite: [
    "qualite_dashboard", "qualite_of", "qualite_indicateurs",
    "qualite_controles", "qualite_nc", "qualite_actions",
    "qualite_recettes", "qualite_tracabilite", "qualite_rapports", "qualite_shift",
  ],
  inventaire: ["inventaire_campagnes"],
};

interface Perm { module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; }

function applyUmbrellas(rows: Perm[]): Perm[] {
  const merged = new Map<string, Perm>();
  for (const r of rows) merged.set(r.module, { ...r });
  for (const [parent, children] of Object.entries(UMBRELLAS)) {
    const p = merged.get(parent);
    if (!p) continue;
    for (const c of children) {
      if (merged.has(c)) continue;
      merged.set(c, { ...p, module: c });
    }
  }
  return Array.from(merged.values());
}

describe("usePermissions umbrella inheritance", () => {
  it("inherits all qualite_* sub-modules from qualite when not explicit", () => {
    const out = applyUmbrellas([
      { module: "qualite", can_view: true, can_create: true, can_edit: false, can_delete: false },
    ]);
    for (const child of UMBRELLAS.qualite) {
      const c = out.find((p) => p.module === child);
      expect(c?.can_view).toBe(true);
      expect(c?.can_create).toBe(true);
      expect(c?.can_edit).toBe(false);
    }
  });

  it("does NOT override an explicitly configured sub-module", () => {
    const out = applyUmbrellas([
      { module: "qualite", can_view: true, can_create: true, can_edit: true, can_delete: true },
      { module: "qualite_controles", can_view: false, can_create: false, can_edit: false, can_delete: false },
    ]);
    const explicit = out.find((p) => p.module === "qualite_controles")!;
    expect(explicit.can_view).toBe(false);
    expect(explicit.can_create).toBe(false);
  });

  it("does nothing when umbrella parent is absent", () => {
    const out = applyUmbrellas([
      { module: "machines", can_view: true, can_create: false, can_edit: false, can_delete: false },
    ]);
    expect(out.find((p) => p.module === "qualite_controles")).toBeUndefined();
  });

  it("inherits inventaire_campagnes from inventaire", () => {
    const out = applyUmbrellas([
      { module: "inventaire", can_view: true, can_create: true, can_edit: true, can_delete: false },
    ]);
    const c = out.find((p) => p.module === "inventaire_campagnes")!;
    expect(c.can_view).toBe(true);
    expect(c.can_edit).toBe(true);
    expect(c.can_delete).toBe(false);
  });
});
