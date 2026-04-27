import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wrench, Package, Component, ChevronDown } from "lucide-react";
import type { EntityCounters, EquipementRow, OrganeRow } from "@/hooks/useLineSynopticData";
import { SynopticOrganeChip } from "./SynopticOrganeChip";

const EQ_TYPE_LABELS: Record<string, string> = {
  capteur: "Capteur", actionneur: "Actionneur", convoyeur: "Convoyeur",
  peripherique: "Périphérique", utilite: "Utilité", sous_ensemble: "Sous-ensemble",
  instrument: "Instrument", autre: "Autre",
};
const EQ_STATUT_LABELS: Record<string, string> = {
  en_service: "En service", hors_service: "Hors service",
  en_maintenance: "En maintenance", reforme: "Réformé",
};

function statusColor(statut: string) {
  if (statut === "en_service") return "bg-green-500";
  if (statut === "hors_service") return "bg-destructive";
  if (statut === "en_maintenance") return "bg-amber-500";
  return "bg-muted-foreground";
}

interface Props {
  equipement: EquipementRow;
  imageUrl?: string;
  counters: EntityCounters;
  organes: OrganeRow[];
  organeCounters: Record<string, EntityCounters>;
  onClick: () => void;
  onOrganeClick: (org: OrganeRow) => void;
}

export function SynopticEquipmentCard({
  equipement: eq, imageUrl, counters, organes, organeCounters, onClick, onOrganeClick,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const visibleOrganes = showAll ? organes : organes.slice(0, 3);
  const hasCrit = counters.ticketsCritical > 0;

  return (
    <div className="space-y-2">
      <div
        onClick={onClick}
        className={`rounded-lg border-2 bg-card p-3 cursor-pointer transition-all hover:shadow-md ${
          hasCrit ? "border-destructive ring-2 ring-destructive/20" : "border-border"
        }`}
      >
        <div className="flex items-start gap-2.5">
          {imageUrl ? (
            <img src={imageUrl} alt={eq.designation} className="h-9 w-9 rounded object-cover border bg-muted shrink-0" />
          ) : (
            <div className="h-9 w-9 rounded border bg-muted flex items-center justify-center shrink-0">
              <Component className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`h-2 w-2 rounded-full ${statusColor(eq.statut)} shrink-0`} />
              <span className="font-mono text-xs font-bold text-primary truncate">{eq.code}</span>
            </div>
            <p className="text-xs text-foreground line-clamp-2 leading-snug">{eq.designation}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                {EQ_TYPE_LABELS[eq.type] || eq.type}
              </Badge>
              {eq.criticite && (
                <Badge
                  variant={eq.criticite === "A" ? "destructive" : eq.criticite === "B" ? "default" : "secondary"}
                  className="text-[9px] h-4 px-1.5 font-bold"
                >
                  {eq.criticite}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">{EQ_STATUT_LABELS[eq.statut]}</span>
            </div>
          </div>
        </div>

        {(counters.ticketsOpen + counters.preventiveOverdue + counters.pdrCritical + counters.pdrRupture) > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 mt-2 border-t">
            {counters.ticketsOpen > 0 && (
              <Badge variant="destructive" className="h-4 text-[9px] gap-1 px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" /> {counters.ticketsOpen}
              </Badge>
            )}
            {counters.preventiveOverdue > 0 && (
              <Badge className="h-4 text-[9px] gap-1 px-1.5 bg-amber-500 hover:bg-amber-500/90 text-white border-0">
                <Wrench className="h-2.5 w-2.5" /> {counters.preventiveOverdue}
              </Badge>
            )}
            {(counters.pdrRupture + counters.pdrCritical) > 0 && (
              <Badge
                variant={counters.pdrRupture > 0 ? "destructive" : "default"}
                className={`h-4 text-[9px] gap-1 px-1.5 ${counters.pdrRupture === 0 ? "bg-amber-500 hover:bg-amber-500/90 text-white border-0" : ""}`}
              >
                <Package className="h-2.5 w-2.5" /> {counters.pdrRupture + counters.pdrCritical}
              </Badge>
            )}
          </div>
        )}
      </div>

      {organes.length > 0 && (
        <div className="space-y-1 pl-3 border-l-2 border-muted">
          {visibleOrganes.map((o) => (
            <SynopticOrganeChip
              key={o.id}
              organe={o}
              counters={organeCounters[`organe:${o.id}`]}
              onClick={() => onOrganeClick(o)}
            />
          ))}
          {organes.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 text-[10px] text-muted-foreground"
              onClick={() => setShowAll((s) => !s)}
            >
              <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showAll ? "rotate-180" : ""}`} />
              {showAll ? "Réduire" : `Voir tous (${organes.length})`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
