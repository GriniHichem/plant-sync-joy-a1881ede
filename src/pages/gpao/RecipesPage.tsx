import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, BookOpen, Trash2, Edit, ChevronDown, ChevronRight, Package } from "lucide-react";

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
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [version, setVersion] = useState("1");

  // Line dialog
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [lineRecipeId, setLineRecipeId] = useState("");
  const [lineArticleId, setLineArticleId] = useState("");
  const [lineQte, setLineQte] = useState("");
  const [lineUnite, setLineUnite] = useState("kg");

  // Expanded recipe
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const resetForm = () => { setEditId(null); setName(""); setProductId(""); setVersion("1"); };

  const openEdit = (r: any) => {
    setEditId(r.id);
    setName(r.name);
    setProductId(r.product_id);
    setVersion(String(r.version));
    setDialogOpen(true);
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
      toast({ title: editId ? "Recette modifiée" : "Recette créée" });
      setDialogOpen(false);
      resetForm();
      load();
    }
  };

  const handleToggleActive = async (r: any) => {
    await supabase.from("recipes").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  // ─── Recipe Lines ───
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recettes & Nomenclatures</h1>
          <p className="text-muted-foreground">{recipes.length} recette(s) — composition matières par produit</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Nouvelle recette</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Modifier" : "Nouvelle"} recette</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Ex: Recette standard Produit A" />
                </div>
                <div className="space-y-2">
                  <Label>Produit *</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.designation}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
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
          <DialogHeader><DialogTitle>Ajouter un article à la recette</DialogTitle></DialogHeader>
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

      {/* Recipes list */}
      {recipes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Aucune recette — créez-en une pour définir les nomenclatures matières</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => {
            const lines = getLinesForRecipe(r.id);
            const ofs = getOfsForRecipe(r.id);
            const isExpanded = expandedId === r.id;

            return (
              <Card key={r.id}>
                <CardContent className="p-0">
                  {/* Recipe header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{r.name}</p>
                        <Badge variant="outline" className="text-xs">v{r.version}</Badge>
                        <Badge variant={r.is_active ? "default" : "secondary"} className="text-xs">{r.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.products?.code} — {r.products?.designation}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{lines.length} article(s) · {ofs.length} OF</span>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleToggleActive(r); }}>
                            <Badge variant="outline" className="text-[10px] cursor-pointer">{r.is_active ? "Désactiver" : "Activer"}</Badge>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t">
                      {/* Recipe lines */}
                      <div className="p-4 pb-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Composition</p>
                          {canManage && (
                            <Button variant="outline" size="sm" onClick={() => openAddLine(r.id)}>
                              <Plus className="h-3 w-3 mr-1" /> Article
                            </Button>
                          )}
                        </div>
                        {lines.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">Aucun article — ajoutez les matières premières</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Désignation</TableHead>
                                <TableHead>Quantité</TableHead>
                                <TableHead>Unité</TableHead>
                                {canManage && <TableHead className="w-12" />}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lines.map((l) => (
                                <TableRow key={l.id}>
                                  <TableCell className="font-mono">{l.articles?.code}</TableCell>
                                  <TableCell>{l.articles?.designation}</TableCell>
                                  <TableCell className="tabular-nums font-medium">{l.quantite}</TableCell>
                                  <TableCell>{l.unite}</TableCell>
                                  {canManage && (
                                    <TableCell>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteLine(l.id)}>
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
                        <div className="p-4 pt-2 border-t">
                          <p className="text-sm font-medium mb-2">OF utilisant cette recette</p>
                          <div className="flex flex-wrap gap-2">
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
