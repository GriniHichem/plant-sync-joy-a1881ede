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
import { ArrowLeft, Edit, Factory, Plus, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const load = async () => {
    const { data } = await supabase.from("production_lines").select("*").order("code");
    setLines(data || []);
  };

  useEffect(() => { load(); }, []);

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Lignes de production</h1>
          <p className="text-muted-foreground">{lines.length} ligne(s)</p>
        </div>
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
                <TableHead className="w-24" />
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
                    <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                      <Edit className="h-4 w-4" />
                    </Button>
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
