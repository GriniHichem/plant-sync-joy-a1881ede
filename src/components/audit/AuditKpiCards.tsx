import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Activity, ShieldOff, Bug, LogIn,
  ShieldAlert, UserCog, PackageMinus, Calendar,
  type LucideIcon,
} from "lucide-react";
import type { AuditKpis } from "@/hooks/useAuditLogs";

interface Props {
  kpis: AuditKpis;
  loading?: boolean;
  onChipClick?: (preset: KpiPreset) => void;
}

export type KpiPreset =
  | "today" | "critical" | "denied" | "errors"
  | "logins_today" | "sensitive" | "pdr_stock";

const ITEMS: Array<{
  key: keyof AuditKpis;
  label: string;
  icon: LucideIcon;
  accent: string;
  preset?: KpiPreset;
}> = [
  { key: "total",            label: "Total événements",     icon: Activity,      accent: "text-foreground" },
  { key: "today",            label: "Aujourd'hui",          icon: Calendar,      accent: "text-sky-500",     preset: "today" },
  { key: "critical",         label: "Actions critiques",    icon: ShieldAlert,   accent: "text-rose-500",    preset: "critical" },
  { key: "denied",           label: "Actions refusées",     icon: ShieldOff,     accent: "text-orange-500",  preset: "denied" },
  { key: "errors",           label: "Erreurs",              icon: Bug,           accent: "text-red-500",     preset: "errors" },
  { key: "loginsToday",      label: "Connexions du jour",   icon: LogIn,         accent: "text-emerald-500", preset: "logins_today" },
  { key: "sensitiveChanges", label: "Modifs sensibles",     icon: UserCog,       accent: "text-amber-500",   preset: "sensitive" },
  { key: "pdrStock",         label: "Activité stock PDR",   icon: PackageMinus,  accent: "text-violet-500",  preset: "pdr_stock" },
];

export function AuditKpiCards({ kpis, loading, onChipClick }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {ITEMS.map(({ key, label, icon: Icon, accent, preset }) => {
        const value = kpis[key];
        const interactive = !!preset && !!onChipClick;
        return (
          <Card
            key={key}
            onClick={() => preset && onChipClick?.(preset)}
            className={cn(
              "p-3 flex flex-col gap-1.5 border bg-card transition-all",
              interactive && "cursor-pointer hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 leading-none">
                {label}
              </span>
              <Icon size={14} className={cn("opacity-80", accent)} />
            </div>
            <div className={cn("text-2xl font-extrabold tabular-nums leading-tight", accent)}>
              {loading ? <span className="text-muted-foreground/40">—</span> : value.toLocaleString("fr-FR")}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
