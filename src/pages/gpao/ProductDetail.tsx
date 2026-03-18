import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Package, Factory } from "lucide-react";
import { PackagingConfig } from "@/components/gpao/PackagingConfig";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [families, setFamilies] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [lineProducts, setLineProducts] = useState<any[]>([]);
  const [allLines, setAllLines] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const entityImages = useEntityImages("produit", id);
  // Form
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [description, setDescription] = useState("");
  const [unite, setUnite] = useState("g");
  const [uniteBase, setUniteBase] = useState("g");
  const [codeErp, setCodeErp] = useState("");
  const [poidsUnitaire, setPoidsUnitaire] = useState(0);
  const [familyId, setFamilyId] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [pRes, fRes, lpRes, lRes] = await Promise.all([
        supabase.from("products").select("*").eq("id", id).single(),
        supabase.from("product_families").select("*").eq("is_active", true).order("name"),
        supabase.from("line_products").select("*, production_lines(code, designation)").eq("product_id", id),
        supabase.from("production_lines").select("*").eq("is_active", true).order("code"),
      ]);
      if (pRes.data) {
        const p = pRes.data as any;
        setProduct(p);
        setCode(p.code);
        setDesignation(p.designation);
        setDescription(p.description || "");
        setUnite(p.unite);
        setUniteBase(p.unite_base || "kg");
        setCodeErp(p.code_erp || "");
        setPoidsUnitaire(Number(p.poids_unitaire) || 0);
        setFamilyId(p.family_id || "");
      }
      setFamilies(fRes.data || []);
      setLineProducts(lpRes.data || []);
      setAllLines(lRes.data || []);
    };
    load();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("products").update({
      code: code.trim(),
      designation: designation.trim(),
      description: description.trim() || null,
      unite,
      unite_base: uniteBase,
      code_erp: codeErp.trim() || null,
      poids_unitaire: poidsUnitaire,
      family_id: familyId || null,
    } as any).eq("id", id!);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produit mis à jour" });
    }
    setSaving(false);
  };

  const toggleLine = async (lineId: string) => {
    const existing = lineProducts.find((lp: any) => lp.line_id === lineId);
    if (existing) {
      await supabase.from("line_products").delete().eq("id", existing.id);
    } else {
      await supabase.from("line_products").insert({ line_id: lineId, product_id: id } as any);
    }
    const { data } = await supabase.from("line_products").select("*, production_lines(code, designation)").eq("product_id", id!);
    setLineProducts(data || []);
  };

  if (!product) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/gpao/produits")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {entityImages.primaryImage && (
          <EntityThumbnail imageUrl={entityImages.primaryImage.image_url} alt={product.designation} size="lg" rounded="lg" enableLightbox />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{product.designation}</h1>
          <p className="text-muted-foreground font-mono">{product.code}</p>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="h-11">
          <TabsTrigger value="info" className="h-9">Informations</TabsTrigger>
          <TabsTrigger value="packaging" className="h-9">Conditionnement</TabsTrigger>
          <TabsTrigger value="lines" className="h-9">Lignes autorisées</TabsTrigger>
          <TabsTrigger value="images" className="h-9">Images</TabsTrigger>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Unité</Label>
                  <Input value={unite} onChange={(e) => setUnite(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Unité de base</Label>
                  <Input value={uniteBase} onChange={(e) => setUniteBase(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Poids unitaire ({uniteBase})</Label>
                  <Input value={String(poidsUnitaire).replace(".", ",")} onChange={(e) => { const v = e.target.value; if (/^[0-9]*[,.]?[0-9]{0,4}$/.test(v) || v === "") setPoidsUnitaire(Number(v.replace(",", "."))); }} className="h-12" inputMode="decimal" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Famille produit</Label>
                <Select value={familyId || "__none__"} onValueChange={(v) => setFamilyId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {families.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
          <PackagingConfig entityType="product" entityId={id!} poidsUnitaire={poidsUnitaire} uniteBase={uniteBase} />
        </TabsContent>

        <TabsContent value="lines">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="h-4 w-4 text-primary" />
                Lignes de production autorisées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Sélectionnez les lignes autorisées pour ce produit. Les OF ne proposeront que les produits autorisés par la ligne choisie.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {allLines.map((l) => {
                  const isLinked = lineProducts.some((lp: any) => lp.line_id === l.id);
                  return (
                    <div
                      key={l.id}
                      onClick={() => toggleLine(l.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isLinked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{l.code}</p>
                      <p className="text-xs text-muted-foreground">{l.designation}</p>
                      {isLinked && <Badge className="mt-1 text-[10px]">Autorisé</Badge>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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
      </Tabs>
    </div>
  );
}
