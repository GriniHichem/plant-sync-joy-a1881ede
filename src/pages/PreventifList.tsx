import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck, Search, CheckCircle2, AlertTriangle, FileEdit, PauseCircle, RotateCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

const STATUT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  brouillon: { label: "Brouillon", variant: "secondary" },
  valide: { label: "Validé", variant: "default" },
  suspendu: { label: "Suspendu", variant: "outline" },
};

const FREQ_LABELS: Record<string, string> = {
  quotidien: "Quotidien",
  hebdomadaire: "Hebdomadaire",
  bimensuel: "Bimensuel",
  mensuel: "Mensuel",
  trimestriel: "Trimestriel",
  semestriel: "Semestriel",
  annuel: "Annuel",
};

export default function PreventifList() {
  const navigate = useNavWithFrom();
  const [searchParams] = useSearchParams();
  const { hasRole } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterMachine, setFilterMachine] = useState(searchParams.get("machine") || "all");
  const [filterLine, setFilterLine] = useState(searchParams.get("line") || "all");
  const [filterFrequence, setFilterFrequence] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [machines, setMachines] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [lineAssignments, setLineAssignments] = useState<any[]>([]);
  const [equipmentCounts, setEquipmentCounts] = useState<Record<string, number>>({});

  const canSeeBrouillons = hasRole("admin") || hasRole("resp_maintenance");

  useEffect(() => {
    const loadData = async () => {
      const [plansRes, mRes, lRes, mlaRes, eqRes] = await Promise.all([
        supabase
          .from("preventive_plans")
          .select("*, machines(code, designation), production_lines(code, designation)")
          .eq("is_active", true)
          .order("prochaine_echeance", { ascending: true }),
        supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code"),
        supabase.from("production_lines").select("id, code, designation").eq("is_active", true).order("code"),
        supabase.from("machine_line_assignments").select("machine_id, line_id"),
        supabase.from("equipements").select("id, line_id").eq("is_active", true),
      ]);
      setPlans(plansRes.data || []);
      setMachines(mRes.data || []);
      setLines(lRes.data || []);
      setLineAssignments(mlaRes.data || []);

      const eqCounts: Record<string, number> = {};
      (eqRes.data || []).forEach((e: any) => {
        if (e.line_id) eqCounts[e.line_id] = (eqCounts[e.line_id] || 0) + 1;
      });
      setEquipmentCounts(eqCounts);
    };
    loadData();
  }, []);

  // Machines belonging to selected line
  const lineMachineIds = useMemo(() => {
    if (filterLine === "all") return null;
    return new Set(lineAssignments.filter(a => a.line_id === filterLine).map(a => a.machine_id));
  }, [filterLine, lineAssignments]);

  // Filtered machine list for dropdown
  const filteredMachines = useMemo(() => {
    if (!lineMachineIds) return machines;
    return machines.filter(m => lineMachineIds.has(m.id));
  }, [machines, lineMachineIds]);

  // Reset machine filter when line changes and machine not in line
  useEffect(() => {
    if (lineMachineIds && filterMachine !== "all" && !lineMachineIds.has(filterMachine)) {
      setFilterMachine("all");
    }
  }, [lineMachineIds, filterMachine]);

  const filtered = useMemo(() => {
    return plans.filter(p => {
      if (filterStatut !== "all" && p.statut_plan !== filterStatut) return false;
      if (!canSeeBrouillons && p.statut_plan === "brouillon") return false;
      if (filterMachine !== "all" && p.machine_id !== filterMachine) return false;
      if (filterFrequence !== "all" && p.frequence !== filterFrequence) return false;

      // Line filter: match line_id OR machine assigned to that line
      if (filterLine !== "all") {
        const matchDirect = p.line_id === filterLine;
        const matchViaAssignment = lineMachineIds?.has(p.machine_id);
        if (!matchDirect && !matchViaAssignment) return false;
      }

      // Text search
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchMCode = p.machines?.code?.toLowerCase().includes(q);
        const matchMDesig = p.machines?.designation?.toLowerCase().includes(q);
        if (!matchTitle && !matchMCode && !matchMDesig) return false;
      }

      return true;
    });
  }, [plans, filterStatut, filterMachine, filterLine, filterFrequence, searchText, canSeeBrouillons, lineMachineIds]);

  // KPIs
  const kpis = useMemo(() => {
    const valides = filtered.filter(p => p.statut_plan === "valide").length;
    const overdue = filtered.filter(p => p.prochaine_echeance && new Date(p.prochaine_echeance) < new Date() && p.statut_plan === "valide").length;
    const brouillons = filtered.filter(p => p.statut_plan === "brouillon").length;
    const suspendus = filtered.filter(p => p.statut_plan === "suspendu").length;
    return { valides, overdue, brouillons, suspendus };
  }, [filtered]);

  // Line context info
  const lineContext = useMemo(() => {
    if (filterLine === "all") return null;
    const machineCount = lineMachineIds?.size || 0;
    const eqCount = equipmentCounts[filterLine] || 0;
    return { machineCount, eqCount };
  }, [filterLine, lineMachineIds, equipmentCounts]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Préventive</h1>
          <p className="text-muted-foreground">
            {filtered.length} plans
            {kpis.overdue > 0 && <span className="text-destructive ml-2">• {kpis.overdue} en retard</span>}
            {canSeeBrouillons && kpis.brouillons > 0 && <span className="ml-2">• {kpis.brouillons} brouillons</span>}
          </p>
        </div>
        <Button className="h-12 px-6" onClick={() => navigate("/preventif/new")}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau plan
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{kpis.valides}</p>
              <p className="text-xs text-muted-foreground">Validés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-2xl font-bold tabular-nums text-destructive">{kpis.overdue}</p>
              <p className="text-xs text-muted-foreground">En retard</p>
            </div>
          </CardContent>
        </Card>
        {canSeeBrouillons && (
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <FileEdit className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{kpis.brouillons}</p>
                <p className="text-xs text-muted-foreground">Brouillons</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <PauseCircle className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{kpis.suspendus}</p>
              <p className="text-xs text-muted-foreground">Suspendus</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher plan, machine..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 w-56 h-10"
          />
        </div>
        <Select value={filterLine} onValueChange={setFilterLine}>
          <SelectTrigger className="w-48 h-10"><SelectValue placeholder="Ligne" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les lignes</SelectItem>
            {lines.map(l => <SelectItem key={l.id} value={l.id}>{l.code} — {l.designation}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMachine} onValueChange={setFilterMachine}>
          <SelectTrigger className="w-56 h-10"><SelectValue placeholder="Machine" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les machines</SelectItem>
            {filteredMachines.map(m => <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-40 h-10"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {canSeeBrouillons && <SelectItem value="brouillon">Brouillon</SelectItem>}
            <SelectItem value="valide">Validé</SelectItem>
            <SelectItem value="suspendu">Suspendu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterFrequence} onValueChange={setFilterFrequence}>
          <SelectTrigger className="w-44 h-10"><SelectValue placeholder="Fréquence" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes fréquences</SelectItem>
            {Object.entries(FREQ_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterLine !== "all" || filterMachine !== "all" || filterStatut !== "all" || filterFrequence !== "all" || searchText.trim()) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-3 text-muted-foreground"
            onClick={() => {
              setFilterLine("all");
              setFilterMachine("all");
              setFilterStatut("all");
              setFilterFrequence("all");
              setSearchText("");
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
          </Button>
        )}
      </div>

      {/* Line context summary */}
      {lineContext && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-2">
          <CalendarCheck className="h-4 w-4" />
          Ligne sélectionnée : <strong className="text-foreground">{lineContext.machineCount}</strong> machine(s),{" "}
          <strong className="text-foreground">{lineContext.eqCount}</strong> équipement(s)
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Ligne</TableHead>
                <TableHead>Fréquence</TableHead>
                <TableHead>Dernière exéc.</TableHead>
                <TableHead>Prochaine éch.</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Aucun plan préventif
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const isOverdue = p.prochaine_echeance && new Date(p.prochaine_echeance) < new Date() && p.statut_plan === "valide";
                  const statutInfo = STATUT_LABELS[p.statut_plan] || STATUT_LABELS.valide;
                  return (
                    <TableRow
                      key={p.id}
                      className={`cursor-pointer hover:bg-muted/50 ${isOverdue ? "bg-destructive/5" : ""}`}
                      onClick={() => navigate(`/preventif/${p.id}`)}
                    >
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>
                        <p className="text-sm">{p.machines?.designation}</p>
                        <p className="text-xs text-muted-foreground">{p.machines?.code}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.production_lines?.code || "—"}
                      </TableCell>
                      <TableCell className="capitalize">{p.frequence}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {p.derniere_execution ? new Date(p.derniere_execution).toLocaleDateString("fr-FR") : "Jamais"}
                      </TableCell>
                      <TableCell className={`tabular-nums ${isOverdue ? "text-destructive font-bold" : ""}`}>
                        {p.prochaine_echeance ? new Date(p.prochaine_echeance).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statutInfo.variant} className="text-xs">{statutInfo.label}</Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-[10px] ml-1">RETARD</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
