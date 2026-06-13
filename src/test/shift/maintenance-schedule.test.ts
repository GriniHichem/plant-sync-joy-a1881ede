import { describe, it, expect } from "vitest";

// Réplique la logique de sélection des plans maintenance (RPC apply_maintenance_shift_schedules)
interface Schedule {
  is_active: boolean;
  auto_open: boolean;
  date_debut: string;
  date_fin: string | null;
  weekdays: number[];
  shift_type: "matin" | "apres_midi" | "nuit";
}

const DEFAULT_START: Record<string, string> = {
  matin: "06:00",
  apres_midi: "14:00",
  nuit: "22:00",
};

function isScheduleDue(s: Schedule, now: Date): boolean {
  if (!s.is_active || !s.auto_open) return false;
  const today = now.toISOString().slice(0, 10);
  if (s.date_debut > today) return false;
  if (s.date_fin && s.date_fin < today) return false;
  const dow = now.getUTCDay();
  if (s.weekdays.length > 0 && !s.weekdays.includes(dow)) return false;
  if (s.shift_type !== "nuit") {
    const nowT = now.toISOString().slice(11, 16);
    if (nowT < DEFAULT_START[s.shift_type]) return false;
  }
  return true;
}

const base: Schedule = {
  is_active: true,
  auto_open: true,
  date_debut: "2026-01-01",
  date_fin: null,
  weekdays: [],
  shift_type: "matin",
};

describe("maintenance schedule due logic", () => {
  it("matin dû après 06:00", () => {
    expect(isScheduleDue(base, new Date("2026-06-13T07:00:00Z"))).toBe(true);
    expect(isScheduleDue(base, new Date("2026-06-13T05:00:00Z"))).toBe(false);
  });

  it("nuit dû toute la journée", () => {
    const s = { ...base, shift_type: "nuit" as const };
    expect(isScheduleDue(s, new Date("2026-06-13T03:00:00Z"))).toBe(true);
  });

  it("respecte la plage de dates", () => {
    expect(isScheduleDue({ ...base, date_debut: "2026-07-01" }, new Date("2026-06-13T07:00:00Z"))).toBe(false);
    expect(isScheduleDue({ ...base, date_fin: "2026-06-01" }, new Date("2026-06-13T07:00:00Z"))).toBe(false);
  });

  it("respecte les jours de la semaine (samedi = 6)", () => {
    const sat = new Date("2026-06-13T07:00:00Z"); // samedi
    expect(isScheduleDue({ ...base, weekdays: [6] }, sat)).toBe(true);
    expect(isScheduleDue({ ...base, weekdays: [1, 2, 3, 4, 5] }, sat)).toBe(false);
  });

  it("ignore plans inactifs ou sans auto_open", () => {
    expect(isScheduleDue({ ...base, is_active: false }, new Date("2026-06-13T07:00:00Z"))).toBe(false);
    expect(isScheduleDue({ ...base, auto_open: false }, new Date("2026-06-13T07:00:00Z"))).toBe(false);
  });
});
