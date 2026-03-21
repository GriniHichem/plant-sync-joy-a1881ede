import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, CheckCircle, PauseCircle, Play, CalendarCheck, Package, Users, ClipboardCheck, Clock, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const STATUT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  brouillon: { label: "Brouillon", variant: "secondary" },
  valide: { label: "Validé", variant: "default" },
  suspendu: { label: "Suspendu", variant: "outline" },
};

const FREQUENCE_DAYS: Record<string, number> = {
  quotidien: 1, hebdomadaire: 7, bimensuel: 14, mensuel: 30,
  trimestriel: 90, semestriel: 180, annuel: 365,
};

export default function PreventifDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const [plan, setPlan] = useState<any>(null);
  const [planPdr, setPlanPdr] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);

  // Execution dialog state
  const [execOpen, setExecOpen] = useState(false);
  const [execNotes, setExecNotes] = useState("");
  const [execPdrUsed, setExecPdrUsed] = useState<Record<string, boolean>>({});
  const [execLoading, setExecLoading] = useState(false);
  const [execDureeMinutes, setExecDureeMinutes] = useState<number>(0);
  const [execStartTime, setExecStartTime] = useState("");

  const loadAll = async () => {
    if (!id) return;
    const [pRes, ppRes, aRes, eRes] = await Promise.all([
      supabase.from("preventive_plans").select("*, machines(code, designation), production_lines(code, designation)").eq("id", id).single(),
      supabase.from("preventive_plan_pdr").select("*, pdr(reference, designation)").eq("plan_id", id),
      supabase.from("preventive_plan_assignees").select("user_id").eq("plan_id", id),
      supabase.from("preventive_executions").select("*").eq("plan_id", id).order("date_execution", { ascending: false }),
    ]);
    if (pRes.data) setPlan(pRes.data);
    setPlanPdr(ppRes.data || []);
    setExecutions(eRes.data || []);

    const userIds = (aRes.data || []).map((a: any) => a.user_id);
    setAssigneeIds(userIds);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", userIds);
      setAssignees(profiles || []);
    }
  };

  useEffect(() => { loadAll(); }, [id]);

  const updateStatut = async (newStatut: string) => {
    await supabase.from("preventive_plans").update({ statut_plan: newStatut } as any).eq("id", id);
    toast({ title: `Plan ${newStatut === "valide" ? "validé" : newStatut === "suspendu" ? "suspendu" : "remis en brouillon"}` });
    loadAll();
  };

  const isAssigned = user ? assigneeIds.includes(user.id) : false;
  const canExecute = plan && (plan as any).statut_plan === "valide" && (isAssigned || hasRole("admin") || hasRole("resp_maintenance"));

  const openExecDialog = () => {
    setExecNotes("");
    setExecDureeMinutes(0);
    const now = new Date();
    setExecStartTime(now.toTimeString().slice(0, 5));
    const pdrMap: Record<string, boolean> = {};
    planPdr.forEach(pp => { pdrMap[pp.id] = true; });
    setExecPdrUsed(pdrMap);
    setExecOpen(true);
  };

  const submitExecution = async () => {
    if (!user || !id) return;
    setExecLoading(true);
    try {
      const pdrUsedList = planPdr
        .filter(pp => execPdrUsed[pp.id])
        .map(pp => ({ pdr_id: pp.pdr_id, reference: pp.pdr?.reference, quantite: pp.quantite }));

      const { error } = await supabase.from("preventive_executions").insert({
        plan_id: id,
        executed_by: user.id,
        notes: execNotes || null,
        pdr_used: pdrUsedList as any,
      });

      if (error) throw error;

      // Update plan: derniere_execution + prochaine_echeance
      const now = new Date();
      const days = FREQUENCE_DAYS[plan.frequence] || 30;
      const nextDate = new Date(now.getTime() + days * 86400000);

      await supabase.from("preventive_plans").update({
        derniere_execution: now.toISOString(),
        prochaine_echeance: nextDate.toISOString(),
      } as any).eq("id", id);

      toast({ title: "Exécution enregistrée", description: `Prochaine échéance : ${nextDate.toLocaleDateString("fr-FR")}` });
      setExecOpen(false);
      loadAll();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setExecLoading(false);
    }
  };

  if (!plan) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const statutInfo = STATUT_LABELS[(plan as any).statut_plan] || STATUT_LABELS.valide;
  const isOverdue = plan.prochaine_echeance && new Date(plan.prochaine_echeance) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/preventif")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{plan.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={statutInfo.variant} className="text-xs">{statutInfo.label}</Badge>
            <Badge variant="outline" className="text-xs capitalize">{plan.frequence}</Badge>
            {isOverdue && <Badge variant="destructive" className="text-xs">En retard</Badge>}
            {(plan as any).source === "auto_duree_vie" && <Badge variant="secondary" className="text-xs">Auto (durée de vie)</Badge>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canExecute && (
            <Button onClick={openExecDialog} className="h-12 px-4 bg-green-600 hover:bg-green-700">
              <ClipboardCheck className="h-4 w-4 mr-2" /> Exécuter
            </Button>
          )}
          {canEdit("preventif") && (plan as any).statut_plan === "brouillon" && (
            <Button onClick={() => updateStatut("valide")} className="h-12 px-4">
              <CheckCircle className="h-4 w-4 mr-2" /> Valider
            </Button>
          )}
          {canEdit("preventif") && (plan as any).statut_plan === "valide" && (
            <Button variant="outline" onClick={() => updateStatut("suspendu")} className="h-12 px-4">
              <PauseCircle className="h-4 w-4 mr-2" /> Suspendre
            </Button>
          )}
          {canEdit("preventif") && (plan as any).statut_plan === "suspendu" && (
            <Button variant="outline" onClick={() => updateStatut("valide")} className="h-12 px-4">
              <Play className="h-4 w-4 mr-2" /> Réactiver
            </Button>
          )}
          {canEdit("preventif") && (
            <Button variant="outline" onClick={() => navigate(`/preventif/${id}/edit`)} className="h-12 px-4">
              <Edit className="h-4 w-4 mr-2" /> Modifier
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="h-11">
          <TabsTrigger value="info" className="h-9">Infos</TabsTrigger>
          <TabsTrigger value="pdr" className="h-9"><Package className="h-3.5 w-3.5 mr-1" />PDR</TabsTrigger>
          <TabsTrigger value="assignees" className="h-9"><Users className="h-3.5 w-3.5 mr-1" />Affectés</TabsTrigger>
          <TabsTrigger value="executions" className="h-9"><CalendarCheck className="h-3.5 w-3.5 mr-1" />Exécutions</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6">
              {[
                ["Titre", plan.title],
                ["Machine", plan.machines ? `${plan.machines.code} — ${plan.machines.designation}` : "—"],
                ["Ligne", (plan as any).production_lines ? `${(plan as any).production_lines.code} — ${(plan as any).production_lines.designation}` : "—"],
                ["Fréquence", plan.frequence],
                ["Statut plan", statutInfo.label],
                ["Source", (plan as any).source === "auto_duree_vie" ? "Auto (durée de vie)" : "Manuel"],
                ["Dernière exécution", plan.derniere_execution ? new Date(plan.derniere_execution).toLocaleDateString("fr-FR") : "Jamais"],
                ["Prochaine échéance", plan.prochaine_echeance ? new Date(plan.prochaine_echeance).toLocaleDateString("fr-FR") : "—"],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{String(value)}</p>
                </div>
              ))}
              {(plan as any).type_maintenance && (
                <div className="col-span-full">
                  <p className="text-xs text-muted-foreground">Type de maintenance / Opérations</p>
                  <p className="text-sm whitespace-pre-wrap">{(plan as any).type_maintenance}</p>
                </div>
              )}
              {plan.description && (
                <div className="col-span-full">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{plan.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdr">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Quantité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planPdr.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Aucune PDR</TableCell></TableRow>
                  ) : planPdr.map((pp: any) => (
                    <TableRow key={pp.id}>
                      <TableCell className="font-mono text-sm">{pp.pdr?.reference}</TableCell>
                      <TableCell>{pp.pdr?.designation}</TableCell>
                      <TableCell className="tabular-nums">×{pp.quantite}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignees">
          <Card>
            <CardContent className="pt-6">
              {assignees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun maintenancier affecté</p>
              ) : (
                <div className="space-y-2">
                  {assignees.map((a: any) => (
                    <div key={a.user_id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{a.first_name} {a.last_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">Aucune exécution</TableCell></TableRow>
                  ) : executions.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="tabular-nums text-sm">{new Date(e.date_execution).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execution Dialog */}
      <Dialog open={execOpen} onOpenChange={setExecOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exécuter le plan préventif</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Timing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="exec-start" className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Heure début
                </Label>
                <Input
                  id="exec-start"
                  type="time"
                  value={execStartTime}
                  onChange={(e) => setExecStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="exec-duree" className="text-sm font-medium flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-muted-foreground" /> Durée (minutes)
                </Label>
                <Input
                  id="exec-duree"
                  type="number"
                  min={0}
                  value={execDureeMinutes || ""}
                  onChange={(e) => setExecDureeMinutes(Number(e.target.value))}
                  placeholder="Ex: 45"
                  className="mt-1"
                />
              </div>
            </div>

            {/* PDR utilisées */}
            {planPdr.length > 0 && (
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" /> PDR utilisées
                </Label>
                <div className="border rounded-lg divide-y">
                  {planPdr.map((pp: any) => (
                    <div key={pp.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`pdr-${pp.id}`}
                        checked={execPdrUsed[pp.id] ?? false}
                        onCheckedChange={(v) => setExecPdrUsed(prev => ({ ...prev, [pp.id]: !!v }))}
                      />
                      <label htmlFor={`pdr-${pp.id}`} className="flex-1 cursor-pointer">
                        <span className="text-sm font-mono font-medium">{pp.pdr?.reference}</span>
                        <span className="text-sm text-muted-foreground ml-2">— {pp.pdr?.designation}</span>
                        <Badge variant="outline" className="ml-2 text-xs">×{pp.quantite}</Badge>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.values(execPdrUsed).filter(Boolean).length}/{planPdr.length} pièce(s) sélectionnée(s)
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="exec-notes">Notes / Observations</Label>
              <Textarea
                id="exec-notes"
                value={execNotes}
                onChange={(e) => setExecNotes(e.target.value)}
                placeholder="Observations sur l'exécution..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecOpen(false)}>Annuler</Button>
            <Button onClick={submitExecution} disabled={execLoading} className="bg-green-600 hover:bg-green-700">
              {execLoading ? "Enregistrement..." : "Confirmer l'exécution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
