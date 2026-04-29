import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Qualité module routes", () => {
  const appSource = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");

  const expectedRoutes = [
    "/qualite",
    "/qualite/of",
    "/qualite/indicateurs",
    "/qualite/controles",
    "/qualite/non-conformites",
    "/qualite/actions",
    "/qualite/recettes-nomenclatures",
    "/qualite/tracabilite",
    "/qualite/rapports",
  ];

  for (const path of expectedRoutes) {
    it(`registers route ${path}`, () => {
      expect(appSource).toContain(`path="${path}"`);
    });
  }

  it("does not modify existing GPAO/GMAO routes", () => {
    expect(appSource).toContain('path="/gpao/of"');
    expect(appSource).toContain('path="/tickets"');
    expect(appSource).toContain('path="/pdr"');
  });
});
