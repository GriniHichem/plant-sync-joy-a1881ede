/**
 * Résolution d'un code scanné (QR / code-barres) vers une entité métier.
 * Appelle le RPC `resolve_scanned_code`. Retourne 0, 1 ou N résultats.
 */
import { supabase } from "@/integrations/supabase/client";

export type ScannableEntityType = "pdr" | "machine" | "organe" | "equipement";

export interface ResolvedScan {
  entity_type: ScannableEntityType;
  entity_id: string;
  code: string | null;
  label: string | null;
  matched_field: string | null;
  url: string | null;
}

export async function resolveScannedCode(
  raw: string,
  allowedTypes?: ScannableEntityType[],
): Promise<ResolvedScan[]> {
  const code = (raw ?? "").trim();
  if (!code) return [];

  const { data, error } = await supabase.rpc("resolve_scanned_code" as any, {
    p_code: code,
  });
  if (error) throw new Error(`Scan: ${error.message}`);

  let rows = ((data ?? []) as ResolvedScan[]);
  if (allowedTypes?.length) {
    rows = rows.filter((r) => allowedTypes.includes(r.entity_type));
  }
  return rows;
}
