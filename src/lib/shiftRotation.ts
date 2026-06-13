// Pure helpers for the per-employee shift rotation engine.
// Mirrors the SQL function compute_expected_shift (Africa/Algiers timezone).

export type SlotCode = "matin" | "midi" | "nuit" | "jour";
export type PatternToken = SlotCode | "repos";

export interface SystemSlot {
  slot_code: SlotCode;
  label: string;
  heure_debut: string; // "HH:MM" or "HH:MM:SS"
  heure_fin: string;
  crosses_midnight: boolean;
}

export interface ExpectedShift {
  slot_code: SlotCode;
  start: Date;
  end: Date;
  is_now: boolean;
}

/** Number of whole days between two YYYY-MM-DD dates (b - a). */
export function dayDiff(anchor: string, target: string): number {
  const a = Date.UTC(
    Number(anchor.slice(0, 4)),
    Number(anchor.slice(5, 7)) - 1,
    Number(anchor.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(target.slice(0, 4)),
    Number(target.slice(5, 7)) - 1,
    Number(target.slice(8, 10)),
  );
  return Math.round((b - a) / 86_400_000);
}

/** Token expected on a given date for a rotation pattern (positive modulo). */
export function tokenForDate(
  pattern: PatternToken[],
  anchorDate: string,
  targetDate: string,
): PatternToken | null {
  if (!pattern || pattern.length === 0) return null;
  const diff = dayDiff(anchorDate, targetDate);
  const len = pattern.length;
  const idx = ((diff % len) + len) % len;
  return pattern[idx];
}

/** ISO day of week 1=Mon..7=Sun for a YYYY-MM-DD date. */
export function isoDow(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  const js = d.getUTCDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js;
}

/** Surface system: Mon-Fri work ("jour"), Sat/Sun rest. */
export function surfaceTokenForDate(targetDate: string): PatternToken | null {
  const dow = isoDow(targetDate);
  return dow >= 1 && dow <= 5 ? "jour" : null;
}

function hm(time: string): [number, number] {
  const [h, m] = time.split(":");
  return [Number(h), Number(m)];
}

/**
 * Build slot bounds for a local date (interpreted in the given timezone offset is
 * left to the DB; here we use the provided Date math against a local wall date).
 * For UI preview we work with local Date objects.
 */
export function slotBounds(slot: SystemSlot, localDate: string): { start: Date; end: Date } {
  const [sh, sm] = hm(slot.heure_debut);
  const [eh, em] = hm(slot.heure_fin);
  const [y, mo, d] = localDate.split("-").map(Number);
  const start = new Date(y, mo - 1, d, sh, sm, 0, 0);
  const end = new Date(y, mo - 1, d, eh, em, 0, 0);
  if (slot.crosses_midnight) end.setDate(end.getDate() + 1);
  return { start, end };
}

const TOKEN_LABELS: Record<PatternToken, string> = {
  matin: "Matin",
  midi: "Midi",
  nuit: "Nuit",
  jour: "Journée",
  repos: "Repos",
};

export function tokenLabel(token: PatternToken): string {
  return TOKEN_LABELS[token] ?? token;
}

export function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
