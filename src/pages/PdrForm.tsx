import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";

const APPRO_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "importation", label: "Importation" },
  { value: "mixte", label: "Mixte" },
];
const STATUT_OPTIONS = [
  { value: "commune", label: "Commune" },
  { value: "strategique", label: "Stratégique" },
];

export default function PdrForm() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [families, setFamilies] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [linkedMachines, setLinkedMachines] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    reference: "", designation: "", description: "",
    fournisseur: "", emplacement: "",
    stock_actuel: 0, stock_min: 0, stock_max: 0,
    stock_securite: 0, point_commande: 0,
    delai_approvisionnement: 0,
    prix_unitaire: 0, pmp: 0,
    family_id: "", statut_pdr: "commune",
    approvisionnement: "local",
  });

  useEffect(() => {
    Promise.all([
      supabase.from("pdr_families").select("*").eq("is_active", true).order("name"),
      supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code"),
    ]).then(([fRes, mRes]) => {
      setFamilies(fRes.data || []);
      setMachines(mRes.data || []);
    });

    if (!isNew && id) {
      supabase.from("pdr").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setForm({
            reference: data.reference, designation: data.designation,
            description: (data as any).description || "",
            fournisseur: (data as any).fournisseur || "",
            emplacement: (data as any).emplacement || "",
            stock_actuel: data.stock_actuel, stock_min: data.stock_min,
            stock_max: (data as any).stock_max || 0,
            stock_securite: (data as any).stock_securite || 0,
            point_commande: (data as any).point_commande || 0,
            delai_approvisionnement: (data as any).delai_approvisionnement || 0,
            prix_unitaire: (data as any).prix_unitaire || 0,
            pmp: (data as any).pmp || 0,
            family_id: (data as any).family_id || "",
            statut_pdr: (data as any).statut_pdr || "commune",
            approvisionnement: (data as any).approvisionnement || "local",
          });
        }
      });
      supabase.from("machine_pdr").select("machine_id").eq("pdr_id", id).then(({ data }) => {
        setLinkedMachines((data || []).map((d: any) => d.machine_id));
      });
    }
  }, [id]);

  const handleFamilyChange = (familyId: string) => {
    setForm((prev) => ({ ...prev, family_id: familyId }));
    if (familyId && familyId !== "__none__") {
      const fam = families.find((f) => f.id === familyId);
      if (fam) {
        setForm((prev) => ({
          ...prev,
          family_id: familyId,
          approvisionnement: fam.approvisionnement || prev.approvisionnement,
          statut_pdr: fam.statut_default || prev.statut_pdr,
        }));
      }
    }
  };

  const toggleMachine = (machineId: string) => {
    setLinkedMachines((prev) =>
      prev.includes(machineId) ? prev.filter((m) => m !== machineId) : [...prev, machineId]
    );
  };

  const handleChange = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.reference.trim() || !form.designation.trim()) {
      toast({ title: "Référence et désignation obligatoires", variant: "destructive" });
      return;
    }
    if (form.statut_pdr === "strategique" && linkedMachines.length === 0) {
      toast({ title: "PDR stratégique : au moins une machine doit être liée", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload: any = {
      reference: form.reference.trim(),
      designation: form.designation.trim(),
      description: form.description.trim() || null,
      fournisseur: form.fournisseur.trim() || null,
      emplacement: form.emplacement.trim() || null,
      stock_actuel: Number(form.stock_actuel),
      stock_min: Number(form.stock_min),
      stock_max: Number(form.stock_max),
      stock_securite: Number(form.stock_securite),
      point_commande: Number(form.point_commande),
      delai_approvisionnement: Number(form.delai_approvisionnement),
      prix_unitaire: Number(form.prix_unitaire) || null,
      pmp: Number(form.pmp),
      family_id: form.family_id && form.family_id !== "__none__" ? form.family_id : null,
      statut_pdr: form.statut_pdr,
      approvisionnement: form.approvisionnement,
    };

    let pdrId = id;
    if (isNew) {
      const { data, error } = await supabase.from("pdr").insert(payload).select().single();
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
      pdrId = data.id;
    } else {
      const { error } = await supabase.from("pdr").update(payload).eq("id", id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }

    // Save machine links
    if (pdrId && pdrId !== "new") {
      await supabase.from("machine_pdr").delete().eq("pdr_id", pdrId);
      if (linkedMachines.length > 0) {
        await supabase.from("machine_pdr").insert(
          linkedMachines.map((mid) => ({ pdr_id: pdrId!, machine_id: mid }))
        );
      }
    }

    // Auto-inherit family suppliers for new PDR
    if (isNew && pdrId && pdrId !== "new" && form.family_id && form.family_id !== "__none__") {
      const { data: familySuppliers } = await supabase
        .from("pdr_family_suppliers")
        .select("nom, reference_fournisseur, prix, delai_jours, email, tel, adresse, url1, url2, notes, is_principal")
        .eq("family_id", form.family_id);
      if (familySuppliers && familySuppliers.length > 0) {
        await supabase.from("pdr_suppliers").insert(
          familySuppliers.map((s: any) => ({ ...s, pdr_id: pdrId! }))
        );
      }
    }

    toast({ title: isNew ? "PDR créée" : "PDR mise à jour" });
    navigate(`/pdr/${pdrId}`);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(isNew ? "/pdr" : `/pdr/${id}`)} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isNew ? "Nouvelle pièce de rechange" : "Modifier la PDR"}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-12 px-6">
          <Save className="h-4 w-4 mr-2" /> {saving ? "..." : "Enregistrer"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Référence *</Label>
                <Input value={form.reference} onChange={(e) => handleChange("reference", e.target.value)} className="h-12" placeholder="PDR-001" />
              </div>
              <div className="space-y-2">
                <Label>Désignation *</Label>
                <Input value={form.designation} onChange={(e) => handleChange("designation", e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Famille PDR</Label>
                <Select value={form.family_id || "__none__"} onValueChange={handleFamilyChange}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {families.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fournisseur principal</Label>
                <Input value={form.fournisseur} onChange={(e) => handleChange("fournisseur", e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Emplacement</Label>
                <Input value={form.emplacement} onChange={(e) => handleChange("emplacement", e.target.value)} className="h-12" placeholder="Magasin A, Étagère 3" />
              </div>
              <div className="space-y-2">
                <Label>Délai appro. (jours)</Label>
                <Input type="number" value={form.delai_approvisionnement} onChange={(e) => handleChange("delai_approvisionnement", Number(e.target.value))} className="h-12" min="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Classification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Statut PDR</Label>
                <Select value={form.statut_pdr} onValueChange={(v) => handleChange("statut_pdr", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Approvisionnement</Label>
                <Select value={form.approvisionnement} onValueChange={(v) => handleChange("approvisionnement", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPRO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Stock & Prix (DA)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Stock actuel</Label>
                  <Input type="number" value={form.stock_actuel} onChange={(e) => handleChange("stock_actuel", Number(e.target.value))} className="h-10" min="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stock min</Label>
                  <Input type="number" value={form.stock_min} onChange={(e) => handleChange("stock_min", Number(e.target.value))} className="h-10" min="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stock max</Label>
                  <Input type="number" value={form.stock_max} onChange={(e) => handleChange("stock_max", Number(e.target.value))} className="h-10" min="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stock sécurité</Label>
                  <Input type="number" value={form.stock_securite} onChange={(e) => handleChange("stock_securite", Number(e.target.value))} className="h-10" min="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Point commande</Label>
                  <Input type="number" value={form.point_commande} onChange={(e) => handleChange("point_commande", Number(e.target.value))} className="h-10" min="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prix unit. (DA)</Label>
                  <Input type="number" step="0.01" value={form.prix_unitaire} onChange={(e) => handleChange("prix_unitaire", Number(e.target.value))} className="h-10" min="0" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PMP (DA)</Label>
                <Input type="number" step="0.01" value={form.pmp} onChange={(e) => handleChange("pmp", Number(e.target.value))} className="h-10" min="0" />
              </div>
            </CardContent>
          </Card>

          {form.statut_pdr === "strategique" && (
            <Card>
              <CardHeader><CardTitle>Machines ciblées *</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {machines.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={linkedMachines.includes(m.id)}
                        onChange={() => toggleMachine(m.id)}
                        className="rounded border-input"
                      />
                      <span className="font-mono text-xs">{m.code}</span>
                      <span className="text-muted-foreground truncate">{m.designation}</span>
                    </label>
                  ))}
                  {machines.length === 0 && <p className="text-xs text-muted-foreground">Aucune machine</p>}
                </div>
                {linkedMachines.length === 0 && (
                  <p className="text-xs text-destructive mt-2">Au moins une machine obligatoire pour une PDR stratégique</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
