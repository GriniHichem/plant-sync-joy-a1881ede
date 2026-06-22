import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Trash2, Eye, Save, Lock } from "lucide-react";

interface Assignment {
  id: string;
  machine_id: string;
  line_id: string;
  priority: number;
  sort_order: number;
  machines: { id: string; code: string; designation: string; role_fonctionnel: string; statut: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  alimentation: "Alimentation", transformation: "Transformation", dosage: "Dosage",
  melange: "Mélange", convoyage: "Convoyage", conditionnement: "Conditionnement",
  controle: "Contrôle", evacuation: "Évacuation", utilite: "Utilité", autre: "Autre",
};

export default function LineConfig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack(`/lignes/${id}`);
  const { toast } = useToast();
  const { canEdit, loading: permLoading } = usePermissions();
  const [line, setLine] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allMachines, setAllMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState("__none__");
  const [saving, setSaving] = useState(false);

  // Equipements
  const [lineEquipements, setLineEquipements] = useState<any[]>([]);
  const [allEquipements, setAllEquipements] = useState<any[]>([]);
  const [selectedEquip, setSelectedEquip] = useState("__none__");

  const load = async () => {
    if (!id) return;
    const [lRes, aRes, mRes, lEqRes, allEqRes] = await Promise.all([
      supabase.from("production_lines").select("*").eq("id", id).single(),
      supabase.from("machine_line_assignments")
        .select("*, machines(id, code, designation, role_fonctionnel, statut)")
        .eq("line_id", id)
        .order("sort_order"),
      supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code"),
      supabase.from("equipements").select("id, code, designation, type, statut").eq("line_id", id).order("code"),
      supabase.from("equipements").select("id, code, designation, type, line_id").eq("is_active", true).order("code"),
    ]);
    setLine(lRes.data);
    setAssignments(aRes.data || []);
    setAllMachines(mRes.data || []);
    setLineEquipements(lEqRes.data || []);
    setAllEquipements(allEqRes.data || []);
  };

  useEffect(() => { load(); }, [id]);

  const handleAddEquip = async () => {
    if (selectedEquip === "__none__" || !id) return;
    const { error } = await supabase.from("equipements").update({ line_id: id }).eq("id", selectedEquip);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { setSelectedEquip("__none__"); load(); }
  };

  const handleRemoveEquip = async (eqId: string) => {
    const { error } = await supabase.from("equipements").update({ line_id: null }).eq("id", eqId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else load();
  };

  const assignedIds = new Set(assignments.map((a) => a.machine_id));
  const availableMachines = allMachines.filter((m) => !assignedIds.has(m.id));

  const handleAdd = async () => {
    if (selectedMachine === "__none__" || !id) return;
    const nextOrder = assignments.length > 0 ? Math.max(...assignments.map((a) => a.sort_order)) + 1 : 1;
    // Find next available priority for this machine
    const { data: existingPriorities } = await supabase
      .from("machine_line_assignments")
      .select("priority")
      .eq("machine_id", selectedMachine);
    const usedPriorities = new Set((existingPriorities || []).map((p: any) => p.priority));
    let nextPriority = 1;
    for (let i = 1; i <= 3; i++) {
      if (!usedPriorities.has(i)) { nextPriority = i; break; }
    }
    if (usedPriorities.size >= 3) {
      toast({ title: "Cette machine est déjà affectée à 3 lignes", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("machine_line_assignments").insert({
      machine_id: selectedMachine,
      line_id: id,
      priority: nextPriority,
      sort_order: nextOrder,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSelectedMachine("__none__");
      load();
    }
  };

  const handleRemove = async (assignmentId: string) => {
    await supabase.from("machine_line_assignments").delete().eq("id", assignmentId);
    load();
  };

  const handleMove = async (idx: number, direction: "up" | "down") => {
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= assignments.length) return;
    const a = assignments[idx];
    const b = assignments[swapIdx];
    await Promise.all([
      supabase.from("machine_line_assignments").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("machine_line_assignments").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    load();
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    // Rewrite sort_order sequentially
    const updates = assignments.map((a, idx) =>
      supabase.from("machine_line_assignments").update({ sort_order: idx + 1 }).eq("id", a.id)
    );
    await Promise.all(updates);
    setSaving(false);
    toast({ title: "Ordre enregistré" });
    load();
  };

  if (!line) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Configurer — {line.code}</h1>
          <p className="text-muted-foreground text-sm">Définir l'ordre des machines dans le processus</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/lignes/${id}`)}>
          <Eye className="h-4 w-4 mr-2" /> Voir synoptique
        </Button>
      </div>

      {/* Add machine */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ajouter une machine au processus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="flex-1 h-11">
                <SelectValue placeholder="Sélectionner une machine..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Choisir —</SelectItem>
                {availableMachines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={selectedMachine === "__none__"} className="h-11">
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ordered machine list */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ordre du processus ({assignments.length} machines)</CardTitle>
          {assignments.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleSaveOrder} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "..." : "Normaliser l'ordre"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune machine dans le processus. Ajoutez-en ci-dessus.
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a, idx) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      disabled={idx === assignments.length - 1}
                      onClick={() => handleMove(idx, "down")}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-bold truncate">{a.machines?.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.machines?.designation}</p>
                  </div>

                  <Badge variant="outline" className="text-xs shrink-0">
                    {ROLE_LABELS[a.machines?.role_fonctionnel || ""] || "—"}
                  </Badge>

                  <Badge
                    variant={a.machines?.statut === "en_marche" ? "default" : a.machines?.statut === "arret" ? "destructive" : "secondary"}
                    className="text-xs shrink-0"
                  >
                    {a.machines?.statut === "en_marche" ? "Marche" : a.machines?.statut === "arret" ? "Arrêt" : "Maint."}
                  </Badge>

                  <Badge variant="outline" className="text-xs shrink-0">
                    Priorité {a.priority}
                  </Badge>

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive shrink-0" onClick={() => handleRemove(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipements autonomes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Équipements autonomes de la ligne ({lineEquipements.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={selectedEquip} onValueChange={setSelectedEquip}>
              <SelectTrigger className="flex-1 h-11">
                <SelectValue placeholder="Sélectionner un équipement à rattacher..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Choisir —</SelectItem>
                {allEquipements.filter((e) => e.line_id !== id).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.code} — {e.designation}{e.line_id ? " (déplacé d'une autre ligne)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddEquip} disabled={selectedEquip === "__none__"} className="h-11">
              <Plus className="h-4 w-4 mr-2" /> Rattacher
            </Button>
          </div>

          {lineEquipements.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Aucun équipement rattaché directement à la ligne.
            </p>
          ) : (
            <div className="space-y-2">
              {lineEquipements.map((eq) => (
                <div key={eq.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-bold truncate">{eq.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{eq.designation}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{eq.type}</Badge>
                  <Badge
                    variant={eq.statut === "en_service" ? "default" : eq.statut === "hors_service" ? "destructive" : "secondary"}
                    className="text-xs shrink-0"
                  >
                    {eq.statut}
                  </Badge>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive/70 hover:text-destructive shrink-0"
                    onClick={() => handleRemoveEquip(eq.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
