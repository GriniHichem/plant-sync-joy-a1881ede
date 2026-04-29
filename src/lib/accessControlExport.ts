import { supabase } from "@/integrations/supabase/client";

export interface AccessControlSnapshot {
  exported_at: string;
  version: number;
  role_permissions: unknown[];
  document_permissions: unknown[];
  pdr_stock_permissions: unknown[];
  validation_permissions: unknown[];
  quality_permissions: unknown[];
  custom_roles: unknown[];
  audit_role_settings: unknown[];
  control_switches: unknown[];
}

export async function exportAccessControl(): Promise<AccessControlSnapshot> {
  const [rp, dp, pp, vp, qp, cr, ars, cs] = await Promise.all([
    supabase.from("role_permissions").select("*"),
    supabase.from("document_permissions").select("*"),
    supabase.from("pdr_stock_permissions").select("*"),
    supabase.from("validation_permissions").select("*"),
    supabase.from("quality_permissions" as any).select("*"),
    supabase.from("custom_roles" as any).select("*"),
    supabase.from("audit_role_settings" as any).select("*"),
    supabase.from("app_settings").select("*").like("key", "control.%"),
  ]);

  return {
    exported_at: new Date().toISOString(),
    version: 1,
    role_permissions: rp.data ?? [],
    document_permissions: dp.data ?? [],
    pdr_stock_permissions: pp.data ?? [],
    validation_permissions: vp.data ?? [],
    quality_permissions: qp.data ?? [],
    custom_roles: cr.data ?? [],
    audit_role_settings: ars.data ?? [],
    control_switches: cs.data ?? [],
  };
}

function escapeSqlString(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

export function generateMigrationSql(snap: AccessControlSnapshot): string {
  const lines: string[] = [
    "-- Access Control snapshot",
    `-- Exported: ${snap.exported_at}`,
    "-- Apply on a fresh self-hosted Supabase instance after running base migrations.",
    "",
  ];
  const tables: Array<{ name: string; rows: unknown[]; conflict: string }> = [
    { name: "role_permissions", rows: snap.role_permissions, conflict: "(role, module)" },
    { name: "document_permissions", rows: snap.document_permissions, conflict: "(role, entity_type)" },
    { name: "pdr_stock_permissions", rows: snap.pdr_stock_permissions, conflict: "(role)" },
    { name: "validation_permissions", rows: snap.validation_permissions, conflict: "(role)" },
    { name: "quality_permissions", rows: snap.quality_permissions, conflict: "(role)" },
    { name: "custom_roles", rows: snap.custom_roles, conflict: "(code)" },
    { name: "audit_role_settings", rows: snap.audit_role_settings, conflict: "(role, module)" },
  ];
  for (const t of tables) {
    if (!t.rows.length) continue;
    lines.push(`-- Table: ${t.name} (${t.rows.length} rows)`);
    for (const row of t.rows as Record<string, unknown>[]) {
      const cols = Object.keys(row).filter((k) => k !== "id" && k !== "created_at" && k !== "updated_at" && k !== "search_vector");
      const vals = cols.map((c) => escapeSqlString(row[c]));
      lines.push(`INSERT INTO public.${t.name} (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT ${t.conflict} DO NOTHING;`);
    }
    lines.push("");
  }
  if (snap.control_switches.length) {
    lines.push("-- Control switches (app_settings)");
    for (const s of snap.control_switches as Record<string, unknown>[]) {
      lines.push(`UPDATE public.app_settings SET value = ${escapeSqlString(s.value)} WHERE key = ${escapeSqlString(s.key)};`);
    }
  }
  return lines.join("\n");
}

export function downloadJson(snap: AccessControlSnapshot) {
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `access-control-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSql(sql: string) {
  const blob = new Blob([sql], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `access-control-migration-${new Date().toISOString().slice(0,10)}.sql`;
  a.click();
  URL.revokeObjectURL(url);
}
