import { describe, it, expect, vi } from "vitest";

const { saveSpy, autoTableSpy } = vi.hoisted(() => ({
  saveSpy: vi.fn(),
  autoTableSpy: vi.fn(),
}));

vi.mock("jspdf", () => {
  return {
    default: class FakePdf {
      internal = { pageSize: { getWidth: () => 595 } };
      setFontSize() {}
      setFont() {}
      setTextColor() {}
      text() {}
      splitTextToSize(t: string) { return [t]; }
      save = saveSpy;
    },
  };
});
vi.mock("jspdf-autotable", () => ({ default: autoTableSpy }));

import { generateShiftReportPdf } from "@/lib/shiftReportPdf";

describe("shiftReportPdf", () => {
  it("invokes autoTable for meta + kpis + each section and saves a file", () => {
    saveSpy.mockClear();
    autoTableSpy.mockClear();

    generateShiftReportPdf({
      kind: "production",
      title: "Shift L01 — 2026-04-30",
      startedAt: new Date("2026-04-30T06:00:00Z").toISOString(),
      endedAt: new Date("2026-04-30T14:00:00Z").toISOString(),
      team: "A",
      line: "L01",
      user: "Operator 1",
      observations: "RAS",
      kpis: [
        { label: "Quantité produite", value: "1200 kg" },
        { label: "Arrêts", value: 3 },
      ],
      sections: [
        { title: "Arrêts", columns: ["Heure", "Type", "Durée"], rows: [["08:00", "Panne", "15 min"]] },
        { title: "Tickets", columns: ["N°", "Statut"], rows: [] },
      ],
    });

    // 1 meta + 1 kpis + 2 sections = 4 calls
    expect(autoTableSpy).toHaveBeenCalledTimes(4);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [filename] = saveSpy.mock.calls[0];
    expect(filename).toMatch(/^bilan_production_/);
    expect(filename).toMatch(/\.pdf$/);
  });

  it("renders empty sections with a placeholder row", () => {
    autoTableSpy.mockClear();
    generateShiftReportPdf({
      kind: "quality",
      title: "Q-Shift",
      startedAt: null,
      endedAt: null,
      kpis: [],
      sections: [{ title: "NC", columns: ["Code", "Gravité"], rows: [] }],
    });
    // Last call (sections placeholder)
    const last = autoTableSpy.mock.calls.at(-1)?.[1];
    expect(last.body).toEqual([["—"]]);
  });
});
