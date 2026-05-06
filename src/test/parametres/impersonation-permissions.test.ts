import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// ----- Mocks ---------------------------------------------------------------

let currentRoles: string[] = [];
const rowsByRole: Record<string, Array<{ module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>> = {
  admin: [
    { module: "dashboard", can_view: true, can_create: true, can_edit: true, can_delete: true },
    { module: "utilisateurs", can_view: true, can_create: true, can_edit: true, can_delete: true },
    { module: "preventif", can_view: true, can_create: true, can_edit: true, can_delete: true },
    { module: "tickets", can_view: true, can_create: true, can_edit: true, can_delete: true },
  ],
  operateur: [
    { module: "dashboard", can_view: true, can_create: false, can_edit: false, can_delete: false },
    { module: "tickets", can_view: true, can_create: true, can_edit: false, can_delete: false },
  ],
  resp_maintenance: [
    { module: "dashboard", can_view: true, can_create: false, can_edit: false, can_delete: false },
    { module: "tickets", can_view: true, can_create: true, can_edit: true, can_delete: true },
    { module: "preventif", can_view: true, can_create: true, can_edit: true, can_delete: true },
  ],
  controleur_qualite: [
    { module: "qualite", can_view: true, can_create: true, can_edit: false, can_delete: false },
    // Explicit override of one umbrella child:
    { module: "qualite_controles", can_view: true, can_create: true, can_edit: true, can_delete: false },
  ],
};

let resolveLoad: ((v: unknown) => void) | null = null;
let pendingRoles: string[] | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (_t: string) => ({
      select: () => ({
        in: (_col: string, roles: string[]) => {
          const data = roles.flatMap((r) => (rowsByRole[r] ?? []).map((row) => ({ ...row, role: r })));
          if (pendingRoles && JSON.stringify(pendingRoles) === JSON.stringify(roles)) {
            return new Promise((res) => { resolveLoad = (v: any) => res(v ?? { data, error: null }); });
          }
          return Promise.resolve({ data, error: null });
        },
      }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ roles: currentRoles }),
}));

import { usePermissions } from "@/hooks/usePermissions";

beforeEach(() => {
  currentRoles = [];
  pendingRoles = null;
  resolveLoad = null;
});

describe("usePermissions × impersonation", () => {
  it("T1 — impersonating an operateur restricts utilisateurs but keeps dashboard", async () => {
    currentRoles = ["operateur"];
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canView("dashboard")).toBe(true);
    expect(result.current.canView("utilisateurs")).toBe(false);
    expect(result.current.canEdit("tickets")).toBe(false);
  });

  it("T2 — impersonating resp_maintenance grants preventif but not utilisateurs", async () => {
    currentRoles = ["resp_maintenance"];
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canView("preventif")).toBe(true);
    expect(result.current.canEdit("preventif")).toBe(true);
    expect(result.current.canEdit("utilisateurs")).toBe(false);
  });

  it("T3 — switching impersonation A→B does not leak previous permissions", async () => {
    currentRoles = ["admin"];
    const { result, rerender } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canView("utilisateurs")).toBe(true);

    currentRoles = ["operateur"];
    rerender();
    // Reset is immediate (loading=true, perms cleared)
    expect(result.current.loading).toBe(true);
    expect(result.current.canView("utilisateurs")).toBe(false);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canView("utilisateurs")).toBe(false);
    expect(result.current.canView("dashboard")).toBe(true);
  });

  it("T4 — stopping impersonation restores admin perms", async () => {
    currentRoles = ["operateur"];
    const { result, rerender } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canView("utilisateurs")).toBe(false);

    currentRoles = ["admin"];
    rerender();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canView("utilisateurs")).toBe(true);
    expect(result.current.canDelete("preventif")).toBe(true);
  });

  it("T5 — race: rapid switch ignores stale response", async () => {
    currentRoles = ["admin"];
    pendingRoles = ["admin"]; // make first load pending
    const { result, rerender } = renderHook(() => usePermissions());
    expect(result.current.loading).toBe(true);

    // Switch before first response resolves
    currentRoles = ["operateur"];
    pendingRoles = null;
    rerender();

    // Now resolve the stale admin response
    await act(async () => {
      resolveLoad?.(null);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Final state must reflect operateur, not admin
    expect(result.current.canView("utilisateurs")).toBe(false);
    expect(result.current.canView("dashboard")).toBe(true);
  });

  it("T6 — umbrella qualite grants children, explicit child override wins", async () => {
    currentRoles = ["controleur_qualite"];
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Inherited child (no explicit row)
    expect(result.current.canView("qualite_nc")).toBe(true);
    expect(result.current.canCreate("qualite_nc")).toBe(true);
    expect(result.current.canEdit("qualite_nc")).toBe(false);
    // Explicit override adds edit on qualite_controles
    expect(result.current.canEdit("qualite_controles")).toBe(true);
  });
});
