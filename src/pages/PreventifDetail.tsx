import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, CheckCircle, PauseCircle, Play, CalendarCheck, Package, Users, ClipboardCheck, Clock, Timer, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { Label } from "@/components/ui/label";
import { logAudit } from "@/lib/audit";
import { consumePreventiveHolding, confirmItemTaken, createPdrRequest, type PdrRequest, type PdrRequestItem } from "@/hooks/usePdrRequests";
import { ConfirmTakeDialog } from "@/components/pdr/ConfirmTakeDialog";
import { PdrRequestComposer } from "@/components/pdr/PdrRequestComposer";
import { useShiftRealtime } from "@/hooks/useShiftRealtime";
import { Plus, PackagePlus } from "lucide-react";

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
  const navigate = useNavWithFrom();
  const goBack = useSmartBack("/preventif");
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const [plan, setPlan] = useState<any>(null);
  const [planPdr, setPlanPdr] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);

  // Open (in-progress) execution + held pieces
  const [openExec, setOpenExec] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [consumedQty, setConsumedQty] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);

  // Pieces requested for this plan (full requests with items)
  const [planRequests, setPlanRequests] = useState<PdrRequest[]>([]);
  const [takeTarget, setTakeTarget] = useState<{ req: PdrRequest; it: PdrRequestItem } | null>(null);
  const [takeBusy, setTakeBusy] = useState(false);

  // Consumptions (intervention_pdr) of this plan + resolved user names
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

  // Execution dialog state (clôture)
  const [execOpen, setExecOpen] = useState(false);
  const [execNotes, setExecNotes] = useState("");
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
    const execs = eRes.data || [];
    setExecutions(execs);
    const open = execs.find((e: any) => e.statut === "en_cours" && (!user || e.executed_by === user.id)) || null;
    setOpenExec(open);

    const userIds = (aRes.data || []).map((a: any) => a.user_id);
    setAssigneeIds(userIds);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", userIds);
      setAssignees(profiles || []);
    }
    await loadHoldings();
    await loadPlanRequests();
    await loadHistory(execs);
  };

  // Consumptions (intervention_pdr) tied to this plan's executions + user names
  const loadHistory = async (execs: any[]) => {
    if (!id) { setConsumptions([]); return; }
    const execIds = (execs ?? []).map((e: any) => e.id);
    let cons: any[] = [];
    if (execIds.length > 0) {
      const { data } = await supabase
        .from("intervention_pdr" as any)
        .select("*, pdr(reference, designation)")
        .in("preventive_execution_id", execIds);
      cons = (data as any) ?? [];
    }
    setConsumptions(cons);

    // Resolve all user ids involved in the PDR lifecycle
    const { data: reqs } = await supabase
      .from("pdr_requests" as any)
      .select("requested_by, created_by, items:pdr_request_items(prepared_by, taken_by)")
      .eq("preventive_plan_id", id);
    const userIds = new Set<string>();
    ((reqs as any[]) ?? []).forEach((r) => {
      if (r.requested_by) userIds.add(r.requested_by);
      if (r.created_by) userIds.add(r.created_by);
      (r.items ?? []).forEach((it: any) => {
        if (it.prepared_by) userIds.add(it.prepared_by);
        if (it.taken_by) userIds.add(it.taken_by);
      });
    });
    (execs ?? []).forEach((e: any) => { if (e.executed_by) userIds.add(e.executed_by); });
    const ids = [...userIds];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—"; });
      setProfileMap(map);
    } else {
      setProfileMap({});
    }
  };

  // Pieces taken (held) by the user for this plan's validated requests
  const loadHoldings = async () => {
    if (!id || !user) { setHoldings([]); return; }
    const { data: reqs } = await supabase.from("pdr_requests" as any).select("id").eq("preventive_plan_id", id);
    const reqIds = (reqs ?? []).map((r: any) => r.id);
    if (reqIds.length === 0) { setHoldings([]); return; }
    const { data: items } = await supabase.from("pdr_request_items" as any).select("id").in("request_id", reqIds);
    const itemIds = (items ?? []).map((i: any) => i.id);
    if (itemIds.length === 0) { setHoldings([]); return; }
    const { data: holds } = await supabase
      .from("pdr_maintenance_holdings" as any)
      .select("*, pdr(reference, designation)")
      .eq("holder_id", user.id).eq("statut", "en_main").in("request_item_id", itemIds);
    setHoldings((holds as any) ?? []);
    const init: Record<string, string> = {};
    (holds ?? []).forEach((h: any) => { init[h.id] = String(h.quantite); });
    setConsumedQty(init);
  };

  // All requests of this plan with their items (état demandée / prête / prise)
  const loadPlanRequests = async () => {
    if (!id) { setPlanRequests([]); return; }
    const { data } = await supabase
      .from("pdr_requests" as any)
      .select(
        "*, machines(id, code, designation), tickets(id, numero), items:pdr_request_items(*, pdr(id, reference, designation, stock_actuel, stock_reserve, unite_stock))",
      )
      .eq("preventive_plan_id", id)
      .order("created_at", { ascending: false });
    setPlanRequests((data as any) ?? []);
  };

  const handleTake = async (itemId: string, qte: number) => {
    setTakeBusy(true);
    try {
      await confirmItemTaken(itemId, qte);
      toast({ title: "Prise confirmée — pièce transférée à la maintenance" });
      setTakeTarget(null);
      await loadHoldings();
      await loadPlanRequests();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setTakeBusy(false);
    }
  };

  useEffect(() => { loadAll(); }, [id]);



  const updateStatut = async (newStatut: string) => {
    const oldStatut = (plan as any)?.statut_plan;
    const { error } = await supabase.from("preventive_plans").update({ statut_plan: newStatut } as any).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit({
      action_type: "status_change", module: "preventif" as any, entity_type: "preventive_plan",
      entity_id: id!, entity_label: plan?.title,
      action_label: `Plan préventif → ${newStatut}`,
      old_values: { statut_plan: oldStatut }, new_values: { statut_plan: newStatut },
      severity: newStatut === "suspendu" ? "medium" : "low",
    });
    toast({ title: `Plan ${newStatut === "valide" ? "validé" : newStatut === "suspendu" ? "suspendu" : "remis en brouillon"}` });
    loadAll();
  };

  const isAssigned = user ? assigneeIds.includes(user.id) : false;
  const canWork = plan && (plan as any).statut_plan === "valide" && (isAssigned || hasRole("admin") || hasRole("resp_maintenance"));

  // ===== Commencer : crée une exécution en cours =====
  const startExecution = async () => {
    if (!user || !id) return;
    setStarting(true);
    try {
      const now = new Date();
      const { data: exec, error } = await supabase.from("preventive_executions").insert({
        plan_id: id,
        executed_by: user.id,
        statut: "en_cours",
        heure_debut: now.toISOString(),
      } as any).select("*").single();
      if (error) throw error;
      await logAudit({
        action_type: "create", module: "preventif" as any, entity_type: "preventive_execution",
        entity_id: (exec as any).id, entity_label: plan?.title,
        action_label: "Début intervention plan préventif", severity: "low",
        new_values: { plan_id: id, heure_debut: now.toISOString() },
      });
      toast({ title: "Intervention démarrée", description: "Vous pouvez demander/prendre des pièces puis clôturer." });
      await loadAll();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const openExecDialog = async () => {
    setExecNotes("");
    setExecDureeMinutes(0);
    const now = new Date();
    setExecStartTime(now.toTimeString().slice(0, 5));
    setExecOpen(true);
  };


  // ===== Terminer : clôture l'exécution en cours + consomme les pièces prêtées =====
  const submitExecution = async () => {
    if (!user || !id || !openExec) return;
    if (execDureeMinutes <= 0) {
      toast({ title: "Durée obligatoire", description: "Veuillez saisir la durée de l'intervention", variant: "destructive" });
      return;
    }
    setExecLoading(true);
    try {
      // Consommation des pièces prêtées (reliquat retourné au magasin auto)
      for (const h of holdings) {
        const qte = Math.max(0, Math.min(h.quantite, parseInt(consumedQty[h.id] ?? String(h.quantite), 10) || 0));
        try {
          await consumePreventiveHolding({ holding_id: h.id, execution_id: openExec.id, qte_consomme: qte });
        } catch (e) { console.warn("[preventif] holding consume failed", e); }
      }

      const consumedList = holdings.map((h) => ({
        pdr_id: h.pdr_id, reference: h.pdr?.reference,
        quantite: Math.max(0, Math.min(h.quantite, parseInt(consumedQty[h.id] ?? String(h.quantite), 10) || 0)),
      })).filter((c) => c.quantite > 0);


      const now = new Date();
      const { error } = await supabase.from("preventive_executions").update({
        statut: "terminee",
        heure_fin: now.toISOString(),
        duree_minutes: execDureeMinutes,
        notes: [
          execStartTime ? `Début: ${execStartTime}` : null,
          `Durée: ${execDureeMinutes} min`,
          execNotes || null,
        ].filter(Boolean).join(" | "),
        pdr_used: consumedList as any,
      } as any).eq("id", openExec.id);
      if (error) throw error;

      // Update plan: derniere_execution + prochaine_echeance
      const days = FREQUENCE_DAYS[plan.frequence] || 30;
      const nextDate = new Date(now.getTime() + days * 86400000);
      await supabase.from("preventive_plans").update({
        derniere_execution: now.toISOString(),
        prochaine_echeance: nextDate.toISOString(),
      } as any).eq("id", id);

      await logAudit({
        action_type: "update", module: "preventif" as any, entity_type: "preventive_execution",
        entity_id: openExec.id, entity_label: plan?.title,
        action_label: "Clôture intervention plan préventif",
        new_values: {
          plan_id: id, duree_minutes: execDureeMinutes, heure_debut: execStartTime,
          pdr_used: consumedList, prochaine_echeance: nextDate.toISOString(),
        },
        severity: "low",
      });

      toast({ title: "Intervention clôturée", description: `Prochaine échéance : ${nextDate.toLocaleDateString("fr-FR")}` });
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

  // Items demandés pour ce plan, à plat avec leur demande parente
  const allReqItems = planRequests.flatMap((r) => (r.items ?? []).map((it) => ({ req: r, it })));
  const itemsAPrendre = allReqItems.filter(({ it }) => it.statut === "prete");
  const itemsEnPreparation = allReqItems.filter(({ it }) => it.statut === "demandee");

  // ===== Historique PDR : chronologie par pièce =====
  const userName = (uid?: string | null) => (uid ? (profileMap[uid] || "—") : "—");
  const execLabel = (execId?: string | null) => {
    const e = executions.find((x: any) => x.id === execId);
    return e ? `exéc. du ${new Date(e.date_execution).toLocaleDateString("fr-FR")}` : "exécution";
  };
  type HistEvent = { ts: number; type: "demandee" | "preparee" | "prise" | "consommee"; date: string; qte: number; user: string; note?: string };
  const histByPiece: { pdrId: string; reference: string; designation: string; events: HistEvent[] }[] = (() => {
    const groups = new Map<string, { pdrId: string; reference: string; designation: string; events: HistEvent[] }>();
    const ensure = (pdrId: string, reference: string, designation: string) => {
      if (!groups.has(pdrId)) groups.set(pdrId, { pdrId, reference, designation, events: [] });
      return groups.get(pdrId)!;
    };
    allReqItems.forEach(({ req, it }) => {
      const pid = it.pdr_id as string;
      const g = ensure(pid, it.pdr?.reference ?? "—", it.pdr?.designation ?? "");
      if ((it as any).created_at || req.created_at) {
        g.events.push({ ts: new Date(req.created_at).getTime(), type: "demandee", date: req.created_at, qte: it.quantite_demandee ?? 0, user: userName(req.requested_by || (req as any).created_by), note: req.numero });
      }
      if ((it as any).prepared_at) {
        g.events.push({ ts: new Date((it as any).prepared_at).getTime(), type: "preparee", date: (it as any).prepared_at, qte: it.quantite_preparee ?? it.quantite_demandee ?? 0, user: userName((it as any).prepared_by) });
      }
      if ((it as any).taken_at) {
        const reliquat = Math.max(0, (it.quantite_demandee ?? 0) - (it.quantite_prise ?? 0));
        g.events.push({ ts: new Date((it as any).taken_at).getTime(), type: "prise", date: (it as any).taken_at, qte: it.quantite_prise ?? 0, user: userName((it as any).taken_by), note: reliquat > 0 ? `reliquat ${reliquat} non fourni` : undefined });
      }
    });
    consumptions.forEach((c: any) => {
      const pid = c.pdr_id as string;
      const g = ensure(pid, c.pdr?.reference ?? "—", c.pdr?.designation ?? "");
      g.events.push({ ts: new Date(c.created_at).getTime(), type: "consommee", date: c.created_at, qte: c.quantite ?? 0, user: "", note: execLabel(c.preventive_execution_id) });
    });
    return [...groups.values()]
      .map((g) => ({ ...g, events: g.events.sort((a, b) => a.ts - b.ts) }))
      .sort((a, b) => (b.events[0]?.ts ?? 0) - (a.events[0]?.ts ?? 0));
  })();

  const HIST_META: Record<HistEvent["type"], { label: string; cls: string }> = {
    demandee: { label: "Demandée", cls: "text-blue-600 border-blue-600/40" },
    preparee: { label: "Préparée", cls: "text-amber-600 border-amber-600/40" },
    prise: { label: "Prise", cls: "text-emerald-600 border-emerald-600/40" },
    consommee: { label: "Consommée", cls: "text-purple-600 border-purple-600/40" },
  };

  // ===== Onglet PDR : prévu (nomenclature) + état réel (demandé / pris / consommé) =====
  type PdrRow = {
    pdrId: string; reference: string; designation: string;
    prevu: number; demande: number; pris: number; consomme: number;
    statut: "non_demandee" | "demandee" | "prete" | "prise" | "refusee" | "consommee";
  };
  const pdrOverview: PdrRow[] = (() => {
    const map = new Map<string, PdrRow>();
    const ensure = (pdrId: string, reference: string, designation: string) => {
      if (!map.has(pdrId)) {
        map.set(pdrId, { pdrId, reference, designation, prevu: 0, demande: 0, pris: 0, consomme: 0, statut: "non_demandee" });
      }
      return map.get(pdrId)!;
    };
    // Nomenclature planifiée
    planPdr.forEach((pp: any) => {
      if (!pp.pdr_id && !pp.pdr) return;
      const pid = pp.pdr_id ?? pp.pdr?.id;
      const r = ensure(pid, pp.pdr?.reference ?? "—", pp.pdr?.designation ?? "");
      r.prevu += pp.quantite ?? 0;
    });
    // Demandes / prises
    allReqItems.forEach(({ it }) => {
      const pid = it.pdr_id as string;
      const r = ensure(pid, it.pdr?.reference ?? "—", it.pdr?.designation ?? "");
      r.demande += it.quantite_demandee ?? 0;
      r.pris += it.quantite_prise ?? 0;
      const rank = { non_demandee: 0, refusee: 1, demandee: 2, prete: 3, prise: 4, consommee: 5 } as const;
      const cur = it.statut === "refusee" ? "refusee" : it.statut === "prete" ? "prete" : it.statut === "prise" ? "prise" : "demandee";
      if (rank[cur] > rank[r.statut]) r.statut = cur as PdrRow["statut"];
    });
    // Consommations réelles
    consumptions.forEach((c: any) => {
      const pid = c.pdr_id as string;
      const r = ensure(pid, c.pdr?.reference ?? "—", c.pdr?.designation ?? "");
      r.consomme += c.quantite ?? 0;
    });
    map.forEach((r) => { if (r.consomme > 0) r.statut = "consommee"; });
    return [...map.values()].sort((a, b) => a.reference.localeCompare(b.reference));
  })();
  const PDR_STATUT_META: Record<PdrRow["statut"], { label: string; cls: string }> = {
    non_demandee: { label: "Non demandée", cls: "text-muted-foreground border-border" },
    demandee: { label: "Demandée", cls: "text-blue-600 border-blue-600/40" },
    prete: { label: "Prête", cls: "text-amber-600 border-amber-600/40" },
    prise: { label: "Prise", cls: "text-emerald-600 border-emerald-600/40" },
    refusee: { label: "Refusée", cls: "text-destructive border-destructive/40" },
    consommee: { label: "Consommée", cls: "text-purple-600 border-purple-600/40" },
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{plan.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {(plan as any).numero && <Badge variant="outline" className="text-xs font-mono">{(plan as any).numero}</Badge>}
            <Badge variant={statutInfo.variant} className="text-xs">{statutInfo.label}</Badge>
            <Badge variant="outline" className="text-xs capitalize">{plan.frequence}</Badge>
            {isOverdue && <Badge variant="destructive" className="text-xs">En retard</Badge>}
            {(plan as any).source === "auto_duree_vie" && <Badge variant="secondary" className="text-xs">Auto (durée de vie)</Badge>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canWork && !openExec && (
            <Button onClick={startExecution} disabled={starting} className="h-12 px-4 bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4 mr-2" /> {starting ? "Démarrage..." : "Commencer"}
            </Button>
          )}
          {canWork && openExec && (
            <Button onClick={openExecDialog} className="h-12 px-4 bg-green-600 hover:bg-green-700">
              <ClipboardCheck className="h-4 w-4 mr-2" /> Terminer
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
          {openExec && (
            <Button variant="outline" onClick={() => navigate(`/maintenance/shift/pieces?plan=${id}&exec=${openExec.id}${plan.machine_id ? `&machine=${plan.machine_id}` : ""}`)} className="h-12 px-4">
              <Package className="h-4 w-4 mr-2" /> Demander / prendre des pièces
            </Button>
          )}
        </div>
      </div>

      {openExec && (
        <Card className="border-green-600/40 bg-green-50/40 dark:bg-green-950/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <ClipboardCheck className="h-5 w-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Intervention en cours</p>
                <p className="text-xs text-muted-foreground">
                  Démarrée {openExec.heure_debut ? new Date(openExec.heure_debut).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                  {` · ${holdings.length} prise(s)`}
                  {itemsAPrendre.length > 0 ? ` · ${itemsAPrendre.length} à prendre` : ""}
                  {itemsEnPreparation.length > 0 ? ` · ${itemsEnPreparation.length} en préparation` : ""}
                </p>
              </div>
            </div>

            {(itemsAPrendre.length > 0 || itemsEnPreparation.length > 0) && (
              <div className="border rounded-lg divide-y bg-background">
                {itemsAPrendre.map(({ req, it }) => (
                  <div key={it.id} className="flex items-center gap-3 p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-semibold truncate">{it.pdr?.reference}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{it.pdr?.designation} · {req.numero} · préparé : {it.quantite_preparee ?? it.quantite_demandee}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-600/40">Prête</Badge>
                    <Button size="sm" className="h-9" disabled={takeBusy} onClick={() => setTakeTarget({ req, it })}>
                      Confirmer la prise
                    </Button>
                  </div>
                ))}
                {itemsEnPreparation.map(({ req, it }) => (
                  <div key={it.id} className="flex items-center gap-3 p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-semibold truncate">{it.pdr?.reference}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{it.pdr?.designation} · {req.numero} · demandé : {it.quantite_demandee}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-600/40">En préparation (magasin)</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="info">
        <TabsList className="h-11">
          <TabsTrigger value="info" className="h-9">Infos</TabsTrigger>

          <TabsTrigger value="pdr" className="h-9"><Package className="h-3.5 w-3.5 mr-1" />PDR</TabsTrigger>
          <TabsTrigger value="assignees" className="h-9"><Users className="h-3.5 w-3.5 mr-1" />Affectés</TabsTrigger>
          <TabsTrigger value="executions" className="h-9"><CalendarCheck className="h-3.5 w-3.5 mr-1" />Exécutions</TabsTrigger>
          <TabsTrigger value="historique" className="h-9"><History className="h-3.5 w-3.5 mr-1" />Historique PDR</TabsTrigger>
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
                    <TableHead className="text-right">Prévu</TableHead>
                    <TableHead className="text-right">Demandé</TableHead>
                    <TableHead className="text-right">Pris</TableHead>
                    <TableHead className="text-right">Consommé</TableHead>
                    <TableHead className="text-right">Reliquat</TableHead>
                    <TableHead>État</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pdrOverview.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Aucune PDR planifiée ni demandée pour ce plan</TableCell></TableRow>
                  ) : pdrOverview.map((r) => {
                    const reliquat = Math.max(0, r.prevu - r.consomme);
                    return (
                      <TableRow key={r.pdrId}>
                        <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                        <TableCell>{r.designation}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.prevu || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.demande || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.pris || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{r.consomme || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.prevu > 0 ? reliquat : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${PDR_STATUT_META[r.statut].cls}`}>{PDR_STATUT_META[r.statut].label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                    <TableHead>Statut</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Exécuté par</TableHead>
                    <TableHead>PDR consommées</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune exécution</TableCell></TableRow>
                  ) : executions.map((e: any) => {
                    const pdrUsed = Array.isArray(e.pdr_used) ? e.pdr_used : [];
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="tabular-nums text-sm">{new Date(e.date_execution).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>
                          <Badge variant={e.statut === "en_cours" ? "outline" : "default"} className="text-[10px]">
                            {e.statut === "en_cours" ? "En cours" : "Terminée"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">{e.duree_minutes ? `${e.duree_minutes} min` : "—"}</TableCell>
                        <TableCell className="text-sm">
                          {assignees.find((a: any) => a.user_id === e.executed_by)
                            ? `${assignees.find((a: any) => a.user_id === e.executed_by)?.first_name} ${assignees.find((a: any) => a.user_id === e.executed_by)?.last_name}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {pdrUsed.length > 0 ? (
                            <div className="space-y-0.5">
                              {pdrUsed.map((p: any, i: number) => (
                                <span key={i} className="block text-xs">
                                  <span className="font-mono">{p.reference}</span> ×{p.quantite}
                                </span>
                              ))}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[250px]">{e.notes || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historique">
          <Card>
            <CardContent className="pt-6">
              {histByPiece.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun mouvement de pièce pour ce plan</p>
              ) : (
                <div className="space-y-4">
                  {histByPiece.map((g) => (
                    <div key={g.pdrId} className="rounded-lg border">
                      <div className="px-4 py-2.5 border-b bg-muted/40">
                        <p className="font-mono text-sm font-semibold">{g.reference}</p>
                        <p className="text-xs text-muted-foreground">{g.designation}</p>
                      </div>
                      <ul className="divide-y">
                        {g.events.map((ev, i) => (
                          <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="text-xs text-muted-foreground tabular-nums w-28 shrink-0">
                              {new Date(ev.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${HIST_META[ev.type].cls}`}>{HIST_META[ev.type].label}</Badge>
                            <span className="text-sm font-medium tabular-nums shrink-0">×{ev.qte}</span>
                            <span className="text-xs text-muted-foreground truncate flex-1">
                              {ev.user ? `par ${ev.user}` : ""}
                              {ev.note ? `${ev.user ? " · " : ""}${ev.note}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execution Dialog */}
      <Dialog open={execOpen} onOpenChange={setExecOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Terminer l'intervention préventive</DialogTitle>
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

            {/* Pièces prêtées — quantité consommée */}
            {holdings.length > 0 && (
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" /> Pièces prises — quantité consommée
                </Label>
                <p className="text-xs text-muted-foreground mb-2">Le reliquat non consommé est automatiquement retourné au stock magasin.</p>
                <div className="border rounded-lg divide-y">
                  {holdings.map((h: any) => (
                    <div key={h.id} className="flex items-center gap-3 p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs font-semibold truncate">{h.pdr?.reference}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{h.pdr?.designation} · pris : {h.quantite}</p>
                      </div>
                      <Input
                        type="number" min={0} max={h.quantite}
                        value={consumedQty[h.id] ?? String(h.quantite)}
                        onChange={(e) => setConsumedQty((m) => ({ ...m, [h.id]: e.target.value }))}
                        className="h-10 w-20 tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {holdings.length === 0 && (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed p-2.5">
                Aucune pièce prise. Si l'intervention nécessite des pièces, utilisez « Demander / prendre des pièces » avant de clôturer.
              </p>
            )}

            {(itemsAPrendre.length + itemsEnPreparation.length) > 0 && (
              <p className="text-xs rounded-md border border-amber-600/40 bg-amber-50/40 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 p-2.5">
                {itemsAPrendre.length + itemsEnPreparation.length} pièce(s) demandée(s) non prise(s) ne seront pas consommées. Prenez-les avant de clôturer si besoin.
              </p>
            )}

            {/* Pièce manquante : passer par le circuit de demande (jamais de consommation directe) */}
            <div className="rounded-md border border-dashed p-2.5 flex items-start gap-2">
              <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  Pièce manquante ou imprévu ? Fermez ce dialogue et utilisez « Demander / prendre des pièces ». Le magasin prépare et valide, puis vous confirmez ici la quantité consommée.
                </p>
                {openExec && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-9"
                    onClick={() => {
                      setExecOpen(false);
                      navigate(`/maintenance/shift/pieces?plan=${id}&exec=${openExec.id}${plan.machine_id ? `&machine=${plan.machine_id}` : ""}`);
                    }}
                  >
                    <Package className="h-4 w-4 mr-2" /> Demander / prendre des pièces
                  </Button>
                )}
              </div>
            </div>



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
              {execLoading ? "Clôture..." : "Clôturer l'intervention"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmTakeDialog
        open={!!takeTarget}
        request={takeTarget?.req ?? null}
        item={takeTarget?.it ?? null}
        busy={takeBusy}
        onConfirm={(qte) => takeTarget && handleTake(takeTarget.it.id, qte)}
        onCancel={() => setTakeTarget(null)}
      />
    </div>
  );
}
