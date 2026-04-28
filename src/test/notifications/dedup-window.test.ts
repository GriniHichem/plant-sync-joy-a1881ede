import { describe, it, expect } from "vitest";
import { dedupWindowSince } from "@/lib/notifications";

describe("dedupWindowSince", () => {
  const tolerance = 2_000; // 2s

  function approxMs(iso: string): number {
    return Date.now() - new Date(iso).getTime();
  }

  it("immediate ≈ 5 minutes", () => {
    const ms = approxMs(dedupWindowSince("immediate"));
    expect(Math.abs(ms - 5 * 60 * 1000)).toBeLessThan(tolerance);
  });

  it("grouped_hourly ≈ 1 hour", () => {
    const ms = approxMs(dedupWindowSince("grouped_hourly"));
    expect(Math.abs(ms - 60 * 60 * 1000)).toBeLessThan(tolerance);
  });

  it("grouped_daily ≈ 24 hours", () => {
    const ms = approxMs(dedupWindowSince("grouped_daily"));
    expect(Math.abs(ms - 24 * 60 * 60 * 1000)).toBeLessThan(tolerance);
  });

  it("returns ISO string", () => {
    expect(() => new Date(dedupWindowSince("immediate")).toISOString()).not.toThrow();
  });
});
