import { describe, it, expect } from "vitest";
import {
  dayDiff,
  tokenForDate,
  isoDow,
  surfaceTokenForDate,
  slotBounds,
  type PatternToken,
  type SystemSlot,
} from "@/lib/shiftRotation";

describe("shiftRotation engine", () => {
  it("computes day difference correctly", () => {
    expect(dayDiff("2026-01-01", "2026-01-01")).toBe(0);
    expect(dayDiff("2026-01-01", "2026-01-09")).toBe(8);
    expect(dayDiff("2026-01-10", "2026-01-01")).toBe(-9);
  });

  it("loops a rotation pattern indefinitely (positive modulo)", () => {
    const pattern: PatternToken[] = [
      "matin", "matin", "midi", "midi", "nuit", "nuit", "repos", "repos",
    ];
    // day 0 -> matin
    expect(tokenForDate(pattern, "2026-01-01", "2026-01-01")).toBe("matin");
    // day 2 -> midi
    expect(tokenForDate(pattern, "2026-01-01", "2026-01-03")).toBe("midi");
    // day 6 -> repos
    expect(tokenForDate(pattern, "2026-01-01", "2026-01-07")).toBe("repos");
    // day 8 -> wraps back to matin
    expect(tokenForDate(pattern, "2026-01-01", "2026-01-09")).toBe("matin");
    // far future stays consistent (day 80 = 8*10)
    expect(tokenForDate(pattern, "2026-01-01", "2026-03-22")).toBe("matin");
  });

  it("handles dates before anchor with positive modulo", () => {
    const pattern: PatternToken[] = ["matin", "midi", "nuit"];
    // day -1 -> index 2 -> nuit
    expect(tokenForDate(pattern, "2026-01-02", "2026-01-01")).toBe("nuit");
  });

  it("returns null for empty pattern", () => {
    expect(tokenForDate([], "2026-01-01", "2026-01-01")).toBeNull();
  });

  it("applies surface 5/7 weekday rule", () => {
    // 2026-06-15 is a Monday
    expect(isoDow("2026-06-15")).toBe(1);
    expect(surfaceTokenForDate("2026-06-15")).toBe("jour");
    // Saturday 2026-06-13
    expect(isoDow("2026-06-13")).toBe(6);
    expect(surfaceTokenForDate("2026-06-13")).toBeNull();
    // Sunday 2026-06-14
    expect(surfaceTokenForDate("2026-06-14")).toBeNull();
  });

  it("computes night slot bounds crossing midnight", () => {
    const nuit: SystemSlot = {
      slot_code: "nuit",
      label: "Nuit",
      heure_debut: "22:00",
      heure_fin: "06:00",
      crosses_midnight: true,
    };
    const { start, end } = slotBounds(nuit, "2026-06-15");
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(22);
    expect(end.getDate()).toBe(16);
    expect(end.getHours()).toBe(6);
  });

  it("computes regular slot bounds same day", () => {
    const matin: SystemSlot = {
      slot_code: "matin",
      label: "Matin",
      heure_debut: "06:00",
      heure_fin: "14:00",
      crosses_midnight: false,
    };
    const { start, end } = slotBounds(matin, "2026-06-15");
    expect(start.getHours()).toBe(6);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(14);
  });
});
