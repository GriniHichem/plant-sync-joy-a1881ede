import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User, Wrench, Factory, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { canEdit, canDelete } = usePermissions();
  const isMobile = useIsMobile();
  const [ticket, setTicket] = useState<any>(null);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [causeRacine, setCauseRacine] = useState("");
  const [solution, setSolution] = useState("");

  const [pdrList, setPdrList] = useState<any[]>([]);
  const [selectedPdr, setSelectedPdr] = useState<{ pdr_id: string; quantite: number }[]>([]);
  const [newPdrId, setNewPdrId] = useState("");
  const [newPdrQte, setNewPdrQte] = useState("1");

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
    }

    const { data: intData } = await supabase
      .from("interventions")
      .select("*, intervention_pdr(*, pdr(reference, designation))")
      .eq("ticket_id", id)
      .order("date_debut", { ascending: false });
    setInterventions(intData || []);
  };

  useEffect(() => {
    loadTicket();
    supabase.from("pdr").select("id, reference, designation, stock_actuel").eq("is_active", true).order("reference").then(({ data }) => setPdrList(data || []));
  }, [id]);

  const handleTakeCharge = async () => {
    const now = new Date().toISOString();
    await supabase.from("tickets").update({ statut: "pris_en_charge" as any, assignee_id: user?.id, heure_prise_en_charge: now }).eq("id", id!);
    await supabase.from("interventions").insert({ ticket_id: id!, technicien_id: user?.id!, description: "Prise en charge", statut: "en_cours" as any });
    toast({ title: "Ticket pris en charge" });
    loadTicket();
  };

  const addPdr = () => {
    if (!newPdrId) return;
    setSelectedPdr((prev) => {
      if (prev.find((p) => p.pdr_id === newPdrId)) return prev;
      return [...prev, { pdr_id: newPdrId, quantite: parseInt(newPdrQte) || 1 }];
    });
    setNewPdrId(""); setNewPdrQte("1");
  };

  const removePdr = (pdrId: string) => setSelectedPdr((prev) => prev.filter((p) => p.pdr_id !== pdrId));

  const handleResolve = async () => {
    if (!causeRacine || !solution) {
      toast({ title: "Erreur", description: "Cause racine et solution obligatoires", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const tempsArret = ticket?.heure_declaration ? Math.round((new Date(now).getTime() - new Date(ticket.heure_declaration).getTime()) / 60000) : null;
    const tempsIntervention = ticket?.heure_prise_en_charge ? Math.round((new Date(now).getTime() - new Date(ticket.heure_prise_en_charge).getTime()) / 60000) : null;

    await supabase.from("tickets").update({
      statut: "resolu" as any, heure_resolution: now, cause_racine: causeRacine, solution, temps_arret_minutes: tempsArret, temps_intervention_minutes: tempsIntervention,
    }).eq("id", id!);

    const activeIntervention = interventions.find((i) => i.statut === "en_cours");
    if (activeIntervention) {
      await supabase.from("interventions").update({ statut: "terminee" as any, date_fin: now }).eq("id", activeIntervention.id);
      if (selectedPdr.length > 0) {
        await supabase.from("intervention_pdr").insert(selectedPdr.map((p) => ({ intervention_id: activeIntervention.id, pdr_id: p.pdr_id, quantite: p.quantite })));
        for (const p of selectedPdr) {
          const pdrItem = pdrList.find((x) => x.id === p.pdr_id);
          if (pdrItem) {
            const stockApres = Math.max(0, pdrItem.stock_actuel - p.quantite);
            await supabase.from("pdr").update({ stock_actuel: stockApres }).eq("id", p.pdr_id);
            await supabase.from("pdr_stock_movements").insert({
              pdr_id: p.pdr_id, type: "sortie" as any, quantite: p.quantite,
              stock_avant: pdrItem.stock_actuel, stock_apres: stockApres,
              source_type: "ticket", source_id: id,
              reference_source: ticket.numero, motif: `Ticket ${ticket.numero}`,
              user_id: user?.id,
            });
          }
        }
      }
    }
    toast({ title: "Ticket résolu" });
    setSelectedPdr([]);
    loadTicket();
  };

  const handleClose = async () => {
    await supabase.from("tickets").update({ statut: "cloture" as any, heure_cloture: new Date().toISOString() }).eq("id", id!);
    toast({ title: "Ticket clôturé" });
    loadTicket();
  };

  if (!ticket) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const canTakeCharge = ticket.statut === "ouvert" && (hasRole("maintenancier") || hasRole("resp_maintenance") || hasRole("admin"));
  const canResolve = (ticket.statut === "pris_en_charge" || ticket.statut === "en_cours") && (ticket.assignee_id === user?.id || hasRole("admin"));
  const canCloseTicket = ticket.statut === "resolu" && (hasRole("resp_maintenance") || hasRole("admin"));

  // Time helpers
  const fmtDate = (d: string) => new Date(d).toLocaleString("fr-FR");

  return (
    <div className={`space-y-4 ${isMobile ? "px-1" : "max-w-3xl"}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")} className="h-9 w-9 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}>{ticket.numero}</h1>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <StatusBadge type="ticket" value={ticket.statut} />
            <StatusBadge type="priority" value={ticket.priorite} />
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
          {ticket.heure_resolution && <InfoItem label="Résolution" value={fmtDate(ticket.heure_resolution)} icon={<Wrench className="h-3 w-3" />} mono />}
          {ticket.temps_arret_minutes != null && <InfoItem label="Temps d'arrêt" value={`${ticket.temps_arret_minutes} min`} highlight />}
          {ticket.temps_intervention_minutes != null && <InfoItem label="Temps intervention" value={`${ticket.temps_intervention_minutes} min`} mono />}
          {ticket.cause_racine && <InfoItem label="Cause racine" value={ticket.cause_racine} full />}
          {ticket.solution && <InfoItem label="Solution" value={ticket.solution} full />}
        </CardContent>
      </Card>

      {/* Actions */}
      {canTakeCharge && canEdit("tickets") && (
        <Button onClick={handleTakeCharge} className="w-full h-12">
          <Wrench className="h-4 w-4 mr-2" /> Prendre en charge
        </Button>
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

            {/* PDR */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><Package className="h-3 w-3" /> Pièces utilisées</Label>
              <div className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
                <Select value={newPdrId} onValueChange={setNewPdrId}>
                  <SelectTrigger className="h-10 flex-1"><SelectValue placeholder="Sélectionner une pièce" /></SelectTrigger>
                  <SelectContent>{pdrList.map((p) => <SelectItem key={p.id} value={p.id}>{p.reference} — {p.designation} ({p.stock_actuel})</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input type="number" value={newPdrQte} onChange={(e) => setNewPdrQte(e.target.value)} className="h-10 w-16" min="1" placeholder="Qté" />
                  <Button variant="outline" size="sm" className="h-10" onClick={addPdr} disabled={!newPdrId}>+</Button>
                </div>
              </div>
              {selectedPdr.length > 0 && (
                <div className="space-y-1">
                  {selectedPdr.map((sp) => {
                    const pdr = pdrList.find((p) => p.id === sp.pdr_id);
                    return (
                      <div key={sp.pdr_id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded bg-muted/50">
                        <span className="truncate">{pdr?.reference} — {pdr?.designation}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="tabular-nums font-medium">×{sp.quantite}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removePdr(sp.pdr_id)}>×</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button onClick={handleResolve} className="w-full h-12">Résoudre</Button>
          </CardContent>
        </Card>
      )}

      {canCloseTicket && (
        <Button onClick={handleClose} variant="outline" className="w-full h-12">Clôturer le ticket</Button>
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
