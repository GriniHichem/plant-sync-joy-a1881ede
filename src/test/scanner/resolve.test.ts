import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: any[]) => rpcMock(...args) },
}));

import { resolveScannedCode } from "@/lib/scanResolver";

describe("resolveScannedCode", () => {
  beforeEach(() => rpcMock.mockReset());

  it("returns empty for empty input", async () => {
    const r = await resolveScannedCode("   ");
    expect(r).toEqual([]);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("calls RPC with trimmed code", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await resolveScannedCode("  ABC123  ");
    expect(rpcMock).toHaveBeenCalledWith("resolve_scanned_code", { p_code: "ABC123" });
  });

  it("filters by allowedTypes", async () => {
    rpcMock.mockResolvedValue({
      data: [
        { entity_type: "pdr", entity_id: "1", code: "P", label: "L", matched_field: "code_erp", url: "/pdr/1" },
        { entity_type: "machine", entity_id: "2", code: "M", label: "L", matched_field: "code_erp", url: "/machines/2" },
      ],
      error: null,
    });
    const r = await resolveScannedCode("X", ["pdr"]);
    expect(r).toHaveLength(1);
    expect(r[0].entity_type).toBe("pdr");
  });

  it("throws on supabase error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(resolveScannedCode("X")).rejects.toThrow(/boom/);
  });
});
