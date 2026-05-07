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
import { ArrowLeft, Edit, FolderTree, Plus, Shield, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";

export default function FamillesAdmin() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [families, setFamilies] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");

  const load = async () => {
    const { data } = await supabase.from("machine_families").select("*").order("name");
    setFamilies(data || []);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setEditId(null); setName(""); setDescription(""); setParentId(""); };

  const openEdit = (f: any) => {
    setEditId(f.id);
    setName(f.name);
    setDescription(f.description || "");
    setParentId(f.parent_id || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Le nom est obligatoire", variant: "destructive" });
      return;
    }
    const payload = { name: name.trim(), description: description.trim() || null, parent_id: parentId && parentId !== "__none__" ? parentId : null };
    const { error } = editId
      ? await supabase.from("machine_families").update(payload).eq("id", editId)
      : await supabase.from("machine_families").insert(payload);
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
    await supabase.from("machine_families").update({ is_active: !f.is_active }).eq("id", f.id);
    load();
  };

  const rootFamilies = families.filter((f) => !f.parent_id);
  const getChildren = (id: string) => families.filter((f) => f.parent_id === id);

  if (!hasRole("admin") && !hasRole("resp_maintenance")) {
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
          <h1 className="text-2xl font-bold">Familles machines</h1>
          <p className="text-muted-foreground">{families.length} famille(s)</p>
        </div>
        <ExportCsvButton
          data={families}
          columns={[
            { key: "name", label: "Nom" },
            { key: "description", label: "Description" },
            { key: "parent_id", label: "Parent ID" },
            { key: "is_active", label: "Actif", format: (v) => (v ? "Oui" : "Non") },
          ]}
          filename="familles_machines"
        />
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Modifier" : "Nouvelle"} famille</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Ex: Convoyeurs" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Famille parente</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Aucune (racine)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune (racine)</SelectItem>
                    {families.filter((f) => f.id !== editId).map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <TableHead>Description</TableHead>
                <TableHead>Sous-familles</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rootFamilies.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground"><FolderTree className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucune famille</TableCell></TableRow>
              ) : rootFamilies.map((f) => {
                const children = getChildren(f.id);
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-muted-foreground">{f.description || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {children.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {children.map((c: any) => (
                          <Badge key={c.id} variant="outline" className="cursor-pointer" onClick={() => openEdit(c)}>{c.name}</Badge>
                        ))}
                      </div>
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
    </div>
  );
}
