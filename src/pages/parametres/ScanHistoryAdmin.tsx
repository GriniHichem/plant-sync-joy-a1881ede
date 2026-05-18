/**
 * Historique consultable des scans QR / code-barres.
 *
 * - Chaque utilisateur voit ses propres scans (RLS).
 * - Admin et responsable SI voient l'historique complet (RLS).
 * - Filtres : période, résultat, source, type d'entité, recherche texte.
 * - Export CSV.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScanLine, RotateCcw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";
import { format as fmtDate } from "date-fns";
import { fr } from "date-fns/locale";

interface ScanRow {
  id: string;
  user_id: string;
  scanned_at: string;
  raw_value: string;
  normalized_value: string | null;
  source: string;
  code_format: string | null;
  outcome: string;
  match_quality: string | null;
  matches_count: number;
  entity_type: string | null;
  entity_id: string | null;
  entity_code: string | null;
  entity_label: string | null;
  context: string | null;
  error_message: string | null;
}

const OUTCOME_LABEL: Record<string, { label: string; tone: string }> = {
  resolved:  { label: "Résolu",      tone: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30" },
  ambiguous: { label: "Ambigu",      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  not_found: { label: "Non trouvé",  tone: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30" },
  enrolled:  { label: "Enrôlé",      tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  error:     { label: "Erreur",      tone: "bg-destructive/10 text-destructive border-destructive/30" },
};

const SOURCE_LABEL: Record<string, string> = {
  camera: "Caméra", manual: "Manuel", enroll: "Enrôlement",
};

const ENTITY_LABEL: Record<string, string> = {
  pdr: "PDR", machine: "Machine", organe: "Organe", equipement: "Équipement",
};

const ENTITY_ROUTE: Record<string, string> = {
  pdr: "/pdr", machine: "/machines", organe: "/organes", equipement: "/equipements",
};

const PAGE_SIZE = 100;

export default function ScanHistoryAdmin() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdminOrSi = hasRole("admin") || hasRole("responsable_si");

  const [rows, setRows] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let q = supabase
        .from("scan_history" as any)
        .select("*")
        .order("scanned_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (outcome) q = q.eq("outcome", outcome);
      if (source) q = q.eq("source", source);
      if (entityType) q = q.eq("entity_type", entityType);
      if (from) q = q.gte("scanned_at", new Date(from).toISOString());
      if (to) {
        const d = new Date(to); d.setHours(23, 59, 59, 999);
        q = q.lte("scanned_at", d.toISOString());
      }
      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error(error);
        setRows([]);
      } else {
        setRows((data as any[]) ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [outcome, source, entityType, from, to]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) =>
      (r.raw_value || "").toLowerCase().includes(q)
      || (r.entity_code || "").toLowerCase().includes(q)
      || (r.entity_label || "").toLowerCase().includes(q)
      || (r.context || "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const ok = filtered.filter((r) => r.outcome === "resolved" || r.outcome === "enrolled").length;
    const amb = filtered.filter((r) => r.outcome === "ambiguous").length;
    const nf = filtered.filter((r) => r.outcome === "not_found").length;
    const err = filtered.filter((r) => r.outcome === "error").length;
    const rate = total ? Math.round((ok / total) * 100) : 0;
    return { total, ok, amb, nf, err, rate };
  }, [filtered]);

  const hasFilters = !!(outcome || source || entityType || query || from || to);
  const reset = () => { setOutcome(""); setSource(""); setEntityType(""); setQuery(""); setFrom(""); setTo(""); };

  const csvColumns = [
    { key: "scanned_at", label: "Date", format: (v: string) => fmtDate(new Date(v), "yyyy-MM-dd HH:mm:ss") },
    { key: "source", label: "Source", format: (v: string) => SOURCE_LABEL[v] ?? v },
    { key: "code_format", label: "Format" },
    { key: "raw_value", label: "Valeur scannée" },
    { key: "outcome", label: "Résultat", format: (v: string) => OUTCOME_LABEL[v]?.label ?? v },
    { key: "match_quality", label: "Qualité" },
    { key: "matches_count", label: "Nb matches" },
    { key: "entity_type", label: "Type entité", format: (v: string | null) => v ? (ENTITY_LABEL[v] ?? v) : "" },
    { key: "entity_code", label: "Code entité" },
    { key: "entity_label", label: "Libellé entité" },
    { key: "context", label: "Contexte" },
    { key: "error_message", label: "Erreur" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanLine className="h-6 w-6" /> Historique des scans
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdminOrSi
              ? "Tous les scans effectués par les utilisateurs."
              : "Vos derniers scans QR / code-barres."}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            data={filtered}
            columns={csvColumns}
            filename="historique-scans"
          />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total" value={kpis.total} />
        <KpiCard label="Succès" value={kpis.ok} sub={`${kpis.rate}%`} tone="text-green-600" />
        <KpiCard label="Ambigus" value={kpis.amb} tone="text-amber-600" />
        <KpiCard label="Non trouvés" value={kpis.nf} tone="text-red-600" />
        <KpiCard label="Erreurs" value={kpis.err} tone="text-destructive" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Valeur, code, libellé, contexte…"
                className="pl-8 h-10"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Résultat</Label>
            <Select value={outcome || "__none__"} onValueChange={(v) => setOutcome(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Tous</SelectItem>
                {Object.entries(OUTCOME_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Source</Label>
            <Select value={source || "__none__"} onValueChange={(v) => setSource(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Toutes</SelectItem>
                {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type d'entité</Label>
            <Select value={entityType || "__none__"} onValueChange={(v) => setEntityType(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Tous</SelectItem>
                {Object.entries(ENTITY_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Du</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Au</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10" />
          </div>
          {hasFilters && (
            <div className="md:col-span-6 flex justify-end">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Réinitialiser
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Résultat</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>Contexte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun scan</TableCell></TableRow>
              ) : (
                filtered.map((r) => {
                  const o = OUTCOME_LABEL[r.outcome] ?? { label: r.outcome, tone: "" };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(new Date(r.scanned_at), "dd/MM/yy HH:mm:ss", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-xs">{SOURCE_LABEL[r.source] ?? r.source}</TableCell>
                      <TableCell className="text-xs font-mono">{r.code_format ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono max-w-[260px] truncate" title={r.raw_value}>
                        {r.raw_value}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${o.tone}`}>{o.label}</Badge>
                        {r.matches_count > 1 && (
                          <span className="ml-1 text-[10px] text-muted-foreground">×{r.matches_count}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.entity_type && r.entity_id ? (
                          <Link
                            to={`${ENTITY_ROUTE[r.entity_type]}/${r.entity_id}`}
                            className="text-primary hover:underline"
                          >
                            <span className="text-[10px] uppercase mr-1 text-muted-foreground">
                              {ENTITY_LABEL[r.entity_type]}
                            </span>
                            {r.entity_code ?? r.entity_label ?? r.entity_id.slice(0, 6)}
                          </Link>
                        ) : r.error_message ? (
                          <span className="text-destructive text-[11px]">{r.error_message}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.context ?? "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        {filtered.length} entrée(s) affichée(s) · max {PAGE_SIZE} par chargement
      </p>
    </div>
  );
}

function KpiCard({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${tone ?? ""}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
