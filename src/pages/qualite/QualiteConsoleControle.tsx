import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gauge, AlertTriangle, ClipboardCheck, Users, RefreshCw, ArrowRight } from "lucide-react";

interface OFRow { id: string; numero: string; product_id: string | null; line_id: string | null; }
interface OfStatus {
  of: OFRow;
  productLabel: string;
  lineLabel: string;
  required: number;
  due: number;
  overdue: number;
  todayChecks: number;
  todayNonConform: number;
}
interface ControllerRow { userId: string; name: string; total: number; nonConform: number; }

const labelOf = (r?: { name?: string | null; designation?: string | null; code?: string | null; id?: string } | null) =>
  r ? (r.name || r.designation || r.code || (r.id ? r.id.slice(0, 6) : "—")) : "—";

export default function QualiteConsoleControle() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<OfStatus[]>([]);
  const [controllers, setControllers] = useState<ControllerRow[]>([]);
  const [recentNc, setRecentNc] = useState<any[]>([]);
  const [conformityRate, setConformityRate] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const isoToday = todayStart.toISOString();

    const [ofRes, prodRes, lineRes, checkRes, profRes] = await Promise.all([
      (supabase as any).from("ordres_fabrication").select("id, numero, product_id, line_id")
        .eq("statut", "en_cours").order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("products").select("id, name, designation, code"),
      (supabase as any).from("production_lines").select("id, name, designation, code"),
      (supabase as any).from("quality_checks")
        .select("id, of_id, indicator_id, control_time, is_conform, controlled_by")
        .gte("control_time", isoToday).order("control_time", { ascending: false }).limit(1000),
      (supabase as any).from("profiles").select("id, full_name"),
    ]);

    if (ofRes.error) toast({ title: "Erreur", description: ofRes.error.message, variant: "destructive" });

    const prodById = new Map((prodRes.data || []).map((p: any) => [p.id, p]));
    const lineById = new Map((lineRes.data || []).map((l: any) => [l.id, l]));
    const nameById = new Map((profRes.data || []).map((p: any) => [p.id, p.full_name]));
    const ofs: OFRow[] = ofRes.data || [];
    const checks: any[] = checkRes.data || [];

    // Conformity rate (today)
    const decided = checks.filter((c) => c.is_conform != null);
    setConformityRate(decided.length ? Math.round((decided.filter((c) => c.is_conform).length / decided.length) * 100) : null);

    // Controller activity
    const byUser = new Map<string, ControllerRow>();
    checks.forEach((c) => {
      if (!c.controlled_by) return;
      const row = byUser.get(c.controlled_by) ?? { userId: c.controlled_by, name: nameById.get(c.controlled_by) || "—", total: 0, nonConform: 0 };
      row.total += 1;
      if (c.is_conform === false) row.nonConform += 1;
      byUser.set(c.controlled_by, row);
    });
    setControllers(Array.from(byUser.values()).sort((a, b) => b.total - a.total));

    // Recent NC today
    setRecentNc(checks.filter((c) => c.is_conform === false).slice(0, 8));

    // Per-OF status via RPC (parallel)
    const perOf = await Promise.all(ofs.map(async (of) => {
      const { data } = await (supabase as any).rpc("get_quality_indicators_for_of", { p_of_id: of.id });
      const req = (data || []).filter((i: any) => i.effective_is_required);
      const ofChecks = checks.filter((c) => c.of_id === of.id);
      const lastByInd: Record<string, string> = {};
      ofChecks.forEach((c) => { if (!lastByInd[c.indicator_id]) lastByInd[c.indicator_id] = c.control_time; });
      let due = 0, overdue = 0;
      req.forEach((i: any) => {
        const last = lastByInd[i.indicator_id];
        const mins = i.effective_frequency_minutes;
        if (!last) { due += 1; return; }
        if (mins && mins > 0) {
          const elapsed = (Date.now() - new Date(last).getTime()) / 60000;
          if (elapsed >= mins) { overdue += 1; due += 1; }
        }
      });
      return {
        of,
        productLabel: labelOf(prodById.get(of.product_id || "") as any),
        lineLabel: labelOf(lineById.get(of.line_id || "") as any),
        required: req.length,
        due,
        overdue,
        todayChecks: ofChecks.length,
        todayNonConform: ofChecks.filter((c) => c.is_conform === false).length,
      } as OfStatus;
    }));
    perOf.sort((a, b) => b.overdue - a.overdue || b.due - a.due);
    setStatuses(perOf);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => ({
    ofs: statuses.length,
    due: statuses.reduce((s, o) => s + o.due, 0),
    overdue: statuses.reduce((s, o) => s + o.overdue, 0),
    nc: statuses.reduce((s, o) => s + o.todayNonConform, 0),
  }), [statuses]);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Gauge className="h-6 w-6 text-primary" />
            Console Responsable Contrôle
          </h1>
          <p className="text-sm text-muted-foreground">Pilotage en temps réel des contrôles qualité en ligne (aujourd'hui)</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><ClipboardCheck className="h-3.5 w-3.5" /> OF en cours</div>
          <div className="text-2xl font-semibold">{totals.ofs}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Contrôles dus</div>
          <div className="text-2xl font-semibold text-amber-600">{totals.due}</div>
          <div className="text-xs text-muted-foreground">dont {totals.overdue} en retard</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Non conformités (jour)</div>
          <div className="text-2xl font-semibold text-destructive">{totals.nc}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Taux de conformité (jour)</div>
          <div className="text-2xl font-semibold">{conformityRate == null ? "—" : `${conformityRate}%`}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ordres de fabrication en cours</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OF</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Ligne</TableHead>
                <TableHead className="text-center">Contrôles requis</TableHead>
                <TableHead className="text-center">À saisir</TableHead>
                <TableHead className="text-center">En retard</TableHead>
                <TableHead className="text-center">NC (jour)</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Chargement…</TableCell></TableRow>
              ) : statuses.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Aucun OF en cours</TableCell></TableRow>
              ) : statuses.map((s) => (
                <TableRow key={s.of.id} className={s.overdue > 0 ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium">{s.of.numero}</TableCell>
                  <TableCell>{s.productLabel}</TableCell>
                  <TableCell>{s.lineLabel}</TableCell>
                  <TableCell className="text-center">{s.required}</TableCell>
                  <TableCell className="text-center">{s.due > 0 ? <Badge variant="outline" className="border-amber-500 text-amber-600">{s.due}</Badge> : "—"}</TableCell>
                  <TableCell className="text-center">{s.overdue > 0 ? <Badge variant="destructive">{s.overdue}</Badge> : "—"}</TableCell>
                  <TableCell className="text-center">{s.todayNonConform > 0 ? <Badge variant="destructive">{s.todayNonConform}</Badge> : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/qualite/saisie?of=${s.of.id}`}>Saisir <ArrowRight className="h-4 w-4 ml-1" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Activité des contrôleurs (jour)</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrôleur</TableHead>
                  <TableHead className="text-center">Contrôles</TableHead>
                  <TableHead className="text-center">Non conformes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controllers.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Aucune saisie aujourd'hui</TableCell></TableRow>
                ) : controllers.map((c) => (
                  <TableRow key={c.userId}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-center">{c.total}</TableCell>
                    <TableCell className="text-center">{c.nonConform > 0 ? <Badge variant="destructive">{c.nonConform}</Badge> : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Dernières non-conformités</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-2">
            {recentNc.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune non-conformité aujourd'hui.</p>
            ) : recentNc.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-1.5">
                <span>{statuses.find((s) => s.of.id === c.of_id)?.of.numero ?? c.of_id.slice(0, 6)}</span>
                <span className="text-muted-foreground">{new Date(c.control_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link to="/qualite/controles">Voir la traçabilité complète</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
