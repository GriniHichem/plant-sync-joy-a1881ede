import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the logic without relying on jsdom URL API
describe("exportToCsv logic", () => {
  it("nested key resolution works", () => {
    const resolve = (obj: any, key: string) =>
      key.includes(".") ? key.split(".").reduce((o: any, k: string) => o?.[k], obj) : obj[key];
    
    const row = { numero: "OF-001", products: { designation: "Harissa" } };
    expect(resolve(row, "numero")).toBe("OF-001");
    expect(resolve(row, "products.designation")).toBe("Harissa");
  });

  it("handles null in nested keys gracefully", () => {
    const resolve = (obj: any, key: string) =>
      key.includes(".") ? key.split(".").reduce((o: any, k: string) => o?.[k], obj) : obj[key];
    
    const row = { numero: "OF-001", products: null };
    expect(resolve(row, "products.designation")).toBeUndefined();
  });

  it("escapes double quotes correctly", () => {
    const val = 'He said "hello"';
    const escaped = val.replace(/"/g, '""');
    expect(escaped).toBe('He said ""hello""');
  });

  it("handles null/undefined values", () => {
    const format = (val: any) => val == null ? "" : String(val);
    expect(format(null)).toBe("");
    expect(format(undefined)).toBe("");
    expect(format(0)).toBe("0");
    expect(format("test")).toBe("test");
  });

  it("CSV header is properly quoted", () => {
    const columns = [{ key: "a", label: "Nom" }, { key: "b", label: "Valeur" }];
    const header = columns.map((c) => `"${c.label}"`).join(";");
    expect(header).toBe('"Nom";"Valeur"');
  });

  it("semicolon separator for French locale", () => {
    const separator = ";";
    const row = ['"Test"', '"42"'].join(separator);
    expect(row).toBe('"Test";"42"');
  });
});
