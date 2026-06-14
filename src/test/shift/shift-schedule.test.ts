import { describe, it, expect } from "vitest";
import {
  isoDow,
  templateBounds,
  scheduleCoversDate,
  resolveActiveSchedule,
  type ShiftTemplate,
  type ShiftSchedule,
} from "@/lib/shiftSchedule";

const matin: ShiftTemplate = {
  id: "t-matin", code: "matin", label: "Matin",
  heure_debut: "06:00", heure_fin: "14:00", crosses_midnight: false,
};
const nuit: ShiftTemplate = {
  id: "t-nuit", code: "nuit", label: "Nuit",
  heure_debut: "22:00", heure_fin: "06:00", crosses_midnight: true,
};
const templatesById = { [matin.id]: matin, [nuit.id]: nuit };

function sched(p: Partial<ShiftSchedule>): ShiftSchedule {
  return {
    id: "s1", team_id: "team1", template_id: matin.id, scope_kind: "all",
    line_ids: [], date_debut: "2026-01-01", date_fin: null, weekdays: [],
    is_active: true, ...p,
  };
}

describe("shiftSchedule engine", () => {
  it("computes ISO day of week", () => {
    expect(isoDow("2026-06-15")).toBe(1); // Monday
    expect(isoDow("2026-06-14")).toBe(7); // Sunday
  });

  it("computes regular slot bounds same day", () => {
    const { start, end } = templateBounds(matin, "2026-06-15");
    expect(start.getHours()).toBe(6);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(14);
  });

  it("computes night slot bounds crossing midnight", () => {
    const { start, end } = templateBounds(nuit, "2026-06-15");
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(22);
    expect(end.getDate()).toBe(16);
    expect(end.getHours()).toBe(6);
  });

  it("respects schedule date range and weekdays", () => {
    expect(scheduleCoversDate(sched({}), "2026-06-15")).toBe(true);
    expect(scheduleCoversDate(sched({ date_fin: "2026-06-10" }), "2026-06-15")).toBe(false);
    // Monday only
    expect(scheduleCoversDate(sched({ weekdays: [1] }), "2026-06-15")).toBe(true);
    expect(scheduleCoversDate(sched({ weekdays: [1] }), "2026-06-16")).toBe(false);
    expect(scheduleCoversDate(sched({ is_active: false }), "2026-06-15")).toBe(false);
  });

  it("flags on-shift when current time is within the template window", () => {
    const at = new Date(2026, 5, 15, 9, 0, 0); // Mon 09:00
    const res = resolveActiveSchedule([sched({})], templatesById, at);
    expect(res?.isOnShift).toBe(true);
    expect(res?.template.code).toBe("matin");
  });

  it("resolves a night slot still running after midnight (yesterday)", () => {
    const at = new Date(2026, 5, 16, 2, 0, 0); // Tue 02:00
    const res = resolveActiveSchedule(
      [sched({ template_id: nuit.id })], templatesById, at,
    );
    expect(res?.isOnShift).toBe(true);
    expect(res?.template.code).toBe("nuit");
  });

  it("returns next upcoming slot when not currently on shift", () => {
    const at = new Date(2026, 5, 15, 4, 0, 0); // Mon 04:00 (before 06:00)
    const res = resolveActiveSchedule([sched({})], templatesById, at);
    expect(res?.isOnShift).toBe(false);
    expect(res?.bounds.start.getHours()).toBe(6);
  });
});
