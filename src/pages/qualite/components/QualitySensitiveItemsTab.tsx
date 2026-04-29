import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

const ITEM_TYPE_LABELS: Record<string, string> = {
  raw_material: "Matière première",
  packaging: "Emballage",
  label: "Étiquette",
  carton: "Carton",
  pallet: "Palette",
  consumable: "Consommable",
};

export default function QualitySensitiveItemsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [i, r] = await Promise.all([
        (supabase as any).from("recipe_lines").select("*, articles(code, designation)").eq("is_quality_sensitive", true),
        supabase.from("recipes").select("id, name, version, status, is_active, products(code, designation)"),
      ]);
      setItems(i.data || []);
      setRecipes(r.data || []);
    })();
  }, []);

  const filtered = items.filter((it) => {
    if (!search) return true;
    const recipe = recipes.find((r) => r.id === it.recipe_id);
    const hay = `${it.articles?.code} ${it.articles?.designation} ${recipe?.products?.code} ${recipe?.products?.designation} ${recipe?.name}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3">
          <Input placeholder="Recherche article / produit / recette…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 max-w-xs" />
        </CardContent>
      </Card>
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun composant qualité sensible</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-2">Article</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Produit</th>
                <th className="text-left p-2">Recette</th>
                <th className="text-right p-2">Qté</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const recipe = recipes.find((r) => r.id === it.recipe_id);
                const status = recipe?.status || (recipe?.is_active ? "active" : "—");
                return (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        <span className="font-medium">{it.articles?.code}</span>
                        <span className="text-muted-foreground">{it.articles?.designation}</span>
                      </div>
                    </td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{ITEM_TYPE_LABELS[it.item_type] || it.item_type}</Badge></td>
                    <td className="p-2">{recipe?.products?.code} — {recipe?.products?.designation}</td>
                    <td className="p-2">{recipe?.name} <Badge variant="outline" className="text-[9px] ml-1">v{recipe?.version} · {status}</Badge></td>
                    <td className="p-2 text-right tabular-nums">{it.quantite} {it.unite}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
