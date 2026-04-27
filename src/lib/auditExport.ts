import type { AuditLogRow } from "@/hooks/useAuditLogs";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : (typeof v === "object" ? JSON.stringify(v) : String(v));
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(rows: AuditLogRow[], includeTechnical = false): string {
  const baseHeaders = [
    "Date", "Utilisateur", "Email", "Module", "Action", "Type entité",
    "Code entité", "Libellé entité", "Description", "Statut", "Sévérité",
    "Source", "IP",
  ];
  const techHeaders = ["User Agent", "Champs modifiés", "Anciennes valeurs", "Nouvelles valeurs", "Métadonnées"];
  const headers = includeTechnical ? [...baseHeaders, ...techHeaders] : baseHeaders;

  const lines: string[] = [headers.join(";")];

  for (const r of rows) {
    const base = [
      r.created_at,
      r.user_full_name ?? "",
      r.user_email ?? "",
      r.module ?? "",
      r.action_label ?? r.action_type ?? r.action ?? "",
      r.entity_type ?? "",
      r.entity_code ?? "",
      r.entity_label ?? "",
      r.description ?? "",
      r.status,
      r.severity,
      r.source,
      r.ip_address ?? "",
    ];
    const tech = includeTechnical
      ? [
          r.user_agent ?? "",
          (r.changed_fields ?? []).join(", "),
          r.old_values,
          r.new_values,
          r.metadata,
        ]
      : [];
    const all = [...base, ...tech].map(csvEscape);
    lines.push(all.join(";"));
  }
  return lines.join("\r\n");
}

export function downloadCsv(rows: AuditLogRow[], includeTechnical = false): void {
  const csv = rowsToCsv(rows, includeTechnical);
  // UTF-8 BOM for Excel
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `audit_logs_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
