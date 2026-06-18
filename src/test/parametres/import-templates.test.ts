import { describe, it, expect } from "vitest";
import { IMPORT_TEMPLATES, buildTemplateCsv, isValidEnumValue, ImportEntity } from "@/lib/importTemplates";

const ENTITIES: ImportEntity[] = ["machines", "equipements", "organes", "pdr"];

describe("import templates", () => {
  it("defines all four entities with rpc and unique key", () => {
    ENTITIES.forEach((e) => {
      const t = IMPORT_TEMPLATES[e];
      expect(t.entity).toBe(e);
      expect(t.rpc).toMatch(/^import_/);
      expect(t.fields.length).toBeGreaterThan(0);
      expect(t.fields.some((f) => f.key === t.uniqueKey)).toBe(true);
    });
  });

  it("marks required fields (code/reference + designation)", () => {
    expect(IMPORT_TEMPLATES.machines.fields.find((f) => f.key === "code")?.required).toBe(true);
    expect(IMPORT_TEMPLATES.pdr.fields.find((f) => f.key === "reference")?.required).toBe(true);
    ENTITIES.forEach((e) => {
      expect(IMPORT_TEMPLATES[e].fields.find((f) => f.key === "designation")?.required).toBe(true);
    });
  });

  it("builds a CSV template with UTF-8 BOM and header + sample row", () => {
    const csv = buildTemplateCsv("machines");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.replace(/^\uFEFF/, "").trim().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"code*"');
    expect(lines[0]).toContain('"famille"');
  });

  it("validates enum values case-insensitively and accepts empty", () => {
    const crit = IMPORT_TEMPLATES.machines.fields.find((f) => f.key === "criticite")!;
    expect(isValidEnumValue(crit, "")).toBe(true);
    expect(isValidEnumValue(crit, "a")).toBe(true);
    expect(isValidEnumValue(crit, "B")).toBe(true);
    expect(isValidEnumValue(crit, "X")).toBe(false);
  });

  it("treats non-enum fields as always valid", () => {
    const desig = IMPORT_TEMPLATES.machines.fields.find((f) => f.key === "designation")!;
    expect(isValidEnumValue(desig, "anything")).toBe(true);
  });
});
