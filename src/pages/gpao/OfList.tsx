import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OfStatusBadge } from "./GpaoDashboard";
import { Plus, Search, ClipboardList, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { exportToCsv } from "@/lib/exportCsv";

export default function OfList() {
  const [ofs, setOfs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [newProductId, setNewProductId] = useState("");
  const [newLineId, setNewLineId] = useState("");
  const [newQte, setNewQte] = useState("");
  const [newDateDebut, setNewDateDebut] = useState("");
  const [newDateFin, setNewDateFin] = useState("");

  const loadOfs = async () => {
    const { data } = await supabase.from("ordres_fabrication").select("*, products(designation, code), production_lines(designation, code)").order("created_at", { ascending: false });
    setOfs(data || []);
  };

  useEffect(() => {
    loadOfs();
    supabase.from("products").select("*").eq("is_active", true).order("code").then(({ data }) => setProducts(data || []));
    supabase.from("production_lines").select("*").eq("is_active", true).order("code").then(({ data }) => setLines(data || []));
    supabase.from("recipes").select("*").eq("is_active", true).then(({ data }) => setRecipes(data || []));
  }, []);

  const handleCreate = async () => {
    if (!newProductId || !newQte) {
      toast({ title: "Erreur", description: "Produit et quantité obligatoires", variant: "destructive" });
      return;
    }
    const recipe = recipes.find((r) => r.product_id === newProductId);
    const { error } = await supabase.from("ordres_fabrication").insert({
      numero: "",
      product_id: newProductId,
      recipe_id: recipe?.id || null,
      line_id: newLineId || null,
      quantite_prevue: parseFloat(newQte),
      date_debut_prevue: newDateDebut || null,
      date_fin_prevue: newDateFin || null,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "OF créé" });
      setDialogOpen(false);
      setNewProductId(""); setNewLineId(""); setNewQte(""); setNewDateDebut(""); setNewDateFin("");
      loadOfs();
    }
  };

  const filtered = ofs.filter((o) => {
    const matchSearch = !search || o.numero?.toLowerCase().includes(search.toLowerCase()) || o.products?.designation?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.statut === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ordres de Fabrication</h1>
          <p className="text-muted-foreground">{ofs.length} OF</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Nouvel OF</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nouvel ordre de fabrication</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Produit *</Label>
                <Select value={newProductId} onValueChange={setNewProductId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.designation}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ligne de production</Label>
                <Select value={newLineId} onValueChange={setNewLineId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner (optionnel)" /></SelectTrigger>
                  <SelectContent>{lines.map((l) => <SelectItem key={l.id} value={l.id}>{l.code} — {l.designation}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantité prévue (kg) *</Label>
                <Input type="number" value={newQte} onChange={(e) => setNewQte(e.target.value)} className="h-12" placeholder="0" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date début</Label>
                  <Input type="date" value={newDateDebut} onChange={(e) => setNewDateDebut(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Date fin</Label>
                  <Input type="date" value={newDateFin} onChange={(e) => setNewDateFin(e.target.value)} className="h-12" />
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full h-12">Créer l'OF</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="planifie">Planifié</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° OF</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Ligne</TableHead>
                <TableHead>Qté prévue</TableHead>
                <TableHead>Qté produite</TableHead>
                <TableHead>Rebuts</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Dates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucun OF</TableCell></TableRow>
              ) : filtered.map((of) => {
                const progress = of.quantite_prevue > 0 ? Math.round((of.quantite_produite / of.quantite_prevue) * 100) : 0;
                return (
                  <TableRow key={of.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/gpao/of/${of.id}`)}>
                    <TableCell className="font-mono font-medium">{of.numero}</TableCell>
                    <TableCell>{of.products?.designation || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{of.production_lines?.code || "—"}</TableCell>
                    <TableCell className="tabular-nums">{of.quantite_prevue?.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="tabular-nums">
                      {of.quantite_produite?.toLocaleString("fr-FR")}
                      <span className="text-xs text-muted-foreground ml-1">({progress}%)</span>
                    </TableCell>
                    <TableCell className="tabular-nums text-destructive">{of.quantite_rebut > 0 ? of.quantite_rebut : "—"}</TableCell>
                    <TableCell><OfStatusBadge value={of.statut} /></TableCell>
                    <TableCell className="hidden md:table-cell text-xs tabular-nums text-muted-foreground">
                      {of.date_debut_prevue && new Date(of.date_debut_prevue).toLocaleDateString("fr-FR")}
                      {of.date_fin_prevue && ` → ${new Date(of.date_fin_prevue).toLocaleDateString("fr-FR")}`}
                    </TableCell>
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
