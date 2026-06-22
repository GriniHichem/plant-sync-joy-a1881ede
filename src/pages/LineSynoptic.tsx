import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/gmao/KpiCard";
import {
  ArrowLeft, Settings, ChevronRight, RefreshCw, Factory, CalendarCheck,
  Activity, AlertTriangle, Wrench, Package, Cpu, CheckCircle2, XCircle,
  Component as ComponentIcon, Plus, AlertCircle,
} from "lucide-react";
import {
  useLineSynopticData, type EntityKind, type MachineRow, type EquipementRow, type OrganeRow,
} from "@/hooks/useLineSynopticData";
import {
  LineSynopticFilters, DEFAULT_FILTERS, type SynopticFiltersState,
} from "@/components/gmao/LineSynopticFilters";
import { SynopticMachineCard } from "@/components/gmao/SynopticMachineCard";
import { SynopticEquipmentCard } from "@/components/gmao/SynopticEquipmentCard";
import { SynopticEntityPanel } from "@/components/gmao/SynopticEntityPanel";

type SelectedEntity =
  | { kind: "machine"; data: MachineRow }
  | { kind: "equipement"; data: EquipementRow }
  | { kind: "organe"; data: OrganeRow };

export default function LineSynoptic() {
  const { id } = useParams();
  const nav = useNavWithFrom();
  const goBack = useSmartBack("/lignes");
  const { user } = useAuth();
  const { canCreate, canEdit } = usePermissions();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const data = useLineSynopticData(id);
  const {
    loading, error, line, machines, equipements, organes, tickets, preventivePlans, pdrLinks,
    imageMap, countersByEntity, refetch,
  } = data;

  const [filters, setFilters] = useState<SynopticFiltersState>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<SelectedEntity | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Ticket creation dialog
  const [tkOpen, setTkOpen] = useState(false);
  const [tkMachineId, setTkMachineId] = useState<string>("");
  const [tkEquipementId, setTkEquipementId] = useState<string | null>(null);
  const [tkOrganeId, setTkOrganeId] = useState<string | null>(null);
  const [tkPriorite, setTkPriorite] = useState<string>("normale");
  const [tkDescription, setTkDescription] = useState("");

  // Group organes
  const organesByMachine = useMemo(() => {
    const m = new Map<string, OrganeRow[]>();
    organes.forEach((o) => {
      if (o.machine_id) {
        const list = m.get(o.machine_id) || [];
        list.push(o);
        m.set(o.machine_id, list);
      }
    });
    return m;
  }, [organes]);

  const organesByEquipement = useMemo(() => {
    const m = new Map<string, OrganeRow[]>();
    organes.forEach((o) => {
      if (o.equipement_id) {
        const list = m.get(o.equipement_id) || [];
        list.push(o);
        m.set(o.equipement_id, list);
      }
    });
    return m;
  }, [organes]);

  const machineIds = useMemo(() => new Set(machines.map((m) => m.id)), [machines]);
  const standaloneEquipements = useMemo(
    () => equipements.filter((eq) => !eq.machine_id || !machineIds.has(eq.machine_id)),
    [equipements, machineIds]
  );
  const equipementsByMachine = useMemo(() => {
    const m = new Map<string, EquipementRow[]>();
    equipements.forEach((eq) => {
      if (eq.machine_id && machineIds.has(eq.machine_id)) {
        const list = m.get(eq.machine_id) || [];
        list.push(eq);
        m.set(eq.machine_id, list);
      }
    });
    return m;
  }, [equipements, machineIds]);

  // Apply filters
  const matchesAnomaly = (key: string, statut: string) => {
    const c = countersByEntity[key];
    const inMaintOrPanne = statut === "arret" || statut === "maintenance" || statut === "en_panne" || statut === "en_maintenance";
    return inMaintOrPanne || (c && (c.ticketsOpen + c.preventiveOverdue + c.pdrCritical + c.pdrRupture) > 0);
  };

  const filterMachine = (m: MachineRow) => {
    if (filters.statut !== "all" && m.statut !== filters.statut) return false;
    if (filters.criticite !== "all" && m.criticite !== filters.criticite) return false;
    const c = countersByEntity[`machine:${m.id}`];
    if (filters.ticketsOpen && (!c || c.ticketsOpen === 0)) return false;
    if (filters.preventiveOverdue && (!c || c.preventiveOverdue === 0)) return false;
    if (filters.pdrCritical && (!c || c.pdrCritical + c.pdrRupture === 0)) return false;
    if (filters.anomaliesOnly && !matchesAnomaly(`machine:${m.id}`, m.statut)) return false;
    return true;
  };

  const filterEquipement = (eq: EquipementRow) => {
    // Map equipement statut to machine-like statut for the statut filter
    if (filters.statut !== "all") {
      const map: Record<string, string> = { en_service: "en_marche", hors_service: "arret", en_maintenance: "maintenance", reforme: "arret" };
      if (map[eq.statut] !== filters.statut) return false;
    }
    if (filters.criticite !== "all" && eq.criticite !== filters.criticite) return false;
    const c = countersByEntity[`equipement:${eq.id}`];
    if (filters.ticketsOpen && (!c || c.ticketsOpen === 0)) return false;
    if (filters.preventiveOverdue && (!c || c.preventiveOverdue === 0)) return false;
    if (filters.pdrCritical && (!c || c.pdrCritical + c.pdrRupture === 0)) return false;
    if (filters.anomaliesOnly && !matchesAnomaly(`equipement:${eq.id}`, eq.statut)) return false;
    return true;
  };

  const visibleMachines = useMemo(() => machines.filter(filterMachine), [machines, filters, countersByEntity]);
  const visibleStandaloneEquips = useMemo(() => standaloneEquipements.filter(filterEquipement), [standaloneEquipements, filters, countersByEntity]);

  // KPIs (computed on visible set when filter active to reflect what user sees)
  const kpiSet = visibleMachines;
  const kpis = useMemo(() => {
    const total = kpiSet.length;
    const inService = kpiSet.filter((m) => m.statut === "en_marche").length;
    const inPanne = kpiSet.filter((m) => m.statut === "arret").length;
    const inMaint = kpiSet.filter((m) => m.statut === "maintenance").length;
    const ticketsTotal = kpiSet.reduce((s, m) => s + (countersByEntity[`machine:${m.id}`]?.ticketsOpen || 0), 0)
      + visibleStandaloneEquips.reduce((s, eq) => s + (countersByEntity[`equipement:${eq.id}`]?.ticketsOpen || 0), 0);
    const prevOverdue = kpiSet.reduce((s, m) => s + (countersByEntity[`machine:${m.id}`]?.preventiveOverdue || 0), 0)
      + visibleStandaloneEquips.reduce((s, eq) => s + (countersByEntity[`equipement:${eq.id}`]?.preventiveOverdue || 0), 0);
    const pdrCrit = kpiSet.reduce((s, m) => {
      const c = countersByEntity[`machine:${m.id}`];
      return s + ((c?.pdrCritical || 0) + (c?.pdrRupture || 0));
    }, 0);
    const dispo = total > 0 ? Math.round((inService / total) * 100) : 0;
    return { total, inService, inPanne, inMaint, ticketsTotal, prevOverdue, pdrCrit, dispo };
  }, [kpiSet, visibleStandaloneEquips, countersByEntity]);

  const openPanel = (sel: SelectedEntity) => {
    setSelected(sel);
    setPanelOpen(true);
  };

  const handleCreateTicketRequest = (kind: EntityKind, id: string, parentMachineId?: string | null) => {
    // Tickets schema requires machine_id
    let machineId: string | null = null;
    if (kind === "machine") machineId = id;
    else machineId = parentMachineId || null;

    if (!machineId) {
      toast({
        title: "Machine requise",
        description: "Cet équipement/organe n'est pas rattaché à une machine. Créez le ticket depuis la machine parente.",
        variant: "destructive",
      });
      return;
    }
    setTkMachineId(machineId);
    setTkEquipementId(kind === "equipement" ? id : null);
    setTkOrganeId(kind === "organe" ? id : null);
    setTkPriorite("normale");
    setTkDescription("");
    setPanelOpen(false);
    setTkOpen(true);
  };

  const submitTicket = async () => {
    if (!tkMachineId || !tkDescription.trim()) {
      toast({ title: "Champs requis", description: "Machine et description obligatoires", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("tickets").insert({
      machine_id: tkMachineId,
      equipement_id: tkEquipementId,
      organe_id: tkOrganeId,
      ligne_id: id,
      priorite: tkPriorite as any,
      description: tkDescription.trim(),
      declarant_id: user?.id,
      numero: "",
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    // audit log (best-effort)
    if (user?.id) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "create",
        table_name: "tickets",
        new_values: {
          machine_id: tkMachineId,
          equipement_id: tkEquipementId,
          organe_id: tkOrganeId,
          ligne_id: id,
          priorite: tkPriorite,
          description: tkDescription.trim(),
          source: "synoptique",
        } as any,
      });
    }
    toast({ title: "Ticket créé" });
    setTkOpen(false);
    refetch();
  };

  // ------------- RENDER -------------
  if (loading && !line) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-14" />
        <div className="flex gap-3 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-[260px] shrink-0" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
          <p className="font-medium">Erreur de chargement</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={refetch}><RefreshCw className="h-4 w-4 mr-1.5" /> Réessayer</Button>
        </CardContent>
      </Card>
    );
  }

  if (!line) return null;

  const findOrganesForSelected = (): OrganeRow[] | undefined => {
    if (!selected) return undefined;
    if (selected.kind === "machine") return organesByMachine.get(selected.data.id) || [];
    if (selected.kind === "equipement") return organesByEquipement.get(selected.data.id) || [];
    return undefined;
  };

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Factory className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
            <span className="truncate">{line.code} — {line.designation}</span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            Synoptique de supervision
            {line.atelier && <> • {line.atelier}</>}
            {" "}• {machines.length} machine(s) • {equipements.length} équipement(s) • {organes.length} organe(s)
          </p>
        </div>
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={refetch} title="Actualiser">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        {!isMobile && (
          <>
            <Button variant="outline" onClick={() => nav(`/preventif?line=${id}`)} className="h-10">
              <CalendarCheck className="h-4 w-4 mr-1.5" /> Plans préventifs
            </Button>
            {canEdit("lignes") && (
              <Button variant="outline" onClick={() => nav(`/lignes/${id}/config`)} className="h-10">
                <Settings className="h-4 w-4 mr-1.5" /> Configurer
              </Button>
            )}
          </>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
        <KpiCard title="Machines" value={kpis.total} icon={Cpu} />
        <KpiCard title="En marche" value={kpis.inService} icon={CheckCircle2} subtitle={`${kpis.dispo}% dispo.`} trend="up" />
        <KpiCard title="En panne" value={kpis.inPanne} icon={XCircle} trend={kpis.inPanne > 0 ? "down" : undefined} />
        <KpiCard title="En maint." value={kpis.inMaint} icon={Wrench} />
        <KpiCard title="Tickets ouverts" value={kpis.ticketsTotal} icon={AlertTriangle} trend={kpis.ticketsTotal > 0 ? "down" : undefined} />
        <KpiCard title="Prév. retard" value={kpis.prevOverdue} icon={CalendarCheck} trend={kpis.prevOverdue > 0 ? "down" : undefined} />
        <KpiCard title="PDR alertes" value={kpis.pdrCrit} icon={Package} trend={kpis.pdrCrit > 0 ? "down" : undefined} />
        <KpiCard title="Disponibilité" value={`${kpis.dispo}%`} icon={Activity} />
      </div>

      {/* Filters */}
      <LineSynopticFilters value={filters} onChange={setFilters} />

      {/* Synoptic flow */}
      {machines.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Factory className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-base font-medium mb-1">Aucune machine configurée</p>
            <p className="text-sm mb-4">Configurez le processus de cette ligne pour afficher le synoptique.</p>
            <Button onClick={() => nav(`/lignes/${id}/config`)}>
              <Settings className="h-4 w-4 mr-2" /> Configurer la ligne
            </Button>
          </CardContent>
        </Card>
      ) : visibleMachines.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-sm">Aucune machine ne correspond aux filtres sélectionnés.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Réinitialiser les filtres
            </Button>
          </CardContent>
        </Card>
      ) : isMobile ? (
        // Mobile: vertical list
        <div className="space-y-3">
          {visibleMachines.map((m, idx) => (
            <SynopticMachineCard
              key={m.id}
              machine={m}
              index={idx}
              imageUrl={imageMap[`machine:${m.id}`]}
              counters={countersByEntity[`machine:${m.id}`] || { ticketsOpen: 0, ticketsCritical: 0, preventiveOverdue: 0, pdrCritical: 0, pdrRupture: 0 }}
              organes={organesByMachine.get(m.id) || []}
              organeCounters={countersByEntity}
              onClick={() => openPanel({ kind: "machine", data: m })}
              onOrganeClick={(o) => openPanel({ kind: "organe", data: o })}
              compact
            />
          ))}
        </div>
      ) : (
        // Desktop: horizontal flow
        <div className="overflow-x-auto pb-2">
          <div className="flex items-start gap-0 min-w-max py-2 px-1">
            {visibleMachines.map((m, idx) => (
              <div key={m.id} className="flex items-start">
                <SynopticMachineCard
                  machine={m}
                  index={idx}
                  imageUrl={imageMap[`machine:${m.id}`]}
                  counters={countersByEntity[`machine:${m.id}`] || { ticketsOpen: 0, ticketsCritical: 0, preventiveOverdue: 0, pdrCritical: 0, pdrRupture: 0 }}
                  organes={organesByMachine.get(m.id) || []}
                  organeCounters={countersByEntity}
                  onClick={() => openPanel({ kind: "machine", data: m })}
                  onOrganeClick={(o) => openPanel({ kind: "organe", data: o })}
                />
                {idx < visibleMachines.length - 1 && (
                  <div className="flex items-center self-start mt-[100px] px-2">
                    <div className="w-5 h-[2px] bg-border rounded-full" />
                    <ChevronRight className="h-5 w-5 -ml-1.5 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipments attached to line machines (after the flow, optional summary) */}
      {/* Standalone equipments */}
      {visibleStandaloneEquips.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ComponentIcon className="h-4 w-4" />
              Équipements autonomes de la ligne ({visibleStandaloneEquips.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleStandaloneEquips.map((eq) => (
                <SynopticEquipmentCard
                  key={eq.id}
                  equipement={eq}
                  imageUrl={imageMap[`equipement:${eq.id}`]}
                  counters={countersByEntity[`equipement:${eq.id}`] || { ticketsOpen: 0, ticketsCritical: 0, preventiveOverdue: 0, pdrCritical: 0, pdrRupture: 0 }}
                  organes={organesByEquipement.get(eq.id) || []}
                  organeCounters={countersByEntity}
                  onClick={() => openPanel({ kind: "equipement", data: eq })}
                  onOrganeClick={(o) => openPanel({ kind: "organe", data: o })}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipments attached to machines but if any have anomalies, surface */}
      {Array.from(equipementsByMachine.entries()).some(([, list]) => list.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ComponentIcon className="h-4 w-4" />
              Équipements rattachés aux machines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from(equipementsByMachine.values()).flat().filter(filterEquipement).map((eq) => (
                <SynopticEquipmentCard
                  key={eq.id}
                  equipement={eq}
                  imageUrl={imageMap[`equipement:${eq.id}`]}
                  counters={countersByEntity[`equipement:${eq.id}`] || { ticketsOpen: 0, ticketsCritical: 0, preventiveOverdue: 0, pdrCritical: 0, pdrRupture: 0 }}
                  organes={organesByEquipement.get(eq.id) || []}
                  organeCounters={countersByEntity}
                  onClick={() => openPanel({ kind: "equipement", data: eq })}
                  onOrganeClick={(o) => openPanel({ kind: "organe", data: o })}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile floating actions */}
      {isMobile && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-30">
          <Button size="icon" variant="outline" className="h-12 w-12 rounded-full shadow-lg bg-background" onClick={() => nav(`/lignes/${id}/config`)}>
            <Settings className="h-5 w-5" />
          </Button>
          {canCreate("tickets") && machines.length > 0 && (
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-xl"
              onClick={() => {
                setTkMachineId(machines[0].id);
                setTkEquipementId(null);
                setTkOrganeId(null);
                setTkPriorite("normale");
                setTkDescription("");
                setTkOpen(true);
              }}
            >
              <Plus className="h-6 w-6" />
            </Button>
          )}
        </div>
      )}

      {/* Side panel */}
      <SynopticEntityPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        entity={selected}
        imageUrl={selected ? imageMap[`${selected.kind}:${selected.data.id}`] : undefined}
        counters={selected ? countersByEntity[`${selected.kind}:${selected.data.id}`] : undefined}
        tickets={tickets}
        preventivePlans={preventivePlans}
        pdrLinks={pdrLinks}
        childOrganes={findOrganesForSelected()}
        onCreateTicket={handleCreateTicketRequest}
        onSelectOrgane={(o) => setSelected({ kind: "organe", data: o })}
      />

      {/* Create ticket dialog */}
      <Dialog open={tkOpen} onOpenChange={setTkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau ticket maintenance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Machine *</Label>
              <Select value={tkMachineId} onValueChange={setTkMachineId}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Choisir une machine" /></SelectTrigger>
                <SelectContent>
                  {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {tkEquipementId && (
              <p className="text-xs text-muted-foreground">
                Équipement lié : {equipements.find((e) => e.id === tkEquipementId)?.code}
              </p>
            )}
            {tkOrganeId && (
              <p className="text-xs text-muted-foreground">
                Organe lié : {organes.find((o) => o.id === tkOrganeId)?.code}
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Priorité</Label>
              <Select value={tkPriorite} onValueChange={setTkPriorite}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basse">Basse</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="critique">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                value={tkDescription}
                onChange={(e) => setTkDescription(e.target.value)}
                placeholder="Décrivez le problème observé..."
                className="min-h-[90px]"
              />
            </div>
            <Button onClick={submitTicket} className="w-full h-11">Créer le ticket</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
