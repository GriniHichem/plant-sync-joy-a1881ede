import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, Plus } from "lucide-react";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";

export default function ProductsList() {
  const [products, setProducts] = useState<any[]>([]);
  const [entityImages, setEntityImages] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const [pRes, imgRes] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("code"),
        supabase.from("entity_images").select("*").eq("entity_type", "produit").eq("is_primary", true),
      ]);
      setProducts(pRes.data || []);
      setEntityImages(imgRes.data || []);
    };
    load();
  }, []);

  const filtered = products.filter((p) => !search || p.code.toLowerCase().includes(search.toLowerCase()) || p.designation.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produits finis</h1>
          <p className="text-muted-foreground">{products.length} produits</p>
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
                <TableHead className="w-10"></TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucun produit</TableCell></TableRow>
              ) : filtered.map((p) => {
                const img = entityImages.find((i: any) => i.entity_id === p.id);
                return (
                <TableRow key={p.id}>
                  <TableCell className="w-10 pr-0">
                    <EntityThumbnail imageUrl={img?.image_url} alt={p.designation} size="sm" rounded="md" />
                  </TableCell>
                  <TableCell className="font-mono font-medium">{p.code}</TableCell>
                  <TableCell>{p.designation}</TableCell>
                  <TableCell>{p.unite}</TableCell>
                  <TableCell className="text-muted-foreground">{p.description || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
