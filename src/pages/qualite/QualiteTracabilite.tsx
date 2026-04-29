import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Search, Lock, Unlock, AlertTriangle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import {
  notifyOfQualityPending,
} from "@/lib/qualityNotifications";
import {
  buildTracabiliteCsv,
  downloadTracabiliteCsv,
  type TracabilitePayload,
} from "./components/TracabiliteCsv";

const ALL = "__all__";

type OfRow = {
  id: string;
  numero: string;
  product_id: string | null;
  line_id: string | null;
  recipe_id: string | null;
  bom_id: string | null;
  statut: string | null;
  quality_status: string | null;
  quantite_prevue: number | null;
  quantite_produite: number | null;
  quantite_rebut: number | null;
};

const QUALITY_STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  libere: "Libéré",
  bloque: "Bloqué",
  rebut: "Rebut",
};

const QUALITY_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  en_attente: "secondary",
  libere: "default",
  bloque: "destructive",
  rebut: "outline",
};

export default function QualiteTracabilite() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ofs, setOfs] = useState<OfRow[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Record<string, string>>({});
  const [recipes, setRecipes] = useState<Record<string, { name: string; version: number | null }>>({});
  const [boms, setBoms] = useState<Record<string, { version: number | null }>>({});
  const [articles, setArticles] = useState<Record<string, string>>({});
  const [indicators, setIndicators] = useState<Record<string, string>>({});

  const [filterQ, setFilterQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>(ALL);
  const [openOf, setOpenOf] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, TracabilitePayload | undefined>>({});
  const [decisionFor, setDecisionFor] = useState<OfRow | null>(null);
  const [decision, setDecision] = useState<string>("en_attente");
  const [decisionReason, setDecisionReason] = useState<string>("");
  const [savingDecision, setSavingDecision] = useState(false);

  const filtersActive = filterQ !== "" || filterStatus !== ALL;

  const load = async () => {
    setLoading(true);
    const [ofRes, prodRes, lineRes, recRes, bomRes, artRes, indRes] = await Promise.all([
      (supabase as any).from("ordres_fabrication").select("id, numero, product_id, line_id, recipe_id, bom_id, statut, quality_status, quantite_prevue, quantite_produite, quantite_rebut").order("created_at", { ascending: false }).limit(200),
      (supabase as any).from("products").select("id, code, designation"),
      (supabase as any).from("production_lines").select("id, code, designation"),
      (supabase as any).from("recipes").select("id, name, version"),
      (supabase as any).from("bill_of_materials").select("id, version"),
      (supabase as any).from("articles").select("id, code, designation"),
      (supabase as any).from("quality_indicators").select("id, code, name"),
    ]);
    setOfs((ofRes.data ?? []) as OfRow[]);
    setProducts(Object.fromEntries((prodRes.data ?? []).map((p: any) => [p.id, `${p.code} – ${p.designation}`])));
    setLines(Object.fromEntries((lineRes.data ?? []).map((l: any) => [l.id, `${l.code} – ${l.designation}`])));
    setRecipes(Object.fromEntries((recRes.data ?? []).map((r: any) => [r.id, { name: r.name, version: r.version ?? null }])));
    setBoms(Object.fromEntries((bomRes.data ?? []).map((b: any) => [b.id, { version: b.version ?? null }])));
    setArticles(Object.fromEntries((artRes.data ?? []).map((a: any) => [a.id, `${a.code} – ${a.designation}`])));
    setIndicators(Object.fromEntries((indRes.data ?? []).map((i: any) => [i.id, `${i.code} – ${i.name}`])));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const q = filterQ.trim().toLowerCase();
    return ofs.filter((o) => {
      if (filterStatus !== ALL && (o.quality_status ?? "en_attente") !== filterStatus) return false;
      if (q) {
        const hay = [
          o.numero,
          products[o.product_id ?? ""] ?? "",
          lines[o.line_id ?? ""] ?? "",
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ofs, filterQ, filterStatus, products, lines]);

  const loadDetails = async (ofId: string) => {
    if (details[ofId]) return;
    const o = ofs.find((x) => x.id === ofId);
    if (!o) return;
    const [shiftsRes, consRes, checksRes, ncsRes, actsRes, teamsRes, profilesRes] = await Promise.all([
      (supabase as any).from("shifts").select("id, date_shift, shift_type, shift_team_id, chef_ligne_id").eq("of_id", ofId),
      (supabase as any).from("consumptions").select("article_id, quantite, unite, lot_number, batch_number, supplier_lot, expiry_date").eq("of_id", ofId),
      (supabase as any).from("quality_checks").select("id, control_time, indicator_id, measured_value_numeric, measured_value_text, measured_value_boolean, selected_value, is_conform").eq("of_id", ofId).order("control_time", { ascending: false }),
      (supabase as any).from("quality_non_conformities").select("id, nc_number, title, severity, status, decision").eq("of_id", ofId).order("created_at", { ascending: false }),
      (supabase as any).from("quality_actions").select("id, title, action_type, status, due_date").eq("of_id", ofId).order("created_at", { ascending: false }),
      (supabase as any).from("shift_teams").select("id, name"),
      (supabase as any).from("profiles").select("user_id, first_name, last_name"),
    ]);
    const teamMap = new Map((teamsRes.data ?? []).map((t: any) => [t.id, t.name]));
    const profMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()]));

    const recipe = o.recipe_id ? recipes[o.recipe_id] : null;
    const bom = o.bom_id ? boms[o.bom_id] : null;
    const payload: TracabilitePayload = {
      of: {
        numero: o.numero,
        product_label: products[o.product_id ?? ""] ?? null,
        line_label: lines[o.line_id ?? ""] ?? null,
        statut: o.statut,
        quality_status: o.quality_status,
        recipe_label: recipe ? `${recipe.name}${recipe.version != null ? ` v${recipe.version}` : ""}` : null,
        bom_label: bom ? `BOM v${bom.version ?? "?"}` : null,
        quantite_prevue: o.quantite_prevue,
        quantite_produite: o.quantite_produite,
        quantite_rebut: o.quantite_rebut,
      },
      shifts: (shiftsRes.data ?? []).map((s: any) => ({
        date_shift: s.date_shift,
        shift_type: s.shift_type,
        team_label: s.shift_team_id ? (teamMap.get(s.shift_team_id) as string) : null,
        chef_label: s.chef_ligne_id ? (profMap.get(s.chef_ligne_id) as string) : null,
      })),
      consumptions: (consRes.data ?? []).map((c: any) => ({
        article_label: articles[c.article_id ?? ""] ?? "—",
        quantite: c.quantite,
        unite: c.unite,
        lot_number: c.lot_number,
        batch_number: c.batch_number,
        supplier_lot: c.supplier_lot,
        expiry_date: c.expiry_date,
      })),
      checks: (checksRes.data ?? []).map((c: any) => ({
        control_time: c.control_time,
        indicator_label: indicators[c.indicator_id] ?? "—",
        measured: c.measured_value_numeric ?? c.measured_value_text ?? c.selected_value ?? (c.measured_value_boolean == null ? "" : c.measured_value_boolean ? "OUI" : "NON"),
        is_conform: c.is_conform,
      })),
      ncs: (ncsRes.data ?? []).map((n: any) => ({
        nc_number: n.nc_number,
        title: n.title,
        severity: n.severity,
        status: n.status,
        decision: n.decision,
      })),
      actions: (actsRes.data ?? []).map((a: any) => ({
        title: a.title,
        action_type: a.action_type,
        status: a.status,
        due_date: a.due_date,
      })),
    };
    setDetails((prev) => ({ ...prev, [ofId]: payload }));
  };

  const toggleOpen = async (id: string) => {
    if (openOf === id) { setOpenOf(null); return; }
    setOpenOf(id);
    await loadDetails(id);
  };

  const handleExport = (ofId: string) => {
    const p = details[ofId];
    if (!p) return;
    downloadTracabiliteCsv(p);
  };

  const openDecision = (o: OfRow) => {
    setDecisionFor(o);
    setDecision(o.quality_status ?? "en_attente");
    setDecisionReason("");
  };

  const saveDecision = async () => {
    if (!decisionFor) return;
    if (!decision) { toast({ title: "Décision requise", variant: "destructive" }); return; }
    setSavingDecision(true);
    const { error } = await (supabase as any).rpc("set_of_quality_status", {
      p_of_id: decisionFor.id,
      p_status: decision,
      p_reason: decisionReason || null,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSavingDecision(false);
      return;
    }
    await logAudit({
      action_type: "update",
      module: "qualite" as any,
      entity_type: "of",
      entity_id: decisionFor.id,
      entity_code: decisionFor.numero,
      entity_label: decisionFor.numero,
      action_label: `Décision qualité OF : ${QUALITY_STATUS_LABELS[decision] ?? decision}`,
      old_values: { quality_status: decisionFor.quality_status },
      new_values: { quality_status: decision, reason: decisionReason || null },
      severity: decision === "bloque" || decision === "rebut" ? "high" : "info",
    });
    if (decision === "en_attente") {
      await notifyOfQualityPending({
        entity_id: decisionFor.id,
        entity_code: decisionFor.numero,
        entity_label: decisionFor.numero,
      });
    }
    toast({ title: "Statut qualité mis à jour" });
    setDecisionFor(null);
    setSavingDecision(false);
    setDetails((prev) => ({ ...prev, [decisionFor.id]: undefined as any }));
    load();
  };

  const resetFilters = () => { setFilterQ(""); setFilterStatus(ALL); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Traçabilité OF</h1>
          <p className="text-muted-foreground">Vue complète : recette, nomenclature, consommations, contrôles, NC, actions.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher OF, produit, ligne…" className="pl-8" value={filterQ} onChange={(e) => setFilterQ(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut qualité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="libere">Libéré</SelectItem>
              <SelectItem value="bloque">Bloqué</SelectItem>
              <SelectItem value="rebut">Rebut</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="h-4 w-4 mr-1" />Réinitialiser</Button>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">Aucun OF.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const qs = o.quality_status ?? "en_attente";
            const recipe = o.recipe_id ? recipes[o.recipe_id] : null;
            const bom = o.bom_id ? boms[o.bom_id] : null;
            const isOpen = openOf === o.id;
            const detail = details[o.id];
            return (
              <Card key={o.id}>
                <CardHeader className="cursor-pointer" onClick={() => toggleOpen(o.id)}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">{o.numero}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {products[o.product_id ?? ""] ?? "—"} · {lines[o.line_id ?? ""] ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{recipe ? `${recipe.name} v${recipe.version ?? "?"}` : "Pas de recette"}</Badge>
                      <Badge variant="outline">{bom ? `BOM v${bom.version ?? "?"}` : "Pas de BOM"}</Badge>
                      <Badge variant={QUALITY_STATUS_VARIANT[qs] ?? "secondary"}>{QUALITY_STATUS_LABELS[qs] ?? qs}</Badge>
                    </div>
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-4">
                    {!detail ? (
                      <p className="text-sm text-muted-foreground">Chargement des détails…</p>
                    ) : (
                      <Tabs defaultValue="overview">
                        <TabsList>
                          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                          <TabsTrigger value="shifts">Shifts ({detail.shifts.length})</TabsTrigger>
                          <TabsTrigger value="cons">Consommations ({detail.consumptions.length})</TabsTrigger>
                          <TabsTrigger value="checks">Contrôles ({detail.checks.length})</TabsTrigger>
                          <TabsTrigger value="ncs">NC ({detail.ncs.length})</TabsTrigger>
                          <TabsTrigger value="actions">Actions ({detail.actions.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="text-sm space-y-1 pt-3">
                          <div>Quantité prévue : <strong>{detail.of.quantite_prevue ?? "—"}</strong></div>
                          <div>Quantité produite : <strong>{detail.of.quantite_produite ?? "—"}</strong></div>
                          <div>Rebut : <strong>{detail.of.quantite_rebut ?? "—"}</strong></div>
                          <div>Recette : <strong>{detail.of.recipe_label ?? "—"}</strong></div>
                          <div>Nomenclature : <strong>{detail.of.bom_label ?? "non lié"}</strong></div>
                        </TabsContent>
                        <TabsContent value="shifts" className="pt-3">
                          {detail.shifts.length === 0 ? <p className="text-sm text-muted-foreground">Aucun shift.</p> : (
                            <ul className="text-sm space-y-1">{detail.shifts.map((s, i) => (
                              <li key={i}>{s.date_shift} · {s.shift_type} · {s.team_label ?? "—"} · {s.chef_label ?? "—"}</li>
                            ))}</ul>
                          )}
                        </TabsContent>
                        <TabsContent value="cons" className="pt-3">
                          {detail.consumptions.length === 0 ? <p className="text-sm text-muted-foreground">Aucune consommation.</p> : (
                            <table className="text-sm w-full">
                              <thead><tr className="text-left text-muted-foreground"><th>Article</th><th>Qté</th><th>Unité</th><th>Lot</th><th>Batch</th><th>Lot four.</th><th>Péremption</th></tr></thead>
                              <tbody>{detail.consumptions.map((c, i) => (
                                <tr key={i}><td>{c.article_label}</td><td>{c.quantite ?? "—"}</td><td>{c.unite ?? "—"}</td><td>{c.lot_number ?? "—"}</td><td>{c.batch_number ?? "—"}</td><td>{c.supplier_lot ?? "—"}</td><td>{c.expiry_date ?? "—"}</td></tr>
                              ))}</tbody>
                            </table>
                          )}
                        </TabsContent>
                        <TabsContent value="checks" className="pt-3">
                          {detail.checks.length === 0 ? <p className="text-sm text-muted-foreground">Aucun contrôle.</p> : (
                            <ul className="text-sm space-y-1">{detail.checks.map((c, i) => (
                              <li key={i} className="flex items-center gap-2">
                                {c.is_conform === false && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                <span>{new Date(c.control_time).toLocaleString()} · {c.indicator_label} · {String(c.measured)}</span>
                              </li>
                            ))}</ul>
                          )}
                        </TabsContent>
                        <TabsContent value="ncs" className="pt-3">
                          {detail.ncs.length === 0 ? <p className="text-sm text-muted-foreground">Aucune NC.</p> : (
                            <ul className="text-sm space-y-1">{detail.ncs.map((n) => (
                              <li key={n.nc_number}><strong>{n.nc_number}</strong> · {n.title} · {n.severity} · {n.status}{n.decision ? ` · ${n.decision}` : ""}</li>
                            ))}</ul>
                          )}
                        </TabsContent>
                        <TabsContent value="actions" className="pt-3">
                          {detail.actions.length === 0 ? <p className="text-sm text-muted-foreground">Aucune action.</p> : (
                            <ul className="text-sm space-y-1">{detail.actions.map((a, i) => (
                              <li key={i}>{a.title} · {a.action_type} · {a.status}{a.due_date ? ` · échéance ${a.due_date}` : ""}</li>
                            ))}</ul>
                          )}
                        </TabsContent>
                      </Tabs>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleExport(o.id)} disabled={!detail}>
                        <Download className="h-4 w-4 mr-1" /> Export CSV
                      </Button>
                      <Button size="sm" variant="default" onClick={() => openDecision(o)}>
                        {qs === "bloque" ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                        Décision qualité
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {decisionFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !savingDecision && setDecisionFor(null)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle>Décision qualité — {decisionFor.numero}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={decision} onValueChange={setDecision}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="libere">Libérer</SelectItem>
                  <SelectItem value="bloque">Bloquer</SelectItem>
                  <SelectItem value="rebut">Rebut</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Motif (optionnel)" value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" disabled={savingDecision} onClick={() => setDecisionFor(null)}>Annuler</Button>
                <Button disabled={savingDecision} onClick={saveDecision}>Enregistrer</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
