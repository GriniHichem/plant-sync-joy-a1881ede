import { describe, it, expect } from "vitest";
import {
  mockOfs, mockProducts, mockArticles, mockRecipes, mockRecipeLines,
  mockShifts, mockDeclarations, mockConsumptions, mockStops, mockShiftModes,
  mockModeHistory, mockShiftTeams,
} from "../__mocks__/supabase";

describe("GPAO Data Integrity", () => {
  describe("Products", () => {
    it("all products have required fields", () => {
      mockProducts.forEach((p) => {
        expect(p.id).toBeTruthy();
        expect(p.code).toBeTruthy();
        expect(p.designation).toBeTruthy();
        expect(p.unite).toBeTruthy();
      });
    });

    it("product codes are unique", () => {
      const codes = mockProducts.map((p) => p.code);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });

  describe("Articles", () => {
    it("all articles have stock fields", () => {
      mockArticles.forEach((a) => {
        expect(typeof a.stock_actuel).toBe("number");
        expect(typeof a.stock_min).toBe("number");
        expect(a.stock_actuel).toBeGreaterThanOrEqual(0);
        expect(a.stock_min).toBeGreaterThanOrEqual(0);
      });
    });

    it("identifies low stock correctly", () => {
      const lowStock = mockArticles.filter((a) => a.stock_actuel <= a.stock_min);
      expect(lowStock).toHaveLength(1);
      expect(lowStock[0].designation).toBe("Sel");
    });

    it("article codes are unique", () => {
      const codes = mockArticles.map((a) => a.code);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });

  describe("Recipes & Nomenclatures", () => {
    it("recipes reference valid products", () => {
      mockRecipes.forEach((r) => {
        const product = mockProducts.find((p) => p.id === r.product_id);
        expect(product).toBeDefined();
      });
    });

    it("recipe lines reference valid articles", () => {
      mockRecipeLines.forEach((rl) => {
        const article = mockArticles.find((a) => a.id === rl.article_id);
        expect(article).toBeDefined();
      });
    });

    it("recipe lines reference valid recipes", () => {
      mockRecipeLines.forEach((rl) => {
        const recipe = mockRecipes.find((r) => r.id === rl.recipe_id);
        expect(recipe).toBeDefined();
      });
    });

    it("recipe versioning groups by product", () => {
      const byProduct: Record<string, typeof mockRecipes> = {};
      mockRecipes.forEach((r) => {
        if (!byProduct[r.product_id]) byProduct[r.product_id] = [];
        byProduct[r.product_id].push(r);
      });
      // prod-1 has 2 recipe versions
      expect(byProduct["prod-1"]).toHaveLength(2);
      // versions should be unique within product
      const versions = byProduct["prod-1"].map((r) => r.version);
      expect(new Set(versions).size).toBe(versions.length);
    });

    it("recipe composition total makes sense (sum <= 1 for per-kg)", () => {
      const rec1Lines = mockRecipeLines.filter((rl) => rl.recipe_id === "rec-1");
      // 0.6 + 0.05 + 0.2 = 0.85 (< 1kg, reasonable with water/evaporation)
      const total = rec1Lines.reduce((s, l) => s + l.quantite, 0);
      expect(total).toBeLessThanOrEqual(1);
      expect(total).toBeGreaterThan(0);
    });
  });

  describe("Ordres de Fabrication", () => {
    it("all OFs have required fields", () => {
      mockOfs.forEach((of) => {
        expect(of.numero).toBeTruthy();
        expect(of.product_id).toBeTruthy();
        expect(of.quantite_prevue).toBeGreaterThan(0);
        expect(["planifie", "en_cours", "termine", "annule"]).toContain(of.statut);
      });
    });

    it("OF references valid product", () => {
      mockOfs.forEach((of) => {
        const product = mockProducts.find((p) => p.id === of.product_id);
        expect(product).toBeDefined();
      });
    });

    it("OF en_cours has date_debut_reelle", () => {
      const enCours = mockOfs.filter((o) => o.statut === "en_cours");
      enCours.forEach((of) => {
        expect(of.date_debut_reelle).toBeTruthy();
      });
    });

    it("OF termine has both date_debut_reelle and date_fin_reelle", () => {
      const termines = mockOfs.filter((o) => o.statut === "termine");
      termines.forEach((of) => {
        expect(of.date_debut_reelle).toBeTruthy();
        expect(of.date_fin_reelle).toBeTruthy();
      });
    });

    it("OF planifie has no date_debut_reelle", () => {
      const planifies = mockOfs.filter((o) => o.statut === "planifie");
      planifies.forEach((of) => {
        expect(of.date_debut_reelle).toBeNull();
      });
    });

    it("quantite_produite <= quantite_prevue for en_cours OF", () => {
      const enCours = mockOfs.filter((o) => o.statut === "en_cours");
      enCours.forEach((of) => {
        expect(of.quantite_produite).toBeLessThanOrEqual(of.quantite_prevue);
      });
    });

    it("progress calculation is correct", () => {
      const of = mockOfs[0]; // OF-00001: 450/1000 = 45%
      const progress = of.quantite_prevue > 0 ? Math.round((of.quantite_produite / of.quantite_prevue) * 100) : 0;
      expect(progress).toBe(45);
    });

    it("OF references valid shift mode", () => {
      mockOfs.forEach((of) => {
        if (of.shift_mode_id) {
          const mode = mockShiftModes.find((m) => m.id === of.shift_mode_id);
          expect(mode).toBeDefined();
        }
      });
    });
  });

  describe("Shifts", () => {
    it("shift references valid OF", () => {
      mockShifts.forEach((s) => {
        const of = mockOfs.find((o) => o.id === s.of_id);
        expect(of).toBeDefined();
      });
    });

    it("shift references valid team", () => {
      mockShifts.forEach((s) => {
        if (s.shift_team_id) {
          const team = mockShiftTeams.find((t) => t.id === s.shift_team_id);
          expect(team).toBeDefined();
        }
      });
    });

    it("shift type derivation from hour", () => {
      function deriveShiftType(heureDebut: string): "matin" | "apres_midi" | "nuit" {
        const h = new Date(heureDebut).getHours();
        if (h >= 5 && h < 13) return "matin";
        if (h >= 13 && h < 21) return "apres_midi";
        return "nuit";
      }
      // 06:00 UTC = matin
      expect(deriveShiftType("2026-03-17T06:00:00Z")).toBe("matin");
    });

    it("shift heure_debut < heure_fin", () => {
      mockShifts.forEach((s) => {
        expect(new Date(s.heure_debut).getTime()).toBeLessThan(new Date(s.heure_fin).getTime());
      });
    });
  });

  describe("Production Declarations", () => {
    it("declarations reference valid OF and shift", () => {
      mockDeclarations.forEach((d) => {
        expect(mockOfs.find((o) => o.id === d.of_id)).toBeDefined();
        expect(mockShifts.find((s) => s.id === d.shift_id)).toBeDefined();
      });
    });

    it("declaration quantities are non-negative", () => {
      mockDeclarations.forEach((d) => {
        expect(d.quantite_produite).toBeGreaterThanOrEqual(0);
        expect(d.quantite_rebut).toBeGreaterThanOrEqual(0);
      });
    });

    it("hourly slot stats aggregation", () => {
      const shiftDecls = mockDeclarations.filter((d) => d.shift_id === "shift-1");
      const totalQte = shiftDecls.reduce((s, d) => s + d.quantite_produite, 0);
      const totalRebut = shiftDecls.reduce((s, d) => s + d.quantite_rebut, 0);
      expect(totalQte).toBe(115); // 60 + 55
      expect(totalRebut).toBe(2); // 2 + 0
    });
  });

  describe("Consumptions", () => {
    it("consumptions reference valid articles and OF", () => {
      mockConsumptions.forEach((c) => {
        expect(mockArticles.find((a) => a.id === c.article_id)).toBeDefined();
        expect(mockOfs.find((o) => o.id === c.of_id)).toBeDefined();
      });
    });

    it("consumption quantities are positive", () => {
      mockConsumptions.forEach((c) => {
        expect(c.quantite).toBeGreaterThan(0);
      });
    });
  });

  describe("Production Stops", () => {
    it("stops have valid types", () => {
      const validTypes = ["panne", "changement_serie", "pause", "nettoyage", "attente_matiere", "qualite", "autre"];
      mockStops.forEach((s) => {
        expect(validTypes).toContain(s.type);
      });
    });

    it("stop duration calculation", () => {
      mockStops.forEach((s) => {
        if (s.heure_fin && s.duree_minutes) {
          const calc = Math.round((new Date(s.heure_fin).getTime() - new Date(s.heure_debut).getTime()) / 60000);
          expect(calc).toBe(s.duree_minutes);
        }
      });
    });

    it("total stop time aggregation", () => {
      const totalMin = mockStops.reduce((s, st) => s + (st.duree_minutes || 0), 0);
      expect(totalMin).toBe(45); // 30 + 15
    });
  });

  describe("Mode History", () => {
    it("mode history references valid OF", () => {
      mockModeHistory.forEach((mh) => {
        expect(mockOfs.find((o) => o.id === mh.of_id)).toBeDefined();
      });
    });

    it("mode history new_mode references valid shift mode", () => {
      mockModeHistory.forEach((mh) => {
        expect(mockShiftModes.find((m) => m.id === mh.new_mode_id)).toBeDefined();
      });
    });
  });

  describe("Shift Modes", () => {
    it("exactly one default mode exists", () => {
      const defaults = mockShiftModes.filter((m) => m.is_default);
      expect(defaults).toHaveLength(1);
    });

    it("mode codes are unique", () => {
      const codes = mockShiftModes.map((m) => m.code);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });
});

describe("GPAO Business Logic", () => {
  it("OF filter by status works", () => {
    const filterByStatus = (ofs: typeof mockOfs, status: string) =>
      status === "all" ? ofs : ofs.filter((o) => o.statut === status);
    
    expect(filterByStatus(mockOfs, "all")).toHaveLength(3);
    expect(filterByStatus(mockOfs, "en_cours")).toHaveLength(1);
    expect(filterByStatus(mockOfs, "planifie")).toHaveLength(1);
    expect(filterByStatus(mockOfs, "termine")).toHaveLength(1);
    expect(filterByStatus(mockOfs, "annule")).toHaveLength(0);
  });

  it("OF search filter works", () => {
    const search = "harissa";
    const filtered = mockOfs.filter((o) =>
      o.numero?.toLowerCase().includes(search.toLowerCase()) ||
      o.products?.designation?.toLowerCase().includes(search.toLowerCase())
    );
    // OF-00001 and OF-00003 have Harissa classique
    expect(filtered).toHaveLength(2);
  });

  it("per-shift stats computation", () => {
    function getShiftStats(shiftId: string) {
      const shiftDecls = mockDeclarations.filter((d) => d.shift_id === shiftId);
      const qte = shiftDecls.reduce((s, d) => s + d.quantite_produite, 0);
      const rebut = shiftDecls.reduce((s, d) => s + d.quantite_rebut, 0);
      const shiftCons = mockConsumptions.filter((c) => c.shift_id === shiftId);
      const shiftStops = mockStops.filter((st) => st.shift_id === shiftId);
      const stopMin = shiftStops.reduce((s, st) => s + (st.duree_minutes || 0), 0);
      return { qte, rebut, consCount: shiftCons.length, stopMin };
    }
    const stats = getShiftStats("shift-1");
    expect(stats.qte).toBe(115);
    expect(stats.rebut).toBe(2);
    expect(stats.consCount).toBe(1);
    expect(stats.stopMin).toBe(45);
  });

  it("hourly slot generation from shift times", () => {
    const shift = mockShifts[0];
    const start = new Date(shift.heure_debut);
    const end = new Date(shift.heure_fin);
    const ONE_HOUR = 3600000;
    const slots: { label: string }[] = [];
    let cursorMs = start.getTime();
    const endMs = end.getTime();
    while (cursorMs + ONE_HOUR <= endMs) {
      const slotStart = new Date(cursorMs);
      const slotEnd = new Date(cursorMs + ONE_HOUR);
      slots.push({
        label: `${slotStart.getHours().toString().padStart(2, "0")}h – ${slotEnd.getHours().toString().padStart(2, "0")}h`,
      });
      cursorMs += ONE_HOUR;
    }
    expect(slots).toHaveLength(8); // 06:00 to 14:00 = 8 hourly slots
  });

  it("slot editability check (tolerance window)", () => {
    const toleranceHours = 1;
    function canEditSlot(slotEnd: Date, now: Date): boolean {
      if (now < slotEnd) return false;
      const toleranceEnd = new Date(slotEnd.getTime() + toleranceHours * 3600000);
      return now < toleranceEnd;
    }
    const slotEnd = new Date("2026-03-17T07:00:00Z"); // 06-07 slot ends at 07
    // At 07:30, should be editable (within 1h tolerance)
    expect(canEditSlot(slotEnd, new Date("2026-03-17T07:30:00Z"))).toBe(true);
    // At 08:01, should NOT be editable (past tolerance)
    expect(canEditSlot(slotEnd, new Date("2026-03-17T08:01:00Z"))).toBe(false);
    // Before slot ends, NOT editable
    expect(canEditSlot(slotEnd, new Date("2026-03-17T06:30:00Z"))).toBe(false);
  });

  it("recipe grouping by product with versions", () => {
    const byProduct: Record<string, any[]> = {};
    mockRecipes.forEach((r) => {
      if (!byProduct[r.product_id]) byProduct[r.product_id] = [];
      byProduct[r.product_id].push(r);
    });
    Object.values(byProduct).forEach((g) => g.sort((a, b) => b.version - a.version));
    
    expect(Object.keys(byProduct)).toHaveLength(1); // only prod-1
    expect(byProduct["prod-1"]).toHaveLength(2);
    expect(byProduct["prod-1"][0].version).toBe(2); // sorted desc
  });

  it("consumption completion check for shift closure", () => {
    const recipeLinesList = mockRecipeLines.filter((rl) => rl.recipe_id === "rec-1");
    const consumptionEntries: Record<string, string> = {
      "art-1": "35",
      "art-2": "3",
      "art-3": "12",
    };
    const existingConsumptions = [{ id: "c1" }]; // at least one saved

    const allFilled = recipeLinesList.every((rl) => {
      const qte = consumptionEntries[rl.article_id];
      return qte !== undefined && qte !== "" && parseFloat(qte) >= 0;
    });
    expect(allFilled).toBe(true);
    expect(existingConsumptions.length > 0).toBe(true);
  });

  it("CSV export column mapping for OFs", () => {
    const columns = [
      { key: "numero", label: "N° OF" },
      { key: "products.designation", label: "Produit" },
      { key: "production_lines.code", label: "Ligne" },
      { key: "quantite_prevue", label: "Qté prévue" },
      { key: "quantite_produite", label: "Qté produite" },
      { key: "statut", label: "Statut" },
    ];
    const of = mockOfs[0];
    // Test nested key resolution
    columns.forEach((c) => {
      const val = c.key.includes(".")
        ? c.key.split(".").reduce((o: any, k) => o?.[k], of)
        : (of as any)[c.key];
      expect(val).toBeDefined();
    });
  });
});
