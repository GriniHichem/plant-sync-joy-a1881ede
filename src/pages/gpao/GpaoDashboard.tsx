import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDuration } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Factory, Package, ClipboardList, TrendingUp, BarChart3, AlertTriangle, FolderTree, ShieldAlert, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter";
import { KpiCardComparison } from "@/components/analytics/KpiCardComparison";
import { useDateFilter, filterByDateRange } from "@/hooks/useDateFilter";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Progress } from "@/components/ui/progress";

const ofStatusConfig: Record<string, { label: string; className: string }> = {
  planifie: { label: "Planifié", className: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", className: "bg-info/10 text-info border-info/20" },
  termine: { label: "Terminé", className: "bg-success/10 text-success border-success/20" },
  annule: { label: "Annulé", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function OfStatusBadge({ value }: { value: string }) {
  const config = ofStatusConfig[value];
  if (!config) return <Badge variant="outline">{value}</Badge>;
  return <Badge variant="outline" className={`font-medium text-xs ${config.className}`}>{config.label}</Badge>;
}

export default function GpaoDashboard() {
  const [ofs, setOfs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [pdrList, setPdrList] = useState<any[]>([]);
  const navigate = useNavWithFrom();
  const df = useDateFilter("this_month");

  useEffect(() => {
    const load = async () => {
      const [ofRes, prodRes, artRes, stopRes, famRes, pdrRes] = await Promise.all([
        supabase.from("ordres_fabrication").select("*, products(designation, code, family_id, poids_unitaire), production_lines(designation, code)").order("created_at", { ascending: false }),
        supabase.from("products").select("*, product_families(name)").eq("is_active", true),
        supabase.from("articles").select("*, product_families(name)").eq("is_active", true),
        supabase.from("production_stops").select("*, production_lines(designation)").order("heure_debut", { ascending: false }),
        supabase.from("product_families").select("*").eq("is_active", true),
        supabase.from("pdr").select("*").eq("is_active", true),
      ]);
      setOfs(ofRes.data || []);
      setProducts(prodRes.data || []);
      setArticles(artRes.data || []);
      setStops(stopRes.data || []);
      setFamilies(famRes.data || []);
      setPdrList(pdrRes.data || []);
    };
    load();
  }, []);

  const fOfs = useMemo(() => filterByDateRange(ofs, df.range, (o) => o.created_at), [ofs, df.range]);
  const fStops = useMemo(() => filterByDateRange(stops, df.range, (s) => s.heure_debut), [stops, df.range]);
  const cOfs = useMemo(() => df.compareRange ? filterByDateRange(ofs, df.compareRange, (o) => o.created_at) : [], [ofs, df.compareRange]);

  const ofsEnCours = fOfs.filter((o) => o.statut === "en_cours").length;
  const totalProduit = fOfs.reduce((s, o) => s + (o.quantite_produite || 0), 0);
  const totalRebut = fOfs.reduce((s, o) => s + (o.quantite_rebut || 0), 0);
  const rendement = totalProduit > 0 ? Math.round(((totalProduit - totalRebut) / totalProduit) * 100) : 0;
  const lowStockArticles = articles.filter((a) => a.stock_actuel <= a.stock_min).length;

  const prevProduit = cOfs.reduce((s, o) => s + (o.quantite_produite || 0), 0);
  const prevRebut = cOfs.reduce((s, o) => s + (o.quantite_rebut || 0), 0);
  const prevRendement = prevProduit > 0 ? Math.round(((prevProduit - prevRebut) / prevProduit) * 100) : 0;

  // PDR KPIs for GPAO context
  const pdrRupture = pdrList.filter((p) => p.stock_actuel === 0).length;
  const pdrCritique = pdrList.filter((p) => p.stock_actuel > 0 && p.stock_actuel <= p.stock_min).length;
  const valeurStock = pdrList.reduce((s, p) => s + (p.stock_actuel * (p.pmp || 0)), 0);

  // Production by family chart
  const prodByFamily = useMemo(() => {
    const map: Record<string, { name: string; produced: number; scrap: number }> = {};
    fOfs.forEach((of) => {
      const famId = of.products?.family_id;
      const famName = famId ? families.find((f) => f.id === famId)?.name || "Autre" : "Sans famille";
      if (!map[famName]) map[famName] = { name: famName, produced: 0, scrap: 0 };
      map[famName].produced += of.quantite_produite || 0;
      map[famName].scrap += of.quantite_rebut || 0;
    });
    return Object.values(map).sort((a, b) => b.produced - a.produced);
  }, [fOfs, families]);

  // Yield by product (top 5)
  const yieldByProduct = useMemo(() => {
    const map: Record<string, { name: string; produced: number; scrap: number }> = {};
    fOfs.forEach((of) => {
      const label = of.products?.code || "?";
      if (!map[label]) map[label] = { name: label, produced: 0, scrap: 0 };
      map[label].produced += of.quantite_produite || 0;
      map[label].scrap += of.quantite_rebut || 0;
    });
    return Object.values(map)
      .map((v) => ({ ...v, yield: v.produced > 0 ? Math.round(((v.produced - v.scrap) / v.produced) * 100) : 0 }))
      .sort((a, b) => b.produced - a.produced).slice(0, 5);
  }, [fOfs]);

  // Average weight per OF
  const avgPoidsOf = useMemo(() => {
    const ofsWithPoids = fOfs.filter((o) => o.quantite_produite > 0 && o.products?.poids_unitaire > 0);
    if (ofsWithPoids.length === 0) return 0;
    const totalWeight = ofsWithPoids.reduce((s, o) => s + (o.quantite_produite * Number(o.products?.poids_unitaire || 0)), 0);
    return Math.round(totalWeight / ofsWithPoids.length);
  }, [fOfs]);

  // PDR alerts (top 5)
  const pdrAlerts = pdrList
    .filter((p) => p.stock_actuel <= p.stock_min)
    .sort((a, b) => a.stock_actuel - b.stock_actuel)
    .slice(0, 5);

  const chartConfig = {
    produced: { label: "Produit (kg)", color: "hsl(var(--success))" },
    scrap: { label: "Rebut (kg)", color: "hsl(var(--destructive))" },
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard GPAO</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Vue d'ensemble de la production</p>
        </div>
        <DateRangeFilter {...df} />
      </div>

      {/* Row 1: Production KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCardComparison title="OF en cours" value={ofsEnCours} icon={Factory}
          subtitle={`${fOfs.length} total`} currentNumeric={ofsEnCours}
          previousValue={df.compareEnabled ? cOfs.filter((o) => o.statut === "en_cours").length : undefined} />
        <KpiCardComparison title="Production totale" value={`${totalProduit.toLocaleString("fr-FR")} kg`} icon={BarChart3}
          currentNumeric={totalProduit} previousValue={df.compareEnabled ? prevProduit : undefined} unit=" kg" />
        <KpiCardComparison title="Rendement" value={`${rendement}%`} icon={TrendingUp}
          subtitle="Produit - rebuts" currentNumeric={rendement} previousValue={df.compareEnabled ? prevRendement : undefined} unit="%" />
        <KpiCardComparison title="Produits" value={products.length} icon={Package}
          subtitle={`${families.length} famille(s)`} />
        <KpiCardComparison title="PDR stock" value={`${pdrRupture + pdrCritique}`} icon={ShieldAlert}
          subtitle={`${pdrRupture} rupture · ${pdrCritique} critique`} />
        <KpiCardComparison title="Valeur stock PDR" value={`${Math.round(valeurStock).toLocaleString("fr-FR")} DA`} icon={Wrench}
          subtitle={`${pdrList.length} réf.`} />
      </div>

      {/* Row 2: Articles & matières alertes */}
      {(lowStockArticles > 0 || pdrAlerts.length > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          {lowStockArticles > 0 && (
            <Card className="border-warning/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{lowStockArticles} matière(s) en alerte stock</p>
                  <p className="text-xs text-muted-foreground">Stock actuel ≤ stock minimum</p>
                </div>
              </CardContent>
            </Card>
          )}
          {pdrAlerts.length > 0 && (
            <Card className="border-destructive/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{pdrRupture + pdrCritique} PDR en alerte stock</p>
                  <p className="text-xs text-muted-foreground">{pdrRupture} en rupture · {pdrCritique} en critique</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Ordres de fabrication récents
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {fOfs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun OF</p>
            ) : (
              <div className="space-y-2">
                {fOfs.slice(0, 5).map((of) => (
                  <div key={of.id} onClick={() => navigate(`/gpao/of/${of.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{of.numero}</p>
                      <p className="text-xs text-muted-foreground truncate">{of.products?.designation}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs tabular-nums text-muted-foreground">{of.quantite_produite}/{of.quantite_prevue}</span>
                      <OfStatusBadge value={of.statut} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Arrêts récents
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {fStops.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun arrêt</p>
            ) : (
              <div className="space-y-2">
                {fStops.slice(0, 5).map((s) => (
                  <div key={s.id} className="p-3 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium capitalize">{s.type.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground">{s.production_lines?.designation}</p>
                      </div>
                      <span className="text-xs tabular-nums font-medium">{s.duree_minutes ? `${s.duree_minutes} min` : "En cours"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              Production par famille
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prodByFamily.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={prodByFamily} margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="produced" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Produit" />
                  <Bar dataKey="scrap" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Rebut" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rendement par produit (Top 5)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {yieldByProduct.map((p) => (
                <div key={p.name} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium font-mono">{p.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{p.produced.toLocaleString("fr-FR")} kg</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold tabular-nums ${p.yield >= 95 ? "text-success" : p.yield >= 85 ? "text-warning" : "text-destructive"}`}>{p.yield}%</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{p.scrap.toLocaleString("fr-FR")} kg rebut</p>
                  </div>
                </div>
              ))}
              {yieldByProduct.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PDR Alerts detail */}
      {pdrAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-warning" />
              PDR en alerte stock
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pdrAlerts.map((p) => {
                const isRupture = p.stock_actuel === 0;
                const pct = p.stock_min > 0 ? Math.min(100, Math.round((p.stock_actuel / p.stock_min) * 100)) : 0;
                return (
                  <div key={p.id} onClick={() => navigate(`/pdr/${p.id}`)}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${isRupture ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"}`}>
                    <div className="flex justify-between items-start mb-1.5">
                      <p className="text-sm font-medium truncate font-mono">{p.reference}</p>
                      <Badge variant={isRupture ? "destructive" : "outline"} className="text-[10px] shrink-0">
                        {isRupture ? "RUPTURE" : "CRITIQUE"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">{p.designation}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-xs tabular-nums font-medium">{p.stock_actuel}/{p.stock_min}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
