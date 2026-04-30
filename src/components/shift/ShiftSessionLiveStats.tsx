import { useShiftSessionStats } from "@/hooks/useShiftSessionStats";
import type { ShiftKind } from "@/contexts/ActiveShiftContext";
import { Loader2 } from "lucide-react";

interface Props {
  kind: ShiftKind;
  sessionId: string;
  /** Show full KPI grid (primary+secondary+tertiary+extras). Default: compact inline. */
  detailed?: boolean;
}

/**
 * Compact inline KPI strip (default) or full grid (detailed) rendered next to a
 * session in the responsable console.
 */
export function ShiftSessionLiveStats({ kind, sessionId, detailed = false }: Props) {
  const stats = useShiftSessionStats(kind, sessionId);

  if (stats.loading) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Chargement KPIs…
      </div>
    );
  }

  const all = [stats.primary, stats.secondary, ...(stats.tertiary ? [stats.tertiary] : []), ...stats.extras];

  if (detailed) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {all.map((kpi, i) => (
          <Stat key={i} label={kpi.label} value={kpi.value} hint={kpi.hint} block />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap text-xs">
      <Stat label={stats.primary.label} value={stats.primary.value} hint={stats.primary.hint} />
      <Stat label={stats.secondary.label} value={stats.secondary.value} hint={stats.secondary.hint} />
      {stats.tertiary && <Stat label={stats.tertiary.label} value={stats.tertiary.value} hint={stats.tertiary.hint} />}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  block,
}: {
  label: string;
  value: number | string;
  hint?: string;
  block?: boolean;
}) {
  return (
    <div className={`flex flex-col leading-tight ${block ? "rounded-md border border-border bg-muted/30 p-2" : ""}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
