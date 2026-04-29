import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED = [
  "responsable_si",
  "auditeur",
  "controleur_qualite",
  "responsable_controle_qualite",
  "directeur_qualite",
];

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Quality roles additive integration", () => {
  it("RolesMatrix exposes all 5 system/quality roles", () => {
    const src = read("src/pages/parametres/RolesMatrix.tsx");
    for (const r of REQUIRED) {
      expect(src).toContain(`key: "${r}"`);
    }
  });

  it("UsersAdmin labels every system/quality role", () => {
    const src = read("src/pages/parametres/UsersAdmin.tsx");
    for (const r of REQUIRED) {
      const re = new RegExp(`${r}:\\s*"[^"]+"`);
      expect(src).toMatch(re);
    }
  });

  it("ruleCatalog includes new quality roles", () => {
    const src = read("src/lib/ruleCatalog.ts");
    expect(src).toContain('"responsable_controle_qualite"');
    expect(src).toContain('"directeur_qualite"');
    expect(src).toContain('"controleur_qualite"');
  });

  it("AuthContext AppRole type includes the 2 new quality roles", () => {
    const src = read("src/contexts/AuthContext.tsx");
    expect(src).toContain('"responsable_controle_qualite"');
    expect(src).toContain('"directeur_qualite"');
  });
});
