import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

const STATUT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  brouillon: { label: "Brouillon", variant: "secondary" },
  valide: { label: "Validé", variant: "default" },
  suspendu: { label: "Suspendu", variant: "outline" },
};

export default function PreventifList() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterMachine, setFilterMachine] = useState("all");
  const [machines, setMachines] = useState<any[]>([]);

  const canSeeBrouillons = hasRole("admin") || hasRole("resp_maintenance");

  useEffect(() => {
    const loadData = async () => {
      let query = supabase
        .from("preventive_plans")
        .select("*, machines(code, designation), production_lines(code, designation)")
        .eq("is_active", true)
        .order("prochaine_echeance", { ascending: true });

      const { data } = await query;
      setPlans(data || []);

      const { data: mData } = await supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code");
      setMachines(mData || []);
    };
    loadData();
  }, []);

  const filtered = plans.filter(p => {
    if (filterStatut !== "all" && (p as any).statut_plan !== filterStatut) return false;
    if (!canSeeBrouillons && (p as any).statut_plan === "brouillon") return false;
    if (filterMachine !== "all" && p.machine_id !== filterMachine) return false;
    return true;
  });

  const overdue = filtered.filter(p => p.prochaine_echeance && new Date(p.prochaine_echeance) < new Date() && (p as any).statut_plan === "valide");
  const brouillons = plans.filter(p => (p as any).statut_plan === "brouillon");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Préventive</h1>
          <p className="text-muted-foreground">
            {filtered.length} plans
            {overdue.length > 0 && <span className="text-destructive ml-2">• {overdue.length} en retard</span>}
            {canSeeBrouillons && brouillons.length > 0 && <span className="text-muted-foreground ml-2">• {brouillons.length} brouillons</span>}
          </p>
        </div>
        <Button className="h-12 px-6" onClick={() => navigate("/preventif/new")}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau plan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-40 h-10"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {canSeeBrouillons && <SelectItem value="brouillon">Brouillon</SelectItem>}
            <SelectItem value="valide">Validé</SelectItem>
            <SelectItem value="suspendu">Suspendu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMachine} onValueChange={setFilterMachine}>
          <SelectTrigger className="w-56 h-10"><SelectValue placeholder="Machine" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les machines</SelectItem>
            {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

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
                  const isOverdue = p.prochaine_echeance && new Date(p.prochaine_echeance) < new Date() && (p as any).statut_plan === "valide";
                  const statutInfo = STATUT_LABELS[(p as any).statut_plan] || STATUT_LABELS.valide;
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
                        {(p as any).production_lines?.code || "—"}
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
