import { describe, it, expect } from "vitest";
import {
  computeDurationMinutes,
  formatDuration,
  isOverdue,
  computeAbattementKg,
  computeNetKg,
  kgToTonnes,
  formatKg,
} from "@/lib/reception";

describe("Réception F&L — logique métier", () => {
  describe("computeDurationMinutes", () => {
    it("calcule les minutes entre deux heures HH:mm", () => {
      expect(computeDurationMinutes("08:00", "08:12")).toBe(12);
      expect(computeDurationMinutes("09:05", "09:32")).toBe(27);
    });
    it("gère le passage minuit", () => {
      expect(computeDurationMinutes("23:50", "00:10")).toBe(20);
    });
    it("retourne null si valeurs manquantes ou invalides", () => {
      expect(computeDurationMinutes(null, "08:00")).toBeNull();
      expect(computeDurationMinutes("08:00", null)).toBeNull();
      expect(computeDurationMinutes("aa:bb", "08:00")).toBeNull();
    });
  });

  describe("isOverdue — règle > 20 min", () => {
    it("20 min reste conforme", () => {
      expect(isOverdue(20)).toBe(false);
    });
    it("21 min ou plus = hors délai", () => {
      expect(isOverdue(21)).toBe(true);
      expect(isOverdue(45)).toBe(true);
    });
    it("null → non hors délai", () => {
      expect(isOverdue(null)).toBe(false);
      expect(isOverdue(undefined)).toBe(false);
    });
  });

  describe("formatDuration", () => {
    it("affiche minutes sous 60", () => {
      expect(formatDuration(12)).toBe("12 min");
      expect(formatDuration(59)).toBe("59 min");
    });
    it("affiche heures + minutes au-delà", () => {
      expect(formatDuration(60)).toBe("1 h");
      expect(formatDuration(75)).toBe("1 h 15 min");
      expect(formatDuration(125)).toBe("2 h 05 min");
    });
    it("null → tiret", () => {
      expect(formatDuration(null)).toBe("—");
    });
  });

  describe("Calculs poids (abattement / net)", () => {
    it("abattement = brut × taux / 100", () => {
      expect(computeAbattementKg(12500, 4)).toBe(500);
      expect(computeAbattementKg(9800, 5.5)).toBeCloseTo(539, 2);
      expect(computeAbattementKg(15200, 6)).toBe(912);
    });
    it("net = brut − abattement", () => {
      expect(computeNetKg(12500, 4)).toBe(12000);
      expect(computeNetKg(9800, 5.5)).toBeCloseTo(9261, 2);
      expect(computeNetKg(15200, 6)).toBe(14288);
    });
    it("brut ou taux à 0 → abattement 0", () => {
      expect(computeAbattementKg(0, 5)).toBe(0);
      expect(computeAbattementKg(10000, 0)).toBe(0);
      expect(computeNetKg(10000, 0)).toBe(10000);
    });
  });

  describe("Formatage kg / tonnes", () => {
    it("formatKg fr-FR avec 2 décimales", () => {
      expect(formatKg(12000)).toMatch(/12[  ]000,00 kg/);
      expect(formatKg(null)).toBe("—");
    });
    it("kgToTonnes divise par 1000", () => {
      expect(kgToTonnes(12000)).toMatch(/12,000/);
      expect(kgToTonnes(null)).toBe("—");
    });
  });

  describe("Scénarios end-to-end (données seed)", () => {
    // Miroir des tickets seed RC-2026-0001..0005
    const tickets = [
      { num: "RC-2026-0001", start: "08:00", end: "08:12", brut: null, taux: 3.5, statut: "en_cours" },
      { num: "RC-2026-0002", start: "08:30", end: "08:48", brut: 12500, taux: 4.0, statut: "pese" },
      { num: "RC-2026-0003", start: "09:05", end: "09:32", brut: 9800, taux: 5.5, statut: "pese" },
      { num: "RC-2026-0004", start: "09:45", end: "10:00", brut: 15200, taux: 6.0, statut: "pese" },
      { num: "RC-2026-0005", start: "14:00", end: "14:10", brut: 8300, taux: 3.0, statut: "cloture" },
    ];

    it("identifie exactement 1 ticket hors délai (RC-2026-0003, 27 min)", () => {
      const overdue = tickets.filter((t) => isOverdue(computeDurationMinutes(t.start, t.end)));
      expect(overdue.map((t) => t.num)).toEqual(["RC-2026-0003"]);
    });

    it("calcule le tonnage net total des tickets pesés/clôturés", () => {
      const totalNet = tickets
        .filter((t) => t.brut != null)
        .reduce((s, t) => s + computeNetKg(t.brut!, t.taux), 0);
      // 12000 + 9261 + 14288 + 8051 = 43600
      expect(totalNet).toBeCloseTo(43600, 1);
    });

    it("ticket en_cours n'a pas de poids brut à pondérer", () => {
      const enCours = tickets.filter((t) => t.statut === "en_cours");
      expect(enCours).toHaveLength(1);
      expect(enCours[0].brut).toBeNull();
    });
  });
});
