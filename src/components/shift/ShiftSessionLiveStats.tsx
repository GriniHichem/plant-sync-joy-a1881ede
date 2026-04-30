import { useShiftSessionStats } from "@/hooks/useShiftSessionStats";
import type { ShiftKind } from "@/contexts/ActiveShiftContext";
import { Loader2 } from "lucide-react";

interface Props {
  kind: ShiftKind;
  sessionId: string;
}

/**
 * Compact inline KPI strip rendered next to a session in the responsable console.
 */
export function ShiftSessionLiveStats({ kind, sessionId }: Props) {
  const stats = useShiftSessionStats(kind, sessionId);

  if (stats.loading) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Chargement KPIs…
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap text-xs">
      <Stat label={stats.primary.label} value={stats.primary.value} />
      <Stat label={stats.secondary.label} value={stats.secondary.value} />
      {stats.tertiary && <Stat label={stats.tertiary.label} value={stats.tertiary.value} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
