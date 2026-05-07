import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Edit, Factory, Plus, Shield, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";

export default function LignesAdmin() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [lines, setLines] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [description, setDescription] = useState("");
  const [atelier, setAtelier] = useState("");

  // Line-products
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [lineProducts, setLineProducts] = useState<any[]>([]);

  const load = async () => {
    const [lRes, pRes] = await Promise.all([
      supabase.from("production_lines").select("*").order("code"),
      supabase.from("products").select("id, code, designation").eq("is_active", true).order("code"),
    ]);
    setLines(lRes.data || []);
    setAllProducts(pRes.data || []);
  };

  useEffect(() => { load(); }, []);

  const loadLineProducts = async (lineId: string) => {
    const { data } = await supabase.from("line_products").select("*").eq("line_id", lineId);
    setLineProducts(data || []);
  };

  const openProducts = (lineId: string) => {
    setSelectedLineId(lineId);
    loadLineProducts(lineId);
    setProductsDialogOpen(true);
  };

  const toggleProduct = async (productId: string) => {
    if (!selectedLineId) return;
    const existing = lineProducts.find((lp: any) => lp.product_id === productId);
    if (existing) {
      await supabase.from("line_products").delete().eq("id", existing.id);
    } else {
      await supabase.from("line_products").insert({ line_id: selectedLineId, product_id: productId } as any);
    }
    loadLineProducts(selectedLineId);
  };

  const resetForm = () => {
    setEditId(null);
    setCode("");
    setDesignation("");
    setDescription("");
    setAtelier("");
  };

  const openEdit = (l: any) => {
    setEditId(l.id);
    setCode(l.code);
    setDesignation(l.designation);
    setDescription(l.description || "");
    setAtelier(l.atelier || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!code.trim() || !designation.trim()) {
      toast({ title: "Code et désignation obligatoires", variant: "destructive" });
      return;
    }
    const payload = {
      code: code.trim(),
      designation: designation.trim(),
      description: description.trim() || null,
      atelier: atelier.trim() || null,
    };
    const { error } = editId
      ? await supabase.from("production_lines").update(payload).eq("id", editId)
      : await supabase.from("production_lines").insert(payload);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Ligne modifiée" : "Ligne créée" });
      setDialogOpen(false);
      resetForm();
      load();
    }
  };

  const handleToggle = async (l: any) => {
    await supabase.from("production_lines").update({ is_active: !l.is_active }).eq("id", l.id);
    load();
  };

  if (!hasRole("admin") && !hasRole("resp_production")) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Accès réservé</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Lignes de production</h1>
          <p className="text-muted-foreground">{lines.length} ligne(s)</p>
        </div>
        <ExportCsvButton
          data={lines}
          columns={[
            { key: "code", label: "Code" },
            { key: "designation", label: "Désignation" },
            { key: "atelier", label: "Atelier" },
            { key: "description", label: "Description" },
            { key: "is_active", label: "Actif", format: (v) => (v ? "Oui" : "Non") },
          ]}
          filename="lignes_production"
        />
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Modifier" : "Nouvelle"} ligne</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-12" placeholder="L-001" />
              </div>
              <div className="space-y-2">
                <Label>Désignation *</Label>
                <Input value={designation} onChange={(e) => setDesignation(e.target.value)} className="h-12" placeholder="Ligne d'ensachage" />
              </div>
              <div className="space-y-2">
                <Label>Atelier / Zone</Label>
                <Input value={atelier} onChange={(e) => setAtelier(e.target.value)} className="h-12" placeholder="Atelier A" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description de la ligne..." />
              </div>
              <Button onClick={handleSave} className="w-full h-12">{editId ? "Enregistrer" : "Créer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products association dialog */}
      <Dialog open={productsDialogOpen} onOpenChange={setProductsDialogOpen}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produits autorisés
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sélectionnez les produits autorisés pour cette ligne. Si aucun n'est coché, tous les produits seront disponibles.
          </p>
          <div className="space-y-2 mt-2">
            {allProducts.map((p) => {
              const isLinked = lineProducts.some((lp: any) => lp.product_id === p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox checked={isLinked} onCheckedChange={() => toggleProduct(p.id)} />
                  <div>
                    <p className="text-sm font-medium">{p.code}</p>
                    <p className="text-xs text-muted-foreground">{p.designation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead className="hidden md:table-cell">Atelier</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Factory className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Aucune ligne
                  </TableCell>
                </TableRow>
              ) : lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono font-medium">{l.code}</TableCell>
                  <TableCell>{l.designation}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{l.atelier || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">{l.description || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={l.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggle(l)}>
                      {l.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openProducts(l.id)} title="Produits autorisés">
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
