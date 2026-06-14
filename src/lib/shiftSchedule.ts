// Pure helpers for the team-based shift schedule engine.
// Mirrors the SQL function get_active_shift_context (Africa/Algiers timezone).

export interface ShiftTemplate {
  id: string;
  code: string;
  label: string;
  heure_debut: string; // "HH:MM" or "HH:MM:SS"
  heure_fin: string;
  crosses_midnight: boolean;
  couleur?: string | null;
}

export interface ShiftSchedule {
  id: string;
  team_id: string;
  template_id: string;
  scope_kind: string; // maintenance | production | quality | all
  line_ids: string[];
  date_debut: string; // YYYY-MM-DD
  date_fin: string | null;
  weekdays: number[]; // ISO 1-7, empty = every day
  is_active: boolean;
}

export interface SlotBounds {
  start: Date;
  end: Date;
}

function hm(time: string): [number, number] {
  const [h, m] = time.split(":");
  return [Number(h), Number(m)];
}

/** ISO day of week 1=Mon..7=Sun for a YYYY-MM-DD date (local). */
export function isoDow(date: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const js = new Date(y, mo - 1, d).getDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js;
}

export function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build local Date bounds for a template applied on a given wall date. */
export function templateBounds(template: ShiftTemplate, localDate: string): SlotBounds {
  const [sh, sm] = hm(template.heure_debut);
  const [eh, em] = hm(template.heure_fin);
  const [y, mo, d] = localDate.split("-").map(Number);
  const start = new Date(y, mo - 1, d, sh, sm, 0, 0);
  const end = new Date(y, mo - 1, d, eh, em, 0, 0);
  if (template.crosses_midnight) end.setDate(end.getDate() + 1);
  return { start, end };
}

/** True when a schedule covers the given wall date (range + weekdays). */
export function scheduleCoversDate(schedule: ShiftSchedule, localDate: string): boolean {
  if (!schedule.is_active) return false;
  if (localDate < schedule.date_debut) return false;
  if (schedule.date_fin && localDate > schedule.date_fin) return false;
  if (schedule.weekdays && schedule.weekdays.length > 0) {
    if (!schedule.weekdays.includes(isoDow(localDate))) return false;
  }
  return true;
}

export interface ActiveResolution {
  schedule: ShiftSchedule;
  template: ShiftTemplate;
  bounds: SlotBounds;
  isOnShift: boolean;
}

/**
 * Resolve the active (or next upcoming) template at instant `at` for a set of
 * schedules, checking today and yesterday (to catch a night slot still running
 * after midnight). Mirror of get_active_shift_context ordering.
 */
export function resolveActiveSchedule(
  schedules: ShiftSchedule[],
  templatesById: Record<string, ShiftTemplate>,
  at: Date = new Date(),
): ActiveResolution | null {
  const today = formatDateLocal(at);
  const yDate = new Date(at);
  yDate.setDate(yDate.getDate() - 1);
  const candidates: string[] = [today, formatDateLocal(yDate)];

  const rows: ActiveResolution[] = [];
  for (const schedule of schedules) {
    const template = templatesById[schedule.template_id];
    if (!template) continue;
    for (const d of candidates) {
      if (!scheduleCoversDate(schedule, d)) continue;
      const bounds = templateBounds(template, d);
      const isOnShift = at >= bounds.start && at < bounds.end;
      rows.push({ schedule, template, bounds, isOnShift });
    }
  }
  if (rows.length === 0) return null;

  rows.sort((a, b) => {
    if (a.isOnShift !== b.isOnShift) return a.isOnShift ? -1 : 1;
    const aUpcoming = a.bounds.start >= at ? a.bounds.start.getTime() : Infinity;
    const bUpcoming = b.bounds.start >= at ? b.bounds.start.getTime() : Infinity;
    if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
    return b.bounds.start.getTime() - a.bounds.start.getTime();
  });

  return rows[0];
}
