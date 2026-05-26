import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, AlertOctagon, CheckCircle2, AlertTriangle, Eye, RotateCcw } from "lucide-react";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";
import { QUALITY_STATUS_OPTIONS, qualityStatusLabel } from "@/components/qualite/OfQualityTab";

const PROD_STATUSES = [
  { value: "planifie", label: "Planifié" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "annule", label: "Annulé" },
];

interface OfRow {
  id: string;
  numero: string;
  statut: string | null;
  quality_status: string | null;
  product_id: string | null;
  line_id: string | null;
  products: { code: string; designation: string } | null;
  production_lines: { code: string; designation: string } | null;
}

interface CheckLite {
  of_id: string;
  indicator_id: string;
  is_conform: boolean | null;
  control_time: string;
}

export default function QualiteOf() {
  const navigate = useNavigate();
  const [ofs, setOfs] = useState<OfRow[]>([]);
  const [checks, setChecks] = useState<CheckLite[]>([]);
  const [lines, setLines] = useState<Array<{ id: string; code: string; designation: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [qStatus, setQStatus] = useState("__none__");
  const [pStatus, setPStatus] = useState("__none__");
  const [lineFilter, setLineFilter] = useState("__none__");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ofRes, lineRes] = await Promise.all([
        supabase
          .from("ordres_fabrication")
          .select("id, numero, statut, quality_status, product_id, line_id, products(code, designation), production_lines(code, designation)")
          .order("created_at", { ascending: false }),
        supabase.from("production_lines").select("id, code, designation").eq("is_active", true).order("code"),
      ]);
      const ofList = (ofRes.data as any[]) || [];
      setOfs(ofList as OfRow[]);
      setLines((lineRes.data as any[]) || []);
      const ids = ofList.map((o) => o.id);
      if (ids.length) {
        const { data: cRes } = await (supabase as any)
          .from("quality_checks")
          .select("of_id, indicator_id, is_conform, control_time")
          .in("of_id", ids);
        setChecks(((cRes as any[]) || []) as CheckLite[]);
      } else {
        setChecks([]);
      }
      setLoading(false);
    })();
  }, []);

  const checksByOf = useMemo(() => {
    const m = new Map<string, CheckLite[]>();
    for (const c of checks) {
      const arr = m.get(c.of_id) ?? [];
      arr.push(c);
      m.set(c.of_id, arr);
    }
    return m;
  }, [checks]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ofs.filter((o) => {
      if (qStatus !== "__none__" && (o.quality_status ?? "non_demarre") !== qStatus) return false;
      if (pStatus !== "__none__" && (o.statut ?? "") !== pStatus) return false;
      if (lineFilter !== "__none__" && o.line_id !== lineFilter) return false;
      if (term) {
        const hay = `${o.numero} ${o.products?.code ?? ""} ${o.products?.designation ?? ""} ${o.production_lines?.code ?? ""} ${o.production_lines?.designation ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [ofs, search, qStatus, pStatus, lineFilter]);

  const kpis = useMemo(() => {
    let conform = 0, nonConform = 0, outOfTol = 0;
    for (const o of filtered) {
      const qs = o.quality_status;
      if (qs === "conforme" || qs === "libere") conform++;
      if (qs === "non_conforme" || qs === "bloque" || qs === "rebute") nonConform++;
      const ocs = checksByOf.get(o.id) ?? [];
      outOfTol += ocs.filter((c) => c.is_conform === false).length;
    }
    return { total: filtered.length, conform, nonConform, outOfTol };
  }, [filtered, checksByOf]);

  const filtersActive = !!search || qStatus !== "__none__" || pStatus !== "__none__" || lineFilter !== "__none__";

  const resetFilters = () => {
    setSearch(""); setQStatus("__none__"); setPStatus("__none__"); setLineFilter("__none__");
  };

  const exportRows = filtered.map((o) => {
    const ocs = checksByOf.get(o.id) ?? [];
    const performed = new Set(ocs.map((c) => c.indicator_id)).size;
    const out = ocs.filter((c) => c.is_conform === false).length;
    const last = ocs.length ? ocs.map((c) => c.control_time).sort().reverse()[0] : "";
    return {
      numero: o.numero,
      produit: `${o.products?.code ?? ""} ${o.products?.designation ?? ""}`.trim(),
      ligne: `${o.production_lines?.code ?? ""} ${o.production_lines?.designation ?? ""}`.trim(),
      statut_production: o.statut ?? "",
      statut_qualite: qualityStatusLabel(o.quality_status),
      controles_realises: performed,
      hors_tolerance: out,
      dernier_controle: last,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> OF Qualité
        </h1>
        <p className="text-muted-foreground">Suivi qualité des ordres de fabrication — statuts, contrôles et écarts</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">OF affichés</p>
            <p className="text-2xl font-bold tabular-nums">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-primary" /> Conformes / Libérés
            </p>
            <p className="text-2xl font-bold tabular-nums">{kpis.conform}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <AlertOctagon className="h-3 w-3 text-destructive" /> Non conf. / Bloqués
            </p>
            <p className="text-2xl font-bold tabular-nums text-destructive">{kpis.nonConform}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-destructive" /> Hors tolérance
            </p>
            <p className="text-2xl font-bold tabular-nums">{kpis.outOfTol}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <Input
            placeholder="Rechercher OF / produit / ligne…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 max-w-xs"
          />
          <Select value={qStatus} onValueChange={setQStatus}>
            <SelectTrigger className="h-12 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Tous statuts qualité</SelectItem>
              {QUALITY_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pStatus} onValueChange={setPStatus}>
            <SelectTrigger className="h-12 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Tous statuts prod.</SelectItem>
              {PROD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={lineFilter} onValueChange={setLineFilter}>
            <SelectTrigger className="h-12 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Toutes lignes</SelectItem>
              {lines.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.code} — {l.designation}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
            </Button>
          )}
          <div className="ml-auto">
            <ExportCsvButton
              data={exportRows}
              columns={[
                { key: "numero", label: "N° OF" },
                { key: "produit", label: "Produit" },
                { key: "ligne", label: "Ligne" },
                { key: "statut_production", label: "Statut prod." },
                { key: "statut_qualite", label: "Statut qualité" },
                { key: "controles_realises", label: "Contrôles" },
                { key: "hors_tolerance", label: "Hors tolérance" },
                { key: "dernier_controle", label: "Dernier contrôle" },
              ]}
              filename="of_qualite"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Aucun OF ne correspond aux filtres</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° OF</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Ligne</TableHead>
                  <TableHead>Statut prod.</TableHead>
                  <TableHead>Statut qualité</TableHead>
                  <TableHead className="text-right">Contrôles</TableHead>
                  <TableHead className="text-right">Hors tol.</TableHead>
                  <TableHead>Dernier contrôle</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const ocs = checksByOf.get(o.id) ?? [];
                  const performed = new Set(ocs.map((c) => c.indicator_id)).size;
                  const out = ocs.filter((c) => c.is_conform === false).length;
                  const last = ocs.length ? ocs.map((c) => c.control_time).sort().reverse()[0] : null;
                  const qOpt = QUALITY_STATUS_OPTIONS.find((x) => x.value === (o.quality_status ?? "non_demarre"));
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.numero}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{o.products?.code ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{o.products?.designation ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {o.production_lines ? `${o.production_lines.code} — ${o.production_lines.designation}` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {PROD_STATUSES.find((p) => p.value === o.statut)?.label ?? o.statut ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={qOpt?.variant ?? "secondary"} className="text-[10px]">
                          {qualityStatusLabel(o.quality_status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{performed}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {out > 0 ? <span className="text-destructive font-medium">{out}</span> : out}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {last ? new Date(last).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/gpao/of/${o.id}`)}>
                          <Eye className="h-3 w-3 mr-1" /> Ouvrir
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
