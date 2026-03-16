import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package } from "lucide-react";

export default function ConsumptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [ofs, setOfs] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selOfId, setSelOfId] = useState("");
  const [selArticleId, setSelArticleId] = useState("");
  const [selQte, setSelQte] = useState("");

  const load = async () => {
    const { data } = await supabase.from("consumptions").select("*, articles(code, designation, unite), ordres_fabrication(numero)").order("created_at", { ascending: false }).limit(50);
    setConsumptions(data || []);
  };

  useEffect(() => {
    load();
    supabase.from("ordres_fabrication").select("id, numero").eq("statut", "en_cours" as any).order("numero").then(({ data }) => setOfs(data || []));
    supabase.from("articles").select("*").eq("is_active", true).order("code").then(({ data }) => setArticles(data || []));
  }, []);

  const handleCreate = async () => {
    if (!selOfId || !selArticleId || !selQte) {
      toast({ title: "Erreur", description: "Tous les champs sont obligatoires", variant: "destructive" });
      return;
    }
    const article = articles.find((a) => a.id === selArticleId);
    const { error } = await supabase.from("consumptions").insert({
      of_id: selOfId,
      article_id: selArticleId,
      quantite: parseFloat(selQte),
      unite: article?.unite || "kg",
      declared_by: user?.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Consommation déclarée" });
      setDialogOpen(false);
      setSelOfId(""); setSelArticleId(""); setSelQte("");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consommations</h1>
          <p className="text-muted-foreground">Déclarations de consommation matières</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Déclarer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle consommation</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>OF *</Label>
                <Select value={selOfId} onValueChange={setSelOfId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner un OF" /></SelectTrigger>
                  <SelectContent>{ofs.map((o) => <SelectItem key={o.id} value={o.id}>{o.numero}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Article *</Label>
                <Select value={selArticleId} onValueChange={setSelArticleId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.designation}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantité *</Label>
                <Input type="number" value={selQte} onChange={(e) => setSelQte(e.target.value)} className="h-12" placeholder="0" />
              </div>
              <Button onClick={handleCreate} className="w-full h-12">Déclarer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OF</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumptions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucune consommation</TableCell></TableRow>
              ) : consumptions.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.ordres_fabrication?.numero}</TableCell>
                  <TableCell>{c.articles?.code} — {c.articles?.designation}</TableCell>
                  <TableCell className="tabular-nums font-medium">{c.quantite}</TableCell>
                  <TableCell>{c.unite}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{new Date(c.created_at).toLocaleString("fr-FR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
