import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { ArrowLeft, Clock, User, Wrench, Factory } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<any>(null);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [causeRacine, setCauseRacine] = useState("");
  const [solution, setSolution] = useState("");

  const loadTicket = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("tickets")
      .select("*, machines(code, designation)")
      .eq("id", id)
      .single();
    setTicket(data);
    if (data) {
      setCauseRacine(data.cause_racine || "");
      setSolution(data.solution || "");
    }

    const { data: intData } = await supabase
      .from("interventions")
      .select("*, intervention_pdr(*, pdr(reference, designation))")
      .eq("ticket_id", id)
      .order("date_debut", { ascending: false });
    setInterventions(intData || []);
  };

  useEffect(() => { loadTicket(); }, [id]);

  const handleTakeCharge = async () => {
    const now = new Date().toISOString();
    await supabase.from("tickets").update({
      statut: "pris_en_charge" as any,
      assignee_id: user?.id,
      heure_prise_en_charge: now,
    }).eq("id", id!);

    await supabase.from("interventions").insert({
      ticket_id: id!,
      technicien_id: user?.id!,
      description: "Prise en charge",
      statut: "en_cours" as any,
    });

    toast({ title: "Ticket pris en charge" });
    loadTicket();
  };

  const handleResolve = async () => {
    if (!causeRacine || !solution) {
      toast({ title: "Erreur", description: "Cause racine et solution obligatoires", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const tempsArret = ticket?.heure_declaration
      ? Math.round((new Date(now).getTime() - new Date(ticket.heure_declaration).getTime()) / 60000)
      : null;
    const tempsIntervention = ticket?.heure_prise_en_charge
      ? Math.round((new Date(now).getTime() - new Date(ticket.heure_prise_en_charge).getTime()) / 60000)
      : null;

    await supabase.from("tickets").update({
      statut: "resolu" as any,
      heure_resolution: now,
      cause_racine: causeRacine,
      solution: solution,
      temps_arret_minutes: tempsArret,
      temps_intervention_minutes: tempsIntervention,
    }).eq("id", id!);

    // Close intervention
    await supabase.from("interventions")
      .update({ statut: "terminee" as any, date_fin: now })
      .eq("ticket_id", id!)
      .eq("statut", "en_cours" as any);

    toast({ title: "Ticket résolu" });
    loadTicket();
  };

  const handleClose = async () => {
    await supabase.from("tickets").update({
      statut: "cloture" as any,
      heure_cloture: new Date().toISOString(),
    }).eq("id", id!);
    toast({ title: "Ticket clôturé" });
    loadTicket();
  };

  if (!ticket) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const canTakeCharge = ticket.statut === "ouvert" && (hasRole("maintenancier") || hasRole("resp_maintenance") || hasRole("admin"));
  const canResolve = (ticket.statut === "pris_en_charge" || ticket.statut === "en_cours") && (ticket.assignee_id === user?.id || hasRole("admin"));
  const canClose = ticket.statut === "resolu" && (hasRole("resp_maintenance") || hasRole("admin"));

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{ticket.numero}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge type="ticket" value={ticket.statut} />
            <StatusBadge type="priority" value={ticket.priorite} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Machine</p>
            <p className="text-sm font-medium">{ticket.machines?.code} — {ticket.machines?.designation}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="text-sm">{ticket.description}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Déclaration</p>
            <p className="text-sm tabular-nums">{new Date(ticket.heure_declaration).toLocaleString("fr-FR")}</p>
          </div>
          {ticket.heure_prise_en_charge && (
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Prise en charge</p>
              <p className="text-sm tabular-nums">{new Date(ticket.heure_prise_en_charge).toLocaleString("fr-FR")}</p>
            </div>
          )}
          {ticket.heure_resolution && (
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Wrench className="h-3 w-3" /> Résolution</p>
              <p className="text-sm tabular-nums">{new Date(ticket.heure_resolution).toLocaleString("fr-FR")}</p>
            </div>
          )}
          {ticket.temps_arret_minutes && (
            <div>
              <p className="text-xs text-muted-foreground">Temps d'arrêt</p>
              <p className="text-sm font-bold tabular-nums text-destructive">{ticket.temps_arret_minutes} min</p>
            </div>
          )}
          {ticket.temps_intervention_minutes && (
            <div>
              <p className="text-xs text-muted-foreground">Temps d'intervention</p>
              <p className="text-sm font-bold tabular-nums">{ticket.temps_intervention_minutes} min</p>
            </div>
          )}
          {ticket.cause_racine && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Cause racine</p>
              <p className="text-sm">{ticket.cause_racine}</p>
            </div>
          )}
          {ticket.solution && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Solution</p>
              <p className="text-sm">{ticket.solution}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {canTakeCharge && (
        <Card>
          <CardContent className="p-5">
            <Button onClick={handleTakeCharge} className="w-full h-12 text-base">
              <Wrench className="h-4 w-4 mr-2" /> Prendre en charge
            </Button>
          </CardContent>
        </Card>
      )}

      {canResolve && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Résolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cause racine *</Label>
              <Textarea value={causeRacine} onChange={(e) => setCauseRacine(e.target.value)} placeholder="Cause du problème..." />
            </div>
            <div className="space-y-2">
              <Label>Solution *</Label>
              <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Action corrective effectuée..." />
            </div>
            <Button onClick={handleResolve} className="w-full h-12 text-base">Résoudre</Button>
          </CardContent>
        </Card>
      )}

      {canClose && (
        <Card>
          <CardContent className="p-5">
            <Button onClick={handleClose} variant="outline" className="w-full h-12 text-base">
              Clôturer le ticket
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Interventions timeline */}
      {interventions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historique interventions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {interventions.map((i) => (
                <div key={i.id} className="flex gap-3 p-3 rounded-lg border">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{i.description}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {new Date(i.date_debut).toLocaleString("fr-FR")}
                      {i.date_fin && ` → ${new Date(i.date_fin).toLocaleString("fr-FR")}`}
                    </p>
                    <StatusBadge type="ticket" value={i.statut === "en_cours" ? "en_cours" : i.statut === "terminee" ? "resolu" : "cloture"} className="mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
