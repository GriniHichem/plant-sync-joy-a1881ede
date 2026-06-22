import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wrench, Save, ArrowLeft, ListChecks, Package } from "lucide-react";
import { logAudit } from "@/lib/audit";
import { useShiftRealtime } from "@/hooks/useShiftRealtime";
import { consumeMaintenanceHolding } from "@/hooks/usePdrRequests";

/**
 * Maintenance shift kiosk:
 * - Without ticketId: lists my open tickets/preventive tasks (link to shift home).
 * - With ticketId: focused intervention form (description, duration, root cause, solution, close).
 */
export default function MaintenanceShiftIntervention() {
  const { ticketId } = useParams<{ ticketId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [description, setDescription] = useState("");
  const [dureeMin, setDureeMin] = useState("");
  const [causeRacine, setCauseRacine] = useState("");
  const [solution, setSolution] = useState("");
  const [closeTicket, setCloseTicket] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Maintenance stock held for this ticket (intermediate stock to consume on closure)
  const [holdings, setHoldings] = useState<any[]>([]);
  const [consumed, setConsumed] = useState<Record<string, string>>({});

  // List state (no ticketId)
  const [openTickets, setOpenTickets] = useState<any[]>([]);

  const loadOpenTickets = () => {
    if (!user) return;
    supabase
      .from("tickets")
      .select("id, numero, description, priorite, statut, machines(id, code, designation)")
      .in("statut", ["ouvert", "pris_en_charge"])
      .or(`assignee_id.eq.${user.id},assignee_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setOpenTickets(data ?? []);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!ticketId) {
      setLoading(true);
      loadOpenTickets();
      return;
    }
    setLoading(true);
    supabase
      .from("tickets")
      .select("*, machines(id, code, designation), production_lines(code, designation)")
      .eq("id", ticketId)
      .maybeSingle()
      .then(({ data }) => {
        setTicket(data);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, user]);

  useShiftRealtime(
    `maint-tickets-${user?.id ?? "anon"}`,
    "tickets",
    loadOpenTickets,
    !ticketId && !!user,
  );

  // Load maintenance stock (holdings) held by this user for this ticket's requests
  const loadHoldings = async () => {
    if (!ticketId || !user) { setHoldings([]); return; }
    const { data: reqs } = await supabase.from("pdr_requests" as any).select("id").eq("ticket_id", ticketId);
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
    setConsumed(init);
  };

  useEffect(() => { loadHoldings(); /* eslint-disable-next-line */ }, [ticketId, user]);
  useShiftRealtime(`maint-hold-tk-${ticketId ?? "none"}`, "pdr_maintenance_holdings", loadHoldings, !!ticketId && !!user);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  // ===== List mode =====
  if (!ticketId) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5 text-primary" /> Choisir un ticket à traiter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openTickets.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun ticket ouvert ne vous est assigné ou disponible.
              </p>
            )}
            {openTickets.map((t) => (
              <Link
                key={t.id}
                to={`/maintenance/shift/intervention/${t.id}`}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors"
              >
                <Wrench className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm">{t.numero}</span>
                    <Badge variant={t.priorite === "critique" || t.priorite === "haute" ? "destructive" : "secondary"} className="text-[10px]">
                      {t.priorite}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{t.statut.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.machines ? `${t.machines.code} — ${t.machines.designation}` : "Sans machine"}
                  </p>
                  <p className="text-sm mt-1 line-clamp-2">{t.description}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== Detail / form mode =====
  if (!ticket) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Ticket introuvable.</p>
          <Button asChild variant="outline"><Link to="/maintenance/shift">Retour</Link></Button>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit() {
    if (!description.trim()) { toast({ title: "Description requise", variant: "destructive" }); return; }
    const d = parseInt(dureeMin, 10);
    if (!Number.isFinite(d) || d <= 0) { toast({ title: "Durée invalide", variant: "destructive" }); return; }
    if (closeTicket && (!causeRacine.trim() || !solution.trim())) {
      toast({ title: "Cause racine et solution requises pour clôturer", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const startedAt = new Date(now.getTime() - d * 60_000);
      const { data: interv, error } = await supabase
        .from("interventions")
        .insert({
          ticket_id: ticket.id,
          technicien_id: user?.id,
          description: description.trim(),
          notes: null,
          duree_minutes: d,
          date_debut: startedAt.toISOString(),
          date_fin: now.toISOString(),
          statut: closeTicket ? "terminee" : "en_cours",
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      // Consume maintenance stock held for this ticket (generates leftover return automatically)
      for (const h of holdings) {
        const qte = Math.max(0, Math.min(h.quantite, parseInt(consumed[h.id] ?? String(h.quantite), 10) || 0));
        try {
          await consumeMaintenanceHolding({
            holding_id: h.id, intervention_id: (interv as any).id, qte_consomme: qte,
          });
        } catch (e) { console.warn("[shift.intervention] holding consume failed", e); }
      }



      if (closeTicket) {
        // Compute KPI durations: arrest = decl→now, intervention = prise_en_charge→now (or null fallback)
        const tempsArret = ticket.heure_declaration
          ? Math.round((now.getTime() - new Date(ticket.heure_declaration).getTime()) / 60000)
          : null;
        const baselinePEC = ticket.heure_prise_en_charge ?? startedAt.toISOString();
        const tempsIntervention = baselinePEC
          ? Math.round((now.getTime() - new Date(baselinePEC).getTime()) / 60000)
          : null;
        const update: any = {
          // Valid ticket_statut: ouvert|pris_en_charge|en_cours|resolu|cloture (NEVER 'ferme')
          // Mobile closure resolves the ticket; resp. maintenance does the final 'cloture' from desktop.
          statut: "resolu",
          cause_racine: causeRacine.trim(),
          solution: solution.trim(),
          heure_resolution: now.toISOString(),
          temps_arret_minutes: tempsArret,
          temps_intervention_minutes: tempsIntervention,
          assignment_status: "assigned",
        };
        if (!ticket.assignee_id) update.assignee_id = user?.id;
        if (!ticket.heure_prise_en_charge) update.heure_prise_en_charge = startedAt.toISOString();
        const { error: tErr } = await supabase.from("tickets").update(update).eq("id", ticket.id);
        if (tErr) throw tErr;

        // C4: auto-close linked production_stops so GPAO downtime KPI stops counting.
        try {
          const { data: openStops } = await supabase
            .from("production_stops")
            .select("id, heure_debut, duree_minutes")
            .eq("ticket_id", ticket.id)
            .is("heure_fin", null);
          for (const stop of openStops ?? []) {
            const dur = stop.duree_minutes && stop.duree_minutes > 0
              ? stop.duree_minutes
              : (tempsArret ?? Math.max(0, Math.round((now.getTime() - new Date(stop.heure_debut).getTime()) / 60000)));
            await supabase.from("production_stops").update({ heure_fin: now.toISOString(), duree_minutes: dur } as any).eq("id", stop.id);
          }
        } catch (e) { console.warn("[shift.intervention] stop auto-close failed", e); }

        // L3: notify declarant (mobile closure).
        if (ticket.declarant_id && ticket.declarant_id !== user?.id) {
          await supabase.from("notifications").insert({
            notification_type: "ticket_resolved", module: "tickets",
            title: `Ticket résolu : ${ticket.numero}`,
            message: `Votre ticket sur ${ticket.machines?.designation ?? "—"} a été résolu. Cause : ${causeRacine.trim()}`,
            recipient_user_id: ticket.declarant_id,
            triggered_by_user_id: user?.id,
            entity_type: "ticket", entity_id: ticket.id, entity_code: ticket.numero,
            entity_label: ticket.description,
            action_url: `/tickets/${ticket.id}`,
            severity: "info" as any,
          });
        }
      } else if (ticket.statut === "ouvert") {
        const { error: tErr } = await supabase
          .from("tickets")
          .update({ statut: "pris_en_charge", assignee_id: user?.id, heure_prise_en_charge: startedAt.toISOString() } as any)
          .eq("id", ticket.id);
        if (tErr) throw tErr;
      }

      await logAudit({
        action_type: "create",
        module: "interventions" as any,
        entity_type: "intervention",
        entity_id: (interv as any).id,
        entity_label: ticket.numero,
        action_label: closeTicket ? "Intervention + clôture (kiosque shift)" : "Intervention (kiosque shift)",
        new_values: { ticket_id: ticket.id, duree_minutes: d, closed: closeTicket },
      });

      toast({ title: closeTicket ? "Intervention enregistrée et ticket clôturé" : "Intervention enregistrée" });
      navigate("/maintenance/shift");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/maintenance/shift")}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5 text-primary" /> Intervention sur {ticket.numero}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {ticket.machines ? `${ticket.machines.code} — ${ticket.machines.designation}` : "Sans machine"}
          </p>
          <p className="text-sm mt-2">{ticket.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild variant="outline" className="w-full min-h-[44px]">
            <Link to={`/maintenance/shift/pieces?ticket=${ticket.id}${ticket.machine_id ? `&machine=${ticket.machine_id}` : ""}`}>
              <Package className="h-4 w-4 mr-2" /> Demander / prendre des pièces
            </Link>
          </Button>
          <div>
            <Label>Description de l'intervention *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Diagnostic, gestes effectués..." />
          </div>

          <div>
            <Label>Durée (minutes) *</Label>
            <Input
              inputMode="numeric"
              value={dureeMin}
              onChange={(e) => setDureeMin(e.target.value)}
              className="min-h-[48px] text-lg tabular-nums"
            />
          </div>

          {holdings.length > 0 && (
            <div className="rounded-md border p-3 space-y-2 bg-muted/20">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" /> Pièces prises — quantité consommée
              </p>
              {holdings.map((h) => (
                <div key={h.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-semibold truncate">{h.pdr?.reference}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{h.pdr?.designation} · pris : {h.quantite}</p>
                  </div>
                  <Input
                    type="number" min={0} max={h.quantite}
                    value={consumed[h.id] ?? String(h.quantite)}
                    onChange={(e) => setConsumed((m) => ({ ...m, [h.id]: e.target.value }))}
                    className="h-10 w-20 tabular-nums"
                  />
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">Le reliquat non consommé est automatiquement retourné au stock magasin.</p>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md border">
            <input
              type="checkbox"
              checked={closeTicket}
              onChange={(e) => setCloseTicket(e.target.checked)}
              className="h-5 w-5"
            />
            <span className="text-sm font-medium">Clôturer le ticket maintenant</span>
          </label>

          {closeTicket && (
            <>
              <div>
                <Label>Cause racine *</Label>
                <Textarea value={causeRacine} onChange={(e) => setCauseRacine(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Solution appliquée *</Label>
                <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={2} />
              </div>
              <div className="rounded-md border border-amber-300/40 bg-amber-50/30 dark:bg-amber-950/10 p-2 text-xs text-amber-800 dark:text-amber-300">
                <strong>Pièces utilisées ?</strong> La saisie PDR n'est pas disponible en mobile.
                Si vous avez consommé des pièces, ouvrez{" "}
                <Link to={`/tickets/${ticket.id}`} className="underline font-medium">l'écran complet du ticket</Link>{" "}
                avant de clôturer pour décrémenter le stock.
              </div>
            </>
          )}

          <Button onClick={handleSubmit} disabled={submitting} className="w-full min-h-[52px]">
            <Save className="h-5 w-5 mr-2" /> {submitting ? "Enregistrement..." : closeTicket ? "Enregistrer & clôturer" : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
