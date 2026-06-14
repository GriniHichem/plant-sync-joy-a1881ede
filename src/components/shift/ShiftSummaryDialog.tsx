import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Loader2 } from "lucide-react";
import type { ShiftKind } from "@/contexts/ActiveShiftContext";

interface Props {
  kind: ShiftKind;
  session: any;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface BilanData {
  events: { time: string; type: string; label: string; detail?: string }[];
  totals: { label: string; value: number | string }[];
}

const TITLES: Record<ShiftKind, string> = {
  production: "Bilan de Shift Production",
  maintenance: "Bilan de Shift Maintenance",
  quality: "Bilan de Shift Contrôle Qualité",
};

/**
 * Printable HTML shift summary. Uses window.print on the dialog content
 * to generate a PDF locally (browser-driven), no jsPDF dependency.
 */
export function ShiftSummaryDialog({ kind, session, open, onOpenChange }: Props) {
  const [data, setData] = useState<BilanData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !session?.id) return;
    let cancelled = false;
    setLoading(true);
    setData(null);

    (async () => {
      const events: BilanData["events"] = [];
      const totals: BilanData["totals"] = [];

      if (kind === "production") {
        const [{ data: decl }, { data: stops }, { data: tickets }] = await Promise.all([
          supabase
            .from("production_declarations")
            .select("heure_production, quantite_produite, quantite_rebut, notes")
            .eq("shift_id", session.id)
            .order("heure_production"),
          supabase
            .from("production_stops")
            .select("heure_debut, type, duree_minutes, description")
            .eq("shift_id", session.id)
            .order("heure_debut"),
          supabase
            .from("tickets")
            .select("numero, created_at, priorite, statut, description")
            .eq("shift_id", session.id)
            .order("created_at"),
        ]);
        const totalProd = (decl ?? []).reduce((s: number, d: any) => s + Number(d.quantite_produite || 0), 0);
        const totalRebut = (decl ?? []).reduce((s: number, d: any) => s + Number(d.quantite_rebut || 0), 0);
        const totalStopMin = (stops ?? []).reduce((s: number, x: any) => s + Number(x.duree_minutes || 0), 0);
        totals.push({ label: "Quantité produite", value: totalProd });
        totals.push({ label: "Rebut", value: totalRebut });
        totals.push({ label: "Arrêts (min)", value: totalStopMin });
        totals.push({ label: "Tickets ouverts", value: (tickets ?? []).length });
        (decl ?? []).forEach((d: any) =>
          events.push({ time: d.heure_production, type: "Déclaration", label: `Qté ${d.quantite_produite} (rebut ${d.quantite_rebut ?? 0})`, detail: d.notes ?? undefined }),
        );
        (stops ?? []).forEach((s: any) =>
          events.push({ time: s.heure_debut, type: "Arrêt", label: `${String(s.type).replace("_", " ")} • ${s.duree_minutes} min`, detail: s.description }),
        );
        (tickets ?? []).forEach((t: any) =>
          events.push({ time: t.created_at, type: "Ticket", label: `${t.numero} (${t.priorite})`, detail: t.description }),
        );
      } else if (kind === "maintenance") {
        const endTs = session.heure_fin ?? new Date().toISOString();
        const [{ data: interv }, { data: closedTickets }] = await Promise.all([
          supabase
            .from("interventions")
            .select("date_debut, date_fin, description, statut, tickets(numero)")
            .eq("technicien_id", session.maintenancier_id)
            .gte("date_debut", session.heure_debut)
            .lte("date_debut", endTs)
            .order("date_debut"),
          supabase
            .from("tickets")
            .select("numero, heure_resolution, cause_racine, solution")
            .in("statut", ["resolu", "cloture"] as any)
            .gte("heure_resolution", session.heure_debut)
            .lte("heure_resolution", endTs)
            .order("heure_resolution"),
        ]);
        const totalMin = (interv ?? []).reduce((s: number, i: any) => {
          if (!i.date_debut || !i.date_fin) return s;
          return s + Math.round((new Date(i.date_fin).getTime() - new Date(i.date_debut).getTime()) / 60000);
        }, 0);
        totals.push({ label: "Interventions", value: (interv ?? []).length });
        totals.push({ label: "Tickets clôturés", value: (closedTickets ?? []).length });
        totals.push({ label: "Temps intervention (min)", value: totalMin });
        (interv ?? []).forEach((i: any) =>
          events.push({
            time: i.date_debut,
            type: "Intervention",
            label: `${i.tickets?.numero ?? "—"} • ${i.statut}`,
            detail: i.description,
          }),
        );
        (closedTickets ?? []).forEach((t: any) =>
          events.push({
            time: t.heure_resolution,
            type: "Clôture ticket",
            label: t.numero,
            detail: `Cause: ${t.cause_racine ?? "—"} | Solution: ${t.solution ?? "—"}`,
          }),
        );
      } else {
        const [{ data: checks }, { data: ncs }] = await Promise.all([
          supabase
            .from("quality_checks" as any)
            .select("control_time, is_conform, comment, quality_indicators(code, name), ordres_fabrication(numero)")
            .eq("quality_shift_id", session.id)
            .order("control_time"),
          supabase
            .from("quality_non_conformities" as any)
            .select("nc_number, detected_at, severity, nc_type, title, description")
            .eq("quality_shift_id", session.id)
            .order("detected_at"),
        ]);
        const total = (checks ?? []).length;
        const nonConf = (checks ?? []).filter((c: any) => c.is_conform === false).length;
        const rate = total > 0 ? Math.round(((total - nonConf) / total) * 100) : null;
        totals.push({ label: "Contrôles", value: total });
        totals.push({ label: "Non conformes", value: nonConf });
        totals.push({ label: "Taux conformité", value: rate === null ? "—" : `${rate}%` });
        totals.push({ label: "NC déclarées", value: (ncs ?? []).length });
        (checks ?? []).forEach((c: any) =>
          events.push({
            time: c.control_time,
            type: "Contrôle",
            label: `${c.quality_indicators?.code ?? ""} ${c.is_conform === false ? "✗" : c.is_conform === true ? "✓" : "•"}${c.ordres_fabrication?.numero ? ` • ${c.ordres_fabrication.numero}` : ""}`,
            detail: c.comment,
          }),
        );
        (ncs ?? []).forEach((n: any) =>
          events.push({
            time: n.detected_at,
            type: "NC",
            label: `${n.nc_number} • ${n.severity} • ${n.title}`,
            detail: n.description,
          }),
        );
      }

      events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      if (cancelled) return;
      setData({ events, totals });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, kind, session]);

