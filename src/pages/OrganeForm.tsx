import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OrganeForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [parentKind, setParentKind] = useState<"machine" | "equipement">(
    (params.get("equipement_id") ? "equipement" : "machine")
  );
  const [machines, setMachines] = useState<any[]>([]);
  const [equipements, setEquipements] = useState<any[]>([]);
  const [form, setForm] = useState({
    code: "", designation: "", description: "",
    type: "autre", statut: "en_service", criticite: "C",
    machine_id: params.get("machine_id") || "",
    equipement_id: params.get("equipement_id") || "",
    sort_order: 0,
  });

  useEffect(() => {
    supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code").then(({ data }) => setMachines(data || []));
    supabase.from("equipements").select("id, code, designation").eq("is_active", true).order("code").then(({ data }) => setEquipements(data || []));
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase.from("organes" as any).select("*").eq("id", id).single().then(({ data }) => {
      if (!data) return;
      const d: any = data;
      setForm({
        code: d.code, designation: d.designation, description: d.description || "",
        type: d.type, statut: d.statut, criticite: d.criticite,
        machine_id: d.machine_id || "", equipement_id: d.equipement_id || "",
        sort_order: d.sort_order || 0,
      });
      setParentKind(d.machine_id ? "machine" : "equipement");
    });
  }, [id]);

  const save = async () => {
    if (!form.code.trim() || !form.designation.trim()) {
      toast({ title: "Code et désignation obligatoires", variant: "destructive" }); return;
    }
    if (parentKind === "machine" && !form.machine_id) {
      toast({ title: "Machine parente obligatoire", variant: "destructive" }); return;
    }
    if (parentKind === "equipement" && !form.equipement_id) {
      toast({ title: "Équipement parent obligatoire", variant: "destructive" }); return;
    }

    const payload: any = {
      code: form.code.trim(),
      designation: form.designation.trim(),
      description: form.description,
      type: form.type, statut: form.statut, criticite: form.criticite,
      machine_id: parentKind === "machine" ? form.machine_id : null,
      equipement_id: parentKind === "equipement" ? form.equipement_id : null,
      sort_order: Number(form.sort_order) || 0,
    };

    const res = isEdit
      ? await supabase.from("organes" as any).update(payload).eq("id", id)
      : await supabase.from("organes" as any).insert(payload);

    if (res.error) {
      toast({ title: "Erreur", description: res.error.message, variant: "destructive" }); return;
    }
    toast({ title: isEdit ? "Organe modifié" : "Organe créé" });
    navigate("/organes");
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">{isEdit ? "Modifier organe" : "Nouvel organe"}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Parent</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup value={parentKind} onValueChange={(v) => setParentKind(v as any)} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="machine" id="pk-m" /><Label htmlFor="pk-m">Machine</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="equipement" id="pk-e" /><Label htmlFor="pk-e">Équipement</Label></div>
          </RadioGroup>
          {parentKind === "machine" ? (
            <div>
              <Label>Machine *</Label>
              <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une machine" /></SelectTrigger>
                <SelectContent>
                  {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Équipement *</Label>
              <Select value={form.equipement_id} onValueChange={(v) => setForm({ ...form, equipement_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un équipement" /></SelectTrigger>
                <SelectContent>
                  {equipements.map((e) => <SelectItem key={e.id} value={e.id}>{e.code} — {e.designation}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><Label>Désignation *</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["mecanique","electrique","pneumatique","hydraulique","electronique","automatisme","instrumentation","autre"].map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en_service">En service</SelectItem>
                <SelectItem value="en_panne">En panne</SelectItem>
                <SelectItem value="en_maintenance">En maintenance</SelectItem>
                <SelectItem value="hors_service">Hors service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Criticité</Label>
            <Select value={form.criticite} onValueChange={(v) => setForm({ ...form, criticite: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A — Critique</SelectItem>
                <SelectItem value="B">B — Importante</SelectItem>
                <SelectItem value="C">C — Normale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Ordre d'affichage</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
        <Button onClick={save}><Save className="h-4 w-4 mr-2" />Enregistrer</Button>
      </div>
    </div>
  );
}
