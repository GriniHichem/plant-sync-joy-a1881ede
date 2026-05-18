/**
 * Tests pour le helper d'historique des scans.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (_: string) => ({
      insert: (row: any) => {
        insertMock(row);
        return { then: (fn: any) => Promise.resolve({ error: null }).then(fn) };
      },
    }),
  },
}));

import { logScan, detectCodeFormat } from "@/lib/scanHistory";

describe("detectCodeFormat", () => {
  it("detects URL", () => {
    expect(detectCodeFormat("https://app.example.com/pdr/abc")).toBe("URL");
  });
  it("detects UUID", () => {
    expect(detectCodeFormat("11111111-2222-3333-4444-555555555555")).toBe("UUID");
  });
  it("detects EAN-13", () => {
    expect(detectCodeFormat("3017620422003")).toBe("EAN");
  });
  it("detects alnum codes", () => {
    expect(detectCodeFormat("ABC-123")).toBe("CODE_ALNUM");
  });
  it("falls back to QR_TEXT", () => {
    expect(detectCodeFormat("hello world")).toBe("QR_TEXT");
  });
});

describe("logScan", () => {
  beforeEach(() => insertMock.mockReset());

  it("inserts a resolved scan with picked match", () => {
    logScan({
      raw: "PDR-001",
      normalized: "PDR-001",
      source: "camera",
      outcome: "resolved",
      picked: {
        entity_type: "pdr",
        entity_id: "id-1",
        code: "PDR-001",
        label: "Vis M6",
        matched_field: "reference",
        match_quality: "exact",
        url: null,
      },
      matches: [
        {
          entity_type: "pdr", entity_id: "id-1", code: "PDR-001", label: "Vis M6",
          matched_field: "reference", match_quality: "exact", url: null,
        },
      ],
      context: "test",
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0];
    expect(row.outcome).toBe("resolved");
    expect(row.entity_type).toBe("pdr");
    expect(row.entity_code).toBe("PDR-001");
    expect(row.match_quality).toBe("exact");
    expect(row.matches_count).toBe(1);
    expect(row.code_format).toBe("CODE_ALNUM");
  });

  it("inserts an enrolled scan without entity", () => {
    logScan({ raw: "XYZ-NEW", source: "enroll", outcome: "enrolled", context: "enroll_external_ids" });
    const row = insertMock.mock.calls[0][0];
    expect(row.outcome).toBe("enrolled");
    expect(row.entity_id).toBeNull();
    expect(row.source).toBe("enroll");
  });

  it("inserts a not_found scan with empty matches", () => {
    logScan({ raw: "unknown", source: "manual", outcome: "not_found", matches: [] });
    const row = insertMock.mock.calls[0][0];
    expect(row.outcome).toBe("not_found");
    expect(row.matches_count).toBe(0);
    expect(row.entity_id).toBeNull();
  });

  it("never throws on insert failure", () => {
    insertMock.mockImplementationOnce(() => { throw new Error("boom"); });
    expect(() => logScan({ raw: "x", source: "camera", outcome: "error", error: "boom" })).not.toThrow();
  });
});
