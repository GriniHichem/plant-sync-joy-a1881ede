import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useActiveShift } from "@/contexts/ActiveShiftContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ban, Save, ArrowLeft } from "lucide-react";
import { logAudit } from "@/lib/audit";

const STOP_TYPES = [
  { value: "panne", label: "Panne" },
  { value: "changement_format", label: "Changement de format" },
  { value: "manque_matiere", label: "Manque matière" },
  { value: "nettoyage", label: "Nettoyage" },
  { value: "qualite", label: "Qualité" },
  { value: "autre", label: "Autre" },
];

export default function ProductionShiftStop() {
  const { productionShift } = useActiveShift();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [type, setType] = useState("panne");
  const [duree, setDuree] = useState("");
  const [description, setDescription] = useState("");
  const [machineId, setMachineId] = useState<string>("");
  const [machines, setMachines] = useState<any[]>([]);
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
        <CardContent className="p-6 text-center text-muted-foreground">
          Aucun shift production actif.
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit() {
    if (!productionShift) return;
    const d = parseInt(duree, 10);
    if (!Number.isFinite(d) || d <= 0) {
      toast({ title: "Durée invalide", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Description requise", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const startTime = new Date(Date.now() - d * 60_000).toISOString();
      const { data, error } = await supabase
        .from("production_stops")
        .insert({
          shift_id: productionShift.id,
          of_id: productionShift.of_id,
          line_id: productionShift.line_id,
          machine_id: machineId || null,
          type,
          description: description.trim(),
          duree_minutes: d,
          heure_debut: startTime,
          heure_fin: new Date().toISOString(),
          declared_by: user?.id,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      await logAudit({
        action_type: "create",
        module: "gpao" as any,
        entity_type: "production_stop",
        entity_id: (data as any).id,
        action_label: "Arrêt production (kiosque shift)",
        new_values: { shift_id: productionShift.id, type, duree_minutes: d },
      });

      toast({ title: "Arrêt enregistré" });
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
            <Ban className="h-5 w-5 text-destructive" /> Déclarer un arrêt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Type d'arrêt *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="min-h-[48px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STOP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Machine concernée (optionnel)</Label>
            <Select value={machineId || "__none__"} onValueChange={(v) => setMachineId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="min-h-[48px] mt-1"><SelectValue placeholder="Choisir une machine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Aucune —</SelectItem>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Durée (minutes) *</Label>
            <Input
              inputMode="numeric"
              value={duree}
              onChange={(e) => setDuree(e.target.value)}
              className="min-h-[48px] text-lg tabular-nums"
            />
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Cause, contexte, action prise..."
            />
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link to="/gpao/shift/ticket">Créer un ticket à la place</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 min-h-[52px]">
              <Save className="h-5 w-5 mr-2" /> {submitting ? "..." : "Enregistrer"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
