import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Package, Plus, AlertCircle, Download } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/exportCsv";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { useNavigate } from "react-router-dom";
import { CsvImporter } from "@/components/gpao/CsvImporter";
import { Badge } from "@/components/ui/badge";

export default function ArticlesList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreate } = usePermissions();
  const [articles, setArticles] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [entityImages, setEntityImages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [description, setDescription] = useState("");
  const [unite, setUnite] = useState("g");
  const [codeErp, setCodeErp] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [fournisseur, setFournisseur] = useState("");

  const load = async () => {
    const [aRes, imgRes, fRes] = await Promise.all([
      supabase.from("articles").select("*, product_families(name)").eq("is_active", true).order("code"),
      supabase.from("entity_images").select("*").eq("entity_type", "article").eq("is_primary", true),
      supabase.from("product_families").select("*").eq("is_active", true).order("name"),
    ]);
    setArticles(aRes.data || []);
    setEntityImages(imgRes.data || []);
    setFamilies(fRes.data || []);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setCode(""); setDesignation(""); setDescription(""); setUnite("kg");
    setCodeErp(""); setFamilyId(""); setStockMin(""); setPrixUnitaire(""); setFournisseur("");
  };

  const handleCreate = async () => {
    if (!code.trim() || !designation.trim()) {
      toast({ title: "Code et désignation obligatoires", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("articles").insert({
      code: code.trim(),
      designation: designation.trim(),
      description: description.trim() || null,
      unite,
      code_erp: codeErp.trim() || null,
      family_id: familyId || null,
      stock_min: parseFloat(stockMin) || 0,
      prix_unitaire: parseFloat(prixUnitaire) || null,
      fournisseur: fournisseur.trim() || null,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Article créé" });
      setDialogOpen(false);
      resetForm();
      load();
    }
  };

  const filtered = articles.filter((a) => !search || a.code.toLowerCase().includes(search.toLowerCase()) || a.designation.toLowerCase().includes(search.toLowerCase()) || (a as any).code_erp?.toLowerCase().includes(search.toLowerCase()));
  const lowStock = articles.filter((a) => a.stock_actuel <= a.stock_min).length;

  const csvFields = [
    { key: "code", label: "Code", required: true },
    { key: "designation", label: "Désignation", required: true },
    { key: "description", label: "Description" },
    { key: "unite", label: "Unité" },
    { key: "code_erp", label: "Code ERP" },
    { key: "stock_actuel", label: "Stock actuel", type: "number" as const },
    { key: "stock_min", label: "Stock min", type: "number" as const },
    { key: "prix_unitaire", label: "Prix unitaire", type: "number" as const },
    { key: "fournisseur", label: "Fournisseur" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Articles / Matières</h1>
          <p className="text-muted-foreground">
            {articles.length} articles
            {lowStock > 0 && <span className="text-destructive ml-2 inline-flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {lowStock} en stock critique</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(filtered, [
            { key: "code", label: "Code" },
            { key: "designation", label: "Désignation" },
            { key: "stock_actuel", label: "Stock" },
            { key: "stock_min", label: "Stock min" },
            { key: "unite", label: "Unité" },
            { key: "code_erp", label: "Code ERP" },
            { key: "prix_unitaire", label: "Prix unit." },
            { key: "fournisseur", label: "Fournisseur" },
          ], "articles")}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <CsvImporter tableName="articles" fields={csvFields} uniqueKey="code" onComplete={load} />
          {canCreate("articles") && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouvel article</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Code *</Label>
                      <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-12" placeholder="ART-001" />
                    </div>
                    <div className="space-y-2">
                      <Label>Code ERP</Label>
                      <Input value={codeErp} onChange={(e) => setCodeErp(e.target.value)} className="h-12" placeholder="ERP-XXX" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Désignation *</Label>
                    <Input value={designation} onChange={(e) => setDesignation(e.target.value)} className="h-12" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Stock min</Label>
                      <Input type="number" value={stockMin} onChange={(e) => setStockMin(e.target.value)} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Prix unitaire (€)</Label>
                      <Input type="number" value={prixUnitaire} onChange={(e) => setPrixUnitaire(e.target.value)} className="h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fournisseur</Label>
                    <Input value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                  </div>
                  <Button onClick={handleCreate} className="w-full h-12">Créer</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par code, désignation, ERP..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Famille</TableHead>
                <TableHead className="hidden md:table-cell">Code ERP</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Stock min</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="hidden md:table-cell">Prix unit.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucun article</TableCell></TableRow>
              ) : filtered.map((a) => {
                const img = entityImages.find((i: any) => i.entity_id === a.id);
                return (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/gpao/articles/${a.id}`)}>
                  <TableCell className="w-10 pr-0">
                    <EntityThumbnail imageUrl={img?.image_url} alt={a.designation} size="sm" rounded="md" />
                  </TableCell>
                  <TableCell className="font-mono font-medium">{a.code}</TableCell>
                  <TableCell>{a.designation}</TableCell>
                  <TableCell>
                    {(a as any).product_families?.name ? (
                      <Badge variant="outline" className="text-xs">{(a as any).product_families.name}</Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-xs">{(a as any).code_erp || "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    <span className={a.stock_actuel <= a.stock_min ? "text-destructive font-bold" : "text-success font-medium"}>
                      {Number(a.stock_actuel).toLocaleString("fr-FR")}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{Number(a.stock_min).toLocaleString("fr-FR")}</TableCell>
                  <TableCell>{a.unite}</TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">{a.prix_unitaire ? `${a.prix_unitaire} €` : "—"}</TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
