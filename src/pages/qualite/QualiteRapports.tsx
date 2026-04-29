import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Download, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";
import { notifyActionsOverdue } from "@/lib/qualityNotifications";
import {
  computeConformityByGroup,
  countNcBy,
  listOutOfTolerance,
  listOverdueActions,
  countOfsByQualityStatus,
  computeTheoreticalVsReal,
  type CheckRow,
  type NcRow,
  type ActionRow,
  type OfLite,
  type BomItem,
  type ConsumptionRow,
} from "./components/RapportsHelpers";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function QualiteRapports() {
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [ncs, setNcs] = useState<NcRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [ofs, setOfs] = useState<OfLite[]>([]);
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [cons, setCons] = useState<ConsumptionRow[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Record<string, string>>({});
  const [articles, setArticles] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const dateFilter = (q: any) => {
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", `${to}T23:59:59`);
      return q;
    };
    const [c1, c2, c3, c4, c5, c6, p, l, a] = await Promise.all([
      dateFilter((supabase as any).from("quality_checks").select("id, of_id, is_conform, control_time, created_at").limit(2000)),
      dateFilter((supabase as any).from("quality_non_conformities").select("id, nc_type, severity, status, created_at").limit(2000)),
      (supabase as any).from("quality_actions").select("id, status, due_date, responsible_user_id"),
      (supabase as any).from("ordres_fabrication").select("id, numero, product_id, line_id, bom_id, quantite_produite, quality_status").limit(2000),
      (supabase as any).from("bom_items").select("bom_id, article_id, quantity_per_unit"),
      (supabase as any).from("consumptions").select("of_id, article_id, quantite"),
      (supabase as any).from("products").select("id, code, designation"),
      (supabase as any).from("production_lines").select("id, code, designation"),
      (supabase as any).from("articles").select("id, code, designation"),
    ]);
    setChecks((c1.data ?? []) as CheckRow[]);
    setNcs((c2.data ?? []) as NcRow[]);
    setActions((c3.data ?? []) as ActionRow[]);
    setOfs((c4.data ?? []) as OfLite[]);
    setBomItems((c5.data ?? []) as BomItem[]);
    setCons((c6.data ?? []) as ConsumptionRow[]);
    setProducts(Object.fromEntries((p.data ?? []).map((x: any) => [x.id, `${x.code} – ${x.designation}`])));
    setLines(Object.fromEntries((l.data ?? []).map((x: any) => [x.id, `${x.code} – ${x.designation}`])));
    setArticles(Object.fromEntries((a.data ?? []).map((x: any) => [x.id, `${x.code} – ${x.designation}`])));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  const byProduct = useMemo(() => computeConformityByGroup(checks, ofs, "product_id"), [checks, ofs]);
  const byLine = useMemo(() => computeConformityByGroup(checks, ofs, "line_id"), [checks, ofs]);
  const ncByType = useMemo(() => countNcBy(ncs, "nc_type"), [ncs]);
  const ncBySeverity = useMemo(() => countNcBy(ncs, "severity"), [ncs]);
  const oot = useMemo(() => listOutOfTolerance(checks), [checks]);
  const overdue = useMemo(() => listOverdueActions(actions, todayIso()), [actions]);
  const ofStatusCounts = useMemo(() => countOfsByQualityStatus(ofs), [ofs]);
  const theoreticalVsReal = useMemo(() => computeTheoreticalVsReal(ofs, bomItems, cons), [ofs, bomItems, cons]);

  // Best-effort overdue notification — dedup is per day
  useEffect(() => {
    if (!loading && overdue.length > 0) { notifyActionsOverdue(overdue.length).catch(() => {}); }
  }, [loading, overdue.length]);

  const filtersActive = from !== "" || to !== "";
  const reset = () => { setFrom(""); setTo(""); };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Rapports qualité</h1>
        <p className="text-muted-foreground">Synthèses et exports CSV.</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm">Du</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-sm">au</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-4 w-4 mr-1" />Réinitialiser</Button>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <Tabs defaultValue="conformity">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="conformity">Conformité</TabsTrigger>
            <TabsTrigger value="nc">Non-conformités</TabsTrigger>
            <TabsTrigger value="oot">Hors tolérance</TabsTrigger>
            <TabsTrigger value="overdue">Actions en retard</TabsTrigger>
            <TabsTrigger value="ofs">OFs</TabsTrigger>
            <TabsTrigger value="theo">Théorique vs réel</TabsTrigger>
          </TabsList>

          <TabsContent value="conformity" className="pt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Par produit</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportToCsv(byProduct.map((r) => ({ produit: products[r.group_id] ?? r.group_id, total: r.total, conform: r.conform, taux: (r.rate * 100).toFixed(1) + "%" })), [{ key: "produit", label: "Produit" }, { key: "total", label: "Total" }, { key: "conform", label: "Conformes" }, { key: "taux", label: "Taux" }], "conformite_produit")}>
                  <Download className="h-4 w-4 mr-1" />CSV
                </Button>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground"><th>Produit</th><th>Total</th><th>Conformes</th><th>Taux</th></tr></thead>
                  <tbody>{byProduct.map((r) => (
                    <tr key={r.group_id}><td>{products[r.group_id] ?? "—"}</td><td>{r.total}</td><td>{r.conform}</td><td>{(r.rate * 100).toFixed(1)}%</td></tr>
                  ))}</tbody>
                </table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Par ligne</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportToCsv(byLine.map((r) => ({ ligne: lines[r.group_id] ?? r.group_id, total: r.total, conform: r.conform, taux: (r.rate * 100).toFixed(1) + "%" })), [{ key: "ligne", label: "Ligne" }, { key: "total", label: "Total" }, { key: "conform", label: "Conformes" }, { key: "taux", label: "Taux" }], "conformite_ligne")}>
                  <Download className="h-4 w-4 mr-1" />CSV
                </Button>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground"><th>Ligne</th><th>Total</th><th>Conformes</th><th>Taux</th></tr></thead>
                  <tbody>{byLine.map((r) => (
                    <tr key={r.group_id}><td>{lines[r.group_id] ?? "—"}</td><td>{r.total}</td><td>{r.conform}</td><td>{(r.rate * 100).toFixed(1)}%</td></tr>
                  ))}</tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nc" className="pt-4 grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">NC par type</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportToCsv(ncByType, [{ key: "key", label: "Type" }, { key: "count", label: "Nombre" }], "nc_par_type")}><Download className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent><table className="w-full text-sm"><tbody>{ncByType.map((r) => (<tr key={r.key}><td>{r.key}</td><td className="text-right">{r.count}</td></tr>))}</tbody></table></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">NC par gravité</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportToCsv(ncBySeverity, [{ key: "key", label: "Gravité" }, { key: "count", label: "Nombre" }], "nc_par_gravite")}><Download className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent><table className="w-full text-sm"><tbody>{ncBySeverity.map((r) => (<tr key={r.key}><td>{r.key}</td><td className="text-right">{r.count}</td></tr>))}</tbody></table></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="oot" className="pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Contrôles hors tolérance</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportToCsv(oot as any[], [{ key: "control_time", label: "Date" }, { key: "of_id", label: "OF" }, { key: "is_conform", label: "Conforme" }], "controles_hors_tolerance")}><Download className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{oot.length} contrôle(s) hors tolérance.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overdue" className="pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Actions qualité en retard</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportToCsv(overdue as any[], [{ key: "id", label: "ID" }, { key: "status", label: "Statut" }, { key: "due_date", label: "Échéance" }], "actions_en_retard")}><Download className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{overdue.length} action(s) en retard.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ofs" className="pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">OFs par statut qualité</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportToCsv(ofStatusCounts, [{ key: "key", label: "Statut" }, { key: "count", label: "Nombre" }], "ofs_par_statut_qualite")}><Download className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm"><tbody>{ofStatusCounts.map((r) => (<tr key={r.key}><td>{r.key}</td><td className="text-right">{r.count}</td></tr>))}</tbody></table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theo" className="pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Théorique vs réel</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportToCsv(theoreticalVsReal.map((r) => ({ of: r.of_numero, article: articles[r.article_id] ?? r.article_id, theo: r.theoretical, real: r.real, gap: r.gap, gap_pct: r.gap_pct == null ? "" : (r.gap_pct * 100).toFixed(1) + "%" })), [{ key: "of", label: "OF" }, { key: "article", label: "Article" }, { key: "theo", label: "Théorique" }, { key: "real", label: "Réel" }, { key: "gap", label: "Écart" }, { key: "gap_pct", label: "Écart %" }], "theorique_vs_reel")}><Download className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                {theoreticalVsReal.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée disponible (OFs sans nomenclature liée).</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-muted-foreground"><th>OF</th><th>Article</th><th>Théorique</th><th>Réel</th><th>Écart</th><th>%</th></tr></thead>
                    <tbody>{theoreticalVsReal.map((r, i) => (
                      <tr key={i}><td>{r.of_numero}</td><td>{articles[r.article_id] ?? r.article_id}</td><td>{r.theoretical.toFixed(2)}</td><td>{r.real.toFixed(2)}</td><td>{r.gap.toFixed(2)}</td><td>{r.gap_pct == null ? "—" : (r.gap_pct * 100).toFixed(1) + "%"}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
