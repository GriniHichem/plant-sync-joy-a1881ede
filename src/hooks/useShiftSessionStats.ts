import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ShiftKind } from "@/contexts/ActiveShiftContext";

export interface ShiftSessionStats {
  loading: boolean;
  /** Production: declarations count + total quantity. Maintenance: tickets created on this shift. Quality: checks count. */
  primary: { label: string; value: number | string };
  secondary: { label: string; value: number | string };
  tertiary?: { label: string; value: number | string };
}

/**
 * Live KPIs for a single shift session, used by the responsable console.
 * Subscribes to the relevant child tables so values update in real time.
 */
export function useShiftSessionStats(kind: ShiftKind, sessionId: string | null): ShiftSessionStats {
  const [stats, setStats] = useState<ShiftSessionStats>({
    loading: true,
    primary: { label: "—", value: 0 },
    secondary: { label: "—", value: 0 },
  });

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function load() {
      if (kind === "production") {
        const [{ data: decl }, { count: stops }, { count: tickets }] = await Promise.all([
          supabase
            .from("production_declarations")
            .select("quantite_produite, quantite_rebut")
            .eq("shift_id", sessionId),
          supabase
            .from("production_stops")
            .select("id", { count: "exact", head: true })
            .eq("shift_id", sessionId),
          supabase
            .from("tickets")
            .select("id", { count: "exact", head: true })
            .eq("shift_id", sessionId),
        ]);
        const total = (decl ?? []).reduce((s: number, d: any) => s + Number(d.quantite_produite || 0), 0);
        const rebut = (decl ?? []).reduce((s: number, d: any) => s + Number(d.quantite_rebut || 0), 0);
        if (cancelled) return;
        setStats({
          loading: false,
          primary: { label: "Production", value: `${total} (${rebut} rebut)` },
          secondary: { label: "Arrêts", value: stops ?? 0 },
          tertiary: { label: "Tickets", value: tickets ?? 0 },
        });
      } else if (kind === "maintenance") {
        // No direct FK from interventions to maintenance_shifts; we count interventions by the maintainer in the shift window.
        const { data: shiftRow } = await supabase
          .from("maintenance_shifts" as any)
          .select("maintenancier_id, heure_debut, heure_fin")
          .eq("id", sessionId)
          .maybeSingle();
        if (!shiftRow) {
          if (!cancelled) setStats({ loading: false, primary: { label: "Interventions", value: 0 }, secondary: { label: "Tickets clôturés", value: 0 } });
          return;
        }
        const s = shiftRow as any;
        const endTs = s.heure_fin ?? new Date().toISOString();
        const [{ count: interv }, { count: closed }] = await Promise.all([
          supabase
            .from("interventions")
            .select("id", { count: "exact", head: true })
            .eq("technicien_id", s.maintenancier_id)
            .gte("date_debut", s.heure_debut)
            .lte("date_debut", endTs),
          supabase
            .from("tickets")
            .select("id", { count: "exact", head: true })
            .eq("statut", "ferme" as any)
            .gte("heure_resolution", s.heure_debut)
            .lte("heure_resolution", endTs),
        ]);
        if (cancelled) return;
        setStats({
          loading: false,
          primary: { label: "Interventions", value: interv ?? 0 },
          secondary: { label: "Tickets clôturés", value: closed ?? 0 },
        });
      } else {
        const [{ data: checks, count: checksCount }, { count: ncs }] = await Promise.all([
          supabase
            .from("quality_checks" as any)
            .select("is_conform", { count: "exact" })
            .eq("quality_shift_id", sessionId),
          supabase
            .from("quality_non_conformities" as any)
            .select("id", { count: "exact", head: true })
            .eq("quality_shift_id", sessionId),
        ]);
        const total = checksCount ?? 0;
        const nonConf = (checks ?? []).filter((c: any) => c.is_conform === false).length;
        const rate = total > 0 ? Math.round(((total - nonConf) / total) * 100) : null;
        if (cancelled) return;
        setStats({
          loading: false,
          primary: { label: "Contrôles", value: total },
          secondary: { label: "Conformité", value: rate === null ? "—" : `${rate}%` },
          tertiary: { label: "NC", value: ncs ?? 0 },
        });
      }
    }

    load();

    // Realtime: refresh stats on relevant child table changes
    const tables =
      kind === "production"
        ? ["production_declarations", "production_stops", "tickets"]
        : kind === "maintenance"
          ? ["interventions", "tickets"]
          : ["quality_checks", "quality_non_conformities"];

    const channels = tables.map((tbl) =>
      supabase
        .channel(`stats-${kind}-${sessionId}-${tbl}`)
        .on("postgres_changes" as any, { event: "*", schema: "public", table: tbl }, () => load())
        .subscribe(),
    );

    return () => {
      cancelled = true;
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [kind, sessionId]);

  return stats;
}
