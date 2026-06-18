import { describe, expect, it } from "vitest";
import {
  FALLBACK_MODULE,
  KNOWN_MODULE_KEYS,
  getModuleDefinition,
  listModules,
  listModulesByGroup,
} from "@/lib/searchCatalog";

describe("searchCatalog", () => {
  it("exposes all modules indexed in Phase 1 (DB)", () => {
    // Si on ajoute une table indexée DB, elle DOIT être enregistrée ici.
    // Les clés correspondent aux noms de module renvoyés par le RPC global_search.
    const expected = [
      "machines",
      "equipements",
      "organes",
      "lignes",
      "pdr",
      "tickets",
      "interventions",
      "of",
      "products",
      "articles",
      "recipes",
      "consommations",
      "arrets",
      "preventif",
      "notifications",
      "audit",
      "validations",
      "documents",
      "pdr_movements",
      "fournisseurs",
      "quality_nc",
      "quality_actions",
    ].sort();
    expect([...KNOWN_MODULE_KEYS].sort()).toEqual(expected);
  });

  it("each module has icon, label, group and buildUrl()", () => {
    for (const m of listModules()) {
      expect(m.label).toBeTruthy();
      expect(m.pluralLabel).toBeTruthy();
      expect(m.icon).toBeTruthy();
      expect(m.group).toMatch(
        /Industriel|Production|Maintenance|Qualité|Stock|Système/,
      );
      expect(typeof m.buildUrl).toBe("function");
      const url = m.buildUrl("abc-123");
      expect(url.startsWith("/")).toBe(true);
    }
  });

  it("returns a definition for known module key", () => {
    const def = getModuleDefinition("tickets");
    expect(def).not.toBeNull();
    expect(def?.label).toBe("Ticket");
    expect(def?.buildUrl("xyz")).toBe("/tickets/xyz");
  });

  it("returns null for unknown module key", () => {
    expect(getModuleDefinition("not_a_table")).toBeNull();
  });

  it("groups modules by category for facet rendering", () => {
    const groups = listModulesByGroup();
    expect(Object.keys(groups).sort()).toEqual(
      ["Industriel", "Maintenance", "Production", "Qualité", "Stock", "Système"].sort(),
    );
    expect(groups.Maintenance.some((m) => m.key === "tickets")).toBe(true);
    expect(groups.Production.some((m) => m.key === "of")).toBe(true);
    expect(groups.Qualité.some((m) => m.key === "quality_nc")).toBe(true);
    expect(groups.Stock.some((m) => m.key === "pdr")).toBe(true);
  });

  it("FALLBACK_MODULE remains a valid definition", () => {
    expect(FALLBACK_MODULE.icon).toBeTruthy();
    expect(FALLBACK_MODULE.buildUrl("x")).toContain("x");
  });
});
