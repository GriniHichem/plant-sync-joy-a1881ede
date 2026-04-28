import { describe, it, expect } from "vitest";
import {
  MODULES, MODULE_LABEL,
  NOTIF_EVENTS_BY_MODULE,
  VALIDATION_ACTIONS_BY_MODULE,
  getConditionFields,
  ROLES,
} from "@/lib/ruleCatalog";

describe("ruleCatalog", () => {
  it("MODULES have label, value, group", () => {
    for (const m of MODULES) {
      expect(m.value).toBeTruthy();
      expect(m.label).toBeTruthy();
      expect(m.group).toBeTruthy();
    }
  });

  it("MODULE_LABEL covers every module value", () => {
    for (const m of MODULES) {
      expect(MODULE_LABEL[m.value]).toBe(m.label);
    }
  });

  it("every notification event module key exists in MODULES", () => {
    const known = new Set(MODULES.map((m) => m.value));
    for (const k of Object.keys(NOTIF_EVENTS_BY_MODULE)) {
      expect(known.has(k)).toBe(true);
    }
  });

  it("every validation action module key exists in MODULES", () => {
    const known = new Set(MODULES.map((m) => m.value));
    for (const k of Object.keys(VALIDATION_ACTIONS_BY_MODULE)) {
      expect(known.has(k)).toBe(true);
    }
  });

  it("validation action defaultEnforcement is post_hoc or blocking", () => {
    for (const list of Object.values(VALIDATION_ACTIONS_BY_MODULE)) {
      for (const a of list) {
        expect(["post_hoc", "blocking"]).toContain(a.defaultEnforcement);
      }
    }
  });

  it("notification events have non-empty sample context object", () => {
    for (const list of Object.values(NOTIF_EVENTS_BY_MODULE)) {
      for (const e of list) {
        expect(typeof e.sampleContext).toBe("object");
        expect(e.value).toBeTruthy();
        expect(e.label).toBeTruthy();
      }
    }
  });

  it("getConditionFields returns a non-empty list for known and unknown modules", () => {
    expect(getConditionFields("tickets").length).toBeGreaterThan(0);
    expect(getConditionFields("__unknown__").length).toBeGreaterThan(0);
  });

  it("ROLES list is non-empty and includes admin", () => {
    expect(ROLES.length).toBeGreaterThan(0);
    expect(ROLES).toContain("admin");
  });
});
