import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Upload, Trash2, FileText, Plus, X } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";

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

const IMPACT_OPTIONS = [
  { value: "arret_complet", label: "Arrêt complet" },
  { value: "arret_partiel", label: "Arrêt partiel" },
  { value: "degradation", label: "Dégradation" },
  { value: "aucun", label: "Aucun" },
];

const CRITICITE_MAINT_OPTIONS = [
  { value: "faible", label: "Faible" },
  { value: "moyenne", label: "Moyenne" },
  { value: "elevee", label: "Élevée" },
  { value: "critique", label: "Critique" },
];

const DISPO_PDR_OPTIONS = [
  { value: "disponible", label: "Disponible" },
  { value: "partiel", label: "Partiellement" },
  { value: "indisponible", label: "Indisponible" },
];

const PRIORITY_LABELS: Record<number, string> = { 1: "Principale", 2: "Secondaire", 3: "Tertiaire" };

export default function MachineForm() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [families, setFamilies] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const entityImages = useEntityImages("machine", isNew ? undefined : id);

  // Line assignments: [{line_id, priority}]
  const [lineAssignments, setLineAssignments] = useState<{ line_id: string; priority: number }[]>([]);

  const [form, setForm] = useState({
    code: "",
    designation: "",
    description: "",
    marque: "",
    modele: "",
    numero_serie: "",
    localisation: "",
    criticite: "C" as string,
    statut: "en_marche" as string,
    family_id: "",
    date_mise_en_service: "",
    role_fonctionnel: "autre",
    criticite_maintenance: "moyenne",
    impact_ligne: "aucun",
    disponibilite_pdr: "disponible",
  });

  useEffect(() => {
    Promise.all([
      supabase.from("machine_families").select("*").eq("is_active", true).order("name"),
      supabase.from("production_lines").select("*").eq("is_active", true).order("code"),
    ]).then(([fRes, lRes]) => {
      setFamilies(fRes.data || []);
      setLines(lRes.data || []);
    });

    if (!isNew && id) {
      supabase.from("machines").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setForm({
            code: data.code,
            designation: data.designation,
            description: data.description || "",
            marque: data.marque || "",
            modele: data.modele || "",
            numero_serie: data.numero_serie || "",
            localisation: data.localisation || "",
            criticite: data.criticite,
            statut: data.statut,
            family_id: data.family_id || "",
            date_mise_en_service: data.date_mise_en_service || "",
            role_fonctionnel: (data as any).role_fonctionnel || "autre",
            criticite_maintenance: (data as any).criticite_maintenance || "moyenne",
            impact_ligne: (data as any).impact_ligne || "aucun",
            disponibilite_pdr: (data as any).disponibilite_pdr || "disponible",
          });
        }
      });
      // Load line assignments
      supabase.from("machine_line_assignments").select("*").eq("machine_id", id).order("priority").then(({ data }) => {
        setLineAssignments((data || []).map((d: any) => ({ line_id: d.line_id, priority: d.priority })));
      });
      loadDocuments();
    }
  }, [id]);

  const loadDocuments = async () => {
    if (!id || isNew) return;
    const { data } = await supabase.from("machine_documents").select("*").eq("machine_id", id).order("created_at", { ascending: false });
    setDocuments(data || []);
  };

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.designation.trim()) {
      toast({ title: "Code et désignation obligatoires", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      code: form.code.trim(),
      designation: form.designation.trim(),
      description: form.description.trim() || null,
      marque: form.marque.trim() || null,
      modele: form.modele.trim() || null,
      numero_serie: form.numero_serie.trim() || null,
      localisation: form.localisation.trim() || null,
      criticite: form.criticite,
      statut: form.statut,
      family_id: form.family_id && form.family_id !== "__none__" ? form.family_id : null,
      date_mise_en_service: form.date_mise_en_service || null,
      role_fonctionnel: form.role_fonctionnel,
      criticite_maintenance: form.criticite_maintenance,
      impact_ligne: form.impact_ligne,
      disponibilite_pdr: form.disponibilite_pdr,
    };

    let machineId = id;

    if (isNew) {
      const { data, error } = await supabase.from("machines").insert(payload).select().single();
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      machineId = data.id;
      toast({ title: "Machine créée" });
    } else {
      const { error } = await supabase.from("machines").update(payload).eq("id", id);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Machine mise à jour" });
    }

    // Save line assignments
    if (machineId && machineId !== "new") {
      await supabase.from("machine_line_assignments").delete().eq("machine_id", machineId);
      if (lineAssignments.length > 0) {
        await supabase.from("machine_line_assignments").insert(
          lineAssignments.map((a) => ({ machine_id: machineId!, line_id: a.line_id, priority: a.priority }))
        );
      }
    }

    navigate(isNew ? `/machines/${machineId}` : `/machines/${id}`);
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id || isNew) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const filePath = `${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("machine-documents").upload(filePath, file);
      if (uploadError) {
        toast({ title: "Erreur upload", description: uploadError.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("machine-documents").getPublicUrl(filePath);
      const fileType = file.type.startsWith("image/") ? "image" : "document";
      await supabase.from("machine_documents").insert({
        machine_id: id,
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: fileType,
        uploaded_by: user?.id || null,
      });
    }

    setUploading(false);
    toast({ title: "Fichier(s) uploadé(s)" });
    loadDocuments();
    e.target.value = "";
  };

  const handleDeleteDoc = async (doc: any) => {
    const url = new URL(doc.file_url);
    const pathParts = url.pathname.split("/storage/v1/object/public/machine-documents/");
    if (pathParts[1]) {
      await supabase.storage.from("machine-documents").remove([pathParts[1]]);
    }
    await supabase.from("machine_documents").delete().eq("id", doc.id);
    toast({ title: "Document supprimé" });
    loadDocuments();
  };

  // Line assignment helpers
  const addLineAssignment = () => {
    if (lineAssignments.length >= 3) return;
    const nextPriority = lineAssignments.length + 1;
    setLineAssignments((prev) => [...prev, { line_id: "", priority: nextPriority }]);
  };

  const removeLineAssignment = (idx: number) => {
    setLineAssignments((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      // Re-index priorities
      return updated.map((a, i) => ({ ...a, priority: i + 1 }));
    });
  };

  const updateLineAssignment = (idx: number, lineId: string) => {
    setLineAssignments((prev) => prev.map((a, i) => (i === idx ? { ...a, line_id: lineId } : a)));
  };

  const availableLinesFor = (idx: number) => {
    const usedIds = lineAssignments.filter((_, i) => i !== idx).map((a) => a.line_id);
    return lines.filter((l) => !usedIds.includes(l.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(isNew ? "/machines" : `/machines/${id}`)} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isNew ? "Nouvelle machine" : "Modifier la machine"}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-12 px-6">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {/* Image uploader for existing machines */}
      {!isNew && id && (
        <Card>
          <CardHeader><CardTitle>Photo de la machine</CardTitle></CardHeader>
          <CardContent>
            <EntityImageUploader
              images={entityImages.images}
              primaryImage={entityImages.primaryImage}
              uploading={entityImages.uploading}
              onUpload={entityImages.uploadImage}
              onDelete={entityImages.deleteImage}
              onSetPrimary={entityImages.setPrimary}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main form */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => handleChange("code", e.target.value)} className="h-12" placeholder="EQ-001" />
              </div>
              <div className="space-y-2">
                <Label>Désignation *</Label>
                <Input value={form.designation} onChange={(e) => handleChange("designation", e.target.value)} className="h-12" placeholder="Convoyeur principal" />
              </div>
              <div className="space-y-2">
                <Label>Marque</Label>
                <Input value={form.marque} onChange={(e) => handleChange("marque", e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Modèle</Label>
                <Input value={form.modele} onChange={(e) => handleChange("modele", e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>N° Série</Label>
                <Input value={form.numero_serie} onChange={(e) => handleChange("numero_serie", e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Localisation</Label>
                <Input value={form.localisation} onChange={(e) => handleChange("localisation", e.target.value)} className="h-12" placeholder="Atelier A" />
              </div>
              <div className="space-y-2">
                <Label>Mise en service</Label>
                <Input type="date" value={form.date_mise_en_service} onChange={(e) => handleChange("date_mise_en_service", e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Famille</Label>
                <Select value={form.family_id || "__none__"} onValueChange={(v) => handleChange("family_id", v)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {families.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={3} placeholder="Notes sur la machine..." />
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Statut & Criticité</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={(v) => handleChange("statut", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.machine_statut.map((s) => (
                      <SelectItem key={s} value={s}>{s === "en_marche" ? "En marche" : s === "arret" ? "Arrêt" : "Maintenance"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Criticité</Label>
                <Select value={form.criticite} onValueChange={(v) => handleChange("criticite", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.criticite.map((c) => (
                      <SelectItem key={c} value={c}>{c} — {c === "A" ? "Critique" : c === "B" ? "Important" : "Standard"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance & Process */}
          <Card>
            <CardHeader><CardTitle>Process & Maintenance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Rôle fonctionnel</Label>
                <Select value={form.role_fonctionnel} onValueChange={(v) => handleChange("role_fonctionnel", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Impact sur la ligne</Label>
                <Select value={form.impact_ligne} onValueChange={(v) => handleChange("impact_ligne", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPACT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Criticité maintenance</Label>
                <Select value={form.criticite_maintenance} onValueChange={(v) => handleChange("criticite_maintenance", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CRITICITE_MAINT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Disponibilité PDR</Label>
                <Select value={form.disponibilite_pdr} onValueChange={(v) => handleChange("disponibilite_pdr", v)}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPO_PDR_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Line assignments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lignes de production</CardTitle>
                {lineAssignments.length < 3 && (
                  <Button variant="outline" size="sm" onClick={addLineAssignment}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">Aucune ligne affectée</p>
              ) : lineAssignments.map((a, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Badge variant="outline" className="shrink-0 text-xs">{PRIORITY_LABELS[a.priority]}</Badge>
                  <Select value={a.line_id || "__none__"} onValueChange={(v) => updateLineAssignment(idx, v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-10 flex-1"><SelectValue placeholder="Choisir une ligne" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Choisir —</SelectItem>
                      {availableLinesFor(idx).map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.code} — {l.designation}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeLineAssignment(idx)}>
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documents (only for existing machines) */}
          {!isNew && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents</CardTitle>
                  <label className="cursor-pointer">
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
                    <Button variant="outline" size="sm" asChild disabled={uploading}>
                      <span><Upload className="h-3.5 w-3.5 mr-1" /> {uploading ? "Upload..." : "Ajouter"}</span>
                    </Button>
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun document</p>
                ) : documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 rounded-lg border p-2">
                    {doc.file_type === "image" ? (
                      <img src={doc.file_url} alt={doc.name} className="h-10 w-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <a href={doc.file_url} target="_blank" rel="noopener" className="flex-1 text-sm truncate hover:underline">{doc.name}</a>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDeleteDoc(doc)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
