import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { PackagingConfig } from "@/components/gpao/PackagingConfig";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { EntityDocumentManager } from "@/components/documents/EntityDocumentManager";
import { usePermissions } from "@/hooks/usePermissions";

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack("/gpao/articles");
  const { toast } = useToast();
  const [article, setArticle] = useState<any>(null);
  const [families, setFamilies] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const entityImages = useEntityImages("article", id);
  const { canDelete } = usePermissions();

  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [description, setDescription] = useState("");
  const [unite, setUnite] = useState("kg");
  const [codeErp, setCodeErp] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [stockActuel, setStockActuel] = useState(0);
  const [stockMin, setStockMin] = useState(0);
  const [prixUnitaire, setPrixUnitaire] = useState(0);
  const [fournisseur, setFournisseur] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [aRes, fRes] = await Promise.all([
        supabase.from("articles").select("*").eq("id", id).single(),
        supabase.from("product_families").select("*").eq("is_active", true).order("name"),
      ]);
      if (aRes.data) {
        const a = aRes.data as any;
        setArticle(a);
        setCode(a.code);
        setDesignation(a.designation);
        setDescription(a.description || "");
        setUnite(a.unite);
        setCodeErp(a.code_erp || "");
        setFamilyId(a.family_id || "");
        setStockActuel(Number(a.stock_actuel) || 0);
        setStockMin(Number(a.stock_min) || 0);
        setPrixUnitaire(Number(a.prix_unitaire) || 0);
        setFournisseur(a.fournisseur || "");
      }
      setFamilies(fRes.data || []);
    };
    load();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("articles").update({
      code: code.trim(),
      designation: designation.trim(),
      description: description.trim() || null,
      unite,
      code_erp: codeErp.trim() || null,
      family_id: familyId || null,
      stock_actuel: stockActuel,
      stock_min: stockMin,
      prix_unitaire: prixUnitaire || null,
      fournisseur: fournisseur.trim() || null,
    } as any).eq("id", id!);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Article mis à jour" });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const [rlRes, cRes] = await Promise.all([
      supabase.from("recipe_lines").select("id", { count: "exact", head: true }).eq("article_id", id!),
      supabase.from("consumptions").select("id", { count: "exact", head: true }).eq("article_id", id!),
    ]);
    const deps: string[] = [];
    if ((rlRes.count ?? 0) > 0) deps.push(`${rlRes.count} recette(s)`);
    if ((cRes.count ?? 0) > 0) deps.push(`${cRes.count} consommation(s)`);

    if (deps.length > 0) {
      toast({ title: "Suppression impossible", description: `Cet article est utilisé dans : ${deps.join(", ")}`, variant: "destructive" });
      setDeleting(false);
      setShowDeleteDialog(false);
      return;
    }

    const { error } = await supabase.from("articles").delete().eq("id", id!);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Article supprimé" });
      navigate("/gpao/articles");
    }
    setDeleting(false);
    setShowDeleteDialog(false);
  };

  if (!article) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {entityImages.primaryImage && (
          <EntityThumbnail imageUrl={entityImages.primaryImage.image_url} alt={article.designation} size="lg" rounded="lg" enableLightbox />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{article.designation}</h1>
          <p className="text-muted-foreground font-mono">{article.code}</p>
        </div>
        {canDelete("articles") && (
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer définitivement « {article.designation} » ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? "Vérification..." : "Supprimer"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList className="h-11">
          <TabsTrigger value="info" className="h-9">Informations</TabsTrigger>
          <TabsTrigger value="packaging" className="h-9">Conditionnement</TabsTrigger>
          <TabsTrigger value="images" className="h-9">Images</TabsTrigger>
          <TabsTrigger value="documents" className="h-9">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Code ERP</Label>
                  <Input value={codeErp} onChange={(e) => setCodeErp(e.target.value)} className="h-12" placeholder="Code système externe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Désignation *</Label>
                <Input value={designation} onChange={(e) => setDesignation(e.target.value)} className="h-12" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unité</Label>
                  <Input value={unite} onChange={(e) => setUnite(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Famille</Label>
                  <Select value={familyId || "__none__"} onValueChange={(v) => setFamilyId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune</SelectItem>
                      {families.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Stock actuel</Label>
                  <Input type="number" value={stockActuel} onChange={(e) => setStockActuel(Number(e.target.value))} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Stock min</Label>
                  <Input type="number" value={stockMin} onChange={(e) => setStockMin(Number(e.target.value))} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Prix unitaire (DA)</Label>
                  <Input type="number" value={prixUnitaire} onChange={(e) => setPrixUnitaire(Number(e.target.value))} className="h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Input value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <Button onClick={handleSave} disabled={saving} className="h-12">
                <Save className="h-4 w-4 mr-2" /> {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packaging">
          <PackagingConfig entityType="article" entityId={id!} poidsUnitaire={0} uniteBase={unite} />
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardContent className="p-6">
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
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-6">
              <EntityDocumentManager entityType="article" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
