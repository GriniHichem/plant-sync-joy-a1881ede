import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ITEM_TYPE_LABELS: Record<string, string> = {
  raw_material: "Matière première",
  packaging: "Emballage",
  label: "Étiquette",
  carton: "Carton",
  pallet: "Palette",
  consumable: "Consommable",
};

export default function BomCompareTab() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [r, l] = await Promise.all([
        supabase.from("recipes").select("*, products(code, designation)").order("version", { ascending: false }),
        supabase.from("recipe_lines").select("*, articles(code, designation)"),
      ]);
      setRecipes(r.data || []);
      setLines(l.data || []);
    })();
  }, []);

  const products = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of recipes) if (!m.has(r.product_id)) m.set(r.product_id, r.products);
    return Array.from(m.entries()).map(([id, p]) => ({ id, ...p }));
  }, [recipes]);

  const versions = useMemo(() => recipes.filter((r) => r.product_id === productId), [recipes, productId]);

  const linesA = lines.filter((l) => l.recipe_id === aId);
  const linesB = lines.filter((l) => l.recipe_id === bId);

  const keys = new Set<string>();
  linesA.forEach((l) => keys.add(l.article_id + "|" + (l.item_type || "raw_material")));
  linesB.forEach((l) => keys.add(l.article_id + "|" + (l.item_type || "raw_material")));

  const rows = Array.from(keys).map((k) => {
    const a = linesA.find((l) => l.article_id + "|" + (l.item_type || "raw_material") === k);
    const b = linesB.find((l) => l.article_id + "|" + (l.item_type || "raw_material") === k);
    return { k, a, b, art: (a || b)?.articles, type: (a || b)?.item_type || "raw_material" };
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <Select value={productId} onValueChange={(v) => { setProductId(v); setAId(""); setBId(""); }}>
            <SelectTrigger className="h-12 w-72"><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.designation}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={aId} onValueChange={setAId} disabled={!productId}>
            <SelectTrigger className="h-12 w-56"><SelectValue placeholder="Version A" /></SelectTrigger>
            <SelectContent>
              {versions.map((v) => <SelectItem key={v.id} value={v.id}>v{v.version} — {v.name} ({v.status || (v.is_active ? "active" : "archived")})</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={bId} onValueChange={setBId} disabled={!productId}>
            <SelectTrigger className="h-12 w-56"><SelectValue placeholder="Version B" /></SelectTrigger>
            <SelectContent>
              {versions.map((v) => <SelectItem key={v.id} value={v.id}>v{v.version} — {v.name} ({v.status || (v.is_active ? "active" : "archived")})</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!aId || !bId ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Sélectionnez deux versions de recette à comparer</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-2">Article</th>
                <th className="text-left p-2">Type</th>
                <th className="text-right p-2">A</th>
                <th className="text-right p-2">B</th>
                <th className="text-left p-2">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const aQ = r.a?.quantite ?? null;
                const bQ = r.b?.quantite ?? null;
                const diff = aQ != null && bQ != null ? Number(bQ) - Number(aQ) : null;
                return (
                  <tr key={r.k} className="border-t">
                    <td className="p-2">{r.art?.code} — {r.art?.designation}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{ITEM_TYPE_LABELS[r.type] || r.type}</Badge></td>
                    <td className="p-2 text-right tabular-nums">{aQ != null ? `${aQ} ${r.a?.unite}` : "—"}</td>
                    <td className="p-2 text-right tabular-nums">{bQ != null ? `${bQ} ${r.b?.unite}` : "—"}</td>
                    <td className="p-2">{diff == null ? (r.a ? "supprimé" : "ajouté") : diff === 0 ? "=" : diff > 0 ? `+${diff}` : `${diff}`}</td>
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
