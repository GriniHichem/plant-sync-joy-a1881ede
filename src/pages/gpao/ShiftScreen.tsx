import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Clock, Ban, Check, Lock, Unlock, MessageSquare } from "lucide-react";

export default function ShiftScreen() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { canCreate } = usePermissions();
  const navigate = useNavigate();

  const [ofs, setOfs] = useState<any[]>([]);
  const [selectedOf, setSelectedOf] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [shiftTeams, setShiftTeams] = useState<any[]>([]);
  const [toleranceHours, setToleranceHours] = useState(1);

  // Per-hour declaration form
  const [selectedHourSlot, setSelectedHourSlot] = useState<number | null>(null);
  const [declQte, setDeclQte] = useState("");
  const [declRebut, setDeclRebut] = useState("0");
  const [declNotes, setDeclNotes] = useState("");

  // Observations fin shift
  const [observations, setObservations] = useState("");

  // Ticket dialog
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketMachineId, setTicketMachineId] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriorite, setTicketPriorite] = useState("normale");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [ofsRes, linesRes, machinesRes, shiftsRes, slotsRes, teamsRes, settingsRes] = await Promise.all([
      supabase.from("ordres_fabrication").select("*, products(code, designation), production_lines(id, code, designation, machine_id)").eq("statut", "en_cours" as any).order("numero"),
      supabase.from("production_lines").select("*").eq("is_active", true),
      supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code"),
      supabase.from("shifts").select("*, shift_teams(name, code, color)").eq("date_shift", new Date().toISOString().slice(0, 10)).order("heure_debut", { ascending: false }),
      supabase.from("shift_time_slots").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("shift_teams").select("*").eq("is_active", true).order("code"),
      supabase.from("shift_settings").select("*"),
    ]);
    setOfs(ofsRes.data || []);
    setLines(linesRes.data || []);
    setMachines(machinesRes.data || []);
    setShifts(shiftsRes.data || []);
    setTimeSlots(slotsRes.data || []);
    setShiftTeams(teamsRes.data || []);

    const tol = (settingsRes.data || []).find((s: any) => s.key === "tolerance_saisie_heures");
    if (tol) setToleranceHours(parseInt(tol.value) || 1);

    if (ofsRes.data && ofsRes.data.length > 0) setSelectedOf(ofsRes.data[0]);

    // Find active shift
    const now = new Date();
    const active = (shiftsRes.data || []).find((s: any) => {
      const start = new Date(s.heure_debut);
      const end = new Date(s.heure_fin);
      return now >= start && now <= end;
    });
    setActiveShift(active || null);
    if (active) setObservations(active.observations || "");
  }

  useEffect(() => {
    if (selectedOf && activeShift) {
      supabase.from("production_declarations")
        .select("*")
        .eq("of_id", selectedOf.id)
        .eq("shift_id", activeShift.id)
        .order("heure_production", { ascending: true })
        .then(({ data }) => setDeclarations(data || []));
    }
  }, [selectedOf, activeShift]);

  // Generate hourly slots for the active shift
  const hourlySlots = useMemo(() => {
    if (!activeShift) return [];
    const start = new Date(activeShift.heure_debut);
    const end = new Date(activeShift.heure_fin);
    const slots: { hour: number; startTime: Date; endTime: Date; label: string }[] = [];
    let cursor = new Date(start);
    while (cursor < end) {
      const slotEnd = new Date(cursor);
      slotEnd.setHours(slotEnd.getHours() + 1);
      if (slotEnd > end) break;
      slots.push({
        hour: cursor.getHours(),
        startTime: new Date(cursor),
        endTime: new Date(slotEnd),
        label: `${cursor.getHours().toString().padStart(2, "0")}h – ${slotEnd.getHours().toString().padStart(2, "0")}h`,
      });
      cursor = slotEnd;
    }
    return slots;
  }, [activeShift]);

  // Check if a given hour slot can be edited (tolerance logic)
  function canEditSlot(slot: { startTime: Date; endTime: Date }): boolean {
    if (!activeShift) return false;
    const now = new Date();
    const shiftEnd = new Date(activeShift.heure_fin);
    // Can edit during the slot hour itself
    if (now >= slot.startTime && now < slot.endTime) return true;
    // Can edit during the tolerance window after slot ends
    const toleranceEnd = new Date(slot.endTime);
    toleranceEnd.setHours(toleranceEnd.getHours() + toleranceHours);
    if (now >= slot.endTime && now < toleranceEnd && now <= shiftEnd) return true;
    return false;
  }

  // Check if slot already has a declaration
  function getSlotDeclaration(slot: { startTime: Date; endTime: Date }) {
    return declarations.find((d) => {
      const h = new Date(d.heure_production);
      return h >= slot.startTime && h < slot.endTime;
    });
  }

  const handleDeclareProduction = async () => {
    if (selectedHourSlot === null || !selectedOf || !declQte) {
      toast({ title: "Erreur", description: "Sélectionnez un créneau et entrez la quantité", variant: "destructive" });
      return;
    }
    const slot = hourlySlots[selectedHourSlot];
    if (!canEditSlot(slot)) {
      toast({ title: "Hors délai", description: "La fenêtre de saisie est expirée pour ce créneau.", variant: "destructive" });
      return;
    }

    // Use slot start as heure_production for consistency
    const { error: declError } = await supabase.from("production_declarations").insert({
      of_id: selectedOf.id,
      shift_id: activeShift?.id || null,
      heure_production: slot.startTime.toISOString(),
      quantite_produite: parseFloat(declQte),
      quantite_rebut: parseFloat(declRebut) || 0,
      declared_by: user?.id,
      notes: declNotes,
    } as any);

    if (declError) {
      toast({ title: "Erreur", description: declError.message, variant: "destructive" });
      return;
    }

    // Update OF totals
    await supabase.from("ordres_fabrication").update({
      quantite_produite: (selectedOf.quantite_produite || 0) + parseFloat(declQte),
      quantite_rebut: (selectedOf.quantite_rebut || 0) + (parseFloat(declRebut) || 0),
    }).eq("id", selectedOf.id);

    toast({ title: "Production déclarée", description: `${declQte} pour ${slot.label}` });
    setDeclQte(""); setDeclRebut("0"); setDeclNotes(""); setSelectedHourSlot(null);

    // Reload
    const { data: updatedOf } = await supabase.from("ordres_fabrication")
      .select("*, products(code, designation), production_lines(id, code, designation, machine_id)")
      .eq("id", selectedOf.id).single();
    if (updatedOf) setSelectedOf(updatedOf);
    if (activeShift) {
      const { data } = await supabase.from("production_declarations").select("*").eq("of_id", selectedOf.id).eq("shift_id", activeShift.id).order("heure_production", { ascending: true });
      setDeclarations(data || []);
    }
  };

  const handleSaveObservations = async () => {
    if (!activeShift) return;
    await supabase.from("shifts").update({ observations } as any).eq("id", activeShift.id);
    toast({ title: "Observations enregistrées" });
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    await supabase.from("shifts").update({
      statut: "termine",
      heure_fin_reelle: new Date().toISOString(),
      observations,
    } as any).eq("id", activeShift.id);
    toast({ title: "Shift clôturé" });
    loadData();
  };

  const handleCreateTicket = async () => {
    if (!ticketMachineId || !ticketDescription) {
      toast({ title: "Erreur", description: "Machine et description obligatoires", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("tickets").insert({
      machine_id: ticketMachineId,
      priorite: ticketPriorite as any,
      description: ticketDescription,
      declarant_id: user?.id,
      numero: "",
      is_from_gpao: true,
      of_id: selectedOf?.id || null,
      ligne_id: selectedOf?.production_lines?.id || null,
      shift_id: activeShift?.id || null,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ticket maintenance créé", description: "Visible dans la GMAO" });
      setTicketDialogOpen(false);
      setTicketDescription(""); setTicketMachineId("");
    }
  };

  const progress = selectedOf && selectedOf.quantite_prevue > 0
    ? Math.round((selectedOf.quantite_produite / selectedOf.quantite_prevue) * 100) : 0;

  const teamInfo = activeShift?.shift_teams;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Écran Shift</h1>
          <p className="text-muted-foreground">Déclaration de production par créneau horaire</p>
        </div>
        <div className="flex items-center gap-3">
          {activeShift ? (
            <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {teamInfo ? `${teamInfo.name} — ` : ""}
              {activeShift.shift_type === "matin" ? "Matin" : activeShift.shift_type === "apres_midi" ? "Après-midi" : "Nuit"}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 px-3 py-1.5">
              <Ban className="h-3.5 w-3.5 mr-1.5" /> Aucun shift actif
            </Badge>
          )}
          {profile && (
            <Badge variant="secondary" className="px-3 py-1.5">
              Chef: {profile.first_name} {profile.last_name}
            </Badge>
          )}
          {canCreate("tickets") && (
            <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="h-12 px-6">
                  <AlertTriangle className="h-4 w-4 mr-2" /> Ticket maintenance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ouvrir un ticket maintenance (depuis GPAO)</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Machine *</Label>
                    <Select value={ticketMachineId} onValueChange={setTicketMachineId}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>{machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select value={ticketPriorite} onValueChange={setTicketPriorite}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basse">Basse</SelectItem>
                        <SelectItem value="normale">Normale</SelectItem>
                        <SelectItem value="haute">Haute</SelectItem>
                        <SelectItem value="critique">Critique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} placeholder="Décrivez le problème..." className="min-h-[100px]" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ce ticket sera lié à l'OF {selectedOf?.numero || "—"}, shift {activeShift?.shift_type || "—"} et visible dans la GMAO.
                  </p>
                  <Button onClick={handleCreateTicket} className="w-full h-12">Créer le ticket</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* OF Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">OF en cours</CardTitle>
        </CardHeader>
        <CardContent>
          {ofs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Aucun OF en cours</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ofs.map((of) => (
                <div
                  key={of.id}
                  onClick={() => setSelectedOf(of)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${selectedOf?.id === of.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <p className="font-mono font-bold">{of.numero}</p>
                  <p className="text-sm text-muted-foreground">{of.products?.designation}</p>
                  <p className="text-xs tabular-nums mt-1">{of.quantite_produite} / {of.quantite_prevue} {of.unite || "kg"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOf && (
        <>
          {/* Progress */}
          <Card>
            <CardContent className="p-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{selectedOf.numero} — {selectedOf.products?.designation}</span>
                <span className="tabular-nums font-bold">{progress}%</span>
              </div>
              <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ligne: {selectedOf.production_lines?.designation || "—"}</p>
            </CardContent>
          </Card>

          {/* Hourly declaration grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Déclaration par créneau horaire
                <span className="text-xs font-normal text-muted-foreground">
                  Tolérance : {toleranceHours}h après la fin du créneau
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!activeShift ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Ban className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun shift actif — la saisie est désactivée</p>
                </div>
              ) : hourlySlots.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">Aucun créneau horaire calculé</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {hourlySlots.map((slot, idx) => {
                    const existing = getSlotDeclaration(slot);
                    const editable = canEditSlot(slot);
                    const isSelected = selectedHourSlot === idx;
                    const now = new Date();
                    const isPast = now >= slot.endTime;
                    const isCurrent = now >= slot.startTime && now < slot.endTime;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (!existing && editable) setSelectedHourSlot(isSelected ? null : idx);
                        }}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          existing
                            ? "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700"
                            : isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : editable
                                ? "border-border hover:border-primary/40 cursor-pointer"
                                : "border-border bg-muted/30 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm font-bold">{slot.label}</span>
                          {existing ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : editable ? (
                            <Unlock className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        {existing ? (
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium tabular-nums">{existing.quantite_produite} {selectedOf.unite}</p>
                            {existing.quantite_rebut > 0 && (
                              <p className="text-destructive tabular-nums">Rebut: {existing.quantite_rebut}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {isCurrent ? "En cours" : editable ? "Saisie possible" : isPast ? "Expiré" : "À venir"}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Declaration form for selected slot */}
              {selectedHourSlot !== null && activeShift && (
                <div className="border-t pt-4 mt-4 space-y-3">
                  <p className="text-sm font-medium">
                    Saisie pour : <span className="text-primary">{hourlySlots[selectedHourSlot]?.label}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Quantité produite *</Label>
                      <Input type="number" value={declQte} onChange={(e) => setDeclQte(e.target.value)} className="h-14 text-lg" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Rebuts</Label>
                      <Input type="number" value={declRebut} onChange={(e) => setDeclRebut(e.target.value)} className="h-14 text-lg" placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input value={declNotes} onChange={(e) => setDeclNotes(e.target.value)} className="h-12" placeholder="Optionnel" />
                  </div>
                  <Button onClick={handleDeclareProduction} className="w-full h-14 text-lg" disabled={!declQte}>
                    Déclarer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observations / Clôture shift */}
          {activeShift && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Observations de fin de shift
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Commentaires, incidents, consignes pour le shift suivant..."
                  className="min-h-[80px]"
                />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleSaveObservations} className="flex-1">
                    Enregistrer observations
                  </Button>
                  <Button variant="destructive" onClick={handleCloseShift}>
                    Clôturer le shift
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
