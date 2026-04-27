import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { AlertTriangle, Package, Wrench, Ticket, RotateCcw } from "lucide-react";

export interface SynopticFiltersState {
  statut: string; // "all" | en_marche | arret | maintenance
  criticite: string; // "all" | A | B | C
  anomaliesOnly: boolean;
  pdrCritical: boolean;
  preventiveOverdue: boolean;
  ticketsOpen: boolean;
}

export const DEFAULT_FILTERS: SynopticFiltersState = {
  statut: "all",
  criticite: "all",
  anomaliesOnly: false,
  pdrCritical: false,
  preventiveOverdue: false,
  ticketsOpen: false,
};

export function isFilterActive(f: SynopticFiltersState) {
  return (
    f.statut !== "all" ||
    f.criticite !== "all" ||
    f.anomaliesOnly ||
    f.pdrCritical ||
    f.preventiveOverdue ||
    f.ticketsOpen
  );
}

interface Props {
  value: SynopticFiltersState;
  onChange: (next: SynopticFiltersState) => void;
}

export function LineSynopticFilters({ value, onChange }: Props) {
  const set = <K extends keyof SynopticFiltersState>(k: K, v: SynopticFiltersState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <Card>
      <CardContent className="p-3 flex flex-wrap items-center gap-2">
        <Select value={value.statut} onValueChange={(v) => set("statut", v)}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_marche">En marche</SelectItem>
            <SelectItem value="arret">En panne</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>

        <Select value={value.criticite} onValueChange={(v) => set("criticite", v)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Criticité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes crit.</SelectItem>
            <SelectItem value="A">A — Critique</SelectItem>
            <SelectItem value="B">B — Importante</SelectItem>
            <SelectItem value="C">C — Standard</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-border mx-1" />

        <Toggle
          pressed={value.anomaliesOnly}
          onPressedChange={(v) => set("anomaliesOnly", v)}
          className="h-9 px-3 data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive data-[state=on]:border-destructive/40 border"
          aria-label="Anomalies seulement"
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Anomalies
        </Toggle>
        <Toggle
          pressed={value.ticketsOpen}
          onPressedChange={(v) => set("ticketsOpen", v)}
          className="h-9 px-3 data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive data-[state=on]:border-destructive/40 border"
          aria-label="Tickets ouverts"
        >
          <Ticket className="h-3.5 w-3.5 mr-1.5" /> Tickets
        </Toggle>
        <Toggle
          pressed={value.preventiveOverdue}
          onPressedChange={(v) => set("preventiveOverdue", v)}
          className="h-9 px-3 data-[state=on]:bg-amber-500/10 data-[state=on]:text-amber-700 dark:data-[state=on]:text-amber-400 data-[state=on]:border-amber-500/40 border"
          aria-label="Préventif en retard"
        >
          <Wrench className="h-3.5 w-3.5 mr-1.5" /> Prév. retard
        </Toggle>
        <Toggle
          pressed={value.pdrCritical}
          onPressedChange={(v) => set("pdrCritical", v)}
          className="h-9 px-3 data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive data-[state=on]:border-destructive/40 border"
          aria-label="PDR critique"
        >
          <Package className="h-3.5 w-3.5 mr-1.5" /> PDR crit.
        </Toggle>

        {isFilterActive(value) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-muted-foreground ml-auto"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Réinitialiser
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
