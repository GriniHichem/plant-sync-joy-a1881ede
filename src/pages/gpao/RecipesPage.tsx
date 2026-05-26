import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, BookOpen, Trash2, Edit, ChevronDown, ChevronRight, Package, Copy, GitBranch, ListOrdered, AlertTriangle, ArchiveIcon, CheckCircle2, FileText, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { useEntityPrimaryImages } from "@/hooks/useEntityPrimaryImages";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";

interface RecipesPageProps {
  readOnly?: boolean;
  hideHeader?: boolean;
}

export default function RecipesPage({ readOnly = false, hideHeader = false }: RecipesPageProps = {}) {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [recipeLines, setRecipeLines] = useState<any[]>([]);
  const [recipeSteps, setRecipeSteps] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [linkedOfs, setLinkedOfs] = useState<any[]>([]);

  // Step dialog
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [stepEditId, setStepEditId] = useState<string | null>(null);
  const [stepRecipeId, setStepRecipeId] = useState("");
  const [stepOrder, setStepOrder] = useState("1");
  const [stepTitle, setStepTitle] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [stepDuration, setStepDuration] = useState("");
  const [stepCcp, setStepCcp] = useState(false);
  const [stepIndicatorId, setStepIndicatorId] = useState<string>("__none__");
  const [stepProcessParam, setStepProcessParam] = useState("");

  // Compare dialog
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareProductId, setCompareProductId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  // Recipe dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [parentProductId, setParentProductId] = useState("");
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [version, setVersion] = useState("1");

  // Line dialog
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [lineRecipeId, setLineRecipeId] = useState("");
  const [lineArticleId, setLineArticleId] = useState("");
  const [lineQte, setLineQte] = useState("");
  const [lineUnite, setLineUnite] = useState("kg");
  const [lineItemType, setLineItemType] = useState<string>("raw_material");
  const [lineWastePercent, setLineWastePercent] = useState("");
  const [lineMandatory, setLineMandatory] = useState(true);
  const [lineQualitySensitive, setLineQualitySensitive] = useState(false);

  // Expanded states
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const canManage = !readOnly && (hasRole("admin") || hasRole("resp_production") || hasRole("responsable_controle_qualite") || hasRole("directeur_qualite"));


  const load = async () => {
    const [rRes, pRes, aRes, rlRes, rsRes, qiRes, ofRes] = await Promise.all([
      supabase.from("recipes").select("*, products(code, designation)").order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("code"),
      supabase.from("articles").select("*").eq("is_active", true).order("code"),
      supabase.from("recipe_lines").select("*, articles(code, designation, unite)").order("created_at"),
      supabase.from("recipe_steps" as any).select("*").order("step_order"),
      supabase.from("quality_indicators").select("id, code, name, indicator_type, unit").eq("is_active", true).order("code"),
      supabase.from("ordres_fabrication").select("id, numero, statut, recipe_id").not("recipe_id", "is", null),
    ]);
    setRecipes(rRes.data || []);
    setProducts(pRes.data || []);
    setArticles(aRes.data || []);
    setRecipeLines(rlRes.data || []);
    setRecipeSteps((rsRes.data as any[]) || []);
    setIndicators(qiRes.data || []);
    setLinkedOfs(ofRes.data || []);
  };

  useEffect(() => { load(); }, []);

  const productIds = products.map((p) => p.id);
  const articleIds = articles.map((a) => a.id);
  const productImageMap = useEntityPrimaryImages("produit", productIds);
  const articleImageMap = useEntityPrimaryImages("article", articleIds);

  // Group recipes by product_id (recette mère = produit)
  const recipesByProduct = useMemo(() => {
    const map: Record<string, { product: any; versions: any[] }> = {};
    recipes.forEach((r) => {
      if (!map[r.product_id]) {
        map[r.product_id] = { product: r.products, versions: [] };
      }
      map[r.product_id].versions.push(r);
    });
    // Sort versions by version number desc
    Object.values(map).forEach((g) => g.versions.sort((a, b) => b.version - a.version));
    return map;
  }, [recipes]);

  const resetForm = () => { setEditId(null); setName(""); setProductId(""); setVersion("1"); setParentProductId(""); };

  const openEdit = (r: any) => {
    setEditId(r.id);
    setName(r.name);
    setProductId(r.product_id);
    setVersion(String(r.version));
    setParentProductId("");
    setDialogOpen(true);
  };

  const openNewVersion = (prodId: string) => {
    const existing = recipesByProduct[prodId]?.versions || [];
    const maxVersion = existing.reduce((m, r) => Math.max(m, r.version), 0);
    const product = existing[0]?.products;
    setEditId(null);
    setProductId(prodId);
    setParentProductId(prodId);
    setVersion(String(maxVersion + 1));
    setName(`${product?.designation || "Recette"} v${maxVersion + 1}`);
    setDialogOpen(true);
  };

  const handleDuplicateVersion = async (recipe: any) => {
    const lines = getLinesForRecipe(recipe.id);
    const existing = recipesByProduct[recipe.product_id]?.versions || [];
    const maxVersion = existing.reduce((m, r) => Math.max(m, r.version), 0);

    const { data: newRecipe, error } = await supabase.from("recipes").insert({
      name: `${recipe.name} (copie v${maxVersion + 1})`,
      product_id: recipe.product_id,
      version: maxVersion + 1,
    }).select().single();

    if (error || !newRecipe) {
      toast({ title: "Erreur", description: error?.message, variant: "destructive" });
      return;
    }

    // Copy recipe lines
    if (lines.length > 0) {
      const newLines = lines.map((l) => ({
        recipe_id: newRecipe.id,
        article_id: l.article_id,
        quantite: l.quantite,
        unite: l.unite,
      }));
      await supabase.from("recipe_lines").insert(newLines);
    }

    toast({ title: `Version ${maxVersion + 1} créée avec ${lines.length} ligne(s) copiée(s)` });
    load();
  };

  const handleSaveRecipe = async () => {
    if (!name.trim() || !productId) {
      toast({ title: "Nom et produit obligatoires", variant: "destructive" });
      return;
    }
    const payload = { name: name.trim(), product_id: productId, version: parseInt(version) || 1 };
    const { error } = editId
      ? await supabase.from("recipes").update(payload).eq("id", editId)
      : await supabase.from("recipes").insert(payload);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Recette modifiée" : "Version créée" });
      setDialogOpen(false);
      resetForm();
      load();
    }
  };

  const handleToggleActive = async (r: any) => {
    await supabase.from("recipes").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  const handleSetStatus = async (recipeId: string, status: "draft" | "active" | "archived") => {
    const reason = window.prompt(`Motif (${status}) :`, "") ?? undefined;
    const { error } = await (supabase as any).rpc("set_recipe_status", {
      p_recipe_id: recipeId,
      p_status: status,
      p_reason: reason || null,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Recette ${status === "active" ? "activée" : status === "archived" ? "archivée" : "remise en brouillon"}` });
      if (status === "active") {
        const r = (recipes as any[]).find((x) => x.id === recipeId);
        try {
          const { notifyRecipeApproved } = await import("@/lib/qualityNotifications");
          await notifyRecipeApproved({ entity_id: recipeId, entity_label: r?.name ?? null, version: r?.version ?? null });
        } catch { /* notifications are best-effort */ }
      }
      load();
    }
  };

  const getStepsForRecipe = (recipeId: string) =>
    recipeSteps.filter((s) => s.recipe_id === recipeId).sort((a, b) => a.step_order - b.step_order);

  const resetStepForm = () => {
    setStepEditId(null); setStepRecipeId(""); setStepOrder("1"); setStepTitle("");
    setStepDescription(""); setStepDuration(""); setStepCcp(false);
    setStepIndicatorId("__none__"); setStepProcessParam("");
  };

  const openAddStep = (recipeId: string) => {
    const existing = getStepsForRecipe(recipeId);
    const nextOrder = existing.reduce((m, s) => Math.max(m, s.step_order), 0) + 1;
    resetStepForm();
    setStepRecipeId(recipeId);
    setStepOrder(String(nextOrder));
    setStepDialogOpen(true);
  };

  const openEditStep = (s: any) => {
    setStepEditId(s.id);
    setStepRecipeId(s.recipe_id);
    setStepOrder(String(s.step_order));
    setStepTitle(s.title || "");
    setStepDescription(s.description || "");
    setStepDuration(s.expected_duration_minutes != null ? String(s.expected_duration_minutes) : "");
    setStepCcp(!!s.critical_control_point);
    setStepIndicatorId(s.quality_indicator_id || "__none__");
    setStepProcessParam(s.process_parameter ? JSON.stringify(s.process_parameter, null, 2) : "");
    setStepDialogOpen(true);
  };

  const handleSaveStep = async () => {
    if (!stepTitle.trim()) {
      toast({ title: "Titre obligatoire", variant: "destructive" });
      return;
    }
    let processParam: any = null;
    if (stepProcessParam.trim()) {
      try { processParam = JSON.parse(stepProcessParam); }
      catch { toast({ title: "Paramètres process: JSON invalide", variant: "destructive" }); return; }
    }
    const payload: any = {
      recipe_id: stepRecipeId,
      step_order: parseInt(stepOrder) || 1,
      title: stepTitle.trim(),
      description: stepDescription.trim() || null,
      expected_duration_minutes: stepDuration ? parseFloat(stepDuration.replace(",", ".")) : null,
      critical_control_point: stepCcp,
      quality_indicator_id: stepIndicatorId === "__none__" ? null : stepIndicatorId,
      process_parameter: processParam,
    };
    const { error } = stepEditId
      ? await (supabase as any).from("recipe_steps").update(payload).eq("id", stepEditId)
      : await (supabase as any).from("recipe_steps").insert(payload);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: stepEditId ? "Étape modifiée" : "Étape ajoutée" });
      setStepDialogOpen(false);
      resetStepForm();
      load();
    }
  };

  const handleDeleteStep = async (id: string) => {
    if (!window.confirm("Supprimer cette étape ?")) return;
    await (supabase as any).from("recipe_steps").delete().eq("id", id);
    toast({ title: "Étape supprimée" });
    load();
  };

  const openCompare = (productId: string) => {
    const versions = recipesByProduct[productId]?.versions || [];
    setCompareProductId(productId);
    setCompareA(versions[0]?.id || "");
    setCompareB(versions[1]?.id || "");
    setCompareOpen(true);
  };

  const openAddLine = (recipeId: string) => {
    setLineRecipeId(recipeId);
    setLineArticleId("");
    setLineQte("");
    setLineUnite("kg");
    setLineItemType("raw_material");
    setLineWastePercent("");
    setLineMandatory(true);
    setLineQualitySensitive(false);
    setLineDialogOpen(true);
  };

  const handleAddLine = async () => {
    if (!lineArticleId || !lineQte) {
      toast({ title: "Article et quantité obligatoires", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("recipe_lines").insert({
      recipe_id: lineRecipeId,
      article_id: lineArticleId,
      quantite: parseFloat(lineQte.replace(",", ".")),
      unite: lineUnite,
      item_type: lineItemType,
      waste_percent: lineWastePercent ? parseFloat(lineWastePercent.replace(",", ".")) : null,
      is_mandatory: lineMandatory,
      is_quality_sensitive: lineQualitySensitive,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ligne ajoutée" });
      setLineDialogOpen(false);
      load();
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    await supabase.from("recipe_lines").delete().eq("id", lineId);
    toast({ title: "Ligne supprimée" });
    load();
  };

  const getLinesForRecipe = (recipeId: string) => recipeLines.filter((l) => l.recipe_id === recipeId);
  const getOfsForRecipe = (recipeId: string) => linkedOfs.filter((o) => o.recipe_id === recipeId);

  const productGroups = Object.entries(recipesByProduct);

  return (
    <div className="space-y-4">
      {readOnly && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4 flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div>
              Cette page est en <span className="font-medium">lecture seule</span>. La création et la modification des recettes, de la composition et des étapes se font dans <Link to="/qualite/recettes-nomenclatures" className="font-medium text-primary underline">Qualité → Recettes & nomenclatures</Link>.
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {!hideHeader ? (
          <div>
            <h1 className="text-2xl font-bold">Recettes & Nomenclatures</h1>
            <p className="text-muted-foreground">{productGroups.length} produit(s) · {recipes.length} version(s) au total</p>
          </div>
        ) : <div />}
        <div className="flex items-center gap-2">
          <ExportCsvButton
            data={recipes}
            columns={[
              { key: "name", label: "Nom" },
              { key: "version", label: "Version" },
              { key: "products.code", label: "Produit code" },
              { key: "products.designation", label: "Produit" },
              { key: "status", label: "Statut" },
              { key: "is_active", label: "Actif", format: (v) => (v ? "Oui" : "Non") },
              { key: "created_at", label: "Créée le" },
            ]}
            filename="recettes"
          />
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Nouvelle recette</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? "Modifier" : parentProductId ? "Nouvelle version" : "Nouvelle recette"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Ex: Harissa épicée v2" />
                  </div>
                  {!parentProductId && (
                    <div className="space-y-2">
                      <Label>Produit *</Label>
                      <Select value={productId} onValueChange={setProductId}>
                        <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.designation}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>N° Version</Label>
                    <Input type="number" value={version} onChange={(e) => setVersion(e.target.value)} className="h-12" min={1} />
                  </div>
                  <Button onClick={handleSaveRecipe} className="w-full h-12">{editId ? "Enregistrer" : "Créer"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>


      {/* Add line dialog (édition composition) */}
      {canManage && (
        <Dialog open={lineDialogOpen} onOpenChange={setLineDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un article</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Article *</Label>
                <Select value={lineArticleId} onValueChange={setLineArticleId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.designation}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantité *</Label>
                  <Input type="number" value={lineQte} onChange={(e) => setLineQte(e.target.value)} className="h-12" placeholder="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label>Unité</Label>
                  <Select value={lineUnite} onValueChange={setLineUnite}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="l">L</SelectItem>
                      <SelectItem value="ml">mL</SelectItem>
                      <SelectItem value="unité">Unité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={lineItemType} onValueChange={setLineItemType}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw_material">Matière première</SelectItem>
                      <SelectItem value="packaging">Emballage</SelectItem>
                      <SelectItem value="label">Étiquette</SelectItem>
                      <SelectItem value="carton">Carton</SelectItem>
                      <SelectItem value="pallet">Palette</SelectItem>
                      <SelectItem value="consumable">Consommable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Perte %</Label>
                  <Input type="number" value={lineWastePercent} onChange={(e) => setLineWastePercent(e.target.value)} className="h-12" placeholder="0" step="0.01" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={lineMandatory} onChange={(e) => setLineMandatory(e.target.checked)} className="h-4 w-4" />
                  Composant obligatoire
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={lineQualitySensitive} onChange={(e) => setLineQualitySensitive(e.target.checked)} className="h-4 w-4" />
                  Qualité sensible (suivi renforcé en contrôle qualité)
                </label>
              </div>
              <Button onClick={handleAddLine} className="w-full h-12">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Recipes grouped by product */}
      {productGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Aucune recette{readOnly ? "" : " — créez-en une pour définir les nomenclatures matières"}</p>
          </CardContent>
        </Card>

      ) : (
        <div className="space-y-3">
          {productGroups.map(([prodId, group]) => {
            const isProductExpanded = expandedProduct === prodId;
            const activeCount = group.versions.filter((v) => v.is_active).length;
            const totalOfs = group.versions.reduce((s, v) => s + getOfsForRecipe(v.id).length, 0);

            return (
              <Card key={prodId}>
                <CardContent className="p-0">
                  {/* Product header (recette mère) */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedProduct(isProductExpanded ? null : prodId)}
                  >
                    {isProductExpanded
                      ? <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />}
                    <EntityThumbnail imageUrl={productImageMap[prodId]} alt={group.product?.designation} size="md" rounded="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{group.product?.code} — {group.product?.designation}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.versions.length} version(s) · {activeCount} active(s) · {totalOfs} OF
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {group.versions.length >= 2 && (
                        <Button variant="outline" size="sm" onClick={() => openCompare(prodId)}>
                          <FileText className="h-3 w-3 mr-1" /> Comparer
                        </Button>
                      )}
                      {canManage && (
                        <Button variant="outline" size="sm" onClick={() => openNewVersion(prodId)}>
                          <GitBranch className="h-3 w-3 mr-1" /> Nouvelle version
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Versions list */}
                  {isProductExpanded && (
                    <div className="border-t">
                      {group.versions.map((r) => {
                        const lines = getLinesForRecipe(r.id);
                        const ofs = getOfsForRecipe(r.id);
                        const isVersionExpanded = expandedVersion === r.id;

                        return (
                          <div key={r.id} className="border-b last:border-b-0">
                            {/* Version header */}
                            <div
                              className="flex items-center gap-3 px-4 py-3 pl-12 cursor-pointer hover:bg-muted/20 transition-colors"
                              onClick={() => setExpandedVersion(isVersionExpanded ? null : r.id)}
                            >
                              {isVersionExpanded
                                ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium">{r.name}</p>
                                  <Badge variant="outline" className="text-[10px]">v{r.version}</Badge>
                                  {(() => {
                                    const status = (r.status as string) || (r.is_active ? "active" : "archived");
                                    const variant = status === "active" ? "default" : status === "draft" ? "outline" : "secondary";
                                    const label = status === "active" ? "Active" : status === "draft" ? "Brouillon" : "Archivée";
                                    return <Badge variant={variant} className="text-[10px]">{label}</Badge>;
                                  })()}
                                  {r.approved_at && (
                                    <span className="text-[10px] text-muted-foreground">
                                      Approuvée {new Date(r.approved_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                <span>{lines.length} art. · {getStepsForRecipe(r.id).length} ét. · {ofs.length} OF</span>
                                {canManage && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Dupliquer" onClick={() => handleDuplicateVersion(r)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Modifier" onClick={() => openEdit(r)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    {(r.status || (r.is_active ? "active" : "archived")) !== "active" && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Activer" onClick={() => handleSetStatus(r.id, "active")}>
                                        <CheckCircle2 className="h-3 w-3 text-primary" />
                                      </Button>
                                    )}
                                    {(r.status || (r.is_active ? "active" : "archived")) !== "archived" && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Archiver" onClick={() => handleSetStatus(r.id, "archived")}>
                                        <ArchiveIcon className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Version expanded: composition + steps + OFs */}
                            {isVersionExpanded && (
                              <div className="pl-16 pr-4 pb-4 space-y-3">
                                {/* Composition */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                                      <Package className="h-3 w-3" /> Composition (par kg produit fini){readOnly ? " — lecture seule" : ""}
                                    </p>
                                    {canManage ? (
                                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddLine(r.id)}>
                                        <Plus className="h-3 w-3 mr-1" /> Article
                                      </Button>
                                    ) : readOnly ? (
                                      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                        <Link to="/qualite/recettes-nomenclatures">
                                          <Edit className="h-3 w-3 mr-1" /> Modifier dans Qualité
                                        </Link>
                                      </Button>
                                    ) : null}
                                  </div>
                                  {lines.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-3 text-center bg-muted/30 rounded-lg">Aucun article — à ajouter dans Qualité → Recettes & nomenclatures</p>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-10"></TableHead>
                                          <TableHead>Code</TableHead>
                                          <TableHead>Désignation</TableHead>
                                          <TableHead>Quantité</TableHead>
                                          <TableHead>Unité</TableHead>
                                          {canManage && <TableHead className="w-10" />}
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {lines.map((l) => (
                                          <TableRow key={l.id}>
                                             <TableCell className="w-10">
                                               <EntityThumbnail imageUrl={articleImageMap[l.article_id]} alt={l.articles?.designation} size="sm" rounded="md" />
                                             </TableCell>
                                             <TableCell className="font-mono text-xs">{l.articles?.code}</TableCell>
                                             <TableCell className="text-sm">{l.articles?.designation}</TableCell>
                                            <TableCell className="tabular-nums font-medium">{l.quantite}</TableCell>
                                            <TableCell className="text-sm">{l.unite}</TableCell>
                                            {canManage && (
                                              <TableCell>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteLine(l.id)}>
                                                  <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                              </TableCell>
                                            )}
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                </div>


                                {/* Steps (process & CCP) */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                                      <ListOrdered className="h-3 w-3" /> Étapes & paramètres process
                                    </p>
                                    {canManage && (
                                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddStep(r.id)}>
                                        <Plus className="h-3 w-3 mr-1" /> Étape
                                      </Button>
                                    )}
                                  </div>
                                  {getStepsForRecipe(r.id).length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-3 text-center bg-muted/30 rounded-lg">Aucune étape définie</p>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-12">#</TableHead>
                                          <TableHead>Titre</TableHead>
                                          <TableHead>Durée (min)</TableHead>
                                          <TableHead>CCP</TableHead>
                                          <TableHead>Indicateur qualité</TableHead>
                                          {canManage && <TableHead className="w-16" />}
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {getStepsForRecipe(r.id).map((s) => {
                                          const ind = indicators.find((i) => i.id === s.quality_indicator_id);
                                          return (
                                            <TableRow key={s.id}>
                                              <TableCell className="tabular-nums">{s.step_order}</TableCell>
                                              <TableCell className="text-sm">
                                                <div className="font-medium">{s.title}</div>
                                                {s.description && <div className="text-xs text-muted-foreground line-clamp-1">{s.description}</div>}
                                              </TableCell>
                                              <TableCell className="tabular-nums">{s.expected_duration_minutes ?? "—"}</TableCell>
                                              <TableCell>
                                                {s.critical_control_point ? (
                                                  <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-3 w-3" />CCP</Badge>
                                                ) : <span className="text-xs text-muted-foreground">—</span>}
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                {ind ? `${ind.code} — ${ind.name}` : <span className="text-muted-foreground">—</span>}
                                              </TableCell>
                                              {canManage && (
                                                <TableCell>
                                                  <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditStep(s)}>
                                                      <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteStep(s.id)}>
                                                      <Trash2 className="h-3 w-3 text-destructive" />
                                                    </Button>
                                                  </div>
                                                </TableCell>
                                              )}
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  )}
                                </div>

                                {/* Linked OFs */}
                                {ofs.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">OF utilisant cette version</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {ofs.map((of) => (
                                        <Badge key={of.id} variant="outline" className="text-xs">
                                          {of.numero} <span className="ml-1 capitalize text-muted-foreground">{of.statut}</span>
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Step dialog */}
      <Dialog open={stepDialogOpen} onOpenChange={(o) => { setStepDialogOpen(o); if (!o) resetStepForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{stepEditId ? "Modifier l'étape" : "Nouvelle étape"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ordre *</Label>
                <Input type="number" min={1} value={stepOrder} onChange={(e) => setStepOrder(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Durée (min)</Label>
                <Input value={stepDuration} onChange={(e) => setStepDuration(e.target.value)} className="h-12" placeholder="ex: 15" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} className="h-12" placeholder="Ex: Cuisson 85°C" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={stepDescription} onChange={(e) => setStepDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Paramètres process (JSON)</Label>
              <Textarea
                value={stepProcessParam}
                onChange={(e) => setStepProcessParam(e.target.value)}
                rows={3}
                placeholder={'{"temp_c": 85, "pressure_bar": 2.5}'}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="ccp"
                type="checkbox"
                checked={stepCcp}
                onChange={(e) => setStepCcp(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="ccp" className="cursor-pointer">Point de contrôle critique (CCP)</Label>
            </div>
            <div className="space-y-2">
              <Label>Indicateur qualité (optionnel)</Label>
              <Select value={stepIndicatorId} onValueChange={setStepIndicatorId}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {indicators.map((i) => <SelectItem key={i.id} value={i.id}>{i.code} — {i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveStep} className="w-full h-12">{stepEditId ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare versions dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Comparer deux versions</DialogTitle></DialogHeader>
          {compareProductId && (() => {
            const versions = recipesByProduct[compareProductId]?.versions || [];
            const ra = versions.find((v) => v.id === compareA);
            const rb = versions.find((v) => v.id === compareB);
            const linesA = ra ? getLinesForRecipe(ra.id) : [];
            const linesB = rb ? getLinesForRecipe(rb.id) : [];
            const stepsA = ra ? getStepsForRecipe(ra.id) : [];
            const stepsB = rb ? getStepsForRecipe(rb.id) : [];
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Select value={compareA} onValueChange={setCompareA}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Version A" /></SelectTrigger>
                    <SelectContent>{versions.map((v) => <SelectItem key={v.id} value={v.id}>v{v.version} — {v.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={compareB} onValueChange={setCompareB}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Version B" /></SelectTrigger>
                    <SelectContent>{versions.map((v) => <SelectItem key={v.id} value={v.id}>v{v.version} — {v.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                  {[{ r: ra, lines: linesA, steps: stepsA }, { r: rb, lines: linesB, steps: stepsB }].map((side, i) => (
                    <div key={i} className="space-y-3">
                      <div className="text-sm font-semibold">{side.r ? `v${side.r.version} — ${side.r.name}` : "—"}</div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground mb-1">Articles</p>
                        {side.lines.length === 0 ? <p className="text-xs text-muted-foreground">Aucun</p> :
                          side.lines.map((l: any) => <div key={l.id} className="text-xs">{l.articles?.code} — {l.quantite} {l.unite}</div>)}
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground mb-1">Étapes</p>
                        {side.steps.length === 0 ? <p className="text-xs text-muted-foreground">Aucune</p> :
                          side.steps.map((s: any) => (
                            <div key={s.id} className="text-xs">
                              {s.step_order}. {s.title} {s.critical_control_point && <Badge variant="destructive" className="ml-1 text-[9px]">CCP</Badge>}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
