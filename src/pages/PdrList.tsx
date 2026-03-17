import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Package, AlertCircle, Download } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { exportToCsv } from "@/lib/exportCsv";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { useNavigate } from "react-router-dom";

export default function PdrList() {
  const { canCreate } = usePermissions();
  const [pdrList, setPdrList] = useState<any[]>([]);
  const [entityImages, setEntityImages] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const [pRes, imgRes] = await Promise.all([
        supabase.from("pdr").select("*").eq("is_active", true).order("reference"),
        supabase.from("entity_images").select("*").eq("entity_type", "pdr").eq("is_primary", true),
      ]);
      setPdrList(pRes.data || []);
      setEntityImages(imgRes.data || []);
    };
    load();
  }, []);

  const filtered = pdrList.filter(
    (p) =>
      search === "" ||
      p.reference.toLowerCase().includes(search.toLowerCase()) ||
      p.designation.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = pdrList.filter((p) => p.stock_actuel <= p.stock_min).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pièces de Rechange</h1>
          <p className="text-muted-foreground">
            {pdrList.length} références
            {lowStock > 0 && (
              <span className="text-destructive ml-2 inline-flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {lowStock} en stock critique
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(filtered, [
            { key: "reference", label: "Référence" },
            { key: "designation", label: "Désignation" },
            { key: "stock_actuel", label: "Stock actuel" },
            { key: "stock_min", label: "Stock min" },
            { key: "prix_unitaire", label: "Prix unit." },
            { key: "fournisseur", label: "Fournisseur" },
            { key: "emplacement", label: "Emplacement" },
          ], "pieces_rechange")}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          {canCreate("pdr") && (
            <Button className="h-12 px-6">
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par référence ou désignation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Stock min</TableHead>
                <TableHead className="hidden md:table-cell">Prix unit.</TableHead>
                <TableHead className="hidden md:table-cell">Fournisseur</TableHead>
                <TableHead className="hidden md:table-cell">Emplacement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Aucune pièce trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const img = entityImages.find((i: any) => i.entity_id === p.id);
                  return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pdr/${p.id}`)}>
                    <TableCell className="w-10 pr-0">
                      <EntityThumbnail imageUrl={img?.image_url} alt={p.designation} size="sm" rounded="md" />
                    </TableCell>
                    <TableCell className="font-mono font-medium">{p.reference}</TableCell>
                    <TableCell>{p.designation}</TableCell>
                    <TableCell className="tabular-nums">
                      <span className={p.stock_actuel <= p.stock_min ? "text-destructive font-bold" : "text-success font-medium"}>
                        {p.stock_actuel}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{p.stock_min}</TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums">{p.prix_unitaire ? `${p.prix_unitaire} €` : "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{p.fournisseur || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{p.emplacement || "—"}</TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
