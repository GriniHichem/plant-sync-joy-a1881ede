import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";

const TYPE_OPTIONS = [
  { value: "capteur", label: "Capteur" },
  { value: "actionneur", label: "Actionneur" },
  { value: "convoyeur", label: "Convoyeur" },
  { value: "peripherique", label: "Périphérique" },
  { value: "utilite", label: "Utilité" },
  { value: "sous_ensemble", label: "Sous-ensemble" },
  { value: "instrument", label: "Instrument" },
  { value: "autre", label: "Autre" },
];
const STATUT_OPTIONS = [
  { value: "en_service", label: "En service" },
  { value: "hors_service", label: "Hors service" },
  { value: "en_maintenance", label: "En maintenance" },
  { value: "reforme", label: "Réformé" },
];
const CRITICITE_OPTIONS = [
  { value: "A", label: "A — Critique" },
  { value: "B", label: "B — Important" },
  { value: "C", label: "C — Standard" },
];
const CRIT_MAINT_OPTIONS = [
  { value: "faible", label: "Faible" },
  { value: "moyenne", label: "Moyenne" },
  { value: "elevee", label: "Élevée" },
  { value: "critique", label: "Critique" },
];
const ROLE_OPTIONS = [
  { value: "alimentation", label: "Alimentation" },
  { value: "transformation", label: "Transformation" },
  { value: "dosage", label: "Dosage" },
  { value: "melange", label: "Mélange" },
  { value: "convoyage", label: "Convoyage" },
  { value: "conditionnement", label: "Conditionnement" },
  { value: "controle", label: "Contrôle" },
  { value: "evacuation", label: "Évacuation" },
  { value: "utilite", label: "Utilité" },
  { value: "autre", label: "Autre" },
];

interface FormState {
  code: string;
  designation: string;
  description: string;
  type: string;
  statut: string;
  family_id: string;
  machine_id: string;
  line_id: string;
  marque: string;
  modele: string;
  numero_serie: string;
  localisation: string;
  date_mise_en_service: string;
  criticite: string;
  criticite_maintenance: string;
  role_fonctionnel: string;
}

const INITIAL: FormState = {
  code: "", designation: "", description: "", type: "autre", statut: "en_service",
  family_id: "__none__", machine_id: "__none__", line_id: "__none__",
  marque: "", modele: "", numero_serie: "", localisation: "",
  date_mise_en_service: "", criticite: "C", criticite_maintenance: "moyenne",
  role_fonctionnel: "autre",
};

export default function EquipmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack(id ? `/equipements/${id}` : "/equipements");
  const { toast } = useToast();
  const isEdit = !!id;
  const entityImages = useEntityImages("equipement", isEdit ? id : undefined);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [families, setFamilies] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [fRes, mRes, lRes] = await Promise.all([
        supabase.from("machine_families").select("id, name, parent_id").eq("is_active", true).order("name"),
        supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code"),
        supabase.from("production_lines").select("id, code, designation").eq("is_active", true).order("code"),
      ]);
      setFamilies(fRes.data || []);
      setMachines(mRes.data || []);
      setLines(lRes.data || []);

      if (id) {
        const { data } = await supabase.from("equipements").select("*").eq("id", id).single();
        if (data) {
          setForm({
            code: data.code,
            designation: data.designation,
            description: data.description || "",
            type: data.type,
            statut: data.statut,
            family_id: data.family_id || "__none__",
            machine_id: data.machine_id || "__none__",
            line_id: data.line_id || "__none__",
            marque: data.marque || "",
            modele: data.modele || "",
            numero_serie: data.numero_serie || "",
            localisation: data.localisation || "",
            date_mise_en_service: data.date_mise_en_service || "",
            criticite: data.criticite,
            criticite_maintenance: data.criticite_maintenance || "moyenne",
            role_fonctionnel: data.role_fonctionnel || "autre",
          });
        }
      }
    };
    load();
  }, [id]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const setSelect = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.code.trim() || !form.designation.trim()) {
      toast({ title: "Code et désignation requis", variant: "destructive" });
      return;
    }
    if (form.machine_id === "__none__" && form.line_id === "__none__") {
      toast({ title: "Rattachement requis", description: "Un équipement doit être rattaché à une machine ou à une ligne de production.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim(),
      designation: form.designation.trim(),
      description: form.description.trim() || null,
      type: form.type as any,
      statut: form.statut as any,
      family_id: form.family_id !== "__none__" ? form.family_id : null,
      machine_id: form.machine_id !== "__none__" ? form.machine_id : null,
      line_id: form.line_id !== "__none__" ? form.line_id : null,
      marque: form.marque.trim() || null,
      modele: form.modele.trim() || null,
      numero_serie: form.numero_serie.trim() || null,
      localisation: form.localisation.trim() || null,
      date_mise_en_service: form.date_mise_en_service || null,
      criticite: form.criticite as any,
      criticite_maintenance: form.criticite_maintenance as any,
      role_fonctionnel: form.role_fonctionnel as any,
    };

    const { error } = isEdit
      ? await supabase.from("equipements").update(payload).eq("id", id)
      : await supabase.from("equipements").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEdit ? "Équipement modifié" : "Équipement créé" });
      navigate("/equipements");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? "Modifier" : "Nouvel"} équipement</h1>
      </div>

      {isEdit && id && (
        <Card className="max-w-md">
          <CardHeader><CardTitle className="text-base">Photo de l'équipement</CardTitle></CardHeader>
          <CardContent>
            <EntityImageUploader
              images={entityImages.images}
              primaryImage={entityImages.primaryImage}
              uploading={entityImages.uploading}
              onUpload={entityImages.uploadImage}
              onDelete={entityImages.deleteImage}
              onSetPrimary={entityImages.setPrimary}
              maxSizeMb={entityImages.maxSizeMb}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Identification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={form.code} onChange={set("code")} placeholder="EQ-001" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Désignation *</Label>
                <Input value={form.designation} onChange={set("designation")} placeholder="Capteur de niveau" className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={setSelect("type")}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={setSelect("statut")}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Marque</Label>
                <Input value={form.marque} onChange={set("marque")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Modèle</Label>
                <Input value={form.modele} onChange={set("modele")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>N° série</Label>
                <Input value={form.numero_serie} onChange={set("numero_serie")} className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Localisation</Label>
                <Input value={form.localisation} onChange={set("localisation")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Mise en service</Label>
                <Input type="date" value={form.date_mise_en_service} onChange={set("date_mise_en_service")} className="h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={set("description")} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Classification & Rattachement</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Famille</Label>
                <Select value={form.family_id} onValueChange={setSelect("family_id")}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {families.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rôle fonctionnel</Label>
                <Select value={form.role_fonctionnel} onValueChange={setSelect("role_fonctionnel")}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Machine parente</Label>
              <Select value={form.machine_id} onValueChange={setSelect("machine_id")}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune</SelectItem>
                  {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ligne de production</Label>
              <Select value={form.line_id} onValueChange={setSelect("line_id")}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune</SelectItem>
                  {lines.map((l) => <SelectItem key={l.id} value={l.id}>{l.code} — {l.designation}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Criticité</Label>
                <Select value={form.criticite} onValueChange={setSelect("criticite")}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CRITICITE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Criticité maintenance</Label>
                <Select value={form.criticite_maintenance} onValueChange={setSelect("criticite_maintenance")}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CRIT_MAINT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full h-12 mt-4">
              <Save className="h-4 w-4 mr-2" /> {saving ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer l'équipement"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
