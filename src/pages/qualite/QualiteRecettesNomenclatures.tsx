import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, AlertTriangle, BookOpen, RotateCcw } from "lucide-react";

export default function QualiteRecettesNomenclatures() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ccpOnly, setCcpOnly] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const [r, s, i, l] = await Promise.all([
        supabase.from("recipes").select("*, products(code, designation)").order("name"),
        (supabase as any).from("recipe_steps").select("*").order("step_order"),
        supabase.from("quality_indicators").select("id, code, name, unit").eq("is_active", true),
        supabase.from("recipe_lines").select("recipe_id, quantite, unite, articles(code, designation)"),
      ]);
      setRecipes(r.data || []);
      setSteps((s.data as any[]) || []);
      setIndicators(i.data || []);
      setLines(l.data || []);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, { product: any; versions: any[] }> = {};
    for (const r of recipes) {
      const status = (r.status as string) || (r.is_active ? "active" : "archived");
      if (statusFilter !== "all" && status !== statusFilter) continue;
      if (search && !`${r.name} ${r.products?.code} ${r.products?.designation}`.toLowerCase().includes(search.toLowerCase())) continue;
      const stepsForR = steps.filter((s) => s.recipe_id === r.id);
      if (ccpOnly && !stepsForR.some((s) => s.critical_control_point)) continue;
      if (!map[r.product_id]) map[r.product_id] = { product: r.products, versions: [] };
      map[r.product_id].versions.push(r);
    }
    Object.values(map).forEach((g) => g.versions.sort((a, b) => b.version - a.version));
    return map;
  }, [recipes, steps, search, statusFilter, ccpOnly]);

  const filtersActive = !!search || statusFilter !== "all" || ccpOnly;

  const groups = Object.entries(grouped);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Recettes & Nomenclatures (Qualité)</h1>
        <p className="text-muted-foreground">Vue qualité — points de contrôle critiques et indicateurs liés aux étapes</p>
      </div>

      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <Input
            placeholder="Recherche produit / recette…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archivée</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ccpOnly} onChange={(e) => setCcpOnly(e.target.checked)} className="h-4 w-4" />
            Avec CCP uniquement
          </label>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setStatusFilter("all"); setCcpOnly(false); }}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
            </Button>
          )}
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Aucune recette ne correspond aux filtres</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(([prodId, g]) => {
            const open = !!expanded[prodId];
            return (
              <Card key={prodId}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpanded((e) => ({ ...e, [prodId]: !open }))}
                  >
                    {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <div className="flex-1">
                      <p className="font-semibold">{g.product?.code} — {g.product?.designation}</p>
                      <p className="text-sm text-muted-foreground">{g.versions.length} version(s)</p>
                    </div>
                  </div>
                  {open && (
                    <div className="border-t divide-y">
                      {g.versions.map((r) => {
                        const status = (r.status as string) || (r.is_active ? "active" : "archived");
                        const variant = status === "active" ? "default" : status === "draft" ? "outline" : "secondary";
                        const label = status === "active" ? "Active" : status === "draft" ? "Brouillon" : "Archivée";
                        const rSteps = steps.filter((s) => s.recipe_id === r.id).sort((a, b) => a.step_order - b.step_order);
                        const rLines = lines.filter((l) => l.recipe_id === r.id);
                        return (
                          <div key={r.id} className="p-4 pl-12 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{r.name}</span>
                              <Badge variant="outline" className="text-[10px]">v{r.version}</Badge>
                              <Badge variant={variant} className="text-[10px]">{label}</Badge>
                              {rSteps.some((s) => s.critical_control_point) && (
                                <Badge variant="destructive" className="text-[10px] gap-1">
                                  <AlertTriangle className="h-3 w-3" /> CCP
                                </Badge>
                              )}
                            </div>

                            <div>
                              <p className="text-xs uppercase text-muted-foreground mb-1">Composition</p>
                              {rLines.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Aucun article</p>
                              ) : (
                                <div className="text-xs space-y-0.5">
                                  {rLines.map((l, idx) => (
                                    <div key={idx}>{l.articles?.code} — {l.articles?.designation} : {l.quantite} {l.unite}</div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="text-xs uppercase text-muted-foreground mb-1">Étapes & contrôles</p>
                              {rSteps.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Aucune étape définie</p>
                              ) : (
                                <div className="space-y-1">
                                  {rSteps.map((s) => {
                                    const ind = indicators.find((i) => i.id === s.quality_indicator_id);
                                    return (
                                      <div key={s.id} className="text-xs flex items-center gap-2 flex-wrap">
                                        <span className="tabular-nums text-muted-foreground">{s.step_order}.</span>
                                        <span className="font-medium">{s.title}</span>
                                        {s.expected_duration_minutes && (
                                          <span className="text-muted-foreground">· {s.expected_duration_minutes} min</span>
                                        )}
                                        {s.critical_control_point && (
                                          <Badge variant="destructive" className="text-[9px] gap-1">
                                            <AlertTriangle className="h-3 w-3" /> CCP
                                          </Badge>
                                        )}
                                        {ind ? (
                                          <Link to="/qualite/indicateurs" className="text-primary underline">
                                            {ind.code} — {ind.name}{ind.unit ? ` (${ind.unit})` : ""}
                                          </Link>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
