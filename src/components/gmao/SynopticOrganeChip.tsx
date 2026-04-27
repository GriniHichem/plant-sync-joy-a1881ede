import { Badge } from "@/components/ui/badge";
import { Component, AlertTriangle, Package } from "lucide-react";
import type { EntityCounters, OrganeRow } from "@/hooks/useLineSynopticData";

const ORG_TYPE_LABELS: Record<string, string> = {
  moteur: "Moteur", reducteur: "Réducteur", pompe: "Pompe", verin: "Vérin",
  capteur: "Capteur", carte: "Carte", roulement: "Roulement", courroie: "Courroie",
  filtre: "Filtre", joint: "Joint", autre: "Autre",
};

function statusColor(statut: string) {
  if (statut === "en_service") return "bg-green-500";
  if (statut === "en_panne") return "bg-destructive";
  if (statut === "en_maintenance") return "bg-amber-500";
  return "bg-muted-foreground";
}

interface Props {
  organe: OrganeRow;
  counters?: EntityCounters;
  onClick?: () => void;
}

export function SynopticOrganeChip({ organe, counters, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-colors text-left"
    >
      <Component className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className={`h-2 w-2 rounded-full ${statusColor(organe.statut)} shrink-0`} />
      <span className="font-mono text-[11px] font-semibold truncate">{organe.code}</span>
      <span className="text-[11px] text-muted-foreground truncate flex-1">
        {ORG_TYPE_LABELS[organe.type] || organe.type}
      </span>
      {counters?.ticketsOpen ? (
        <Badge variant="destructive" className="h-4 px-1 text-[9px] gap-0.5">
          <AlertTriangle className="h-2.5 w-2.5" />
          {counters.ticketsOpen}
        </Badge>
      ) : null}
      {counters && (counters.pdrCritical + counters.pdrRupture) > 0 ? (
        <Badge
          variant={counters.pdrRupture > 0 ? "destructive" : "default"}
          className="h-4 px-1 text-[9px] gap-0.5"
        >
          <Package className="h-2.5 w-2.5" />
          {counters.pdrRupture + counters.pdrCritical}
        </Badge>
      ) : null}
    </button>
  );
}
