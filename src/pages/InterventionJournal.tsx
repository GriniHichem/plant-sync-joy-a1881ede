import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Wrench, Search, Filter, CalendarIcon, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";

type JournalEntry = {
  id: string;
  type: "curative" | "preventive";
  title: string;
  description: string;
  machine_name: string;
  machine_code: string;
  machine_id: string;
  line_name: string;
  line_id: string | null;
  user_name: string;
  user_id: string;
  date: string;
  status: string;
  duration_minutes: number | null;
  link: string;
  role?: "lead" | "aide" | "co_intervenant" | null;
};

export default function InterventionJournal() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [lineAssignments, setLineAssignments] = useState<any[]>([]);

  const [filterType, setFilterType] = useState<string>("all");
  const [filterLine, setFilterLine] = useState<string>("all");
  const [filterMachine, setFilterMachine] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const [ticketRes, execRes, lineRes, profileRes, machineRes, assignRes] = await Promise.all([
        supabase.from("tickets").select("*, machines(id, designation, code), interventions(id, technicien_id, date_debut, date_fin, statut, description, role)").order("created_at", { ascending: false }),
        supabase.from("preventive_executions").select("*, preventive_plans(id, title, machine_id, line_id, machines(id, designation, code))").order("date_execution", { ascending: false }),
        supabase.from("production_lines").select("id, designation, code").eq("is_active", true),
        supabase.from("profiles").select("user_id, first_name, last_name"),
        supabase.from("machines").select("id, designation, code").eq("is_active", true),
        supabase.from("machine_line_assignments").select("machine_id, line_id"),
      ]);
      setTickets(ticketRes.data || []);
      setExecutions(execRes.data || []);
      setLines(lineRes.data || []);
      setProfiles(profileRes.data || []);
      setMachines(machineRes.data || []);
      setLineAssignments(assignRes.data || []);
    };
    load();
  }, []);

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => {
      map[p.user_id] = `${p.first_name} ${p.last_name}`.trim() || "—";
    });
    return map;
  }, [profiles]);

  const machineLineMap = useMemo(() => {
    const map: Record<string, string> = {};
    lineAssignments.forEach((a) => {
      map[a.machine_id] = a.line_id;
    });
    return map;
  }, [lineAssignments]);

  const lineMap = useMemo(() => {
    const map: Record<string, string> = {};
    lines.forEach((l) => { map[l.id] = l.designation; });
    return map;
  }, [lines]);

  // Build unified journal entries
  const entries: JournalEntry[] = useMemo(() => {
    const result: JournalEntry[] = [];

    // Curative: tickets with interventions
    tickets.forEach((t) => {
      const interventions = t.interventions || [];
      if (interventions.length === 0) {
        // Ticket without intervention — still show it
        const machineId = t.machines?.id || t.machine_id;
        const lineId = t.ligne_id || machineLineMap[machineId] || null;
        result.push({
          id: t.id,
          type: "curative",
          title: t.numero || "Ticket",
          description: t.description || "",
          machine_name: t.machines?.designation || "—",
          machine_code: t.machines?.code || "",
          machine_id: machineId,
          line_name: lineId ? (lineMap[lineId] || "—") : "—",
          line_id: lineId,
          user_name: t.assignee_id ? (profileMap[t.assignee_id] || "—") : "Non assigné",
          user_id: t.assignee_id || "",
          date: t.heure_declaration || t.created_at,
          status: t.statut,
          duration_minutes: t.temps_intervention_minutes,
          link: `/tickets/${t.id}`,
        });
      } else {
        interventions.forEach((intv: any) => {
          const machineId = t.machines?.id || t.machine_id;
          const lineId = t.ligne_id || machineLineMap[machineId] || null;
          const durationMs = intv.date_fin && intv.date_debut
            ? Math.round((new Date(intv.date_fin).getTime() - new Date(intv.date_debut).getTime()) / 60000)
            : t.temps_intervention_minutes;
          result.push({
            id: intv.id,
            type: "curative",
            title: t.numero || "Ticket",
            description: intv.description || t.description || "",
            machine_name: t.machines?.designation || "—",
            machine_code: t.machines?.code || "",
            machine_id: machineId,
            line_name: lineId ? (lineMap[lineId] || "—") : "—",
            line_id: lineId,
            user_name: profileMap[intv.technicien_id] || "—",
            user_id: intv.technicien_id,
            date: intv.date_debut || t.heure_declaration || t.created_at,
            status: intv.statut || t.statut,
            duration_minutes: durationMs,
            link: `/tickets/${t.id}`,
            role: intv.role || null,
          });
        });
      }
    });

    // Preventive: executions
    executions.forEach((e) => {
      const plan = e.preventive_plans;
      const machineId = plan?.machines?.id || plan?.machine_id || "";
      const lineId = plan?.line_id || machineLineMap[machineId] || null;
      result.push({
        id: e.id,
        type: "preventive",
        title: plan?.title || "Plan préventif",
        description: e.notes || "",
        machine_name: plan?.machines?.designation || "—",
        machine_code: plan?.machines?.code || "",
        machine_id: machineId,
        line_name: lineId ? (lineMap[lineId] || "—") : "—",
        line_id: lineId,
        user_name: profileMap[e.executed_by] || "—",
        user_id: e.executed_by,
        date: e.date_execution,
        status: "executé",
        duration_minutes: null,
        link: `/preventif/${plan?.id || ""}`,
      });
    });

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tickets, executions, profileMap, machineLineMap, lineMap]);

  // Unique users in entries for filter
  const activeUsers = useMemo(() => {
    const map: Record<string, string> = {};
    entries.forEach((e) => {
      if (e.user_id) map[e.user_id] = e.user_name;
    });
    return Object.entries(map).sort((a, b) => a[1].localeCompare(b[1]));
  }, [entries]);

  // Filtered entries
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterLine !== "all" && e.line_id !== filterLine) return false;
      if (filterMachine !== "all" && e.machine_id !== filterMachine) return false;
      if (filterUser !== "all" && e.user_id !== filterUser) return false;
      if (dateFrom) {
        const d = new Date(e.date);
        if (d < dateFrom) return false;
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(e.date) > end) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        if (!e.title.toLowerCase().includes(s) && !e.description.toLowerCase().includes(s) && !e.machine_name.toLowerCase().includes(s) && !e.machine_code.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [entries, filterType, filterLine, filterMachine, filterUser, dateFrom, dateTo, search]);

  const curativeCount = filtered.filter((e) => e.type === "curative").length;
  const preventiveCount = filtered.filter((e) => e.type === "preventive").length;

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      ouvert: { label: "Ouvert", variant: "destructive" },
      pris_en_charge: { label: "Pris en charge", variant: "default" },
      resolu: { label: "Résolu", variant: "secondary" },
      cloture: { label: "Clôturé", variant: "outline" },
      en_cours: { label: "En cours", variant: "default" },
      termine: { label: "Terminé", variant: "secondary" },
      executé: { label: "Exécuté", variant: "secondary" },
    };
    const cfg = map[s];
    if (!cfg) return <Badge variant="outline">{s}</Badge>;
    return <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Journal des interventions</h1>
          <p className="text-muted-foreground text-sm">
            Historique complet — {filtered.length} intervention(s)
          </p>
        </div>
        <ExportCsvButton
          data={filtered}
          columns={[
            { key: "date", label: "Date" },
            { key: "type", label: "Type" },
            { key: "title", label: "Titre" },
            { key: "description", label: "Description" },
            { key: "machine_code", label: "Machine code" },
            { key: "machine_name", label: "Machine" },
            { key: "line_name", label: "Ligne" },
            { key: "user_name", label: "Intervenant" },
            { key: "status", label: "Statut" },
            { key: "duration_minutes", label: "Durée (min)" },
            { key: "role", label: "Rôle" },
          ]}
          filename="journal_interventions"
        />
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {([
          { value: "all", label: "Tous", count: entries.length },
          { value: "curative", label: "Curative", count: entries.filter(e => e.type === "curative").length },
          { value: "preventive", label: "Préventive", count: entries.filter(e => e.type === "preventive").length },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              filterType === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span className={cn("ml-1.5 text-xs tabular-nums", filterType === tab.value ? "text-foreground/70" : "text-muted-foreground/60")}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtres</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={filterLine} onValueChange={setFilterLine}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Ligne" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les lignes</SelectItem>
                {lines.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.code} — {l.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterMachine} onValueChange={setFilterMachine}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Machine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les machines</SelectItem>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Maintenancier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les techniciens</SelectItem>
                {activeUsers.map(([uid, name]) => (
                  <SelectItem key={uid} value={uid}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Du */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-9 justify-start text-left font-normal text-xs", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Du"}
                  {dateFrom && (
                    <X className="ml-auto h-3 w-3 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); }} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            {/* Date Au */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-9 justify-start text-left font-normal text-xs", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Au"}
                  {dateTo && (
                    <X className="ml-auto h-3 w-3 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setDateTo(undefined); }} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            {(filterType !== "all" || filterLine !== "all" || filterMachine !== "all" || filterUser !== "all" || dateFrom || dateTo || search.trim()) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-muted-foreground"
                onClick={() => {
                  setFilterType("all");
                  setFilterLine("all");
                  setFilterMachine("all");
                  setFilterUser("all");
                  setDateFrom(undefined);
                  setDateTo(undefined);
                  setSearch("");
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Journal list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucune intervention trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <Card
              key={e.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => navigate(e.link)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${e.type === "curative" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      {e.type === "curative" ? <Wrench className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{e.title}</span>
                        <Badge variant="outline" className={`text-[10px] ${e.type === "curative" ? "border-destructive/30 text-destructive" : "border-primary/30 text-primary"}`}>
                          {e.type === "curative" ? "Curative" : "Préventive"}
                        </Badge>
                        {statusLabel(e.status)}
                        {e.role === "lead" && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Lead</Badge>
                        )}
                        {e.role === "co_intervenant" && (
                          <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/20">Co-intervenant</Badge>
                        )}
                        {e.role === "aide" && (
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">Aide</Badge>
                        )}
                      </div>
                      {e.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{e.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="font-mono">{e.machine_code} — {e.machine_name}</span>
                        {e.line_name !== "—" && <span>Ligne: {e.line_name}</span>}
                        <span>Par: <span className="font-medium text-foreground">{e.user_name}</span></span>
                        {e.duration_minutes != null && e.duration_minutes > 0 && (
                          <span className="tabular-nums">{e.duration_minutes} min</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("fr-FR")}
                    </p>
                    <p className="text-[10px] tabular-nums text-muted-foreground">
                      {new Date(e.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
