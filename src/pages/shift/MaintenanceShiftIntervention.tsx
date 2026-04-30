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
import { Wrench, Save, ArrowLeft, ListChecks } from "lucide-react";
import { logAudit } from "@/lib/audit";
import { useShiftRealtime } from "@/hooks/useShiftRealtime";

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

      if (closeTicket) {
        await supabase
          .from("tickets")
          .update({
            statut: "ferme",
            cause_racine: causeRacine.trim(),
            solution: solution.trim(),
            heure_resolution: now.toISOString(),
          } as any)
          .eq("id", ticket.id);
      } else if (ticket.statut === "ouvert") {
        await supabase
          .from("tickets")
          .update({ statut: "pris_en_charge", assignee_id: user?.id } as any)
          .eq("id", ticket.id);
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
