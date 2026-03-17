import { useState, useMemo, useCallback } from "react";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  subDays, subWeeks, subMonths, subQuarters, subYears,
  differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths,
  format, eachHourOfInterval, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, eachQuarterOfInterval, eachYearOfInterval,
  isWithinInterval,
} from "date-fns";
import { fr } from "date-fns/locale";

export type PresetKey =
  | "today" | "yesterday" | "this_week" | "last_week"
  | "this_month" | "last_month" | "this_quarter" | "this_year"
  | "last_7" | "last_30" | "last_90" | "custom";

export type Granularity = "hour" | "day" | "week" | "month" | "quarter" | "year";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateFilterState {
  preset: PresetKey;
  range: DateRange;
  compareEnabled: boolean;
  compareRange: DateRange | null;
  granularity: Granularity;
}

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "yesterday", label: "Hier" },
  { key: "this_week", label: "Cette semaine" },
  { key: "last_week", label: "Semaine préc." },
  { key: "this_month", label: "Ce mois" },
  { key: "last_month", label: "Mois préc." },
  { key: "this_quarter", label: "Ce trimestre" },
  { key: "this_year", label: "Cette année" },
  { key: "last_7", label: "7 derniers jours" },
  { key: "last_30", label: "30 derniers jours" },
  { key: "last_90", label: "90 derniers jours" },
  { key: "custom", label: "Personnalisé" },
];

function getPresetRange(key: PresetKey): DateRange {
  const now = new Date();
  switch (key) {
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": { const y = subDays(now, 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    case "this_week": return { from: startOfWeek(now, { locale: fr }), to: endOfDay(now) };
    case "last_week": { const s = startOfWeek(subWeeks(now, 1), { locale: fr }); return { from: s, to: endOfWeek(s, { locale: fr }) }; }
    case "this_month": return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_month": { const m = subMonths(now, 1); return { from: startOfMonth(m), to: endOfMonth(m) }; }
    case "this_quarter": return { from: startOfQuarter(now), to: endOfDay(now) };
    case "this_year": return { from: startOfYear(now), to: endOfDay(now) };
    case "last_7": return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "last_30": return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "last_90": return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    default: return { from: startOfMonth(now), to: endOfDay(now) };
  }
}

function getCompareRange(range: DateRange): DateRange {
  const days = differenceInDays(range.to, range.from);
  return {
    from: subDays(range.from, days + 1),
    to: subDays(range.from, 1),
  };
}

export function autoGranularity(range: DateRange): Granularity {
  const hours = differenceInHours(range.to, range.from);
  if (hours <= 48) return "hour";
  const days = differenceInDays(range.to, range.from);
  if (days <= 14) return "day";
  if (days <= 90) return "week";
  const months = differenceInMonths(range.to, range.from);
  if (months <= 12) return "month";
  if (months <= 36) return "quarter";
  return "year";
}

export function getTimeBuckets(range: DateRange, granularity: Granularity): Date[] {
  const interval = { start: range.from, end: range.to };
  switch (granularity) {
    case "hour": return eachHourOfInterval(interval);
    case "day": return eachDayOfInterval(interval);
    case "week": return eachWeekOfInterval(interval, { locale: fr });
    case "month": return eachMonthOfInterval(interval);
    case "quarter": return eachQuarterOfInterval(interval);
    case "year": return eachYearOfInterval(interval);
  }
}

export function formatBucketLabel(date: Date, granularity: Granularity): string {
  switch (granularity) {
    case "hour": return format(date, "HH:mm", { locale: fr });
    case "day": return format(date, "dd MMM", { locale: fr });
    case "week": return `S${format(date, "ww", { locale: fr })}`;
    case "month": return format(date, "MMM yy", { locale: fr });
    case "quarter": return `T${Math.ceil((date.getMonth() + 1) / 3)} ${format(date, "yy")}`;
    case "year": return format(date, "yyyy");
  }
}

export function filterByDateRange<T>(items: T[], range: DateRange, dateAccessor: (item: T) => string | Date): T[] {
  return items.filter((item) => {
    const d = new Date(dateAccessor(item));
    return isWithinInterval(d, { start: range.from, end: range.to });
  });
}

export function calcVariation(current: number, previous: number): { delta: number; pct: number } {
  const delta = current - previous;
  const pct = previous !== 0 ? Math.round((delta / previous) * 100) : current > 0 ? 100 : 0;
  return { delta, pct };
}

export function useDateFilter(defaultPreset: PresetKey = "this_month") {
  const [preset, setPreset] = useState<PresetKey>(defaultPreset);
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [granularityOverride, setGranularityOverride] = useState<Granularity | null>(null);

  const range = useMemo(() => {
    if (preset === "custom" && customRange) return customRange;
    return getPresetRange(preset);
  }, [preset, customRange]);

  const granularity = useMemo(() => {
    return granularityOverride || autoGranularity(range);
  }, [granularityOverride, range]);

  const compareRange = useMemo(() => {
    return compareEnabled ? getCompareRange(range) : null;
  }, [compareEnabled, range]);

  const setPresetAndClear = useCallback((key: PresetKey) => {
    setPreset(key);
    setGranularityOverride(null);
    if (key !== "custom") setCustomRange(null);
  }, []);

  const rangeLabel = useMemo(() => {
    return `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}`;
  }, [range]);

  return {
    preset, range, granularity, compareEnabled, compareRange, rangeLabel,
    setPreset: setPresetAndClear,
    setCustomRange: (r: DateRange) => { setCustomRange(r); setPreset("custom"); },
    setCompareEnabled,
    setGranularity: setGranularityOverride,
  };
}
