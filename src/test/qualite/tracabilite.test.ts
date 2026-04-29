import { describe, it, expect } from "vitest";
import { buildTracabiliteCsv } from "@/pages/qualite/components/TracabiliteCsv";

describe("buildTracabiliteCsv", () => {
  const payload = {
    of: {
      numero: "OF-00001",
      product_label: "P1 – Produit, test",
      line_label: "L1 – Ligne A",
      statut: "en_cours",
      quality_status: "en_attente",
      recipe_label: "Recette A v2",
      bom_label: "BOM v1",
      quantite_prevue: 100,
      quantite_produite: 95,
      quantite_rebut: 2,
    },
    shifts: [
      { date_shift: "2026-04-28", shift_type: "matin", team_label: "Équipe 1", chef_label: "Jean Dupont" },
    ],
    consumptions: [
      { article_label: "A1 – Sucre", quantite: 50, unite: "kg", lot_number: "LOT-A", batch_number: null, supplier_lot: "SUP-9", expiry_date: "2027-01-01" },
    ],
    checks: [
      { control_time: "2026-04-28T10:00:00Z", indicator_label: "TEMP", measured: "23", is_conform: true },
      { control_time: "2026-04-28T11:00:00Z", indicator_label: "PH", measured: "9", is_conform: false },
    ],
    ncs: [
      { nc_number: "NC-00001", title: "Test, with comma", severity: "high", status: "open", decision: null },
    ],
    actions: [
      { title: "Investiguer", action_type: "corrective", status: "open", due_date: "2026-05-05" },
    ],
  };

  it("produces a csv string with all sections and BOM prefix", () => {
    const csv = buildTracabiliteCsv(payload);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("OF-00001");
    expect(csv).toContain("[Shifts]");
    expect(csv).toContain("[Consommations]");
    expect(csv).toContain("[Contrôles qualité]");
    expect(csv).toContain("[Non-conformités]");
    expect(csv).toContain("[Actions qualité]");
    expect(csv).toContain("Recette A v2");
    expect(csv).toContain("BOM v1");
    expect(csv).toContain("LOT-A");
    expect(csv).toContain("OUI");
    expect(csv).toContain("NON");
    // commas in labels are not field separators (we use ;) and quotes are escaped
    expect(csv).toContain(`"P1 – Produit, test"`);
    expect(csv).toContain(`"Test, with comma"`);
  });

  it("renders 'non lié' when no BOM", () => {
    const p = { ...payload, of: { ...payload.of, bom_label: null } };
    expect(buildTracabiliteCsv(p)).toContain("non lié");
  });
});
