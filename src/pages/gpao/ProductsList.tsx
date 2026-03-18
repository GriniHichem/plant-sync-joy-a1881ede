import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Package, Plus, Download } from "lucide-react";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/exportCsv";
import { CsvImporter } from "@/components/gpao/CsvImporter";
import { Badge } from "@/components/ui/badge";

export default function ProductsList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreate } = usePermissions();
  const [products, setProducts] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [entityImages, setEntityImages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [description, setDescription] = useState("");
  const [unite, setUnite] = useState("g");
  const [uniteBase, setUniteBase] = useState("g");
  const [codeErp, setCodeErp] = useState("");
  const [poidsUnitaire, setPoidsUnitaire] = useState("");
  const [familyId, setFamilyId] = useState("");

  const load = async () => {
    const [pRes, imgRes, fRes] = await Promise.all([
      supabase.from("products").select("*, product_families(name)").eq("is_active", true).order("code"),
      supabase.from("entity_images").select("*").eq("entity_type", "produit").eq("is_primary", true),
      supabase.from("product_families").select("*").eq("is_active", true).order("name"),
    ]);
    setProducts(pRes.data || []);
    setEntityImages(imgRes.data || []);
    setFamilies(fRes.data || []);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setCode(""); setDesignation(""); setDescription(""); setUnite("kg"); setUniteBase("kg");
    setCodeErp(""); setPoidsUnitaire(""); setFamilyId("");
  };

  const handleCreate = async () => {
    if (!code.trim() || !designation.trim()) {
      toast({ title: "Code et désignation obligatoires", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("products").insert({
      code: code.trim(),
      designation: designation.trim(),
      description: description.trim() || null,
      unite,
      unite_base: uniteBase,
      code_erp: codeErp.trim() || null,
      poids_unitaire: parseFloat(poidsUnitaire) || 0,
      family_id: familyId || null,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produit créé" });
      setDialogOpen(false);
      resetForm();
      load();
    }
  };

  const filtered = products.filter((p) => !search || p.code.toLowerCase().includes(search.toLowerCase()) || p.designation.toLowerCase().includes(search.toLowerCase()) || (p as any).code_erp?.toLowerCase().includes(search.toLowerCase()));

  const csvFields = [
    { key: "code", label: "Code", required: true },
    { key: "designation", label: "Désignation", required: true },
    { key: "description", label: "Description" },
    { key: "unite", label: "Unité" },
    { key: "unite_base", label: "Unité de base" },
    { key: "code_erp", label: "Code ERP" },
    { key: "poids_unitaire", label: "Poids unitaire", type: "number" as const },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produits finis</h1>
          <p className="text-muted-foreground">{products.length} produits</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(filtered, [
            { key: "code", label: "Code" },
            { key: "designation", label: "Désignation" },
            { key: "unite", label: "Unité" },
            { key: "code_erp", label: "Code ERP" },
            { key: "poids_unitaire", label: "Poids unit." },
            { key: "product_families.name", label: "Famille" },
          ], "produits")}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <CsvImporter tableName="products" fields={csvFields} uniqueKey="code" onComplete={load} />
          {canCreate("produits") && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouveau produit</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Code *</Label>
                      <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-12" placeholder="PRD-001" />
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
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Unité</Label>
                      <Input value={unite} onChange={(e) => setUnite(e.target.value)} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Unité base</Label>
                      <Input value={uniteBase} onChange={(e) => setUniteBase(e.target.value)} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Poids unit.</Label>
                      <Input type="number" value={poidsUnitaire} onChange={(e) => setPoidsUnitaire(e.target.value)} className="h-12" placeholder="0" />
                    </div>
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
                <TableHead>Unité</TableHead>
                <TableHead className="hidden md:table-cell">Poids unit.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucun produit</TableCell></TableRow>
              ) : filtered.map((p) => {
                const img = entityImages.find((i: any) => i.entity_id === p.id);
                return (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/gpao/produits/${p.id}`)}>
                  <TableCell className="w-10 pr-0">
                    <EntityThumbnail imageUrl={img?.image_url} alt={p.designation} size="sm" rounded="md" />
                  </TableCell>
                  <TableCell className="font-mono font-medium">{p.code}</TableCell>
                  <TableCell>{p.designation}</TableCell>
                  <TableCell>
                    {(p as any).product_families?.name ? (
                      <Badge variant="outline" className="text-xs">{(p as any).product_families.name}</Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-xs">{(p as any).code_erp || "—"}</TableCell>
                  <TableCell>{p.unite}</TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">{(p as any).poids_unitaire ? `${(p as any).poids_unitaire} ${(p as any).unite_base || "kg"}` : "—"}</TableCell>
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
