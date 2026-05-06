import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("sonner", () => ({ toast: { warning: vi.fn() } }));

const realInsert = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
const realSelect = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
const realInvoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
const realRpc = vi.fn().mockResolvedValue({ data: 42, error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ insert: realInsert, select: realSelect, update: realInsert, delete: realInsert, upsert: realInsert })),
    functions: { invoke: realInvoke },
    rpc: realRpc,
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { installImpersonationGuard, uninstallImpersonationGuard } from "@/lib/impersonationGuard";

beforeEach(() => {
  realInsert.mockClear();
  realSelect.mockClear();
  realInvoke.mockClear();
  realRpc.mockClear();
});
afterEach(() => uninstallImpersonationGuard());

describe("impersonation guard", () => {
  it("blocks insert/update/delete/upsert when active", async () => {
    installImpersonationGuard();
    const ins: any = await (supabase.from("tickets") as any).insert({ a: 1 });
    expect(ins.error).toBeTruthy();
    expect(realInsert).not.toHaveBeenCalled();
  });

  it("blocks rpc and functions.invoke", async () => {
    installImpersonationGuard();
    const r: any = await (supabase as any).rpc("do_thing");
    const f: any = await supabase.functions.invoke("send-email");
    expect(r.error).toBeTruthy();
    expect(f.error).toBeTruthy();
    expect(realRpc).not.toHaveBeenCalled();
    expect(realInvoke).not.toHaveBeenCalled();
  });

  it("does not block reads (select)", async () => {
    installImpersonationGuard();
    const res: any = await (supabase.from("tickets") as any).select("*");
    expect(res.error).toBeNull();
    expect(realSelect).toHaveBeenCalled();
  });

  it("restores normal write behavior after uninstall", async () => {
    installImpersonationGuard();
    uninstallImpersonationGuard();
    const ins: any = await (supabase.from("tickets") as any).insert({ a: 1 });
    expect(ins.error).toBeNull();
    expect(realInsert).toHaveBeenCalled();
  });
});
