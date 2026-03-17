import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, ArrowRight, Settings, AlertTriangle, CheckCircle2,
  XCircle, Wrench, Package, Zap, Component, Factory,
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

function StatusIcon({ statut }: { statut: string }) {
  if (statut === "en_marche") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (statut === "arret") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Wrench className="h-4 w-4 text-amber-500" />;
}

function CritBorder(criticite: string, critMaint: string) {
  if (criticite === "A" || critMaint === "critique") return "border-destructive/60 shadow-[0_0_12px_-3px_hsl(var(--destructive)/0.3)]";
  if (criticite === "B" || critMaint === "elevee") return "border-amber-400/60 shadow-[0_0_12px_-3px_hsl(38,92%,50%,0.25)]";
  return "border-border";
}

function DispoIndicator({ dispo }: { dispo: string }) {
  const color = dispo === "disponible" ? "bg-green-500" : dispo === "partiel" ? "bg-amber-500" : "bg-destructive";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${color}`} />
          PDR
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <Package className="h-3 w-3 inline mr-1" />PDR: {DISPO_LABELS[dispo] || dispo}
      </TooltipContent>
    </Tooltip>
  );
}

function ImpactIndicator({ impact }: { impact: string }) {
  if (impact === "aucun") return null;
  const variant = impact === "arret_complet" ? "destructive" : impact === "arret_partiel" ? "default" : "secondary";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant as any} className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
          {impact === "arret_complet" && <AlertTriangle className="h-2.5 w-2.5" />}
          {impact === "arret_partiel" && <Zap className="h-2.5 w-2.5" />}
          {IMPACT_LABELS[impact]?.split(" ")[0]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{IMPACT_LABELS[impact]}</TooltipContent>
    </Tooltip>
  );
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
}

export default function LineSynoptic() {
  const { id } = useParams();
  const navigate = useNavigate();
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
          .select("id, code, designation, type, statut, criticite, role_fonctionnel")
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/lignes")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            {line.code} — {line.designation}
          </h1>
          <p className="text-muted-foreground text-sm">
            Synoptique de ligne • {line.atelier || "—"} • {machines.length} machine(s) • {equipments.length} équipement(s)
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/lignes/${id}/config`)} className="h-10">
          <Settings className="h-4 w-4 mr-2" /> Configurer
        </Button>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> En marche</span>
          <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-destructive" /> Arrêt</span>
          <span className="flex items-center gap-1"><Wrench className="h-3.5 w-3.5 text-amber-500" /> Maintenance</span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> PDR OK</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> PDR Partiel</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> PDR Indisponible</span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1 border-l-2 border-destructive/60 pl-1">Critique</span>
          <span className="flex items-center gap-1 border-l-2 border-amber-400/60 pl-1">Élevée</span>
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
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-1 min-w-max px-2">
            {machines.map((m, idx) => {
              const borderClass = CritBorder(m.criticite, m.criticite_maintenance);
              const relatedEquips = equipments.filter((e) => false); // equipments linked to machine handled below
              return (
                <div key={m.id} className="flex items-start">
                  {/* Machine Block */}
                  <div
                    className={`relative w-[200px] rounded-xl border-2 bg-card p-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${borderClass}`}
                    onClick={() => navigate(`/machines/${m.id}`)}
                  >
                    {/* Position badge */}
                    <div className="absolute -top-2.5 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      #{idx + 1}
                    </div>

                    {/* Status + Role */}
                    <div className="flex items-center justify-between mb-2 mt-1">
                      <span className="text-sm">{ROLE_ICONS[m.role_fonctionnel] || "🔧"}</span>
                      <StatusIcon statut={m.statut} />
                    </div>

                    {/* Machine name */}
                    <p className="font-mono text-xs font-bold text-primary truncate">{m.code}</p>
                    <p className="text-xs truncate mb-2 text-foreground">{m.designation}</p>

                    {/* Role label */}
                    <p className="text-[10px] text-muted-foreground mb-2">
                      {ROLE_LABELS[m.role_fonctionnel] || "—"}
                    </p>

                    {/* Indicators row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={m.criticite === "A" ? "destructive" : m.criticite === "B" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {m.criticite}
                      </Badge>
                      <ImpactIndicator impact={m.impact_ligne} />
                      <DispoIndicator dispo={m.disponibilite_pdr} />
                    </div>

                    {/* Criticité maintenance */}
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      Maint: <span className={`font-medium ${
                        m.criticite_maintenance === "critique" ? "text-destructive" :
                        m.criticite_maintenance === "elevee" ? "text-amber-600" : "text-foreground"
                      }`}>{CRIT_MAINT_LABELS[m.criticite_maintenance] || "—"}</span>
                    </div>

                    {/* Status bar at bottom */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-xl ${
                      m.statut === "en_marche" ? "bg-green-500" :
                      m.statut === "arret" ? "bg-destructive" : "bg-amber-500"
                    }`} />
                  </div>

                  {/* Arrow connector */}
                  {idx < machines.length - 1 && (
                    <div className="flex items-center self-center px-1 text-muted-foreground/40">
                      <div className="w-6 h-0.5 bg-border" />
                      <ArrowRight className="h-4 w-4 -ml-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Equipment section */}
      {equipments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Component className="h-4 w-4" />
              Équipements de la ligne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {equipments.map((eq) => (
                <div
                  key={eq.id}
                  className="rounded-lg border p-2.5 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/equipements/${eq.id}`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {EQ_TYPE_LABELS[eq.type] || eq.type}
                    </Badge>
                    <Badge
                      variant={eq.statut === "en_service" ? "default" : eq.statut === "hors_service" ? "destructive" : "secondary"}
                      className="text-[10px] px-1 py-0 h-4"
                    >
                      {eq.statut === "en_service" ? "OK" : eq.statut === "hors_service" ? "HS" : "Maint."}
                    </Badge>
                  </div>
                  <p className="font-mono text-[11px] font-bold truncate">{eq.code}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{eq.designation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
