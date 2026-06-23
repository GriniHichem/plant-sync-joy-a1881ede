import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User, Wrench, Factory, Package, Users, X, ArrowRightLeft, UserMinus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { StickyActionBar } from "@/components/responsive/StickyActionBar";
import { checkValidationRequired, createValidationRequest } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { consumeFromMinistock } from "@/hooks/usePdrRequests";
import { useShiftRealtime } from "@/hooks/useShiftRealtime";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack("/tickets");
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { canEdit, canDelete } = usePermissions();
  const isMobile = useIsMobile();
  const [ticket, setTicket] = useState<any>(null);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [causeRacine, setCauseRacine] = useState("");
  const [solution, setSolution] = useState("");

  const [pdrList, setPdrList] = useState<any[]>([]);
  const [pendingResolve, setPendingResolve] = useState<null | (() => Promise<void>)>(null);

  // Mini-stock du maintenancier (toutes ses pièces en_main, tous tickets confondus)
  const [holdings, setHoldings] = useState<any[]>([]);
  const [consumed, setConsumed] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Co-intervenants
  const [maintenanciers, setMaintenanciers] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [newCollabId, setNewCollabId] = useState("");
  const [newCollabRole, setNewCollabRole] = useState<"aide" | "co_intervenant">("aide");
  const [assigneeName, setAssigneeName] = useState<string>("");

  // Handover (transfer / release)
  const [transferTargetId, setTransferTargetId] = useState("");
  const [handoverMotif, setHandoverMotif] = useState("");
  const [handoverBusy, setHandoverBusy] = useState(false);

  const loadTicket = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("tickets")
      .select("*, machines(code, designation), ordres_fabrication(numero), production_lines(code, designation), panne_types(name)")
      .eq("id", id)
      .single();
    setTicket(data);
    if (data) {
      setCauseRacine(data.cause_racine || "");
      setSolution(data.solution || "");
      // Resolve assignee name
      if (data.assignee_id) {
        const { data: prof } = await supabase
          .from("profiles").select("first_name,last_name").eq("user_id", data.assignee_id).maybeSingle();
        setAssigneeName(prof ? `${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim() : "");
      } else {
        setAssigneeName("");
      }
    }

    const { data: intData } = await supabase
      .from("interventions")
      .select("*, intervention_pdr(*, pdr(reference, designation))")
      .eq("ticket_id", id)
      .order("date_debut", { ascending: false });
    setInterventions(intData || []);

    // Collaborators (active only)
    const { data: collabs } = await supabase
      .from("ticket_collaborators")
      .select("id, user_id, role_label, added_at")
      .eq("ticket_id", id)
      .is("removed_at", null)
      .order("added_at", { ascending: true });
    if (collabs && collabs.length > 0) {
      const userIds = collabs.map((c: any) => c.user_id);
      const { data: profs } = await supabase
        .from("profiles").select("user_id, first_name, last_name").in("user_id", userIds);
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      setCollaborators(collabs.map((c: any) => {
        const p: any = profMap.get(c.user_id);
        return { ...c, full_name: p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "Utilisateur" };
      }));
    } else {
      setCollaborators([]);
    }
  };

  const loadMaintenanciers = async () => {
    const { data: roles } = await supabase
      .from("user_roles").select("user_id, role")
      .in("role", ["maintenancier", "resp_maintenance"] as any);
    const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
    if (ids.length === 0) { setMaintenanciers([]); return; }
    const { data: profs } = await supabase
      .from("profiles").select("user_id, first_name, last_name").in("user_id", ids);
    setMaintenanciers((profs || []).map((p: any) => ({
      user_id: p.user_id,
      full_name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Utilisateur",
    })));
  };

  // Tout le mini-stock du maintenancier connecté (toutes ses pièces en_main, tous tickets confondus)
  const loadHoldings = async () => {
    if (!user) { setHoldings([]); return; }
    const { data: holds } = await supabase
      .from("pdr_maintenance_holdings" as any)
      .select("*, pdr(reference, designation)")
      .eq("holder_id", user.id).eq("statut", "en_main")
      .gt("quantite", 0)
      .order("created_at", { ascending: false });
    setHoldings((holds as any) ?? []);
    setConsumed((prev) => {
      const next = { ...prev };
      (holds ?? []).forEach((h: any) => { if (next[h.id] === undefined) next[h.id] = String(h.quantite); });
      return next;
    });
  };

  useEffect(() => {
    loadTicket();
    loadMaintenanciers();
    loadHoldings();
    supabase.from("pdr").select("id, reference, designation, stock_actuel").eq("is_active", true).order("reference").then(({ data }) => setPdrList(data || []));
  }, [id, user]);

  useShiftRealtime(`ticket-hold-${user?.id ?? "none"}`, "pdr_maintenance_holdings", loadHoldings, !!user);


  const addCollaborator = async () => {
    if (!newCollabId || !id) return;
    const now = new Date().toISOString();
    const { data: collabRow, error } = await supabase.from("ticket_collaborators").insert({
      ticket_id: id, user_id: newCollabId, role_label: newCollabRole, added_by: user?.id, added_at: now,
    }).select("id, added_at").single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    // Open a collaboration intervention so KPI duration starts now (not at resolve time)
    await supabase.from("interventions").insert({
      ticket_id: id,
      technicien_id: newCollabId,
      description: `Collaboration (${newCollabRole === "co_intervenant" ? "co-intervenant" : "aide"})`,
      statut: "en_cours" as any,
      role: newCollabRole as any, // 'aide' | 'co_intervenant' — never inflates the failure count
      date_debut: collabRow?.added_at || now,
    });
    toast({ title: "Collaborateur ajouté" });
    setNewCollabId("");
    setNewCollabRole("aide");
    loadTicket();
  };

  const removeCollaborator = async (collabId: string) => {
    const removedAt = new Date().toISOString();
    const collab = collaborators.find((c) => c.id === collabId);
    const { error } = await supabase.from("ticket_collaborators")
      .update({ removed_at: removedAt, removed_by: user?.id })
      .eq("id", collabId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    // Close the corresponding open collaboration intervention
    if (collab) {
      const openIntv = interventions.find((i) =>
        i.statut === "en_cours" &&
        i.technicien_id === collab.user_id &&
        (i.description || "").startsWith("Collaboration")
      );
      if (openIntv) {
        await supabase.from("interventions").update({
          statut: "terminee" as any, date_fin: removedAt,
        }).eq("id", openIntv.id);
      }
    }
    loadTicket();
  };

  const toggleCollabRole = async (collabId: string, current: string) => {
    const next = current === "aide" ? "co_intervenant" : "aide";
    await supabase.from("ticket_collaborators").update({ role_label: next }).eq("id", collabId);
    loadTicket();
  };


  const handleTakeCharge = async () => {
    const now = new Date().toISOString();
    // Race-safe: only take if currently unassigned. Two maintenanciers clicking simultaneously → only one wins.
    const ticketUpdate: any = { statut: "pris_en_charge" as any, assignee_id: user?.id, assignment_status: "assigned" as any };
    if (!ticket?.heure_prise_en_charge) ticketUpdate.heure_prise_en_charge = now;
    const { data: updated, error } = await supabase
      .from("tickets")
      .update(ticketUpdate)
      .eq("id", id!)
      .is("assignee_id", null)
      .select("id");
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    if (!updated || updated.length === 0) {
      toast({ title: "Ticket déjà pris", description: "Un autre maintenancier vient de le prendre. Rechargement…", variant: "destructive" });
      loadTicket();
      return;
    }
    await supabase.from("interventions").insert({ ticket_id: id!, technicien_id: user?.id!, description: "Prise en charge", statut: "en_cours" as any, role: "lead" as any });
    await logAudit({
      action_type: "status_change", module: "tickets", entity_type: "ticket",
      entity_id: id!, entity_code: ticket?.numero, entity_label: ticket?.description,
      action_label: "Prise en charge ticket",
      old_values: { statut: ticket?.statut, assignee_id: null },
      new_values: { statut: "pris_en_charge", assignee_id: user?.id },
      severity: "low",
    });
    toast({ title: "Ticket pris en charge" });
    loadTicket();
  };

  const handleTransfer = async () => {
    if (!transferTargetId || !handoverMotif.trim() || !id || !user) {
      toast({ title: "Erreur", description: "Sélectionnez un maintenancier et saisissez un motif", variant: "destructive" });
      return;
    }
    setHandoverBusy(true);
    try {
      const now = new Date().toISOString();
      const targetProfile = maintenanciers.find((m) => m.user_id === transferTargetId);
      const previousAssigneeId = ticket.assignee_id;

      // 1. Close current active intervention as "transferee"
      const activeIntervention = interventions.find((i) => i.statut === "en_cours" && i.technicien_id === previousAssigneeId);
      if (activeIntervention) {
        await supabase.from("interventions").update({
          statut: "transferee" as any, date_fin: now,
          notes: `Transfert vers ${targetProfile?.full_name || "—"} — Motif: ${handoverMotif}`,
        }).eq("id", activeIntervention.id);
      }

      // 2. Reassign ticket (keep heure_prise_en_charge for KPI continuity)
      // assignment_status: 'transferred' marks the lifecycle event; will become 'assigned' again
      // automatically next time the new assignee re-takes via handleTakeCharge if needed.
      await supabase.from("tickets").update({
        assignee_id: transferTargetId,
        assignment_status: "transferred" as any,
      }).eq("id", id);

      // 3. Open new intervention for new assignee
      await supabase.from("interventions").insert({
        ticket_id: id, technicien_id: transferTargetId,
        description: `Reprise après transfert (motif: ${handoverMotif})`,
        statut: "en_cours" as any,
        role: "lead" as any, // new assignee becomes the lead
      });

      // 4. Audit
      await logAudit({
        action_type: "status_change", module: "tickets",
        entity_type: "ticket", entity_id: id, entity_code: ticket.numero,
        entity_label: ticket.description, action_label: "Transfert ticket",
        description: `Transfert de ${assigneeName || "—"} vers ${targetProfile?.full_name || "—"} — ${handoverMotif}`,
        old_values: { assignee_id: previousAssigneeId },
        new_values: { assignee_id: transferTargetId },
        metadata: { motif: handoverMotif, event: "ticket.transferred", machine_id: ticket?.machine_id, ligne_id: ticket?.ligne_id },
        severity: "medium",
      });

      // 5. In-app notification to new assignee
      await supabase.from("notifications").insert({
        notification_type: "ticket_transferred", module: "tickets",
        title: `Ticket transféré : ${ticket.numero}`,
        message: `${assigneeName || "Un maintenancier"} vous a transféré ce ticket. Motif : ${handoverMotif}`,
        recipient_user_id: transferTargetId,
        triggered_by_user_id: user.id,
        entity_type: "ticket", entity_id: id, entity_code: ticket.numero,
        entity_label: ticket.description,
        action_url: `/tickets/${id}`,
        severity: "info" as any,
      });

      toast({ title: "Ticket transféré", description: `Repris par ${targetProfile?.full_name || "—"}` });
      setTransferTargetId(""); setHandoverMotif("");
      loadTicket();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setHandoverBusy(false);
    }
  };

  const handleRelease = async () => {
    if (!handoverMotif.trim() || !id || !user) {
      toast({ title: "Erreur", description: "Saisissez un motif de libération", variant: "destructive" });
      return;
    }
    setHandoverBusy(true);
    try {
      const now = new Date().toISOString();
      const previousAssigneeId = ticket.assignee_id;

      // 1. Close current intervention as "liberee"
      const activeIntervention = interventions.find((i) => i.statut === "en_cours" && i.technicien_id === previousAssigneeId);
      if (activeIntervention) {
        await supabase.from("interventions").update({
          statut: "liberee" as any, date_fin: now,
          notes: `Libération du ticket — Motif: ${handoverMotif}`,
        }).eq("id", activeIntervention.id);
      }

      // 2. Release ticket back to pool (keep heure_prise_en_charge for KPI continuity if re-taken)
      // statut returns to 'ouvert' (existing workflow), assignment_status records 'released'.
      await supabase.from("tickets").update({
        assignee_id: null,
        statut: "ouvert" as any,
        assignment_status: "released" as any,
      }).eq("id", id);

      // 3. Audit
      await logAudit({
        action_type: "status_change", module: "tickets",
        entity_type: "ticket", entity_id: id, entity_code: ticket.numero,
        entity_label: ticket.description, action_label: "Libération ticket",
        description: `Libération par ${assigneeName || "—"} — ${handoverMotif}`,
        old_values: { assignee_id: previousAssigneeId, statut: ticket.statut },
        new_values: { assignee_id: null, statut: "ouvert" },
        metadata: { motif: handoverMotif, event: "ticket.released", machine_id: ticket?.machine_id, ligne_id: ticket?.ligne_id },
        severity: "medium",
      });

      // 4. Notify maintenance pool (resp_maintenance role)
      await supabase.from("notifications").insert({
        notification_type: "ticket_released", module: "tickets",
        title: `Ticket libéré : ${ticket.numero}`,
        message: `${assigneeName || "Un maintenancier"} a libéré ce ticket. Motif : ${handoverMotif}`,
        recipient_role: "maintenancier",
        triggered_by_user_id: user.id,
        entity_type: "ticket", entity_id: id, entity_code: ticket.numero,
        entity_label: ticket.description,
        action_url: `/tickets/${id}`,
        severity: "warning" as any,
      });

      toast({ title: "Ticket libéré", description: "Disponible pour reprise" });
      setHandoverMotif("");
      loadTicket();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setHandoverBusy(false);
    }
  };




  const handleResolve = async () => {
    if (!causeRacine || !solution) {
      toast({ title: "Erreur", description: "Cause racine et solution obligatoires", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const tempsArret = ticket?.heure_declaration ? Math.round((new Date(now).getTime() - new Date(ticket.heure_declaration).getTime()) / 60000) : null;
    // KPI integrity: temps_intervention requires a real prise en charge. No fallback (would inflate MTTR with queue time).
    const tempsIntervention = ticket?.heure_prise_en_charge
      ? Math.round((new Date(now).getTime() - new Date(ticket.heure_prise_en_charge).getTime()) / 60000)
      : null;

    const { data: updatedTicket, error: resolveErr } = await supabase.from("tickets").update({
      statut: "resolu" as any, heure_resolution: now, cause_racine: causeRacine, solution, temps_arret_minutes: tempsArret, temps_intervention_minutes: tempsIntervention,
      // L2: clear transient assignment_status so list/badges don't keep showing "Transféré"/"Libéré" after resolve.
      assignment_status: "assigned" as any,
    }).eq("id", id!).select("id").single();
    if (resolveErr) {
      toast({ title: "Erreur résolution", description: resolveErr.message, variant: "destructive" });
      return;
    }

    // C4: auto-close any production_stops linked to this ticket so GPAO downtime KPI stops counting.
    try {
      const { data: openStops } = await supabase
        .from("production_stops")
        .select("id, heure_debut, duree_minutes")
        .eq("ticket_id", id!)
        .is("heure_fin", null);
      for (const stop of openStops ?? []) {
        const dur = stop.duree_minutes && stop.duree_minutes > 0
          ? stop.duree_minutes
          : (tempsArret ?? Math.max(0, Math.round((new Date(now).getTime() - new Date(stop.heure_debut).getTime()) / 60000)));
        await supabase.from("production_stops").update({ heure_fin: now, duree_minutes: dur } as any).eq("id", stop.id);
      }
    } catch (e) { console.warn("[ticket.resolve] stop auto-close failed", e); }

    await logAudit({
      action_type: "status_change", module: "tickets", entity_type: "ticket",
      entity_id: id!, entity_code: ticket?.numero, entity_label: ticket?.description,
      action_label: "Résolution ticket",
      old_values: { statut: ticket?.statut, cause_racine: ticket?.cause_racine, solution: ticket?.solution },
      new_values: { statut: "resolu", cause_racine: causeRacine, solution, temps_arret_minutes: tempsArret, temps_intervention_minutes: tempsIntervention },
      severity: "medium",
    });

    // L3: notify declarant (skip if declarant is the resolver/assignee).
    if (ticket?.declarant_id && ticket.declarant_id !== user?.id && ticket.declarant_id !== ticket.assignee_id) {
      await supabase.from("notifications").insert({
        notification_type: "ticket_resolved", module: "tickets",
        title: `Ticket résolu : ${ticket.numero}`,
        message: `Votre ticket sur ${ticket.machines?.designation ?? "—"} a été résolu. Cause : ${causeRacine}`,
        recipient_user_id: ticket.declarant_id,
        triggered_by_user_id: user?.id,
        entity_type: "ticket", entity_id: id!, entity_code: ticket.numero,
        entity_label: ticket.description,
        action_url: `/tickets/${id}`,
        severity: "info" as any,
      });
    }

    // Field First: post-hoc validation request for critical ticket resolution
    try {
      const ticketCtx: Record<string, unknown> = {
        priority: ticket?.priorite,
        machine_criticite: ticket?.machines?.criticite,
        impact_ligne: ticket?.impact_ligne,
      };
      const { rule, enforcement } = await checkValidationRequired({
        module: "tickets", action_type: "resolve", entity_type: "ticket", context: ticketCtx,
      });
      if (enforcement === "post_hoc" && rule && updatedTicket?.id) {
        await createValidationRequest({
          rule,
          request_type: "resolve",
          module: "tickets",
          requested_action: "resolve",
          entity_type: "ticket",
          entity_id: id,
          entity_code: ticket?.numero,
          entity_label: ticket?.titre || ticket?.description,
          target_record_id: updatedTicket.id,
          title: `Résolution ticket ${ticket?.numero}`,
          description: `Cause: ${causeRacine || "—"} | Solution: ${solution || "—"}`,
          proposed_values: { cause_racine: causeRacine, solution, temps_arret_minutes: tempsArret, temps_intervention_minutes: tempsIntervention },
          metadata: ticketCtx,
          action_url: `/tickets/${id}`,
        });
      }
    } catch (e) { console.warn("[validation] ticket resolve check failed", e); }

    // Active intervention = the lead assignee's en_cours (not a collaborator's)
    const activeIntervention = interventions.find(
      (i) => i.statut === "en_cours" && i.technicien_id === ticket?.assignee_id
    );
    if (activeIntervention) {
      await supabase.from("interventions").update({ statut: "terminee" as any, date_fin: now }).eq("id", activeIntervention.id);
      // Consommer les pièces sélectionnées dans le mini-stock du maintenancier.
      // Le reliquat reste dans son mini-stock (pas de retour magasin ici).
      try {
        for (const h of holdings) {
          if (!selected[h.id]) continue;
          const held = h.quantite;
          const qte = Math.max(0, Math.min(held, parseInt(consumed[h.id] ?? "0", 10) || 0));
          if (qte <= 0) continue;
          try {
            await consumeFromMinistock({
              holding_id: h.id, intervention_id: activeIntervention.id, qte_consomme: qte,
            });
          } catch (e) { console.warn("[ticket.resolve] ministock consume failed", e); }
        }
        await loadHoldings();
      } catch (e) { console.warn("[ticket.resolve] ministock consume error", e); }
      // Close any still-open collaboration interventions (started at addCollaborator time)
      const openCollabIntvIds = interventions
        .filter((i) =>
          i.statut === "en_cours" &&
          i.technicien_id !== ticket?.assignee_id &&
          (i.description || "").startsWith("Collaboration")
        )
        .map((i) => i.id);
      if (openCollabIntvIds.length > 0) {
        await supabase.from("interventions")
          .update({ statut: "terminee" as any, date_fin: now })
          .in("id", openCollabIntvIds);
      }
      // Safety net: for collaborators added BEFORE this fix (no open intervention), create a closed one
      const collabsWithoutIntv = collaborators.filter(
        (c) => !interventions.some((i) =>
          i.technicien_id === c.user_id && (i.description || "").startsWith("Collaboration")
        )
      );
      if (collabsWithoutIntv.length > 0) {
        await supabase.from("interventions").insert(
          collabsWithoutIntv.map((c) => ({
            ticket_id: id!,
            technicien_id: c.user_id,
            description: `Collaboration (${c.role_label === "co_intervenant" ? "co-intervenant" : "aide"})`,
            statut: "terminee" as any,
            role: (c.role_label === "co_intervenant" ? "co_intervenant" : "aide") as any,
            date_debut: c.added_at || ticket?.heure_prise_en_charge || now,
            date_fin: now,
          }))
        );
      }
    }
    toast({ title: "Ticket résolu" });
    loadTicket();
  };

  const handleClose = async () => {
    const closedAt = new Date().toISOString();
    const { error } = await supabase.from("tickets").update({ statut: "cloture" as any, heure_cloture: closedAt }).eq("id", id!);
    if (error) {
      toast({ title: "Erreur clôture", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit({
      action_type: "status_change", module: "tickets", entity_type: "ticket",
      entity_id: id!, entity_code: ticket?.numero, entity_label: ticket?.description,
      action_label: "Clôture ticket",
      old_values: { statut: ticket?.statut },
      new_values: { statut: "cloture", heure_cloture: closedAt },
      severity: "medium",
    });
    // L3: notify declarant of definitive closure (skip if same user).
    if (ticket?.declarant_id && ticket.declarant_id !== user?.id) {
      await supabase.from("notifications").insert({
        notification_type: "ticket_closed", module: "tickets",
        title: `Ticket clôturé : ${ticket.numero}`,
        message: `Le ticket a été clôturé par le responsable maintenance.`,
        recipient_user_id: ticket.declarant_id,
        triggered_by_user_id: user?.id,
        entity_type: "ticket", entity_id: id!, entity_code: ticket.numero,
        entity_label: ticket.description,
        action_url: `/tickets/${id}`,
        severity: "info" as any,
      });
    }
    toast({ title: "Ticket clôturé" });
    loadTicket();
  };

  if (!ticket) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const canTakeCharge = ticket.statut === "ouvert" && (hasRole("maintenancier") || hasRole("resp_maintenance") || hasRole("admin"));
  const canResolve = (ticket.statut === "pris_en_charge" || ticket.statut === "en_cours") && (ticket.assignee_id === user?.id || hasRole("admin"));
  const canHandover = (ticket.statut === "pris_en_charge" || ticket.statut === "en_cours") && (ticket.assignee_id === user?.id || hasRole("admin") || hasRole("resp_maintenance"));
  const canCloseTicket = ticket.statut === "resolu" && (hasRole("resp_maintenance") || hasRole("admin"));

  // Time helpers
  const fmtDate = (d: string) => new Date(d).toLocaleString("fr-FR");

  return (
    <div className={`space-y-4 ${isMobile ? "pb-24" : "max-w-3xl"}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}>{ticket.numero}</h1>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <StatusBadge type="ticket" value={ticket.statut} />
            <StatusBadge type="priority" value={ticket.priorite} />
            {ticket.assignment_status === "transferred" && (
              <Badge variant="outline" className="text-xs bg-info/10 text-info border-info/20">Transféré</Badge>
            )}
            {ticket.assignment_status === "released" && (
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">Libéré</Badge>
            )}
            {ticket.is_from_gpao && (
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:text-blue-300">
                <Factory className="h-3 w-3 mr-0.5" /> GPAO
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Informations</CardTitle>
        </CardHeader>
        <CardContent className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <InfoItem label="Machine" value={`${ticket.machines?.code} — ${ticket.machines?.designation}`} />
          <InfoItem label="Description" value={ticket.description} />
          {ticket.ordres_fabrication?.numero && <InfoItem label="OF lié" value={ticket.ordres_fabrication.numero} mono />}
          {ticket.production_lines?.designation && <InfoItem label="Ligne" value={`${ticket.production_lines.code} — ${ticket.production_lines.designation}`} />}
          <InfoItem label="Déclaration" value={fmtDate(ticket.heure_declaration)} icon={<Clock className="h-3 w-3" />} mono />
          {ticket.heure_prise_en_charge && <InfoItem label="Prise en charge" value={fmtDate(ticket.heure_prise_en_charge)} icon={<User className="h-3 w-3" />} mono />}
          {ticket.assignee_id && (
            <div className="col-span-full">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Pris en charge par</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <Badge variant="secondary" className="text-xs">{assigneeName || "—"} <span className="ml-1 opacity-70">(responsable)</span></Badge>
                {collaborators.map((c) => (
                  <Badge key={c.id} variant="outline" className="text-xs">
                    {c.full_name} <span className="ml-1 opacity-70">({c.role_label === "co_intervenant" ? "co-intervenant" : "aide"})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {ticket.heure_resolution && <InfoItem label="Résolution" value={fmtDate(ticket.heure_resolution)} icon={<Wrench className="h-3 w-3" />} mono />}
          {ticket.temps_arret_minutes != null && <InfoItem label="Temps d'arrêt" value={`${ticket.temps_arret_minutes} min`} highlight />}
          {ticket.temps_intervention_minutes != null && <InfoItem label="Temps intervention" value={`${ticket.temps_intervention_minutes} min`} mono />}
          {ticket.cause_racine && <InfoItem label="Cause racine" value={ticket.cause_racine} full />}
          {ticket.solution && <InfoItem label="Solution" value={ticket.solution} full />}
        </CardContent>
      </Card>

      {/* Actions — sticky on mobile */}
      {canTakeCharge && canEdit("tickets") && (
        <StickyActionBar>
          <Button onClick={handleTakeCharge} className="w-full h-12">
            <Wrench className="h-4 w-4 mr-2" /> Prendre en charge
          </Button>
        </StickyActionBar>
      )}

      {canHandover && canEdit("tickets") && (
        <Card className="border-amber-300/40 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <ArrowRightLeft className="h-4 w-4 text-amber-600" />
              Passation / Libération
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Fin de shift ou blocage : transférez le ticket à un collègue ou libérez-le pour qu'un autre maintenancier puisse le reprendre.
            </p>

            <div className="space-y-1">
              <Label className="text-xs">Motif *</Label>
              <Textarea
                value={handoverMotif}
                onChange={(e) => setHandoverMotif(e.target.value)}
                placeholder="Fin de shift, attente pièce, expertise requise..."
                className={isMobile ? "min-h-[60px]" : "min-h-[60px]"}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Transférer à (optionnel)</Label>
              <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Choisir un maintenancier" /></SelectTrigger>
                <SelectContent>
                  {maintenanciers
                    .filter((m) => m.user_id !== ticket.assignee_id)
                    .map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
              <Button
                onClick={handleTransfer}
                disabled={!transferTargetId || !handoverMotif.trim() || handoverBusy}
                className="h-11 flex-1"
                variant="default"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transférer
              </Button>
              <Button
                onClick={handleRelease}
                disabled={!handoverMotif.trim() || handoverBusy}
                className="h-11 flex-1"
                variant="outline"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Libérer le ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canResolve && canEdit("tickets") && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Résolution</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Cause racine *</Label>
              <Textarea value={causeRacine} onChange={(e) => setCauseRacine(e.target.value)} placeholder="Cause du problème..." className={isMobile ? "min-h-[60px]" : ""} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Solution *</Label>
              <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Action corrective..." className={isMobile ? "min-h-[60px]" : ""} />
            </div>

            {/* Co-intervenants */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Avec l'aide de</Label>
              <div className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
                <Select value={newCollabId} onValueChange={setNewCollabId}>
                  <SelectTrigger className="h-10 flex-1"><SelectValue placeholder="Sélectionner un maintenancier" /></SelectTrigger>
                  <SelectContent>
                    {maintenanciers
                      .filter((m) => m.user_id !== ticket.assignee_id && !collaborators.some((c) => c.user_id === m.user_id))
                      .map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Select value={newCollabRole} onValueChange={(v) => setNewCollabRole(v as any)}>
                    <SelectTrigger className="h-10 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aide">Aide</SelectItem>
                      <SelectItem value="co_intervenant">Co-intervenant</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-10" onClick={addCollaborator} disabled={!newCollabId}>+</Button>
                </div>
              </div>
              {collaborators.length > 0 && (
                <div className="space-y-1">
                  {collaborators.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded bg-muted/50">
                      <span className="truncate">{c.full_name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-accent"
                          onClick={() => toggleCollabRole(c.id, c.role_label)}
                          title="Cliquer pour changer le rôle"
                        >
                          {c.role_label === "co_intervenant" ? "co-intervenant" : "aide"}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeCollaborator(c.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pièces : choisies dans le mini-stock du maintenancier */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><Package className="h-3 w-3" /> Pièces utilisées</Label>
              <Button asChild variant="outline" className="w-full h-11">
                <Link to={`/maintenance/shift/pieces?ticket=${id}${ticket.machine_id ? `&machine=${ticket.machine_id}` : ""}`}>
                  <Package className="h-4 w-4 mr-2" /> Demander / prendre des pièces
                </Link>
              </Button>

              {holdings.length > 0 ? (
                <div className="rounded-md border p-3 space-y-2 bg-muted/20">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" /> Mon stock maintenance — cochez et indiquez la quantité utilisée sur ce ticket
                  </p>
                  {holdings.map((h) => {
                    const isOn = !!selected[h.id];
                    return (
                      <div key={h.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setSelected((m) => ({ ...m, [h.id]: on }));
                            if (on && (consumed[h.id] === undefined || consumed[h.id] === "0")) {
                              setConsumed((m) => ({ ...m, [h.id]: String(Math.min(1, h.quantite)) }));
                            }
                          }}
                          className="h-5 w-5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs font-semibold truncate">{h.pdr?.reference}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{h.pdr?.designation} · en stock : {h.quantite}</p>
                        </div>
                        <Input
                          type="number" min={0} max={h.quantite}
                          disabled={!isOn}
                          value={consumed[h.id] ?? "0"}
                          onChange={(e) => setConsumed((m) => ({ ...m, [h.id]: e.target.value }))}
                          className="h-10 w-20 tabular-nums"
                        />
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-muted-foreground">Le reliquat non consommé reste dans votre stock maintenance pour vos autres tickets.</p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Aucune pièce dans votre stock maintenance. Utilisez « Demander / prendre des pièces » pour vous approvisionner.
                </p>
              )}
            </div>


            <StickyActionBar>
              <Button onClick={() => handleResolve()} className="w-full h-12">Résoudre</Button>
            </StickyActionBar>
          </CardContent>
        </Card>
      )}


      {canCloseTicket && (
        <StickyActionBar>
          <Button onClick={handleClose} variant="outline" className="w-full h-12">Clôturer le ticket</Button>
        </StickyActionBar>
      )}

      {/* Interventions */}
      {interventions.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Historique interventions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {interventions.map((i) => (
                <div key={i.id} className="p-3 rounded-lg border space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{i.description}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {fmtDate(i.date_debut)}
                        {i.date_fin && ` → ${fmtDate(i.date_fin)}`}
                      </p>
                      {i.date_fin && i.date_debut && (
                        <p className="text-xs font-medium tabular-nums">
                          Durée: {Math.round((new Date(i.date_fin).getTime() - new Date(i.date_debut).getTime()) / 60000)} min
                        </p>
                      )}
                      <StatusBadge type="ticket" value={i.statut === "en_cours" ? "en_cours" : i.statut === "terminee" ? "resolu" : "cloture"} className="mt-0.5" />
                    </div>
                  </div>
                  {i.intervention_pdr && i.intervention_pdr.length > 0 && (
                    <div className="ml-4 pl-3 border-l-2 border-muted">
                      <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Package className="h-3 w-3" /> Pièces</p>
                      {i.intervention_pdr.map((ip: any) => (
                        <p key={ip.id} className="text-xs">{ip.pdr?.reference} — {ip.pdr?.designation} <span className="tabular-nums font-medium">×{ip.quantite}</span></p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ label, value, icon, mono, highlight, full }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean; highlight?: boolean; full?: boolean }) {
  return (
    <div className={full ? "col-span-full" : ""}>
      <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className={`text-sm ${mono ? "tabular-nums" : ""} ${highlight ? "font-bold text-destructive tabular-nums" : ""}`}>{value}</p>
    </div>
  );
}
