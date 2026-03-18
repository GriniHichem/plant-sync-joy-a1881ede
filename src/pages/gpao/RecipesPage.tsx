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
import { Plus, BookOpen, Trash2, Edit, ChevronDown, ChevronRight, Package, Copy, GitBranch } from "lucide-react";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { useEntityPrimaryImages } from "@/hooks/useEntityPrimaryImages";

export default function RecipesPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [recipeLines, setRecipeLines] = useState<any[]>([]);
  const [linkedOfs, setLinkedOfs] = useState<any[]>([]);

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

  // Expanded states
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const canManage = hasRole("admin") || hasRole("resp_production");

  const load = async () => {
    const [rRes, pRes, aRes, rlRes, ofRes] = await Promise.all([
      supabase.from("recipes").select("*, products(code, designation)").order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("code"),
      supabase.from("articles").select("*").eq("is_active", true).order("code"),
      supabase.from("recipe_lines").select("*, articles(code, designation, unite)").order("created_at"),
      supabase.from("ordres_fabrication").select("id, numero, statut, recipe_id").not("recipe_id", "is", null),
    ]);
    setRecipes(rRes.data || []);
    setProducts(pRes.data || []);
    setArticles(aRes.data || []);
    setRecipeLines(rlRes.data || []);
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

  const openAddLine = (recipeId: string) => {
    setLineRecipeId(recipeId);
    setLineArticleId("");
    setLineQte("");
    setLineUnite("kg");
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
      quantite: parseFloat(lineQte),
      unite: lineUnite,
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recettes & Nomenclatures</h1>
          <p className="text-muted-foreground">{productGroups.length} produit(s) · {recipes.length} version(s) au total</p>
        </div>
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

      {/* Add line dialog */}
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
            <Button onClick={handleAddLine} className="w-full h-12">Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipes grouped by product */}
      {productGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Aucune recette — créez-en une pour définir les nomenclatures matières</p>
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
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => openNewVersion(prodId)}>
                          <GitBranch className="h-3 w-3 mr-1" /> Nouvelle version
                        </Button>
                      </div>
                    )}
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
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{r.name}</p>
                                  <Badge variant="outline" className="text-[10px]">v{r.version}</Badge>
                                  <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">
                                    {r.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                <span>{lines.length} art. · {ofs.length} OF</span>
                                {canManage && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Dupliquer" onClick={() => handleDuplicateVersion(r)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(r)}>
                                      <Badge variant="outline" className="text-[9px] cursor-pointer px-1">{r.is_active ? "Off" : "On"}</Badge>
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Version expanded: composition + OFs */}
                            {isVersionExpanded && (
                              <div className="pl-16 pr-4 pb-4 space-y-3">
                                {/* Composition */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                                      <Package className="h-3 w-3" /> Composition (par kg produit fini)
                                    </p>
                                    {canManage && (
                                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddLine(r.id)}>
                                        <Plus className="h-3 w-3 mr-1" /> Article
                                      </Button>
                                    )}
                                  </div>
                                  {lines.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-3 text-center bg-muted/30 rounded-lg">Aucun article — ajoutez les matières premières</p>
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
    </div>
  );
}
