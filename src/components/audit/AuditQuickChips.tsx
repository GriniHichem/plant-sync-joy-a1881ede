import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Calendar, CalendarDays, CalendarRange, ShieldAlert, ShieldOff,
  UserCog, PackageMinus, Wrench, Trash2, Bug,
  type LucideIcon,
} from "lucide-react";
import type { AuditFilters } from "@/hooks/useAuditLogs";

export type QuickPreset =
  | "today" | "week" | "month"
  | "critical" | "denied" | "user_role_changes"
  | "stock_movements" | "production_corrections" | "deletions" | "errors";

const PRESETS: Array<{ key: QuickPreset; label: string; icon: LucideIcon; accent?: string }> = [
  { key: "today",  label: "Aujourd'hui",   icon: Calendar },
  { key: "week",   label: "Cette semaine", icon: CalendarDays },
  { key: "month",  label: "Ce mois",       icon: CalendarRange },
  { key: "critical", label: "Critiques",   icon: ShieldAlert,   accent: "text-rose-600" },
  { key: "denied",   label: "Refusés",     icon: ShieldOff,     accent: "text-orange-600" },
  { key: "user_role_changes", label: "Rôles & users", icon: UserCog, accent: "text-amber-600" },
  { key: "stock_movements",   label: "Stock PDR",     icon: PackageMinus, accent: "text-violet-600" },
  { key: "production_corrections", label: "Corrections prod.", icon: Wrench, accent: "text-blue-600" },
  { key: "deletions", label: "Suppressions",  icon: Trash2, accent: "text-red-600" },
  { key: "errors",    label: "Erreurs",       icon: Bug,    accent: "text-red-600" },
];

function startOfToday(): string { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
function startOfWeek(): string {
  const d = new Date(); d.setHours(0,0,0,0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0,10);
}
function startOfMonth(): string {
  const d = new Date(); d.setDate(1); d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}

export function applyQuickPreset(preset: QuickPreset, base: AuditFilters): AuditFilters {
  const today = new Date().toISOString().slice(0,10);
  switch (preset) {
    case "today":  return { ...base, dateFrom: startOfToday(), dateTo: today };
    case "week":   return { ...base, dateFrom: startOfWeek(),  dateTo: today };
    case "month":  return { ...base, dateFrom: startOfMonth(), dateTo: today };
    case "critical": return { ...base, severity: "critical" };
    case "denied":   return { ...base, status: "denied" };
    case "user_role_changes": return { ...base, actionType: "role_change" };
    case "stock_movements":   return { ...base, module: "pdr_stock" };
    case "production_corrections": return { ...base, actionType: "production_correction" };
    case "deletions": return { ...base, actionType: "delete" };
    case "errors":    return { ...base, actionType: "error" };
  }
}

interface Props {
  active?: QuickPreset | null;
  onSelect: (preset: QuickPreset) => void;
}

export function AuditQuickChips({ active, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map(({ key, label, icon: Icon, accent }) => (
        <Button
          key={key}
          size="sm"
          variant={active === key ? "default" : "outline"}
          onClick={() => onSelect(key)}
          className="h-8 text-xs font-semibold gap-1.5"
        >
          <Icon size={13} className={cn(active !== key && accent)} />
          {label}
        </Button>
      ))}
    </div>
  );
}