  const operatorName =
    kind === "production"
      ? `${session?.profiles?.first_name ?? ""} ${session?.profiles?.last_name ?? ""}`.trim() || "—"
      : `${session?.profile?.first_name ?? ""} ${session?.profile?.last_name ?? ""}`.trim() || "—";

  const handlePrint = () => {
    const node = document.getElementById("shift-summary-printable");
    if (!node) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(`<html><head><title>${TITLES[kind]}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px;color:#111;}
        h1{font-size:20px;margin:0 0 4px;}
        h2{font-size:14px;margin:18px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px;}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px;}
        th,td{border:1px solid #ddd;padding:5px 8px;text-align:left;vertical-align:top;}
        th{background:#f3f4f6;}
        .meta{display:flex;flex-wrap:wrap;gap:18px;font-size:12px;color:#444;margin-bottom:8px;}
        .totals{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0;}
        .total-card{border:1px solid #ddd;padding:8px 10px;border-radius:6px;}
        .total-label{font-size:10px;text-transform:uppercase;color:#666;letter-spacing:.5px;}
        .total-value{font-size:18px;font-weight:700;}
      </style></head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{TITLES[kind]}</span>
            <Button size="sm" variant="outline" onClick={handlePrint} disabled={!data}>
              <Printer className="h-4 w-4 mr-1.5" /> Imprimer
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : data ? (
          <div id="shift-summary-printable">
            <h1>{TITLES[kind]}</h1>
            <div className="meta">
              <span><strong>Opérateur :</strong> {operatorName}</span>
              <span><strong>Date :</strong> {session?.date_shift}</span>
              <span><strong>Créneau :</strong> {String(session?.shift_type ?? "").replace("_", " ")}</span>
              <span><strong>Équipe :</strong> {session?.shift_teams?.code ?? "—"}</span>
              <span><strong>Début :</strong> {session?.heure_debut ? new Date(session.heure_debut).toLocaleString("fr-FR") : "—"}</span>
              <span><strong>Fin :</strong> {session?.heure_fin ? new Date(session.heure_fin).toLocaleString("fr-FR") : "En cours"}</span>
            </div>

            <h2>Indicateurs</h2>
            <div className="totals">
              {data.totals.map((t) => (
                <div key={t.label} className="total-card">
                  <div className="total-label">{t.label}</div>
                  <div className="total-value">{t.value}</div>
                </div>
              ))}
            </div>

            <h2>Journal ({data.events.length})</h2>
            {data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun événement enregistré.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Heure</th><th>Type</th><th>Libellé</th><th>Détail</th></tr>
                </thead>
                <tbody>
                  {data.events.map((e, i) => (
                    <tr key={i}>
                      <td className="tabular-nums">{new Date(e.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>{e.type}</td>
                      <td>{e.label}</td>
                      <td>{e.detail ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {session?.observations && (
              <>
                <h2>Observations de fin de shift</h2>
                <p className="text-sm whitespace-pre-wrap">{session.observations}</p>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
