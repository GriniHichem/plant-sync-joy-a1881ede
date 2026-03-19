import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Edit, X, AlertCircle, FileText } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";
import { EntityDocumentManager } from "@/components/documents/EntityDocumentManager";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function PdrDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit, canDelete } = usePermissions();
  const { toast } = useToast();
  const entityImages = useEntityImages("pdr", id);
  const [pdr, setPdr] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    reference: "", designation: "", description: "", fournisseur: "",
    emplacement: "", stock_actuel: 0, stock_min: 0, prix_unitaire: 0,
  });

  useEffect(() => {
    if (!id) return;
    supabase.from("pdr").select("*").eq("id", id).single().then(({ data }) => {
      if (data) {
        setPdr(data);
        setForm({
          reference: data.reference,
          designation: data.designation,
          description: data.description || "",
          fournisseur: data.fournisseur || "",
          emplacement: data.emplacement || "",
          stock_actuel: data.stock_actuel,
          stock_min: data.stock_min,
          prix_unitaire: data.prix_unitaire || 0,
        });
      }
    });
  }, [id]);

  const handleSave = async () => {
    if (!form.reference.trim() || !form.designation.trim()) {
      toast({ title: "Référence et désignation requises", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("pdr").update({
      reference: form.reference.trim(),
      designation: form.designation.trim(),
      description: form.description.trim() || null,
      fournisseur: form.fournisseur.trim() || null,
      emplacement: form.emplacement.trim() || null,
      stock_actuel: Number(form.stock_actuel),
      stock_min: Number(form.stock_min),
      prix_unitaire: Number(form.prix_unitaire) || null,
    }).eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "PDR mise à jour" });
      setEditing(false);
      // Reload
      const { data } = await supabase.from("pdr").select("*").eq("id", id).single();
      if (data) setPdr(data);
    }
  };

  if (!pdr) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const lowStock = pdr.stock_actuel <= pdr.stock_min;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pdr")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{pdr.reference} — {pdr.designation}</h1>
          <div className="flex items-center gap-2 mt-1">
            {lowStock && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertCircle className="h-3 w-3" /> Stock critique
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              Stock: {pdr.stock_actuel} / min {pdr.stock_min}
            </span>
          </div>
        </div>
        {canEdit("pdr") && !editing && (
          <Button variant="outline" onClick={() => setEditing(true)} className="h-12 px-6">
            <Edit className="h-4 w-4 mr-2" /> Modifier
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>
              <X className="h-4 w-4 mr-2" /> Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "..." : "Enregistrer"}
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList className="h-11">
          <TabsTrigger value="info" className="h-9">Informations</TabsTrigger>
          <TabsTrigger value="photos" className="h-9">Photos</TabsTrigger>
          <TabsTrigger value="documents" className="h-9">
            <FileText className="h-3.5 w-3.5 mr-1" /> Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label>Référence *</Label>
                    <Input value={form.reference} onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Désignation *</Label>
                    <Input value={form.designation} onChange={(e) => setForm(f => ({ ...f, designation: e.target.value }))} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock actuel</Label>
                    <Input type="number" value={form.stock_actuel} onChange={(e) => setForm(f => ({ ...f, stock_actuel: Number(e.target.value) }))} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock minimum</Label>
                    <Input type="number" value={form.stock_min} onChange={(e) => setForm(f => ({ ...f, stock_min: Number(e.target.value) }))} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix unitaire</Label>
                    <Input type="number" step="0.01" value={form.prix_unitaire} onChange={(e) => setForm(f => ({ ...f, prix_unitaire: Number(e.target.value) }))} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fournisseur</Label>
                    <Input value={form.fournisseur} onChange={(e) => setForm(f => ({ ...f, fournisseur: e.target.value }))} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Emplacement</Label>
                    <Input value={form.emplacement} onChange={(e) => setForm(f => ({ ...f, emplacement: e.target.value }))} className="h-11" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                </>
              ) : (
                <>
                  {[
                    ["Référence", pdr.reference],
                    ["Désignation", pdr.designation],
                    ["Stock actuel", pdr.stock_actuel],
                    ["Stock minimum", pdr.stock_min],
                    ["Prix unitaire", pdr.prix_unitaire ? `${pdr.prix_unitaire} €` : "—"],
                    ["Fournisseur", pdr.fournisseur || "—"],
                    ["Emplacement", pdr.emplacement || "—"],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium">{String(value)}</p>
                    </div>
                  ))}
                  {pdr.description && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm">{pdr.description}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
            <CardContent>
              <EntityImageUploader
                images={entityImages.images}
                primaryImage={entityImages.primaryImage}
                uploading={entityImages.uploading}
                onUpload={entityImages.uploadImage}
                onDelete={entityImages.deleteImage}
                onSetPrimary={entityImages.setPrimary}
                canEdit={canEdit("pdr")}
                maxSizeMb={entityImages.maxSizeMb}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-6">
              <EntityDocumentManager entityType="pdr" entityId={id!} canEdit={canEdit("pdr")} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
