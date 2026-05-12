import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useActiveShift } from "@/contexts/ActiveShiftContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Save, ArrowLeft } from "lucide-react";
import { logAudit } from "@/lib/audit";

const PRIORITES = [
  { value: "basse", label: "Basse" },
  { value: "normale", label: "Normale" },
  { value: "haute", label: "Haute" },
  { value: "critique", label: "Critique" },
];

export default function ProductionShiftTicket() {
  const { productionShift } = useActiveShift();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [machineId, setMachineId] = useState<string>("");
  const [machines, setMachines] = useState<any[]>([]);
  const [description, setDescription] = useState("");
  const [priorite, setPriorite] = useState("normale");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!productionShift?.line_id) return;
    supabase
      .from("machine_line_assignments")
      .select("machine_id, machines(id, code, designation, is_active)")
      .eq("line_id", productionShift.line_id)
      .order("priority")
      .then(({ data }) => {
        const list = (data ?? [])
          .map((r: any) => r.machines)
          .filter((m: any) => m && m.is_active);
        setMachines(list);
      });
  }, [productionShift?.line_id]);

  if (!productionShift) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6 text-center text-muted-foreground">Aucun shift production actif.</CardContent>
      </Card>
    );
  }

  async function handleSubmit() {
    if (!productionShift) return;
    if (!machineId) { toast({ title: "Machine requise", variant: "destructive" }); return; }
    if (!description.trim()) { toast({ title: "Description requise", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          machine_id: machineId,
          ligne_id: productionShift.line_id,
          description: description.trim(),
          priorite,
          statut: "ouvert",
          declared_by: user?.id,
          shift_id: productionShift.id,
          of_id: productionShift.of_id,
        } as any)
        .select("id, numero")
        .single();
      if (error) throw error;

      await logAudit({
        action_type: "create",
        module: "tickets" as any,
        entity_type: "ticket",
        entity_id: (data as any).id,
        entity_label: (data as any).numero,
        action_label: "Ticket créé depuis shift production",
        new_values: { shift_id: productionShift.id, machine_id: machineId, priorite },
      });

      toast({ title: "Ticket créé", description: (data as any).numero });
      navigate("/gpao/shift");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/gpao/shift")}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour shift
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Créer un ticket maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Machine *</Label>
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger className="min-h-[48px] mt-1"><SelectValue placeholder="Choisir une machine" /></SelectTrigger>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Priorité *</Label>
            <Select value={priorite} onValueChange={setPriorite}>
              <SelectTrigger className="min-h-[48px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full min-h-[52px]">
            <Save className="h-5 w-5 mr-2" /> {submitting ? "Création..." : "Créer le ticket"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
