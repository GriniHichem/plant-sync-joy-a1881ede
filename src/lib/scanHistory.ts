/**
 * Journalisation des scans (QR / code-barres) dans `scan_history`.
 *
 * Conception : "fire-and-forget" — l'écriture est asynchrone et n'interrompt
 * jamais le flux du scanner. Une erreur d'insert est loggée en console sans
 * remonter à l'utilisateur.
 */
import { supabase } from "@/integrations/supabase/client";
import type { MatchQuality, ResolvedScan } from "@/lib/scanResolver";

export type ScanOutcome = "resolved" | "ambiguous" | "not_found" | "enrolled" | "error";
export type ScanSource = "camera" | "manual" | "enroll";

export interface LogScanInput {
  raw: string;
  normalized?: string | null;
  source: ScanSource;
  outcome: ScanOutcome;
  format?: string | null;
  matches?: ResolvedScan[] | null;
  picked?: ResolvedScan | null;
  context?: string | null;
  error?: string | null;
}

/** Devine le format probable à partir du payload. */
export function detectCodeFormat(raw: string): string {
  if (!raw) return "unknown";
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return "URL";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return "UUID";
  if (/^\d{12,14}$/.test(v)) return "EAN";
  if (/^\d{6,}$/.test(v)) return "BARCODE_NUM";
  if (/^[A-Z0-9\-_/.]{4,}$/i.test(v)) return "CODE_ALNUM";
  return "QR_TEXT";
}

/** Journalise un scan. Best-effort, ne lève jamais. */
export function logScan(input: LogScanInput): void {
  try {
    const matches = input.matches ?? [];
    const picked = input.picked ?? (matches.length === 1 ? matches[0] : null);
    const fmt = input.format ?? detectCodeFormat(input.raw);

    const row = {
      raw_value: input.raw.slice(0, 1024),
      normalized_value: (input.normalized ?? null)?.slice(0, 1024) ?? null,
      source: input.source,
      code_format: fmt,
      outcome: input.outcome,
      match_quality: (picked?.match_quality ?? null) as MatchQuality | null,
      matches_count: matches.length,
      entity_type: picked?.entity_type ?? null,
      entity_id: picked?.entity_id ?? null,
      entity_code: picked?.code ?? null,
      entity_label: picked?.label ?? null,
      context: input.context ?? null,
      error_message: input.error ?? null,
    };

    // Fire-and-forget : on n'attend pas la réponse.
    void supabase
      .from("scan_history" as any)
      .insert(row as any)
      .then(({ error }: any) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.warn("[scan_history] insert failed", error.message);
        }
      });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[scan_history] logScan threw", e);
  }
}
