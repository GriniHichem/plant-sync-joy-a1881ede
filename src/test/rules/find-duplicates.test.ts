import { describe, it, expect } from "vitest";
import { findDuplicates, ruleSignature } from "@/lib/ruleValidation";

interface R { id: string; module: string; conditions: unknown; is_active: boolean; key: string }
const keyOf = (r: R) => r.key;

describe("findDuplicates", () => {
  it("returns empty when no duplicates", () => {
    const dups = findDuplicates(
      [
        { id: "1", module: "tickets", conditions: { p: "high" }, is_active: true, key: "ticket_created" },
        { id: "2", module: "tickets", conditions: { p: "low" }, is_active: true, key: "ticket_created" },
      ],
      keyOf,
    );
    expect(dups.size).toBe(0);
  });

  it("detects two active identical rules", () => {
    const dups = findDuplicates(
      [
        { id: "1", module: "tickets", conditions: { p: "high" }, is_active: true, key: "ticket_created" },
        { id: "2", module: "tickets", conditions: { p: "high" }, is_active: true, key: "ticket_created" },
      ],
      keyOf,
    );
    expect(dups.size).toBe(1);
    const ids = Array.from(dups.values())[0];
    expect(ids).toEqual(expect.arrayContaining(["1", "2"]));
  });

  it("ignores inactive rules", () => {
    const dups = findDuplicates(
      [
        { id: "1", module: "tickets", conditions: { p: "high" }, is_active: false, key: "ticket_created" },
        { id: "2", module: "tickets", conditions: { p: "high" }, is_active: false, key: "ticket_created" },
      ],
      keyOf,
    );
    expect(dups.size).toBe(0);
  });

  it("detects multiple duplicate groups", () => {
    const dups = findDuplicates(
      [
        { id: "1", module: "tickets", conditions: null, is_active: true, key: "ticket_created" },
        { id: "2", module: "tickets", conditions: null, is_active: true, key: "ticket_created" },
        { id: "3", module: "pdr_stock", conditions: null, is_active: true, key: "pdr_stock_out" },
        { id: "4", module: "pdr_stock", conditions: null, is_active: true, key: "pdr_stock_out" },
      ],
      keyOf,
    );
    expect(dups.size).toBe(2);
  });
});

describe("ruleSignature", () => {
  it("is stable across calls for same input", () => {
    const a = ruleSignature({ module: "x", key: "k", conditions: { a: 1 } });
    const b = ruleSignature({ module: "x", key: "k", conditions: { a: 1 } });
    expect(a).toBe(b);
  });

  it("differs when conditions differ", () => {
    const a = ruleSignature({ module: "x", key: "k", conditions: { a: 1 } });
    const b = ruleSignature({ module: "x", key: "k", conditions: { a: 2 } });
    expect(a).not.toBe(b);
  });
});
