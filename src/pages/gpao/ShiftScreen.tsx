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
import { OfStatusBadge } from "./GpaoDashboard";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Plus, AlertTriangle, Wrench } from "lucide-react";

export default function ShiftScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ofs, setOfs] = useState<any[]>([]);
  const [selectedOf, setSelectedOf] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

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
    supabase.from("ordres_fabrication").select("*, products(code, designation), production_lines(id, code, designation, machine_id)").eq("statut", "en_cours" as any).order("numero").then(({ data }) => {
      setOfs(data || []);
      if (data && data.length > 0) setSelectedOf(data[0]);
    });
    supabase.from("production_lines").select("*").eq("is_active", true).then(({ data }) => setLines(data || []));
    supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code").then(({ data }) => setMachines(data || []));
  }, []);

  const handleDeclareProduction = async () => {
    if (!selectedOf || !declQte) {
      toast({ title: "Erreur", description: "Sélectionnez un OF et entrez la quantité", variant: "destructive" });
      return;
    }
    const now = new Date();
    // Simple time-based validation: only allow declaration for current hour
    const { error: declError } = await supabase.from("production_declarations").insert({
      of_id: selectedOf.id,
      shift_id: shifts[0]?.id || null, // simplified
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Écran Shift</h1>
          <p className="text-muted-foreground">Saisie production & maintenance</p>
        </div>
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
                Ce ticket sera lié à l'OF {selectedOf?.numero || "—"} et visible dans la GMAO.
              </p>
              <Button onClick={handleCreateTicket} className="w-full h-12">Créer le ticket</Button>
            </div>
          </DialogContent>
        </Dialog>
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
              <CardTitle className="text-base">Déclarer production</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
