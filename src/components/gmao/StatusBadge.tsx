import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ticketStatusConfig: Record<string, { label: string; className: string; pulse?: boolean }> = {
  ouvert: { label: "Ouvert", className: "bg-destructive/10 text-destructive border-destructive/20" },
  pris_en_charge: { label: "Pris en charge", className: "bg-warning/10 text-warning border-warning/20" },
  en_cours: { label: "En cours", className: "bg-info/10 text-info border-info/20", pulse: true },
  resolu: { label: "Résolu", className: "bg-success/10 text-success border-success/20" },
  cloture: { label: "Clôturé", className: "bg-muted text-muted-foreground border-border" },
};

const machineStatusConfig: Record<string, { label: string; className: string }> = {
  en_marche: { label: "En marche", className: "bg-success/10 text-success border-success/20" },
  arret: { label: "Arrêt", className: "bg-destructive/10 text-destructive border-destructive/20" },
  maintenance: { label: "Maintenance", className: "bg-warning/10 text-warning border-warning/20" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  critique: { label: "Critique", className: "bg-destructive text-destructive-foreground" },
  haute: { label: "Haute", className: "bg-warning text-warning-foreground" },
  normale: { label: "Normale", className: "bg-info text-info-foreground" },
  basse: { label: "Basse", className: "bg-muted text-muted-foreground" },
};

const criticiteConfig: Record<string, { label: string; className: string }> = {
  A: { label: "A", className: "bg-destructive/10 text-destructive border-destructive/20" },
  B: { label: "B", className: "bg-warning/10 text-warning border-warning/20" },
  C: { label: "C", className: "bg-success/10 text-success border-success/20" },
};

interface StatusBadgeProps {
  type: "ticket" | "machine" | "priority" | "criticite";
  value: string;
  className?: string;
}

export function StatusBadge({ type, value, className }: StatusBadgeProps) {
  const configs = {
    ticket: ticketStatusConfig,
    machine: machineStatusConfig,
    priority: priorityConfig,
    criticite: criticiteConfig,
  };

  const config = configs[type][value];
  if (!config) return <Badge variant="outline">{value}</Badge>;

  return (
    <Badge variant="outline" className={cn("font-medium text-xs", config.className, className)}>
      {type === "ticket" && (config as any).pulse && (
        <span className="mr-1.5 h-2 w-2 rounded-full bg-current animate-pulse-dot inline-block" />
      )}
      {config.label}
    </Badge>
  );
}
