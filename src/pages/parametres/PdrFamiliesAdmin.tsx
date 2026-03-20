import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Edit, FolderTree, Plus, Shield, Trash2, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const APPRO_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "importation", label: "Importation" },
  { value: "mixte", label: "Mixte" },
];

const STATUT_OPTIONS = [
  { value: "commune", label: "Commune" },
  { value: "strategique", label: "Stratégique" },
];

export default function PdrFamiliesAdmin() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [families, setFamilies] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [approvisionnement, setApprovisionnement] = useState("local");
  const [statutDefault, setStatutDefault] = useState("commune");

  // Supplier management
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierFamilyId, setSupplierFamilyId] = useState<string | null>(null);
  const [supplierFamilyName, setSupplierFamilyName] = useState("");
  const [familySuppliers, setFamilySuppliers] = useState<any[]>([]);
  const [supplierForm, setSupplierForm] = useState({ nom: "", reference_fournisseur: "", prix: 0, delai_jours: 0, contact: "", notes: "", is_principal: false });
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("pdr_families").select("*").order("name");
    setFamilies(data || []);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditId(null); setName(""); setDescription(""); setParentId("");
    setApprovisionnement("local"); setStatutDefault("commune");
  };

  const openEdit = (f: any) => {
    setEditId(f.id);
    setName(f.name);
    setDescription(f.description || "");
    setParentId(f.parent_id || "");
    setApprovisionnement(f.approvisionnement || "local");
    setStatutDefault(f.statut_default || "commune");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Le nom est obligatoire", variant: "destructive" });
      return;
    }
    const payload: any = {
      name: name.trim(),
      description: description.trim() || null,
      parent_id: parentId && parentId !== "__none__" ? parentId : null,
      approvisionnement,
      statut_default: statutDefault,
    };
    const { error } = editId
      ? await supabase.from("pdr_families").update(payload).eq("id", editId)
      : await supabase.from("pdr_families").insert(payload);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Famille modifiée" : "Famille créée" });
      setDialogOpen(false);
      resetForm();
      load();
    }
  };

  const handleToggle = async (f: any) => {
    await supabase.from("pdr_families").update({ is_active: !f.is_active }).eq("id", f.id);
    load();
  };

  // --- Supplier management for families ---
  const openSuppliers = async (f: any) => {
    setSupplierFamilyId(f.id);
    setSupplierFamilyName(f.name);
    const { data } = await supabase.from("pdr_family_suppliers").select("*").eq("family_id", f.id).order("is_principal", { ascending: false });
    setFamilySuppliers(data || []);
    setSupplierDialogOpen(true);
    resetSupplierForm();
  };

  const resetSupplierForm = () => {
    setEditingSupplierId(null);
    setSupplierForm({ nom: "", reference_fournisseur: "", prix: 0, delai_jours: 0, contact: "", notes: "", is_principal: false });
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.nom.trim()) { toast({ title: "Nom obligatoire", variant: "destructive" }); return; }
    const payload: any = { ...supplierForm, family_id: supplierFamilyId };
    if (editingSupplierId) {
      await supabase.from("pdr_family_suppliers").update(payload).eq("id", editingSupplierId);
    } else {
      await supabase.from("pdr_family_suppliers").insert(payload);
    }
    toast({ title: editingSupplierId ? "Fournisseur modifié" : "Fournisseur ajouté" });
    resetSupplierForm();
    // Reload
    const { data } = await supabase.from("pdr_family_suppliers").select("*").eq("family_id", supplierFamilyId).order("is_principal", { ascending: false });
    setFamilySuppliers(data || []);
  };

  const deleteSupplier = async (sid: string) => {
    await supabase.from("pdr_family_suppliers").delete().eq("id", sid);
    toast({ title: "Fournisseur supprimé" });
    const { data } = await supabase.from("pdr_family_suppliers").select("*").eq("family_id", supplierFamilyId).order("is_principal", { ascending: false });
    setFamilySuppliers(data || []);
  };

  const editSupplier = (s: any) => {
    setEditingSupplierId(s.id);
    setSupplierForm({
      nom: s.nom, reference_fournisseur: s.reference_fournisseur || "",
      prix: s.prix || 0, delai_jours: s.delai_jours || 0,
      contact: s.contact || "", notes: s.notes || "", is_principal: s.is_principal,
    });
  };

  const rootFamilies = families.filter((f) => !f.parent_id);
  const getChildren = (id: string) => families.filter((f) => f.parent_id === id);

  if (!hasRole("admin") && !hasRole("resp_maintenance") && !hasRole("gestionnaire_magasin")) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Accès réservé</p>
      </div>
    );
  }

  const approLabel = (v: string) => APPRO_OPTIONS.find((o) => o.value === v)?.label || v;
  const statutLabel = (v: string) => STATUT_OPTIONS.find((o) => o.value === v)?.label || v;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Familles PDR</h1>
          <p className="text-muted-foreground">{families.length} famille(s)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Modifier" : "Nouvelle"} famille PDR</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Ex: Roulements" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Famille parente</Label>
                <Select value={parentId || "__none__"} onValueChange={setParentId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Aucune (racine)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune (racine)</SelectItem>
                    {families.filter((f) => f.id !== editId).map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Approvisionnement</Label>
                  <Select value={approvisionnement} onValueChange={setApprovisionnement}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {APPRO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Statut par défaut</Label>
                  <Select value={statutDefault} onValueChange={setStatutDefault}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full h-12">{editId ? "Enregistrer" : "Créer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Approvisionnement</TableHead>
                <TableHead>Statut défaut</TableHead>
                <TableHead>Sous-familles</TableHead>
                <TableHead>Fournisseurs</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rootFamilies.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><FolderTree className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucune famille</TableCell></TableRow>
              ) : rootFamilies.map((f) => {
                const children = getChildren(f.id);
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{approLabel(f.approvisionnement)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.statut_default === "strategique" ? "destructive" : "secondary"} className="text-xs">
                        {statutLabel(f.statut_default)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {children.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {children.map((c: any) => (
                          <Badge key={c.id} variant="outline" className="cursor-pointer" onClick={() => openEdit(c)}>{c.name}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openSuppliers(f)} className="gap-1 text-xs h-8">
                        <Truck className="h-3.5 w-3.5" /> Gérer
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggle(f)}>
                        {f.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Supplier management dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={(o) => { setSupplierDialogOpen(o); if (!o) resetSupplierForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fournisseurs — {supplierFamilyName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Supplier form */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm font-medium">{editingSupplierId ? "Modifier le fournisseur" : "Ajouter un fournisseur"}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nom *</Label>
                    <Input value={supplierForm.nom} onChange={(e) => setSupplierForm(p => ({ ...p, nom: e.target.value }))} className="h-10" placeholder="Nom fournisseur" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Réf fournisseur</Label>
                    <Input value={supplierForm.reference_fournisseur} onChange={(e) => setSupplierForm(p => ({ ...p, reference_fournisseur: e.target.value }))} className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prix (DA)</Label>
                    <Input type="number" value={supplierForm.prix} onChange={(e) => setSupplierForm(p => ({ ...p, prix: Number(e.target.value) }))} className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Délai (jours)</Label>
                    <Input type="number" value={supplierForm.delai_jours} onChange={(e) => setSupplierForm(p => ({ ...p, delai_jours: Number(e.target.value) }))} className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Contact</Label>
                    <Input value={supplierForm.contact} onChange={(e) => setSupplierForm(p => ({ ...p, contact: e.target.value }))} className="h-10" />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Checkbox checked={supplierForm.is_principal} onCheckedChange={(v) => setSupplierForm(p => ({ ...p, is_principal: !!v }))} />
                    <Label className="text-xs">Principal</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveSupplier} size="sm" className="h-9">{editingSupplierId ? "Enregistrer" : "Ajouter"}</Button>
                  {editingSupplierId && <Button variant="ghost" size="sm" onClick={resetSupplierForm} className="h-9">Annuler</Button>}
                </div>
              </CardContent>
            </Card>

            {/* Supplier list */}
            {familySuppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun fournisseur pour cette famille</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Réf</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Délai</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {familySuppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nom}</TableCell>
                      <TableCell className="text-xs">{s.reference_fournisseur || "—"}</TableCell>
                      <TableCell className="text-xs">{s.prix ? `${Number(s.prix).toLocaleString("fr-FR")} DA` : "—"}</TableCell>
                      <TableCell className="text-xs">{s.delai_jours ? `${s.delai_jours}j` : "—"}</TableCell>
                      <TableCell>{s.is_principal && <Badge className="text-xs">Principal</Badge>}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editSupplier(s)}><Edit className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSupplier(s.id)}><Trash2 className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
