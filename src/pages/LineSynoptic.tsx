import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, ChevronRight, Settings, AlertTriangle, CheckCircle2,
  XCircle, Wrench, Package, Zap, Component, Factory, CalendarCheck,
} from "lucide-react";

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
  degradation: "Dégradation", aucun: "Aucun impact",
};
const CRIT_MAINT_LABELS: Record<string, string> = {
  faible: "Faible", moyenne: "Moyenne", elevee: "Élevée", critique: "Critique",
};
const DISPO_LABELS: Record<string, string> = {
  disponible: "Disponible", partiel: "Partiel", indisponible: "Indisponible",
};
const STATUS_LABELS: Record<string, string> = {
  en_marche: "En marche", arret: "Arrêt", maintenance: "Maintenance",
};
const EQ_TYPE_LABELS: Record<string, string> = {
  capteur: "Capteur", actionneur: "Actionneur", convoyeur: "Convoyeur",
  peripherique: "Périphérique", utilite: "Utilité", sous_ensemble: "Sous-ensemble",
  instrument: "Instrument", autre: "Autre",
};
const EQ_STATUT_LABELS: Record<string, string> = {
  en_service: "En service", hors_service: "Hors service",
  en_maintenance: "En maintenance", reforme: "Réformé",
};

function StatusDot({ statut }: { statut: string }) {
  const cls =
    statut === "en_marche"
      ? "bg-green-500 shadow-[0_0_6px_hsl(142,71%,35%,0.5)]"
      : statut === "arret"
      ? "bg-destructive shadow-[0_0_6px_hsl(var(--destructive)/0.5)]"
      : "bg-amber-500 shadow-[0_0_6px_hsl(38,92%,50%,0.5)]";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls} animate-pulse`} />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-medium">
        {STATUS_LABELS[statut] || statut}
      </TooltipContent>
    </Tooltip>
  );
}

function critBorderClass(criticite: string, critMaint: string) {
  if (criticite === "A" || critMaint === "critique")
    return "border-destructive/50 ring-1 ring-destructive/20";
  if (criticite === "B" || critMaint === "elevee")
    return "border-amber-400/50 ring-1 ring-amber-400/20";
  return "border-border";
}

function statusBarClass(statut: string) {
  if (statut === "en_marche") return "bg-green-500";
  if (statut === "arret") return "bg-destructive";
  return "bg-amber-500";
}

interface MachineBlock {
  id: string;
  code: string;
  designation: string;
  statut: string;
  criticite: string;
  criticite_maintenance: string;
  role_fonctionnel: string;
  impact_ligne: string;
  disponibilite_pdr: string;
  sort_order: number;
}

interface EquipBlock {
  id: string;
  code: string;
  designation: string;
  type: string;
  statut: string;
  criticite: string;
  role_fonctionnel: string;
  machine_id: string | null;
}

export default function LineSynoptic() {
  const { id } = useParams();
  const navigate = useNavWithFrom();
  const goBack = useSmartBack("/lignes");
  const [line, setLine] = useState<any>(null);
  const [machines, setMachines] = useState<MachineBlock[]>([]);
  const [equipments, setEquipments] = useState<EquipBlock[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [lRes, mlaRes, eqRes] = await Promise.all([
        supabase.from("production_lines").select("*").eq("id", id).single(),
        supabase.from("machine_line_assignments")
          .select("sort_order, priority, machines(id, code, designation, statut, criticite, criticite_maintenance, role_fonctionnel, impact_ligne, disponibilite_pdr)")
          .eq("line_id", id)
          .order("sort_order"),
        supabase.from("equipements")
          .select("id, code, designation, type, statut, criticite, role_fonctionnel, machine_id")
          .eq("line_id", id)
          .order("code"),
      ]);
      setLine(lRes.data);
      setMachines(
        (mlaRes.data || []).map((r: any) => ({
          ...r.machines,
          sort_order: r.sort_order,
        }))
      );
      setEquipments(eqRes.data || []);
    };
    load();
  }, [id]);

  if (!line) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  // Group equipments by machine for display under each block
  const equipsByMachine = new Map<string, EquipBlock[]>();
  const standaloneEquips: EquipBlock[] = [];
  equipments.forEach((eq) => {
    if (eq.machine_id && machines.some((m) => m.id === eq.machine_id)) {
      const list = equipsByMachine.get(eq.machine_id) || [];
      list.push(eq);
      equipsByMachine.set(eq.machine_id, list);
    } else {
      standaloneEquips.push(eq);
    }
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            {line.code} — {line.designation}
          </h1>
          <p className="text-muted-foreground text-sm">
            Synoptique de ligne
            {line.atelier && <> • {line.atelier}</>}
            {" "}• {machines.length} machine(s) • {equipments.length} équipement(s)
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/preventif?line=${id}`)} className="h-10">
          <CalendarCheck className="h-4 w-4 mr-2" /> Plans préventifs
        </Button>
        <Button variant="outline" onClick={() => navigate(`/lignes/${id}/config`)} className="h-10">
          <Settings className="h-4 w-4 mr-2" /> Configurer
        </Button>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground text-[11px] uppercase tracking-wide">Légende</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> En marche
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Arrêt
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Maintenance
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1.5">
            <Package className="h-3 w-3" /> PDR
            <span className="h-2 w-2 rounded-full bg-green-500" />OK
            <span className="h-2 w-2 rounded-full bg-amber-500" />Partiel
            <span className="h-2 w-2 rounded-full bg-destructive" />Indispo.
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-1 rounded-sm bg-destructive/60" /> Critique
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-1 rounded-sm bg-amber-400/60" /> Élevée
          </span>
        </CardContent>
      </Card>

      {/* Synoptic Flow */}
      {machines.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Factory className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium mb-1">Aucune machine configurée</p>
            <p className="text-sm mb-4">Configurez le processus de cette ligne pour afficher le synoptique.</p>
            <Button onClick={() => navigate(`/lignes/${id}/config`)}>
              <Settings className="h-4 w-4 mr-2" /> Configurer la ligne
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex items-stretch gap-0 min-w-max py-4 px-1">
            {machines.map((m, idx) => {
              const border = critBorderClass(m.criticite, m.criticite_maintenance);
              const machineEquips = equipsByMachine.get(m.id) || [];
              const dispoColor =
                m.disponibilite_pdr === "disponible" ? "bg-green-500" :
                m.disponibilite_pdr === "partiel" ? "bg-amber-500" : "bg-destructive";

              return (
                <div key={m.id} className="flex items-stretch">
                  {/* Machine column */}
                  <div className="flex flex-col items-center">
                    {/* Machine card */}
                    <div
                      className={`relative w-[240px] rounded-xl border-2 bg-card cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden ${border}`}
                      onClick={() => navigate(`/machines/${m.id}`)}
                    >
                      {/* Top status bar */}
                      <div className={`h-1.5 w-full ${statusBarClass(m.statut)}`} />

                      {/* Content */}
                      <div className="p-4 pb-3">
                        {/* Header: position + status */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-lg leading-none">{ROLE_ICONS[m.role_fonctionnel] || "🔧"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusDot statut={m.statut} />
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {STATUS_LABELS[m.statut]}
                            </span>
                          </div>
                        </div>

                        {/* Machine code - full display */}
                        <p className="font-mono text-sm font-bold text-primary leading-tight mb-0.5">
                          {m.code}
                        </p>
                        {/* Designation - wrap instead of truncate */}
                        <p className="text-sm leading-snug text-foreground mb-2 line-clamp-2">
                          {m.designation}
                        </p>

                        {/* Role */}
                        <div className="flex items-center gap-1.5 mb-3">
                          <Badge variant="outline" className="text-[11px] h-5 px-2 font-normal">
                            {ROLE_LABELS[m.role_fonctionnel] || "—"}
                          </Badge>
                        </div>

                        {/* Indicators grid */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                          {/* Criticité */}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Criticité</span>
                            <Badge
                              variant={m.criticite === "A" ? "destructive" : m.criticite === "B" ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0 h-[18px] font-bold"
                            >
                              {m.criticite}
                            </Badge>
                          </div>

                          {/* Maintenance */}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Maint.</span>
                            <span className={`font-medium ${
                              m.criticite_maintenance === "critique" ? "text-destructive" :
                              m.criticite_maintenance === "elevee" ? "text-amber-600" : "text-foreground"
                            }`}>
                              {CRIT_MAINT_LABELS[m.criticite_maintenance] || "—"}
                            </span>
                          </div>

                          {/* Impact */}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Impact</span>
                            {m.impact_ligne !== "aucun" ? (
                              <Badge
                                variant={m.impact_ligne === "arret_complet" ? "destructive" : m.impact_ligne === "arret_partiel" ? "default" : "secondary"}
                                className="text-[10px] px-1.5 py-0 h-[18px] gap-0.5"
                              >
                                {m.impact_ligne === "arret_complet" && <AlertTriangle className="h-2.5 w-2.5" />}
                                {m.impact_ligne === "arret_partiel" && <Zap className="h-2.5 w-2.5" />}
                                {IMPACT_LABELS[m.impact_ligne]?.split(" ").slice(0, 2).join(" ")}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/60">Aucun</span>
                            )}
                          </div>

                          {/* PDR */}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">PDR</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1">
                                  <span className={`h-2 w-2 rounded-full ${dispoColor}`} />
                                  <span className="font-medium">{DISPO_LABELS[m.disponibilite_pdr] || "—"}</span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                Disponibilité pièces : {DISPO_LABELS[m.disponibilite_pdr]}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Attached equipment chips below machine card */}
                    {machineEquips.length > 0 && (
                      <div className="mt-2 w-[240px] space-y-1">
                        {machineEquips.map((eq) => (
                          <div
                            key={eq.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors text-[11px]"
                            onClick={() => navigate(`/equipements/${eq.id}`)}
                          >
                            <Component className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-mono font-semibold text-foreground">{eq.code}</span>
                            <span className="text-muted-foreground flex-1 min-w-0">{eq.designation}</span>
                            <Badge
                              variant={eq.statut === "en_service" ? "default" : eq.statut === "hors_service" ? "destructive" : "secondary"}
                              className="text-[9px] px-1 py-0 h-3.5 shrink-0"
                            >
                              {eq.statut === "en_service" ? "OK" : eq.statut === "hors_service" ? "HS" : "M"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Arrow connector between machines */}
                  {idx < machines.length - 1 && (
                    <div className="flex items-center self-start mt-[80px] px-2">
                      <div className="w-5 h-[2px] bg-border rounded-full" />
                      <ChevronRight className="h-5 w-5 -ml-1.5 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Standalone equipment (not linked to a specific machine) */}
      {standaloneEquips.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Component className="h-4 w-4" />
              Équipements de la ligne (non rattachés à une machine)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {standaloneEquips.map((eq) => (
                <div
                  key={eq.id}
                  className="rounded-lg border p-3 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
                  onClick={() => navigate(`/equipements/${eq.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[11px] px-1.5 h-5">
                      {EQ_TYPE_LABELS[eq.type] || eq.type}
                    </Badge>
                    <Badge
                      variant={eq.statut === "en_service" ? "default" : eq.statut === "hors_service" ? "destructive" : "secondary"}
                      className="text-[11px] px-1.5 h-5"
                    >
                      {EQ_STATUT_LABELS[eq.statut] || eq.statut}
                    </Badge>
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground">{eq.code}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{eq.designation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
