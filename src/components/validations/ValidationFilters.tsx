import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw, Search } from "lucide-react";
import type { ValidationFiltersState } from "@/hooks/useValidations";

interface Props {
  value: ValidationFiltersState;
  onChange: (v: ValidationFiltersState) => void;
}

const STATUS = ["all", "submitted", "pending_post_hoc", "approved", "applied", "rejected", "cancelled", "archived"];
const STATUS_LABEL: Record<string, string> = {
  all: "Tous",
  submitted: "En attente (bloquante)",
  pending_post_hoc: "À vérifier (a posteriori)",
  approved: "Approuvée",
  applied: "Appliquée",
  rejected: "Rejetée",
  cancelled: "Annulée",
  archived: "Archivée",
};
const PRIORITIES = ["all", "low", "medium", "high", "critical"];
const ENFORCEMENTS = ["all", "post_hoc", "blocking"];
const MODULES = ["all", "pdr_stock", "tickets", "interventions", "consommations", "arrets", "gpao", "preventif"];

export function ValidationFilters({ value, onChange }: Props) {
  const set = <K extends keyof ValidationFiltersState>(k: K, v: ValidationFiltersState[K]) =>
    onChange({ ...value, [k]: v });

  const hasActive =
    !!value.search ||
    (value.status && value.status !== "all") ||
    (value.module && value.module !== "all") ||
    (value.priority && value.priority !== "all") ||
    (value.enforcement && value.enforcement !== "all") ||
    !!value.date_from || !!value.date_to;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher (titre, code, demandeur, motif…)"
          value={value.search ?? ""}
          onChange={(e) => set("search", e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <Label className="text-xs">Statut</Label>
          <Select value={value.status ?? "all"} onValueChange={(v) => set("status", v as ValidationFiltersState["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Module</Label>
          <Select value={value.module ?? "all"} onValueChange={(v) => set("module", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Priorité</Label>
          <Select value={value.priority ?? "all"} onValueChange={(v) => set("priority", v as ValidationFiltersState["priority"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Mode</Label>
          <Select value={value.enforcement ?? "all"} onValueChange={(v) => set("enforcement", v as ValidationFiltersState["enforcement"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ENFORCEMENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Du</Label>
          <Input type="date" value={value.date_from ?? ""} onChange={(e) => set("date_from", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Au</Label>
          <Input type="date" value={value.date_to ?? ""} onChange={(e) => set("date_to", e.target.value)} />
        </div>
      </div>
      {hasActive && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onChange({})}>
            <RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser
          </Button>
        </div>
      )}
    </div>
  );
}
