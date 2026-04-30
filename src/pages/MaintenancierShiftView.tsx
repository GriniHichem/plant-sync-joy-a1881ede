import { useMemo } from "react";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, AlertTriangle, CalendarCheck, Factory, ShieldAlert, ClipboardCheck, Clock } from "lucide-react";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { useEntityPrimaryImages } from "@/hooks/useEntityPrimaryImages";
import { useMaintenanceShiftWorkload } from "@/hooks/useMaintenanceShiftWorkload";

interface MachineGroup {
  machine: { id: string; code: string; designation: string };
  items: any[];
}

interface LineGroup {
  line: { id: string; code: string; designation: string } | null;
  machines: MachineGroup[];
}

function buildLineGroups(items: any[], type: "plan" | "ticket"): LineGroup[] {
  const lineMap = new Map<string, LineGroup>();
  for (const item of items) {
    const lineInfo = type === "plan" ? (item as any).production_lines : item.production_lines;
    const machineInfo = item.machines;
    if (!machineInfo) continue;
    const lineKey = lineInfo?.id || "__no_line__";
    if (!lineMap.has(lineKey)) {
      lineMap.set(lineKey, {
        line: lineInfo ? { id: lineInfo.id, code: lineInfo.code, designation: lineInfo.designation } : null,
        machines: [],
      });
    }
    const group = lineMap.get(lineKey)!;
    let mg = group.machines.find(m => m.machine.id === machineInfo.id);
    if (!mg) {
      mg = { machine: { id: machineInfo.id, code: machineInfo.code, designation: machineInfo.designation }, items: [] };
      group.machines.push(mg);
    }
    mg.items.push(item);
  }
  return Array.from(lineMap.values()).sort((a, b) => (a.line?.code || "zzz").localeCompare(b.line?.code || "zzz"));
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; variant: "destructive" | "default" | "secondary" | "outline" }> = {
    critique: { label: "Critique", variant: "destructive" },
    haute: { label: "Haute", variant: "destructive" },
    normale: { label: "Normale", variant: "secondary" },
    basse: { label: "Basse", variant: "outline" },
  };
  const info = map[priority] || map.normale;
  return <Badge variant={info.variant} className="text-[10px] px-1.5 py-0">{info.label}</Badge>;
}

export default function MaintenancierShiftView() {
  const { user } = useAuth();
  const navigate = useNavWithFrom();
  const { tickets, plans, loading, restrictedToShiftLines } = useMaintenanceShiftWorkload();

  // Collect all machine IDs for image fetching
  const allMachineIds = useMemo(() => {
    const ids = new Set<string>();
    plans.forEach(p => { if (p.machines?.id) ids.add(p.machines.id); });
    tickets.forEach(t => { if (t.machines?.id) ids.add(t.machines.id); });
    return Array.from(ids);
  }, [plans, tickets]);

  const machineImages = useEntityPrimaryImages("machine", allMachineIds);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const curativeGroups = buildLineGroups(tickets, "ticket");
  const preventiveGroups = buildLineGroups(plans, "plan");

  const renderLineGroups = (groups: LineGroup[], type: "plan" | "ticket") => {
    if (groups.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            {type === "ticket" ? (
              <><ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-20" /><p className="text-base font-medium">Aucun ticket curatif</p><p className="text-sm mt-1">Pas de pannes signalées pour le moment</p></>
            ) : (
              <><CalendarCheck className="h-12 w-12 mx-auto mb-4 opacity-20" /><p className="text-base font-medium">Aucun plan préventif</p><p className="text-sm mt-1">Aucune intervention programmée</p></>
            )}
          </CardContent>
        </Card>
      );
    }

    return groups.map((group) => (
      <Collapsible key={group.line?.id || "__no_line__"} defaultOpen>
        <Card className="overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center gap-3 py-3 px-4 cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/50">
              <Factory className="h-5 w-5 text-primary/70 shrink-0" />
              <CardTitle className="text-sm font-semibold flex-1 text-left tracking-wide uppercase">
                {group.line ? `${group.line.code} — ${group.line.designation}` : "Sans ligne"}
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {group.machines.reduce((s, m) => s + m.items.length, 0)}
              </Badge>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-0 divide-y divide-border/40">
              {group.machines.map((mg) => (
                <div key={mg.machine.id} className="p-3 space-y-2">
                  {/* Machine header with image */}
                  <div className="flex items-center gap-3">
                    <EntityThumbnail
                      imageUrl={machineImages[mg.machine.id]}
                      alt={mg.machine.designation}
                      size="lg"
                      rounded="lg"
                      enableLightbox
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-bold text-foreground">{mg.machine.code}</p>
                      <p className="text-xs text-muted-foreground truncate">{mg.machine.designation}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {mg.items.length} {type === "ticket" ? "ticket(s)" : "plan(s)"}
                    </Badge>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5 pl-1">
                    {mg.items.map((item: any) =>
                      type === "ticket" ? (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-destructive/5 border border-destructive/15 bg-destructive/[0.02] transition-colors"
                          onClick={() => navigate(`/tickets/${item.id}`, { state: { from: "/maintenance/shift" } })}
                        >
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-foreground">{item.numero}</span>
                              <PriorityBadge priority={item.priorite} />
                              <Badge variant={item.statut === "ouvert" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 capitalize">{item.statut.replace("_", " ")}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                            {item.heure_declaration && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/70">
                                <Clock className="h-3 w-3" />
                                {new Date(item.heure_declaration).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        </div>
                      ) : (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-primary/5 border transition-colors ${
                            item.prochaine_echeance && new Date(item.prochaine_echeance) < new Date()
                              ? "border-destructive/20 bg-destructive/[0.02]"
                              : "border-primary/10 bg-primary/[0.02]"
                          }`}
                          onClick={() => navigate(`/preventif/${item.id}`)}
                        >
                          <CalendarCheck className={`h-4 w-4 shrink-0 mt-0.5 ${
                            item.prochaine_echeance && new Date(item.prochaine_echeance) < new Date() ? "text-destructive" : "text-primary"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{item.title}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{item.frequence}</Badge>
                              {item.prochaine_echeance && new Date(item.prochaine_echeance) < new Date() && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">En retard</Badge>
                              )}
                            </div>
                            {item.type_maintenance && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.type_maintenance}</p>
                            )}
                            {item.prochaine_echeance && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/70">
                                <Clock className="h-3 w-3" />
                                Échéance : {new Date(item.prochaine_echeance).toLocaleDateString("fr-FR")}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Shift</h1>
          <p className="text-xs md:text-sm text-muted-foreground capitalize truncate">{today}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {restrictedToShiftLines && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
              <Factory className="h-3 w-3" /> Filtré shift
            </Badge>
          )}
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-xs font-medium tabular-nums">{tickets.length} curatif</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs font-medium tabular-nums">{plans.length} préventif</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="curative">
        <TabsList className="h-11 w-full grid grid-cols-2 sticky top-14 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
          <TabsTrigger value="curative" className="h-9 gap-1.5 data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive">
            <ShieldAlert className="h-4 w-4" />
            Curative
            {tickets.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 h-4">{tickets.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="preventive" className="h-9 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <ClipboardCheck className="h-4 w-4" />
            Préventive
            {plans.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 h-4">{plans.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="curative" className="space-y-3 mt-3">
          {renderLineGroups(curativeGroups, "ticket")}
        </TabsContent>

        <TabsContent value="preventive" className="space-y-3 mt-3">
          {renderLineGroups(preventiveGroups, "plan")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
