import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";

interface Row {
  id: string;
  indicator_id: string;
  of_id: string | null;
  control_time: string;
  is_conform: boolean | null;
  controlled_by: string | null;
  unit: string | null;
  measured_value_numeric: number | null;
  measured_value_text: string | null;
  measured_value_boolean: boolean | null;
  selected_value: string | null;
  comment: string | null;
}

function displayValue(r: Row): string {
  if (r.measured_value_numeric !== null && r.measured_value_numeric !== undefined)
    return `${r.measured_value_numeric}${r.unit ? " " + r.unit : ""}`;
  if (r.selected_value) return r.selected_value;
  if (r.measured_value_text) return r.measured_value_text;
  if (r.measured_value_boolean !== null && r.measured_value_boolean !== undefined)
    return r.measured_value_boolean ? "Oui" : "Non";
  return "—";
}

export function ShiftHistoryPanel({
  qualityShiftId,
  filterOfId,
}: {
  qualityShiftId: string;
  filterOfId?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [indicators, setIndicators] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [ofNumbers, setOfNumbers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyOf, setOnlyOf] = useState(false);
  const [indicatorFilter, setIndicatorFilter] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("quality_checks")
      .select(
        "id, indicator_id, of_id, control_time, is_conform, controlled_by, unit, measured_value_numeric, measured_value_text, measured_value_boolean, selected_value, comment"
      )
      .eq("quality_shift_id", qualityShiftId)
      .order("control_time", { ascending: false })
      .limit(500);
    const list: Row[] = data || [];
    setRows(list);

    const indIds = [...new Set(list.map((r) => r.indicator_id).filter(Boolean))];
    const userIds = [...new Set(list.map((r) => r.controlled_by).filter(Boolean))] as string[];
    const ofIds = [...new Set(list.map((r) => r.of_id).filter(Boolean))] as string[];
    const [indRes, profRes, ofRes] = await Promise.all([
      indIds.length ? (supabase as any).from("quality_indicators").select("id, name, code").in("id", indIds) : Promise.resolve({ data: [] }),
      userIds.length ? (supabase as any).from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] }),
      ofIds.length ? (supabase as any).from("ordres_fabrication").select("id, numero").in("id", ofIds) : Promise.resolve({ data: [] }),
    ]);
    setIndicators(Object.fromEntries((indRes.data || []).map((i: any) => [i.id, i.name || i.code])));
    setProfiles(Object.fromEntries((profRes.data || []).map((p: any) => [p.id, p.full_name || "—"])));
    setOfNumbers(Object.fromEntries((ofRes.data || []).map((o: any) => [o.id, o.numero])));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualityShiftId]);

  const scoped = useMemo(
    () => rows.filter((r) => !(onlyOf && filterOfId) || r.of_id === filterOfId),
    [rows, onlyOf, filterOfId]
  );

  // Quick control chips: distinct indicators (with counts) within the current OF scope
  const controlChips = useMemo(() => {
    const counts = new Map<string, number>();
    scoped.forEach((r) => counts.set(r.indicator_id, (counts.get(r.indicator_id) || 0) + 1));
    return [...counts.entries()]
      .map(([id, count]) => ({ id, label: indicators[id] || "—", count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [scoped, indicators]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((r) => {
      if (indicatorFilter && r.indicator_id !== indicatorFilter) return false;
      if (!q) return true;
      const name = (indicators[r.indicator_id] || "").toLowerCase();
      const who = (profiles[r.controlled_by || ""] || "").toLowerCase();
      return name.includes(q) || who.includes(q);
    });
  }, [scoped, search, indicatorFilter, indicators, profiles]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {filterOfId && (
          <Button variant={onlyOf ? "default" : "outline"} size="sm" onClick={() => setOnlyOf((v) => !v)}>
            OF sélectionné
          </Button>
        )}
        <Input
          placeholder="Rechercher contrôle / contrôleur…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 flex-1 min-w-[200px]"
        />
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filtre rapide par contrôle */}
      {controlChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={indicatorFilter === "" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIndicatorFilter("")}
          >
            Tous
          </Button>
          {controlChips.map((c) => (
            <Button
              key={c.id}
              variant={indicatorFilter === c.id ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIndicatorFilter((v) => (v === c.id ? "" : c.id))}
            >
              {c.label}
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">{c.count}</Badge>
            </Button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground text-sm">
          Aucune saisie enregistrée pour ce shift.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-3 font-medium">Heure</th>
                <th className="py-2 pr-3 font-medium">Contrôle</th>
                <th className="py-2 pr-3 font-medium">OF</th>
                <th className="py-2 pr-3 font-medium">Valeur</th>
                <th className="py-2 pr-3 font-medium">Conformité</th>
                <th className="py-2 pr-3 font-medium">Contrôleur</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                    {new Date(r.control_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2 pr-3">{indicators[r.indicator_id] || "—"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{r.of_id ? ofNumbers[r.of_id] || "—" : "—"}</td>
                  <td className="py-2 pr-3 tabular-nums font-medium">{displayValue(r)}</td>
                  <td className="py-2 pr-3">
                    {r.is_conform === true ? (
                      <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" /> Conforme</span>
                    ) : r.is_conform === false ? (
                      <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" /> Non conforme</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{profiles[r.controlled_by || ""] || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
