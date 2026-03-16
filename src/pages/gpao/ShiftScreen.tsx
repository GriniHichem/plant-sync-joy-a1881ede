import { useEffect, useState } from "react";
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
import { OfStatusBadge } from "./GpaoDashboard";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Wrench, Clock, Ban } from "lucide-react";

export default function ShiftScreen() {
  const { user } = useAuth();
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

  // Production declaration form
  const [declQte, setDeclQte] = useState("");
  const [declRebut, setDeclRebut] = useState("0");
  const [declNotes, setDeclNotes] = useState("");

  // Ticket dialog
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketMachineId, setTicketMachineId] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriorite, setTicketPriorite] = useState("normale");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [ofsRes, linesRes, machinesRes, shiftsRes] = await Promise.all([
      supabase.from("ordres_fabrication").select("*, products(code, designation), production_lines(id, code, designation, machine_id)").eq("statut", "en_cours" as any).order("numero"),
      supabase.from("production_lines").select("*").eq("is_active", true),
      supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code"),
      supabase.from("shifts").select("*").eq("date_shift", new Date().toISOString().slice(0, 10)).order("heure_debut", { ascending: false }),
    ]);
    setOfs(ofsRes.data || []);
    setLines(linesRes.data || []);
    setMachines(machinesRes.data || []);
    setShifts(shiftsRes.data || []);

    if (ofsRes.data && ofsRes.data.length > 0) {
      setSelectedOf(ofsRes.data[0]);
    }

    // Find active shift
    const now = new Date();
    const active = (shiftsRes.data || []).find((s: any) => {
      const start = new Date(s.heure_debut);
      const end = new Date(s.heure_fin);
      return now >= start && now <= end;
    });
    setActiveShift(active || null);
  }

  useEffect(() => {
    if (selectedOf && activeShift) {
      supabase.from("production_declarations")
        .select("*")
        .eq("of_id", selectedOf.id)
        .eq("shift_id", activeShift.id)
        .order("heure_production", { ascending: false })
        .then(({ data }) => setDeclarations(data || []));
    }
  }, [selectedOf, activeShift]);

  // Check if current hour is within active shift window
  function isWithinShiftWindow(): boolean {
    if (!activeShift) return false;
    const now = new Date();
    const start = new Date(activeShift.heure_debut);
    const end = new Date(activeShift.heure_fin);
    return now >= start && now <= end;
  }

  const shiftActive = isWithinShiftWindow();

  const handleDeclareProduction = async () => {
    if (!shiftActive) {
      toast({ title: "Hors shift", description: "La saisie n'est autorisée que pendant le shift actif.", variant: "destructive" });
      return;
    }
    if (!selectedOf || !declQte) {
      toast({ title: "Erreur", description: "Sélectionnez un OF et entrez la quantité", variant: "destructive" });
      return;
    }
    const now = new Date();
    const { error: declError } = await supabase.from("production_declarations").insert({
      of_id: selectedOf.id,
      shift_id: activeShift?.id || null,
      heure_production: now.toISOString(),
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

    toast({ title: "Production déclarée", description: `${declQte} ${selectedOf.products?.designation}` });
    setDeclQte("");
    setDeclRebut("0");
    setDeclNotes("");

    // Reload OF
    const { data: updatedOf } = await supabase.from("ordres_fabrication").select("*, products(code, designation), production_lines(id, code, designation, machine_id)").eq("id", selectedOf.id).single();
    if (updatedOf) setSelectedOf(updatedOf);
    // Reload declarations
    if (activeShift) {
      const { data } = await supabase.from("production_declarations").select("*").eq("of_id", selectedOf.id).eq("shift_id", activeShift.id).order("heure_production", { ascending: false });
      setDeclarations(data || []);
    }
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
      setTicketDescription("");
      setTicketMachineId("");
    }
  };

  const progress = selectedOf && selectedOf.quantite_prevue > 0
    ? Math.round((selectedOf.quantite_produite / selectedOf.quantite_prevue) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Écran Shift</h1>
          <p className="text-muted-foreground">Saisie production & maintenance</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Shift status indicator */}
          {activeShift ? (
            <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Shift actif : {activeShift.shift_type === "matin" ? "Matin" : activeShift.shift_type === "apres_midi" ? "Après-midi" : "Nuit"}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 px-3 py-1.5">
              <Ban className="h-3.5 w-3.5 mr-1.5" />
              Aucun shift actif
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
              <p className="text-xs text-muted-foreground mt-1">
                Ligne: {selectedOf.production_lines?.designation || "—"}
              </p>
            </CardContent>
          </Card>

          {/* Déclaration production */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Déclarer production
                {!shiftActive && (
                  <Badge variant="outline" className="border-destructive/50 text-destructive text-xs font-normal">
                    <Ban className="h-3 w-3 mr-1" /> Saisie bloquée — hors shift
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantité produite *</Label>
                  <Input
                    type="number"
                    value={declQte}
                    onChange={(e) => setDeclQte(e.target.value)}
                    className="h-14 text-lg"
                    placeholder="0"
                    disabled={!shiftActive}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rebuts</Label>
                  <Input
                    type="number"
                    value={declRebut}
                    onChange={(e) => setDeclRebut(e.target.value)}
                    className="h-14 text-lg"
                    placeholder="0"
                    disabled={!shiftActive}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={declNotes} onChange={(e) => setDeclNotes(e.target.value)} className="h-12" placeholder="Optionnel" disabled={!shiftActive} />
              </div>
              <Button onClick={handleDeclareProduction} className="w-full h-14 text-lg" disabled={!declQte || !shiftActive}>
                {shiftActive ? "Déclarer" : "Saisie bloquée (hors shift)"}
              </Button>

              {/* Recent declarations */}
              {declarations.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Déclarations du shift</p>
                  <div className="space-y-1">
                    {declarations.slice(0, 5).map((d) => (
                      <div key={d.id} className="flex justify-between text-xs py-1.5 px-2 rounded bg-muted/30">
                        <span className="tabular-nums text-muted-foreground">
                          {new Date(d.heure_production).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="tabular-nums font-medium">{d.quantite_produite} kg</span>
                        {d.quantite_rebut > 0 && (
                          <span className="tabular-nums text-destructive">rebut: {d.quantite_rebut}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
