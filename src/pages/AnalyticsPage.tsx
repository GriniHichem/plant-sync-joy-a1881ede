import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/gmao/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Legend } from "recharts";
import { Clock, TrendingUp, AlertTriangle, Factory, Wrench, BarChart3, Activity, Gauge } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))"];

export default function AnalyticsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [ofs, setOfs] = useState<any[]>([]);
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [recipeLines, setRecipeLines] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [tRes, mRes, oRes, dRes, sRes, cRes, rRes, rlRes, shRes, lRes] = await Promise.all([
        supabase.from("tickets").select("*, machines(code, designation)").order("heure_declaration", { ascending: false }),
        supabase.from("machines").select("*").eq("is_active", true),
        supabase.from("ordres_fabrication").select("*, products(designation, code), production_lines(designation, code)").order("created_at", { ascending: false }),
        supabase.from("production_declarations").select("*, shifts(shift_type, line_id, date_shift)"),
        supabase.from("production_stops").select("*, production_lines(designation, code)"),
        supabase.from("consumptions").select("*, articles(code, designation), ordres_fabrication(numero)"),
        supabase.from("recipes").select("*").eq("is_active", true),
        supabase.from("recipe_lines").select("*, articles(code, designation)"),
        supabase.from("shifts").select("*, production_lines(designation, code)"),
        supabase.from("production_lines").select("*").eq("is_active", true),
      ]);
      setTickets(tRes.data || []);
      setMachines(mRes.data || []);
      setOfs(oRes.data || []);
      setDeclarations(dRes.data || []);
      setStops(sRes.data || []);
      setConsumptions(cRes.data || []);
      setRecipes(rRes.data || []);
      setRecipeLines(rlRes.data || []);
      setShifts(shRes.data || []);
      setLines(lRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  // ─── MTBF & MTTR ───
  const kpis = useMemo(() => {
    const closedTickets = tickets.filter((t) => t.statut === "cloture" || t.statut === "resolu");
    const withIntervention = closedTickets.filter((t) => t.temps_intervention_minutes);
    const withArret = closedTickets.filter((t) => t.temps_arret_minutes);

    const mttr = withIntervention.length > 0
      ? Math.round(withIntervention.reduce((s, t) => s + t.temps_intervention_minutes, 0) / withIntervention.length)
      : 0;

    // MTBF: total operating hours / number of failures (simplified)
    const totalMachines = machines.length || 1;
    const totalFailures = tickets.filter((t) => t.statut !== "annule").length || 1;
    // Assume 30 days × 24h operating window
    const totalHours = totalMachines * 30 * 24;
    const mtbf = Math.round(totalHours / totalFailures);

    const avgArret = withArret.length > 0
      ? Math.round(withArret.reduce((s, t) => s + t.temps_arret_minutes, 0) / withArret.length)
      : 0;

    // Availability = MTBF / (MTBF + MTTR)
    const availability = mtbf > 0 && mttr > 0 ? Math.round((mtbf / (mtbf + mttr / 60)) * 100) : 100;

    return { mttr, mtbf, avgArret, availability, totalFailures, closedCount: closedTickets.length };
  }, [tickets, machines]);

  // ─── Tickets by machine (top 10) ───
  const ticketsByMachine = useMemo(() => {
    const map: Record<string, { name: string; count: number; downtime: number }> = {};
    tickets.forEach((t) => {
      const key = t.machine_id;
      const label = t.machines?.code || "?";
      if (!map[key]) map[key] = { name: label, count: 0, downtime: 0 };
      map[key].count++;
      map[key].downtime += t.temps_arret_minutes || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [tickets]);

  // ─── Stops by type ───
  const stopsByType = useMemo(() => {
    const map: Record<string, number> = {};
    stops.forEach((s) => {
      const type = s.type || "autre";
      map[type] = (map[type] || 0) + (s.duree_minutes || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [stops]);

  // ─── Yield by line ───
  const yieldByLine = useMemo(() => {
    const map: Record<string, { name: string; produced: number; scrap: number }> = {};
    ofs.forEach((of) => {
      const lineLabel = of.production_lines?.code || "Sans ligne";
      const key = of.line_id || "none";
      if (!map[key]) map[key] = { name: lineLabel, produced: 0, scrap: 0 };
      map[key].produced += of.quantite_produite || 0;
      map[key].scrap += of.quantite_rebut || 0;
    });
    return Object.values(map).map((v) => ({
      ...v,
      yield: v.produced > 0 ? Math.round(((v.produced - v.scrap) / v.produced) * 100) : 0,
    }));
  }, [ofs]);

  // ─── Yield by shift type ───
  const yieldByShift = useMemo(() => {
    const map: Record<string, { produced: number; scrap: number }> = {};
    declarations.forEach((d) => {
      const shiftType = d.shifts?.shift_type || "inconnu";
      if (!map[shiftType]) map[shiftType] = { produced: 0, scrap: 0 };
      map[shiftType].produced += d.quantite_produite || 0;
      map[shiftType].scrap += d.quantite_rebut || 0;
    });
    const labels: Record<string, string> = { matin: "Matin", apres_midi: "Après-midi", nuit: "Nuit" };
    return Object.entries(map).map(([key, v]) => ({
      name: labels[key] || key,
      produced: v.produced,
      scrap: v.scrap,
      yield: v.produced > 0 ? Math.round(((v.produced - v.scrap) / v.produced) * 100) : 0,
    }));
  }, [declarations]);

  // ─── Consumption gaps (actual vs recipe) ───
  const consumptionGaps = useMemo(() => {
    // Group consumptions by OF, then compare with recipe expected
    const ofConsumptions: Record<string, Record<string, number>> = {};
    consumptions.forEach((c) => {
      const ofId = c.of_id;
      const artId = c.article_id;
      if (!ofConsumptions[ofId]) ofConsumptions[ofId] = {};
      ofConsumptions[ofId][artId] = (ofConsumptions[ofId][artId] || 0) + c.quantite;
    });

    const gaps: { article: string; expected: number; actual: number; gap: number }[] = [];
    const articleGaps: Record<string, { expected: number; actual: number }> = {};

    ofs.forEach((of) => {
      if (!of.recipe_id) return;
      const ofCons = ofConsumptions[of.id] || {};
      const rLines = recipeLines.filter((rl) => rl.recipe_id === of.recipe_id);
      const ratio = of.quantite_produite > 0 ? of.quantite_produite : of.quantite_prevue;

      rLines.forEach((rl) => {
        const expected = rl.quantite * (ratio || 1);
        const actual = ofCons[rl.article_id] || 0;
        const artLabel = rl.articles?.code || rl.article_id.slice(0, 8);
        if (!articleGaps[artLabel]) articleGaps[artLabel] = { expected: 0, actual: 0 };
        articleGaps[artLabel].expected += expected;
        articleGaps[artLabel].actual += actual;
      });
    });

    return Object.entries(articleGaps)
      .map(([article, v]) => ({
        article,
        expected: Math.round(v.expected * 100) / 100,
        actual: Math.round(v.actual * 100) / 100,
        gap: Math.round((v.actual - v.expected) * 100) / 100,
      }))
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
      .slice(0, 10);
  }, [consumptions, ofs, recipeLines]);

  // ─── Maintenance impact: downtime by month ───
  const maintenanceImpact = useMemo(() => {
    const map: Record<string, { month: string; downtime: number; tickets: number }> = {};
    tickets.forEach((t) => {
      const d = new Date(t.heure_declaration);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { month: label, downtime: 0, tickets: 0 };
      map[key].downtime += t.temps_arret_minutes || 0;
      map[key].tickets++;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const chartConfig = {
    count: { label: "Tickets", color: "hsl(var(--primary))" },
    downtime: { label: "Arrêt (min)", color: "hsl(var(--destructive))" },
    tickets: { label: "Tickets", color: "hsl(var(--primary))" },
    produced: { label: "Produit", color: "hsl(var(--success))" },
    scrap: { label: "Rebut", color: "hsl(var(--destructive))" },
    yield: { label: "Rendement %", color: "hsl(var(--primary))" },
    expected: { label: "Prévu", color: "hsl(var(--muted-foreground))" },
    actual: { label: "Réel", color: "hsl(var(--primary))" },
    value: { label: "Durée (min)", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analyse & KPI</h1>
        <p className="text-muted-foreground">Indicateurs avancés maintenance & production</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard title="MTBF" value={`${kpis.mtbf}h`} icon={Activity} subtitle="Temps moyen entre pannes" />
        <KpiCard title="MTTR" value={`${kpis.mttr} min`} icon={Clock} subtitle="Temps moyen de réparation" />
        <KpiCard title="Disponibilité" value={`${kpis.availability}%`} icon={Gauge} trend={kpis.availability >= 90 ? "up" : "down"} subtitle="MTBF/(MTBF+MTTR)" />
        <KpiCard title="Arrêt moyen" value={`${kpis.avgArret} min`} icon={AlertTriangle} subtitle="Par ticket" />
        <KpiCard title="Total pannes" value={kpis.totalFailures} icon={Wrench} subtitle={`${kpis.closedCount} clôturés`} />
        <KpiCard title="Lignes actives" value={lines.length} icon={Factory} subtitle={`${ofs.filter((o) => o.statut === "en_cours").length} OF en cours`} />
      </div>

      <Tabs defaultValue="maintenance" className="space-y-4">
        <TabsList className="h-11">
          <TabsTrigger value="maintenance" className="h-9">Maintenance</TabsTrigger>
          <TabsTrigger value="production" className="h-9">Production</TabsTrigger>
          <TabsTrigger value="consumption" className="h-9">Consommation</TabsTrigger>
        </TabsList>

        {/* ─── TAB: Maintenance ─── */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Tickets by machine */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tickets par machine (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                {ticketsByMachine.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                ) : (
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

            {/* Maintenance impact over time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Impact maintenance (arrêts / mois)</CardTitle>
              </CardHeader>
              <CardContent>
                {maintenanceImpact.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <LineChart data={maintenanceImpact} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="downtime" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="tickets" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Downtime by machine */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Temps d'arrêt par machine (min)</CardTitle>
              </CardHeader>
              <CardContent>
                {ticketsByMachine.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
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

        {/* ─── TAB: Production ─── */}
        <TabsContent value="production" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Yield by line */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rendement par ligne</CardTitle>
              </CardHeader>
              <CardContent>
                {yieldByLine.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                ) : (
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

            {/* Yield by shift */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rendement par shift</CardTitle>
              </CardHeader>
              <CardContent>
                {yieldByShift.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                ) : (
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

            {/* Stops by type (pie) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Répartition des arrêts</CardTitle>
              </CardHeader>
              <CardContent>
                {stopsByType.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <PieChart>
                      <Pie data={stopsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {stopsByType.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Production overview table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rendement par ligne (détail)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {yieldByLine.map((l) => (
                    <div key={l.name} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{l.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{l.produced.toLocaleString("fr-FR")} kg produits</p>
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

        {/* ─── TAB: Consumption ─── */}
        <TabsContent value="consumption" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Écarts de consommation (Réel vs Prévu par recette)</CardTitle>
            </CardHeader>
            <CardContent>
              {consumptionGaps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun écart calculable — liez des recettes aux OF pour voir les écarts</p>
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

          {consumptionGaps.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Détail des écarts</CardTitle>
              </CardHeader>
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
      </Tabs>
    </div>
  );
}
