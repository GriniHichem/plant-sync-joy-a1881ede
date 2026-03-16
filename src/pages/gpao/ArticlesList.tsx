import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, Plus, AlertCircle } from "lucide-react";

export default function ArticlesList() {
  const [articles, setArticles] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("articles").select("*").eq("is_active", true).order("code").then(({ data }) => setArticles(data || []));
  }, []);

  const filtered = articles.filter((a) => !search || a.code.toLowerCase().includes(search.toLowerCase()) || a.designation.toLowerCase().includes(search.toLowerCase()));
  const lowStock = articles.filter((a) => a.stock_actuel <= a.stock_min).length;

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
        <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Stock min</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="hidden md:table-cell">Prix unit.</TableHead>
                <TableHead className="hidden md:table-cell">Fournisseur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucun article</TableCell></TableRow>
              ) : filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-medium">{a.code}</TableCell>
                  <TableCell>{a.designation}</TableCell>
                  <TableCell className="tabular-nums">
                    <span className={a.stock_actuel <= a.stock_min ? "text-destructive font-bold" : "text-success font-medium"}>
                      {Number(a.stock_actuel).toLocaleString("fr-FR")}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{Number(a.stock_min).toLocaleString("fr-FR")}</TableCell>
                  <TableCell>{a.unite}</TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">{a.prix_unitaire ? `${a.prix_unitaire} €` : "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{a.fournisseur || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
