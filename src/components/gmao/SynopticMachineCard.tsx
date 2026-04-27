import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertTriangle, Zap, Package, Wrench, ChevronDown, Image as ImageIcon,
} from "lucide-react";
import type { EntityCounters, MachineRow, OrganeRow } from "@/hooks/useLineSynopticData";
import { SynopticOrganeChip } from "./SynopticOrganeChip";

const ROLE_LABELS: Record<string, string> = {
  alimentation: "Alimentation", transformation: "Transformation", dosage: "Dosage",
  melange: "Mélange", convoyage: "Convoyage", conditionnement: "Conditionnement",
  controle: "Contrôle", evacuation: "Évacuation", utilite: "Utilité", autre: "Autre",
};
const ROLE_ICONS: Record<string, string> = {
  alimentation: "🔽", transformation: "⚙️", dosage: "⚖️",
  melange: "🔄", convoyage: "➡️", conditionnement: "📦",
  controle: "🔍", evacuation: "🔼", utilite: "🔌", autre: "🔧",
};
const IMPACT_LABELS: Record<string, string> = {
  arret_complet: "Arrêt complet", arret_partiel: "Arrêt partiel",
  degradation: "Dégradation", aucun: "Aucun",
};
const STATUS_LABELS: Record<string, string> = {
  en_marche: "En marche", arret: "En panne", maintenance: "Maintenance",
};
const DISPO_LABELS: Record<string, string> = {
  disponible: "Disponible", partiel: "Partiel", indisponible: "Indispo.",
};
const CRIT_MAINT_LABELS: Record<string, string> = {
  faible: "Faible", moyenne: "Moyenne", elevee: "Élevée", critique: "Critique",
};

function statusBarClass(statut: string) {
  if (statut === "en_marche") return "bg-green-500";
  if (statut === "arret") return "bg-destructive";
  return "bg-amber-500";
}

interface Props {
  machine: MachineRow;
  index: number;
  imageUrl?: string;
  counters: EntityCounters;
  organes: OrganeRow[];
  organeCounters: Record<string, EntityCounters>;
  onClick: () => void;
  onOrganeClick: (org: OrganeRow) => void;
  compact?: boolean;
}

export function SynopticMachineCard({
  machine: m, index, imageUrl, counters, organes, organeCounters,
  onClick, onOrganeClick, compact,
}: Props) {
  const [showAllOrganes, setShowAllOrganes] = useState(false);
  const visibleOrganes = showAllOrganes ? organes : organes.slice(0, 3);
  const hasCriticalTicket = counters.ticketsCritical > 0;
  const isStopComplete = m.impact_ligne === "arret_complet" && m.statut !== "en_marche";

  const borderClass = hasCriticalTicket
    ? "border-destructive ring-2 ring-destructive/30"
    : m.criticite === "A" || m.criticite_maintenance === "critique"
    ? "border-destructive/50 ring-1 ring-destructive/20"
    : m.criticite === "B" || m.criticite_maintenance === "elevee"
    ? "border-amber-400/50 ring-1 ring-amber-400/20"
    : "border-border";

  return (
    <div className={compact ? "w-full" : "w-[260px]"}>
      <div
        className={`relative rounded-xl border-2 bg-card cursor-pointer transition-all hover:shadow-lg overflow-hidden ${borderClass}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
      >
        {/* Top status bar */}
        <div className={`h-1.5 w-full ${statusBarClass(m.statut)}`} />

        {/* Bandeau Arrêt complet */}
        {isStopComplete && (
          <div className="bg-destructive text-destructive-foreground px-3 py-1 text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Arrêt complet de ligne
          </div>
        )}

        <div className="p-3.5">
          {/* Header row */}
          <div className="flex items-start gap-2.5 mb-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold shrink-0">
              {index + 1}
            </span>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={m.designation}
                className="h-10 w-10 rounded-md object-cover border shrink-0 bg-muted"
              />
            ) : (
              <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center shrink-0">
                <span className="text-base">{ROLE_ICONS[m.role_fonctionnel] || "🔧"}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm font-bold text-primary leading-tight truncate">{m.code}</p>
              <p className="text-xs text-foreground line-clamp-2 leading-snug">{m.designation}</p>
            </div>
          </div>

          {/* Status + Role */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <Badge variant="outline" className="text-[10px] h-5 px-2 font-normal">
              {ROLE_LABELS[m.role_fonctionnel] || "—"}
            </Badge>
            <span className="flex items-center gap-1.5 text-[11px] font-medium">
              <span className={`h-2 w-2 rounded-full ${statusBarClass(m.statut)}`} />
              {STATUS_LABELS[m.statut]}
            </span>
          </div>

          {/* Indicators */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] mb-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Crit.</span>
              <Badge
                variant={m.criticite === "A" ? "destructive" : m.criticite === "B" ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0 h-[18px] font-bold"
              >
                {m.criticite}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Maint.</span>
              <span
                className={`font-medium text-[10px] ${
                  m.criticite_maintenance === "critique"
                    ? "text-destructive"
                    : m.criticite_maintenance === "elevee"
                    ? "text-amber-600"
                    : "text-foreground"
                }`}
              >
                {CRIT_MAINT_LABELS[m.criticite_maintenance] || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Impact</span>
              <span className={`text-[10px] font-medium ${m.impact_ligne === "arret_complet" ? "text-destructive" : m.impact_ligne === "arret_partiel" ? "text-amber-600" : "text-muted-foreground"}`}>
                {IMPACT_LABELS[m.impact_ligne]}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PDR</span>
              <span className="flex items-center gap-1 text-[10px] font-medium">
                <span className={`h-2 w-2 rounded-full ${
                  m.disponibilite_pdr === "disponible" ? "bg-green-500" :
                  m.disponibilite_pdr === "partiel" ? "bg-amber-500" : "bg-destructive"
                }`} />
                {DISPO_LABELS[m.disponibilite_pdr]}
              </span>
            </div>
          </div>

          {/* Anomaly badges */}
          {(counters.ticketsOpen + counters.preventiveOverdue + counters.pdrCritical + counters.pdrRupture) > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {counters.ticketsOpen > 0 && (
                <Badge variant="destructive" className="h-5 text-[10px] gap-1 px-1.5">
                  <AlertTriangle className="h-2.5 w-2.5" /> Tickets {counters.ticketsOpen}
                </Badge>
              )}
              {counters.preventiveOverdue > 0 && (
                <Badge className="h-5 text-[10px] gap-1 px-1.5 bg-amber-500 hover:bg-amber-500/90 text-white border-0">
                  <Wrench className="h-2.5 w-2.5" /> Prév. retard {counters.preventiveOverdue}
                </Badge>
              )}
              {counters.pdrRupture > 0 && (
                <Badge variant="destructive" className="h-5 text-[10px] gap-1 px-1.5">
                  <Package className="h-2.5 w-2.5" /> PDR rupture {counters.pdrRupture}
                </Badge>
              )}
              {counters.pdrCritical > 0 && (
                <Badge className="h-5 text-[10px] gap-1 px-1.5 bg-amber-500 hover:bg-amber-500/90 text-white border-0">
                  <Package className="h-2.5 w-2.5" /> PDR critique {counters.pdrCritical}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Organes section */}
      {organes.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-1">
            Organes ({organes.length})
          </div>
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
              className="w-full h-7 text-[11px] text-muted-foreground"
              onClick={() => setShowAllOrganes((s) => !s)}
            >
              <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showAllOrganes ? "rotate-180" : ""}`} />
              {showAllOrganes ? "Réduire" : `Voir tous (${organes.length})`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
