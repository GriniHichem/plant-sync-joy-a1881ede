import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";

const FREQUENCES = [
  { value: "quotidien", label: "Quotidien" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "mensuel", label: "Mensuel" },
  { value: "trimestriel", label: "Trimestriel" },
  { value: "semestriel", label: "Semestriel" },
  { value: "annuel", label: "Annuel" },
];

export default function PreventifForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !id;
  const navigate = useNavigate();
  const goBack = useSmartBack(isNew ? "/preventif" : `/preventif/${id}`);
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [machines, setMachines] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [pdrList, setPdrList] = useState<any[]>([]);
  const [maintenanciers, setMaintenanciers] = useState<any[]>([]);
  const [machinePdr, setMachinePdr] = useState<any[]>([]);
  const [equipements, setEquipements] = useState<any[]>([]);
  const [organes, setOrganes] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    machine_id: "",
    line_id: "",
    equipement_id: "",
    organe_id: "",
    frequence: "mensuel",
    type_maintenance: "",
    statut_plan: "brouillon",
    source: "manuel",
    source_pdr_id: null as string | null,
    prochaine_echeance: "",
  });

  const [selectedPdr, setSelectedPdr] = useState<{ pdr_id: string; quantite: number }[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code"),
      supabase.from("production_lines").select("id, code, designation").eq("is_active", true).order("code"),
      supabase.from("pdr").select("id, reference, designation").eq("is_active", true).order("reference"),
      supabase.from("user_roles").select("user_id, role").eq("role", "maintenancier"),
      supabase.from("equipements").select("id, code, designation, machine_id").eq("is_active", true).order("code"),
      supabase.from("organes" as any).select("id, code, designation, machine_id, equipement_id").eq("is_active", true).order("code"),
    ]).then(async ([mRes, lRes, pRes, urRes, eRes, oRes]) => {
      setMachines(mRes.data || []);
      setLines(lRes.data || []);
      setPdrList(pRes.data || []);
      setEquipements(eRes.data || []);
      setOrganes((oRes.data as any) || []);

      const userIds = (urRes.data || []).map((r: any) => r.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", userIds);
        setMaintenanciers(profiles || []);
      }
    });

    // Pre-fill from URL params
    const machineParam = searchParams.get("machine");
    const pdrParam = searchParams.get("pdr");
    if (machineParam) setForm(f => ({ ...f, machine_id: machineParam }));
    if (pdrParam) {
      setSelectedPdr([{ pdr_id: pdrParam, quantite: 1 }]);
      setForm(f => ({ ...f, source: "auto_duree_vie", source_pdr_id: pdrParam }));
    }

    if (id) {
      loadPlan(id);
    }
  }, [id]);

  const loadPlan = async (planId: string) => {
    const { data } = await supabase.from("preventive_plans").select("*").eq("id", planId).single();
    if (data) {
      setForm({
        title: data.title,
        description: (data as any).description || "",
        machine_id: data.machine_id,
        line_id: (data as any).line_id || "",
        equipement_id: (data as any).equipement_id || "",
        organe_id: (data as any).organe_id || "",
        frequence: data.frequence,
        type_maintenance: (data as any).type_maintenance || "",
        statut_plan: (data as any).statut_plan || "valide",
        source: (data as any).source || "manuel",
        source_pdr_id: (data as any).source_pdr_id || null,
        prochaine_echeance: data.prochaine_echeance ? new Date(data.prochaine_echeance).toISOString().slice(0, 10) : "",
      });
    }
    const { data: planPdr } = await supabase.from("preventive_plan_pdr").select("pdr_id, quantite").eq("plan_id", planId);
    setSelectedPdr((planPdr || []).map((p: any) => ({ pdr_id: p.pdr_id, quantite: p.quantite })));
    const { data: assignees } = await supabase.from("preventive_plan_assignees").select("user_id").eq("plan_id", planId);
    setSelectedAssignees((assignees || []).map((a: any) => a.user_id));
  };

  // When machine changes, load machine-PDR links and auto-detect line
  useEffect(() => {
    if (form.machine_id) {
      supabase.from("machine_pdr").select("pdr_id").eq("machine_id", form.machine_id).then(({ data }) => {
        setMachinePdr((data || []).map((d: any) => d.pdr_id));
      });
      // Auto-detect line
      supabase.from("machine_line_assignments").select("line_id").eq("machine_id", form.machine_id).limit(1).then(({ data }) => {
        if (data && data.length > 0 && !form.line_id) {
          setForm(f => ({ ...f, line_id: data[0].line_id }));
        }
      });
    }
  }, [form.machine_id]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.machine_id) {
      toast({ title: "Titre et machine obligatoires", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      machine_id: form.machine_id,
      line_id: form.line_id || null,
      equipement_id: form.equipement_id || null,
      organe_id: form.organe_id || null,
      frequence: form.frequence,
      type_maintenance: form.type_maintenance,
      statut_plan: form.statut_plan,
      source: form.source,
      source_pdr_id: form.source_pdr_id || null,
      prochaine_echeance: form.prochaine_echeance ? new Date(form.prochaine_echeance).toISOString() : null,
    };

    let planId = id;
    if (isNew) {
      const { data, error } = await supabase.from("preventive_plans").insert(payload).select().single();
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
      planId = data.id;
    } else {
      const { error } = await supabase.from("preventive_plans").update(payload).eq("id", id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }

    // Save PDR links
    if (planId) {
      await supabase.from("preventive_plan_pdr").delete().eq("plan_id", planId);
      if (selectedPdr.length > 0) {
        await supabase.from("preventive_plan_pdr").insert(
          selectedPdr.map(p => ({ plan_id: planId!, pdr_id: p.pdr_id, quantite: p.quantite }))
        );
      }

      // Save assignees
      await supabase.from("preventive_plan_assignees").delete().eq("plan_id", planId);
      if (selectedAssignees.length > 0) {
        await supabase.from("preventive_plan_assignees").insert(
          selectedAssignees.map(uid => ({ plan_id: planId!, user_id: uid }))
        );
      }
    }

    toast({ title: isNew ? "Plan créé" : "Plan mis à jour" });
    navigate(`/preventif/${planId}`);
    setSaving(false);
  };

  const togglePdr = (pdrId: string) => {
    setSelectedPdr(prev =>
      prev.some(p => p.pdr_id === pdrId)
        ? prev.filter(p => p.pdr_id !== pdrId)
        : [...prev, { pdr_id: pdrId, quantite: 1 }]
    );
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId) ? prev.filter(u => u !== userId) : [...prev, userId]
    );
  };

  // PDR to show: machine-linked first, then all
  const sortedPdr = [...pdrList].sort((a, b) => {
    const aLinked = machinePdr.includes(a.id) ? 0 : 1;
    const bLinked = machinePdr.includes(b.id) ? 0 : 1;
    return aLinked - bLinked;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isNew ? "Nouveau plan préventif" : "Modifier le plan"}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-12 px-6">
          <Save className="h-4 w-4 mr-2" /> {saving ? "..." : "Enregistrer"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main form */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Informations du plan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-12" placeholder="Graissage mensuel..." />
              </div>
              <div className="space-y-2">
                <Label>Machine *</Label>
                <Select value={form.machine_id} onValueChange={v => setForm(f => ({ ...f, machine_id: v }))}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ligne</Label>
                <Select value={form.line_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, line_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Auto-détectée" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {lines.map(l => <SelectItem key={l.id} value={l.id}>{l.code} — {l.designation}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Équipement (optionnel)</Label>
                <Select value={form.equipement_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, equipement_id: v === "__none__" ? "" : v, organe_id: "" }))}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {equipements
                      .filter((e: any) => !form.machine_id || e.machine_id === form.machine_id || !e.machine_id)
                      .map((e: any) => <SelectItem key={e.id} value={e.id}>{e.code} — {e.designation}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Organe (optionnel)</Label>
                <Select value={form.organe_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, organe_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {organes
                      .filter((o: any) =>
                        (form.equipement_id && o.equipement_id === form.equipement_id) ||
                        (!form.equipement_id && form.machine_id && o.machine_id === form.machine_id)
                      )
                      .map((o: any) => <SelectItem key={o.id} value={o.id}>{o.code} — {o.designation}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fréquence</Label>
                <Select value={form.frequence} onValueChange={v => setForm(f => ({ ...f, frequence: v }))}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCES.map(fr => <SelectItem key={fr.value} value={fr.value}>{fr.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut du plan</Label>
                <Select value={form.statut_plan} onValueChange={v => setForm(f => ({ ...f, statut_plan: v }))}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="valide">Validé</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prochaine échéance</Label>
                <Input type="date" value={form.prochaine_echeance} onChange={e => setForm(f => ({ ...f, prochaine_echeance: e.target.value }))} className="h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type de maintenance / Opérations</Label>
              <Textarea value={form.type_maintenance} onChange={e => setForm(f => ({ ...f, type_maintenance: e.target.value }))} rows={3} placeholder="Décrire les opérations à réaliser..." />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* PDR selection */}
          <Card>
            <CardHeader><CardTitle className="text-base">PDR concernées</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {sortedPdr.map(p => (
                  <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                    <input type="checkbox" checked={selectedPdr.some(sp => sp.pdr_id === p.id)} onChange={() => togglePdr(p.id)} className="rounded border-input" />
                    <span className="font-mono text-xs">{p.reference}</span>
                    <span className="text-muted-foreground truncate">{p.designation}</span>
                    {machinePdr.includes(p.id) && <span className="text-xs text-primary ml-auto">liée</span>}
                  </label>
                ))}
                {sortedPdr.length === 0 && <p className="text-xs text-muted-foreground">Aucune PDR</p>}
              </div>
            </CardContent>
          </Card>

          {/* Assignees */}
          <Card>
            <CardHeader><CardTitle className="text-base">Maintenanciers affectés</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {maintenanciers.map(m => (
                  <label key={m.user_id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                    <input type="checkbox" checked={selectedAssignees.includes(m.user_id)} onChange={() => toggleAssignee(m.user_id)} className="rounded border-input" />
                    <span>{m.first_name} {m.last_name}</span>
                  </label>
                ))}
                {maintenanciers.length === 0 && <p className="text-xs text-muted-foreground">Aucun maintenancier</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
