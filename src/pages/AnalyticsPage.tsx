import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Clock, TrendingUp, AlertTriangle, Factory, Wrench, BarChart3, Activity, Gauge, Package, FolderTree } from "lucide-react";
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter";
import { KpiCardComparison } from "@/components/analytics/KpiCardComparison";
import { TrendChart } from "@/components/analytics/TrendChart";
import { useDateFilter, filterByDateRange } from "@/hooks/useDateFilter";

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))"];

export default function AnalyticsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [ofs, setOfs] = useState<any[]>([]);
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [recipeLines, setRecipeLines] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const df = useDateFilter("this_month");

  useEffect(() => {
    const load = async () => {
      const [tRes, mRes, oRes, dRes, sRes, cRes, rlRes, lRes, fRes, pRes, iRes, prRes] = await Promise.all([
        supabase.from("tickets").select("*, machines(code, designation), ordres_fabrication(numero, products(code, designation))").order("heure_declaration", { ascending: false }),
        supabase.from("machines").select("*").eq("is_active", true),
        supabase.from("ordres_fabrication").select("*, products(designation, code, family_id, poids_unitaire, product_families(name)), production_lines(designation, code)").order("created_at", { ascending: false }),
        supabase.from("production_declarations").select("*, shifts(shift_type, line_id, date_shift)"),
        supabase.from("production_stops").select("*, production_lines(designation, code)"),
        supabase.from("consumptions").select("*, articles(code, designation, code_erp, family_id, product_families(name)), ordres_fabrication(numero)"),
        supabase.from("recipe_lines").select("*, articles(code, designation)"),
        supabase.from("production_lines").select("*").eq("is_active", true),
        supabase.from("product_families").select("*").eq("is_active", true),
        supabase.from("products").select("*, product_families(name)").eq("is_active", true),
        supabase.from("interventions").select("id, ticket_id, technicien_id, date_debut, date_fin, statut, role"),
        supabase.from("profiles").select("user_id, first_name, last_name"),
      ]);
      setTickets(tRes.data || []);
      setMachines(mRes.data || []);
      setOfs(oRes.data || []);
      setDeclarations(dRes.data || []);
      setStops(sRes.data || []);
      setConsumptions(cRes.data || []);
      setRecipeLines(rlRes.data || []);
      setLines(lRes.data || []);
      setFamilies(fRes.data || []);
      setProducts(pRes.data || []);
      setInterventions(iRes.data || []);
      setProfiles(prRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  // Filtered data
  const fTickets = useMemo(() => filterByDateRange(tickets, df.range, (t) => t.heure_declaration), [tickets, df.range]);
  const fStops = useMemo(() => filterByDateRange(stops, df.range, (s) => s.heure_debut), [stops, df.range]);
  const fOfs = useMemo(() => filterByDateRange(ofs, df.range, (o) => o.created_at), [ofs, df.range]);
  const fDeclarations = useMemo(() => filterByDateRange(declarations, df.range, (d) => d.heure_production), [declarations, df.range]);
  const fConsumptions = useMemo(() => filterByDateRange(consumptions, df.range, (c) => c.created_at), [consumptions, df.range]);

  // Compare filtered
  const cTickets = useMemo(() => df.compareRange ? filterByDateRange(tickets, df.compareRange, (t) => t.heure_declaration) : [], [tickets, df.compareRange]);
  const cOfs = useMemo(() => df.compareRange ? filterByDateRange(ofs, df.compareRange, (o) => o.created_at) : [], [ofs, df.compareRange]);

  // KPIs
  // IMPORTANT: KPIs panne / MTBF / disponibilité comptent UNIQUEMENT les tickets.
  // Ne JAMAIS compter `interventions` ici — un ticket avec plusieurs collaborateurs
  // génère plusieurs interventions mais reste UNE SEULE panne.
  const kpis = useMemo(() => {
    const closed = fTickets.filter((t) => t.statut === "cloture" || t.statut === "resolu");
    const withInt = closed.filter((t) => t.temps_intervention_minutes);
    const withArr = closed.filter((t) => t.temps_arret_minutes);
    const mttr = withInt.length > 0 ? Math.round(withInt.reduce((s, t) => s + t.temps_intervention_minutes, 0) / withInt.length) : 0;
    const totalFailures = fTickets.filter((t) => t.statut !== "annule").length || 1; // 1 ticket = 1 panne
    const totalHours = (machines.length || 1) * 30 * 24;
    const mtbf = Math.round(totalHours / totalFailures);
    const avgArret = withArr.length > 0 ? Math.round(withArr.reduce((s, t) => s + t.temps_arret_minutes, 0) / withArr.length) : 0;
    const availability = mtbf > 0 && mttr > 0 ? Math.round((mtbf / (mtbf + mttr / 60)) * 100) : 100;
    return { mttr, mtbf, avgArret, availability, totalFailures, closedCount: closed.length };
  }, [fTickets, machines]);

  const prevKpis = useMemo(() => {
    if (!df.compareRange) return null;
    const closed = cTickets.filter((t) => t.statut === "cloture" || t.statut === "resolu");
    const withInt = closed.filter((t) => t.temps_intervention_minutes);
    const withArr = closed.filter((t) => t.temps_arret_minutes);
    const mttr = withInt.length > 0 ? Math.round(withInt.reduce((s, t) => s + t.temps_intervention_minutes, 0) / withInt.length) : 0;
    const totalFailures = cTickets.filter((t) => t.statut !== "annule").length || 1; // 1 ticket = 1 panne
    const totalHours = (machines.length || 1) * 30 * 24;
    const mtbf = Math.round(totalHours / totalFailures);
    const avgArret = withArr.length > 0 ? Math.round(withArr.reduce((s, t) => s + t.temps_arret_minutes, 0) / withArr.length) : 0;
    const availability = mtbf > 0 && mttr > 0 ? Math.round((mtbf / (mtbf + mttr / 60)) * 100) : 100;
    return { mttr, mtbf, avgArret, availability, totalFailures, closedCount: closed.length };
  }, [cTickets, machines, df.compareRange]);

  // Per-technician workload — multi-counted by design (1 collaborator on a ticket = 1 row here).
  // This is fed by `interventions.role`, NOT by ticket count, so it never inflates panne KPIs above.
  const technicianWorkload = useMemo(() => {
    const ticketIds = new Set(fTickets.map((t) => t.id));
    const profileMap = new Map(profiles.map((p: any) => [p.user_id, `${p.first_name || ""} ${p.last_name || ""}`.trim() || "—"]));
    const agg: Record<string, { name: string; total: number; durationMin: number; lead: number; aide: number; co: number }> = {};
    interventions
      .filter((i) => i.technicien_id && ticketIds.has(i.ticket_id))
      .forEach((i) => {
        const key = i.technicien_id;
        if (!agg[key]) agg[key] = { name: profileMap.get(key) || "—", total: 0, durationMin: 0, lead: 0, aide: 0, co: 0 };
        agg[key].total += 1;
        if (i.date_debut && i.date_fin) {
          agg[key].durationMin += Math.max(0, Math.round((new Date(i.date_fin).getTime() - new Date(i.date_debut).getTime()) / 60000));
        }
        const role = i.role || "lead";
        if (role === "lead") agg[key].lead += 1;
        else if (role === "co_intervenant") agg[key].co += 1;
        else agg[key].aide += 1;
      });
    return Object.values(agg).sort((a, b) => b.durationMin - a.durationMin);
  }, [interventions, fTickets, profiles]);

  // Prod KPIs
  const totalProduit = fOfs.reduce((s, o) => s + (o.quantite_produite || 0), 0);
  const totalRebut = fOfs.reduce((s, o) => s + (o.quantite_rebut || 0), 0);
  const rendement = totalProduit > 0 ? Math.round(((totalProduit - totalRebut) / totalProduit) * 100) : 0;
  const prevTotalProduit = cOfs.reduce((s, o) => s + (o.quantite_produite || 0), 0);
  const prevRendement = prevTotalProduit > 0 ? Math.round(((prevTotalProduit - cOfs.reduce((s, o) => s + (o.quantite_rebut || 0), 0)) / prevTotalProduit) * 100) : 0;

  // Charts data
  const ticketsByMachine = useMemo(() => {
    const map: Record<string, { name: string; count: number; downtime: number }> = {};
    fTickets.forEach((t) => {
      const key = t.machine_id;
      const label = t.machines?.code || "?";
      if (!map[key]) map[key] = { name: label, count: 0, downtime: 0 };
      map[key].count++;
      map[key].downtime += t.temps_arret_minutes || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [fTickets]);

  const stopsByType = useMemo(() => {
    const map: Record<string, number> = {};
    fStops.forEach((s) => { const type = s.type || "autre"; map[type] = (map[type] || 0) + (s.duree_minutes || 0); });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [fStops]);

  const yieldByLine = useMemo(() => {
    const map: Record<string, { name: string; produced: number; scrap: number }> = {};
    fOfs.forEach((of) => {
      const label = of.production_lines?.code || "Sans ligne";
      const key = of.line_id || "none";
      if (!map[key]) map[key] = { name: label, produced: 0, scrap: 0 };
      map[key].produced += of.quantite_produite || 0;
      map[key].scrap += of.quantite_rebut || 0;
    });
    return Object.values(map).map((v) => ({ ...v, yield: v.produced > 0 ? Math.round(((v.produced - v.scrap) / v.produced) * 100) : 0 }));
  }, [fOfs]);

  const yieldByShift = useMemo(() => {
    const map: Record<string, { produced: number; scrap: number }> = {};
    fDeclarations.forEach((d) => {
      const st = d.shifts?.shift_type || "inconnu";
      if (!map[st]) map[st] = { produced: 0, scrap: 0 };
      map[st].produced += d.quantite_produite || 0;
      map[st].scrap += d.quantite_rebut || 0;
    });
    const labels: Record<string, string> = { matin: "Matin", apres_midi: "Après-midi", nuit: "Nuit" };
    return Object.entries(map).map(([key, v]) => ({
      name: labels[key] || key, produced: v.produced, scrap: v.scrap,
      yield: v.produced > 0 ? Math.round(((v.produced - v.scrap) / v.produced) * 100) : 0,
    }));
  }, [fDeclarations]);

  // Yield by family
  const yieldByFamily = useMemo(() => {
    const map: Record<string, { name: string; produced: number; scrap: number }> = {};
    fOfs.forEach((of) => {
      const famName = of.products?.product_families?.name || "Sans famille";
      if (!map[famName]) map[famName] = { name: famName, produced: 0, scrap: 0 };
      map[famName].produced += of.quantite_produite || 0;
      map[famName].scrap += of.quantite_rebut || 0;
    });
    return Object.values(map).map((v) => ({
      ...v, yield: v.produced > 0 ? Math.round(((v.produced - v.scrap) / v.produced) * 100) : 0,
    })).sort((a, b) => b.produced - a.produced);
  }, [fOfs]);

  // Production by product (top 10)
  const prodByProduct = useMemo(() => {
    const map: Record<string, { name: string; produced: number; poids: number }> = {};
    fOfs.forEach((of) => {
      const label = of.products?.code || "?";
      if (!map[label]) map[label] = { name: label, produced: 0, poids: Number(of.products?.poids_unitaire) || 0 };
      map[label].produced += of.quantite_produite || 0;
    });
    return Object.values(map).sort((a, b) => b.produced - a.produced).slice(0, 10);
  }, [fOfs]);

  // Consumption by family
  const consByFamily = useMemo(() => {
    const map: Record<string, number> = {};
    fConsumptions.forEach((c) => {
      const famName = c.articles?.product_families?.name || "Sans famille";
      map[famName] = (map[famName] || 0) + (c.quantite || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  }, [fConsumptions]);

  const consumptionGaps = useMemo(() => {
    const ofCons: Record<string, Record<string, number>> = {};
    fConsumptions.forEach((c) => {
      if (!ofCons[c.of_id]) ofCons[c.of_id] = {};
      ofCons[c.of_id][c.article_id] = (ofCons[c.of_id][c.article_id] || 0) + c.quantite;
    });
    const artGaps: Record<string, { expected: number; actual: number; erp: string }> = {};
    fOfs.forEach((of) => {
      if (!of.recipe_id) return;
      const oc = ofCons[of.id] || {};
      const rls = recipeLines.filter((rl) => rl.recipe_id === of.recipe_id);
      const ratio = of.quantite_produite > 0 ? of.quantite_produite : of.quantite_prevue;
      rls.forEach((rl) => {
        const exp = rl.quantite * (ratio || 1);
        const act = oc[rl.article_id] || 0;
        const label = rl.articles?.code || rl.article_id.slice(0, 8);
        if (!artGaps[label]) artGaps[label] = { expected: 0, actual: 0, erp: "" };
        artGaps[label].expected += exp;
        artGaps[label].actual += act;
      });
    });
    return Object.entries(artGaps)
      .map(([article, v]) => ({ article, expected: Math.round(v.expected * 100) / 100, actual: Math.round(v.actual * 100) / 100, gap: Math.round((v.actual - v.expected) * 100) / 100 }))
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 10);
  }, [fConsumptions, fOfs, recipeLines]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const chartConfig = {
    count: { label: "Tickets", color: "hsl(var(--primary))" },
    downtime: { label: "Arrêt (min)", color: "hsl(var(--destructive))" },
    produced: { label: "Produit", color: "hsl(var(--success))" },
    scrap: { label: "Rebut", color: "hsl(var(--destructive))" },
    expected: { label: "Prévu", color: "hsl(var(--muted-foreground))" },
    actual: { label: "Réel", color: "hsl(var(--primary))" },
    value: { label: "Durée (min)", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analyse & KPI</h1>
          <p className="text-muted-foreground text-sm">Indicateurs avancés maintenance & production</p>
        </div>
        <DateRangeFilter {...df} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCardComparison title="MTBF" value={`${kpis.mtbf}h`} icon={Activity} subtitle="Temps moyen entre pannes"
          currentNumeric={kpis.mtbf} previousValue={prevKpis?.mtbf} unit="h" />
        <KpiCardComparison title="MTTR" value={`${kpis.mttr} min`} icon={Clock} subtitle="Temps moyen réparation"
          currentNumeric={kpis.mttr} previousValue={prevKpis?.mttr} unit=" min" invertTrend />
        <KpiCardComparison title="Disponibilité" value={`${kpis.availability}%`} icon={Gauge} subtitle="MTBF/(MTBF+MTTR)"
          currentNumeric={kpis.availability} previousValue={prevKpis?.availability} unit="%" />
        <KpiCardComparison title="Arrêt moyen" value={`${kpis.avgArret} min`} icon={AlertTriangle} subtitle="Par ticket"
          currentNumeric={kpis.avgArret} previousValue={prevKpis?.avgArret} unit=" min" invertTrend />
        <KpiCardComparison title="Total pannes" value={kpis.totalFailures} icon={Wrench} subtitle={`${kpis.closedCount} clôturés`}
          currentNumeric={kpis.totalFailures} previousValue={prevKpis?.totalFailures} invertTrend />
        <KpiCardComparison title="Rendement" value={`${rendement}%`} icon={TrendingUp}
          currentNumeric={rendement} previousValue={df.compareEnabled ? prevRendement : undefined} unit="%" />
        <KpiCardComparison title="Produits actifs" value={products.length} icon={Package}
          subtitle={`${families.length} famille(s)`} />
        <KpiCardComparison title="Lignes actives" value={lines.length} icon={Factory}
          subtitle={`${fOfs.filter((o) => o.statut === "en_cours").length} OF en cours`} />
      </div>

      <Tabs defaultValue="maintenance" className="space-y-4">
        <TabsList className="h-11">
          <TabsTrigger value="maintenance" className="h-9">Maintenance</TabsTrigger>
          <TabsTrigger value="production" className="h-9">Production</TabsTrigger>
          <TabsTrigger value="consumption" className="h-9">Consommation</TabsTrigger>
          <TabsTrigger value="trends" className="h-9">Tendances</TabsTrigger>
        </TabsList>

        {/* Maintenance */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Tickets par machine (Top 10)</CardTitle></CardHeader>
              <CardContent>
                {ticketsByMachine.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p> : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={ticketsByMachine} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={55} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-base">Temps d'arrêt par machine (min)</CardTitle></CardHeader>
              <CardContent>
                {ticketsByMachine.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p> : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={ticketsByMachine} margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="downtime" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Production */}
        <TabsContent value="production" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Rendement par ligne</CardTitle></CardHeader>
              <CardContent>
                {yieldByLine.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p> : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={yieldByLine} margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
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
              <CardHeader className="pb-2"><CardTitle className="text-base">Rendement par shift</CardTitle></CardHeader>
              <CardContent>
                {yieldByShift.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p> : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={yieldByShift} margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="produced" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="scrap" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Yield by family */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FolderTree className="h-4 w-4" /> Rendement par famille produit</CardTitle></CardHeader>
              <CardContent>
                {yieldByFamily.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p> : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={yieldByFamily} margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
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

            {/* Production by product top 10 */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Production par produit (Top 10)</CardTitle></CardHeader>
              <CardContent>
                {prodByProduct.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p> : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={prodByProduct} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={55} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="produced" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Produit (kg)" />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Répartition des arrêts</CardTitle></CardHeader>
              <CardContent>
                {stopsByType.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p> : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <PieChart>
                      <Pie data={stopsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {stopsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Rendement par ligne (détail)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {yieldByLine.map((l) => (
                    <div key={l.name} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{l.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{l.produced.toLocaleString("fr-FR")} kg</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold tabular-nums ${l.yield >= 95 ? "text-success" : l.yield >= 85 ? "text-warning" : "text-destructive"}`}>{l.yield}%</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{l.scrap.toLocaleString("fr-FR")} kg rebut</p>
                      </div>
                    </div>
                  ))}
                  {yieldByLine.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Consumption */}
        <TabsContent value="consumption" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Écarts de consommation (Réel vs Prévu)</CardTitle></CardHeader>
              <CardContent>
                {consumptionGaps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun écart calculable</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <BarChart data={consumptionGaps} margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="article" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="expected" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Prévu" />
                      <Bar dataKey="actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Réel" />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Consumption by family */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FolderTree className="h-4 w-4" /> Consommation par famille article</CardTitle></CardHeader>
              <CardContent>
                {consByFamily.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p> : (
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <BarChart data={consByFamily} margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} name="Consommation" />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {consumptionGaps.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Détail des écarts</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {consumptionGaps.map((g) => (
                    <div key={g.article} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{g.article}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">Prévu: {g.expected} · Réel: {g.actual}</p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${g.gap > 0 ? "text-destructive" : g.gap < 0 ? "text-success" : "text-muted-foreground"}`}>
                        {g.gap > 0 ? "+" : ""}{g.gap}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <TrendChart
              title="Tickets maintenance"
              items={tickets}
              dateAccessor={(t) => t.heure_declaration}
              valueAccessor={() => 1}
              range={df.range}
              granularity={df.granularity}
              compareItems={df.compareEnabled ? tickets : undefined}
              compareRange={df.compareRange}
              chartType="bar"
              color="hsl(var(--primary))"
              valueLabel="Tickets"
            />
            <TrendChart
              title="Temps d'arrêt (min)"
              items={tickets.filter((t) => t.temps_arret_minutes)}
              dateAccessor={(t) => t.heure_declaration}
              valueAccessor={(t) => t.temps_arret_minutes || 0}
              range={df.range}
              granularity={df.granularity}
              compareItems={df.compareEnabled ? tickets.filter((t) => t.temps_arret_minutes) : undefined}
              compareRange={df.compareRange}
              color="hsl(var(--destructive))"
              valueLabel="Arrêt (min)"
            />
            <TrendChart
              title="Production (kg)"
              items={declarations}
              dateAccessor={(d) => d.heure_production}
              valueAccessor={(d) => d.quantite_produite || 0}
              range={df.range}
              granularity={df.granularity}
              compareItems={df.compareEnabled ? declarations : undefined}
              compareRange={df.compareRange}
              chartType="bar"
              color="hsl(var(--success))"
              valueLabel="Produit (kg)"
            />
            <TrendChart
              title="Rebuts (kg)"
              items={declarations}
              dateAccessor={(d) => d.heure_production}
              valueAccessor={(d) => d.quantite_rebut || 0}
              range={df.range}
              granularity={df.granularity}
              compareItems={df.compareEnabled ? declarations : undefined}
              compareRange={df.compareRange}
              color="hsl(var(--warning))"
              valueLabel="Rebut (kg)"
            />
            <TrendChart
              title="Arrêts production (min)"
              items={stops.filter((s) => s.duree_minutes)}
              dateAccessor={(s) => s.heure_debut}
              valueAccessor={(s) => s.duree_minutes || 0}
              range={df.range}
              granularity={df.granularity}
              compareItems={df.compareEnabled ? stops.filter((s) => s.duree_minutes) : undefined}
              compareRange={df.compareRange}
              color="hsl(var(--destructive))"
              valueLabel="Durée (min)"
              className="md:col-span-2"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
