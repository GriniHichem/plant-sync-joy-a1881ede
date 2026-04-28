import { describe, it, expect } from "vitest";
import { preflightNotifRule } from "@/lib/ruleValidation";

const base = {
  name: "Règle X",
  module: "tickets",
  event_type: "ticket_created",
  target_roles: ["resp_maintenance"],
  channels: ["in_app"],
  severity: "info",
  is_critical: false,
  conditions: null,
};

describe("preflightNotifRule", () => {
  it("accepts a valid rule", () => {
    const r = preflightNotifRule(base);
    expect(r.errors).toHaveLength(0);
  });

  it("flags missing name/module/event", () => {
    const r = preflightNotifRule({ ...base, name: "", module: "", event_type: "" });
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects unknown module without allowCustom", () => {
    const r = preflightNotifRule({ ...base, module: "alien" });
    expect(r.errors.some((e) => e.includes("alien"))).toBe(true);
  });

  it("accepts unknown module with allowCustom", () => {
    const r = preflightNotifRule({ ...base, module: "alien", allowCustom: true });
    expect(r.errors).toHaveLength(0);
  });

  it("warns on non-standard event for known module", () => {
    const r = preflightNotifRule({ ...base, event_type: "totally_made_up" });
    expect(r.warnings.some((w) => w.includes("totally_made_up"))).toBe(true);
  });

  it("warns when no recipients", () => {
    const r = preflightNotifRule({ ...base, target_roles: [], target_users: [] });
    expect(r.warnings.some((w) => /destinataire/i.test(w))).toBe(true);
  });

  it("errors when no channels", () => {
    const r = preflightNotifRule({ ...base, channels: [] });
    expect(r.errors.some((e) => /canal/i.test(e))).toBe(true);
  });

  it("warns critical without email channel", () => {
    const r = preflightNotifRule({ ...base, severity: "critical", channels: ["in_app"] });
    expect(r.warnings.some((w) => /email/i.test(w))).toBe(true);
  });

  it("warns critical + quiet hours", () => {
    const r = preflightNotifRule({ ...base, is_critical: true, quiet_hours_enabled: true });
    expect(r.warnings.some((w) => /silencieuses/i.test(w))).toBe(true);
  });

  it("errors on invalid JSON conditions string", () => {
    const r = preflightNotifRule({ ...base, conditions: "{not json" });
    expect(r.errors.some((e) => /JSON/.test(e))).toBe(true);
  });

  it("accepts valid JSON conditions string", () => {
    const r = preflightNotifRule({ ...base, conditions: '{"all":[]}' });
    expect(r.errors.some((e) => /JSON/.test(e))).toBe(false);
  });
});
