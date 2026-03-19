import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Edit, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DocumentCategoriesAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("document_categories")
      .select("*")
      .order("sort_order");
    setCategories(data || []);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (cat: any) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editing) {
      await supabase.from("document_categories").update({
        name: name.trim(),
        description: description.trim() || null,
      } as any).eq("id", editing.id);
      toast({ title: "Catégorie mise à jour" });
    } else {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;
      await supabase.from("document_categories").insert({
        name: name.trim(),
        description: description.trim() || null,
        sort_order: maxOrder + 1,
      } as any);
      toast({ title: "Catégorie créée" });
    }
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (cat: any) => {
    await supabase.from("document_categories").update({ is_active: !cat.is_active } as any).eq("id", cat.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Catégories de documents</h1>
          <p className="text-muted-foreground">Gérer les catégories pour le classement des documents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="h-10">
              <Plus className="h-4 w-4 mr-2" /> Nouvelle catégorie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Ex: Fiche technique" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-12" placeholder="Description optionnelle" />
              </div>
              <Button onClick={handleSave} disabled={!name.trim()} className="w-full h-12">
                {editing ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <Card key={cat.id} className={!cat.is_active ? "opacity-60" : ""}>
            <CardContent className="p-4 flex items-center gap-3">
              <FolderOpen className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{cat.name}</p>
                  {!cat.is_active && <Badge variant="secondary" className="text-[10px]">Inactif</Badge>}
                </div>
                {cat.description && <p className="text-xs text-muted-foreground truncate">{cat.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
