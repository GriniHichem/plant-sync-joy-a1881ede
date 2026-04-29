import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveDialog } from "@/components/responsive/ResponsiveDialog";
import { AlertOctagon, Plus, RotateCcw, Search, Download, Gavel, Lock, ListChecks } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { logAudit } from "@/lib/audit";
import { parseDecimal } from "@/pages/qualite/QualiteIndicateurs";

const ALL = "__all__";
const NONE = "__none__";

// ----------------- Enums (UI labels) -----------------

export const NC_TYPES = [
  { value: "produit_fini", label: "Produit fini" },
  { value: "emballage", label: "Emballage" },
  { value: "matiere_premiere", label: "Matière première" },
  { value: "process", label: "Process" },
  { value: "hygiene", label: "Hygiène" },
  { value: "etiquetage", label: "Étiquetage" },
  { value: "poids", label: "Poids" },
  { value: "aspect", label: "Aspect" },
  { value: "securite_alimentaire", label: "Sécurité alimentaire" },
  { value: "autre", label: "Autre" },
] as const;

export const NC_SEVERITIES = [
  { value: "minor", label: "Mineure", variant: "secondary" as const, audit: "info" as const },
  { value: "major", label: "Majeure", variant: "default" as const, audit: "low" as const },
  { value: "critical", label: "Critique", variant: "destructive" as const, audit: "high" as const },
] as const;

export const NC_STATUSES = [
  { value: "draft", label: "Brouillon", variant: "outline" as const },
  { value: "declared", label: "Déclarée", variant: "secondary" as const },
  { value: "under_review", label: "En revue", variant: "secondary" as const },
  { value: "blocked", label: "Bloquée", variant: "destructive" as const },
  { value: "decision_pending", label: "Décision en attente", variant: "secondary" as const },
  { value: "action_in_progress", label: "Action en cours", variant: "default" as const },
  { value: "verified", label: "Vérifiée", variant: "default" as const },
  { value: "closed", label: "Clôturée", variant: "outline" as const },
  { value: "cancelled", label: "Annulée", variant: "outline" as const },
] as const;

export const NC_DECISIONS = [
  { value: "bloquer_lot", label: "Bloquer le lot" },
  { value: "liberer", label: "Libérer" },
  { value: "liberer_sous_derogation", label: "Libérer sous dérogation" },
  { value: "retraiter", label: "Retraiter" },
  { value: "trier", label: "Trier" },
  { value: "rebuter", label: "Rebuter" },
  { value: "retour_fournisseur", label: "Retour fournisseur" },
  { value: "quarantaine", label: "Quarantaine" },
  { value: "autre", label: "Autre" },
] as const;

export const ncTypeLabel = (v: string | null | undefined) =>
  NC_TYPES.find((t) => t.value === v)?.label ?? v ?? "—";
export const ncSeverityMeta = (v: string | null | undefined) =>
  NC_SEVERITIES.find((s) => s.value === v) ?? NC_SEVERITIES[0];
export const ncStatusMeta = (v: string | null | undefined) =>
  NC_STATUSES.find((s) => s.value === v) ?? NC_STATUSES[0];
export const ncDecisionLabel = (v: string | null | undefined) =>
  NC_DECISIONS.find((d) => d.value === v)?.label ?? v ?? "—";

// ----------------- Pure helpers (exported for tests) -----------------

export interface NcFormState {
  of_id: string;
  quality_check_id: string;
  product_id: string;
  production_line_id: string;
  shift_id: string;
  team_id: string;
  article_id: string;
  packaging_article_id: string;
  batch_number: string;
  lot_number: string;
  nc_type: string;
  nc_category: string;
  severity: string;
  title: string;
  description: string;
  detected_quantity: string;
  affected_quantity: string;
  unit: string;
  immediate_action: string;
  detected_at: string; // datetime-local
}

export const emptyNcForm = (): NcFormState => ({
  of_id: "", quality_check_id: "", product_id: "", production_line_id: "",
  shift_id: "", team_id: "", article_id: "", packaging_article_id: "",
  batch_number: "", lot_number: "",
  nc_type: "produit_fini", nc_category: "", severity: "minor",
  title: "", description: "",
  detected_quantity: "", affected_quantity: "", unit: "",
  immediate_action: "",
  detected_at: new Date().toISOString().slice(0, 16),
});

export function buildNcInsertPayload(
  f: NcFormState,
  declared_by: string | null,
  status: "draft" | "declared",
): Record<string, any> {
  const orNull = (s: string) => (s && s.trim() ? s.trim() : null);
  return {
    declared_by,
    of_id: orNull(f.of_id),
    quality_check_id: orNull(f.quality_check_id),
    product_id: orNull(f.product_id),
    production_line_id: orNull(f.production_line_id),
    shift_id: orNull(f.shift_id),
    team_id: orNull(f.team_id),
    article_id: orNull(f.article_id),
    packaging_article_id: orNull(f.packaging_article_id),
    batch_number: orNull(f.batch_number),
    lot_number: orNull(f.lot_number),
    nc_type: f.nc_type,
    nc_category: orNull(f.nc_category),
    severity: f.severity,
    status,
    title: f.title.trim(),
    description: orNull(f.description),
    detected_quantity: parseDecimal(f.detected_quantity),
    affected_quantity: parseDecimal(f.affected_quantity),
    unit: orNull(f.unit),
    immediate_action: orNull(f.immediate_action),
    detected_at: f.detected_at ? new Date(f.detected_at).toISOString() : new Date().toISOString(),
    validation_status: "not_required",
  };
}

export function validateNcForm(f: NcFormState): string | null {
  if (!f.title.trim()) return "Titre obligatoire";
  if (!f.nc_type) return "Type obligatoire";
  if (!f.severity) return "Sévérité obligatoire";
  return null;
}

export interface NcFilterState {
  q: string;
  of: string;
  type: string;
  severity: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}
export const emptyNcFilters = (): NcFilterState => ({
  q: "", of: ALL, type: ALL, severity: ALL, status: ALL, dateFrom: "", dateTo: "",
});

export interface NcRow {
  id: string;
  nc_number: string | null;
  detected_at: string;
  declared_by: string | null;
  of_id: string | null;
  quality_check_id: string | null;
  product_id: string | null;
  production_line_id: string | null;
  shift_id: string | null;
  team_id: string | null;
  article_id: string | null;
  packaging_article_id: string | null;
  batch_number: string | null;
  lot_number: string | null;
  nc_type: string;
  nc_category: string | null;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  detected_quantity: number | null;
  affected_quantity: number | null;
  unit: string | null;
  immediate_action: string | null;
  decision: string | null;
  decision_at: string | null;
  decision_by: string | null;
  closure_comment: string | null;
  closed_at: string | null;
  closed_by: string | null;
}

export function filterNc(
  rows: NcRow[],
  f: NcFilterState,
  ctx: { ofLabel: (id: string) => string },
): NcRow[] {
  const ql = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.of !== ALL && (r.of_id || "") !== f.of) return false;
    if (f.type !== ALL && r.nc_type !== f.type) return false;
    if (f.severity !== ALL && r.severity !== f.severity) return false;
    if (f.status !== ALL && r.status !== f.status) return false;
    if (f.dateFrom && r.detected_at < f.dateFrom) return false;
    if (f.dateTo && r.detected_at > f.dateTo + "T23:59:59") return false;
    if (ql) {
      const hay = `${r.nc_number ?? ""} ${r.title} ${r.description ?? ""} ${r.batch_number ?? ""} ${r.lot_number ?? ""} ${r.of_id ? ctx.ofLabel(r.of_id) : ""}`.toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  });
}

/**
 * Returns the SECOND-STAGE operation needed for a "bloquer_lot" decision.
 * Always returns nothing for any other decision. Never includes production `statut`.
 */
export function buildBlockLotRpcArgs(
  decision: string | null,
  of_id: string | null,
  reason: string,
  applyQualityBlock: boolean,
): { p_of_id: string; p_status: "bloque"; p_reason: string } | null {
  if (decision !== "bloquer_lot") return null;
  if (!of_id) return null;
  if (!applyQualityBlock) return null;
  return { p_of_id: of_id, p_status: "bloque", p_reason: reason || "Bloqué via NC" };
}

export function buildClosurePayload(
  closure_comment: string,
  closed_by: string | null,
): Record<string, any> | string {
  if (!closure_comment.trim()) return "Commentaire de clôture obligatoire";
  return {
    status: "closed",
    closure_comment: closure_comment.trim(),
    closed_by,
    closed_at: new Date().toISOString(),
  };
}

// ----------------- Component -----------------

interface OfLite { id: string; numero: string; product_id: string | null; line_id: string | null; }
interface ProductLite { id: string; code: string | null; designation: string | null; name: string | null; }
interface LineLite { id: string; code: string | null; designation: string | null; name: string | null; }

const labelOf = (r?: { name?: string | null; designation?: string | null; code?: string | null }) =>
  r ? (r.name || r.designation || r.code || "—") : "—";

export default function QualiteNonConformites() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const canManage =
    hasRole("admin") || hasRole("resp_production") || hasRole("chef_ligne") ||
    hasRole("bureau_methode") || hasRole("controleur_qualite");

  const [rows, setRows] = useState<NcRow[]>([]);
  const [ofs, setOfs] = useState<OfLite[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [lines, setLines] = useState<LineLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<NcFilterState>(emptyNcFilters());

  // Create dialog
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NcFormState>(emptyNcForm());
  const [saving, setSaving] = useState(false);

  // Decision/closure dialog
  const [decisionFor, setDecisionFor] = useState<NcRow | null>(null);
  const [decision, setDecision] = useState<string>("");
  const [decisionComment, setDecisionComment] = useState("");
  const [applyQualityBlock, setApplyQualityBlock] = useState(true);
  const [closureComment, setClosureComment] = useState("");
  const [decisionSaving, setDecisionSaving] = useState(false);

  const ofById = useMemo(() => new Map(ofs.map((o) => [o.id, o])), [ofs]);
  const prodById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const ofLabel = (id: string) => ofById.get(id)?.numero ?? id.slice(0, 6);

  const load = async () => {
    setLoading(true);
    const [ncRes, ofRes, prRes, lnRes] = await Promise.all([
      (supabase as any).from("quality_non_conformities").select("*").order("detected_at", { ascending: false }).limit(500),
      (supabase as any).from("ordres_fabrication").select("id, numero, product_id, line_id").order("created_at", { ascending: false }).limit(500),
      (supabase as any).from("products").select("id, code, designation, name"),
      (supabase as any).from("production_lines").select("id, code, designation, name"),
    ]);
    setRows(ncRes.data || []);
    setOfs(ofRes.data || []);
    setProducts(prRes.data || []);
    setLines(lnRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Pre-fill from a non-conform check (?from_check=ID)
  useEffect(() => {
    const fc = searchParams.get("from_check");
    if (!fc) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("quality_checks")
        .select("id, of_id, product_id, production_line_id, indicator_id, comment, unit, measured_value_numeric, measured_value_text")
        .eq("id", fc).maybeSingle();
      if (!data) return;
      // Try to fetch indicator name
      let indicatorName = "";
      if (data.indicator_id) {
        const { data: ind } = await (supabase as any)
          .from("quality_indicators").select("code, name").eq("id", data.indicator_id).maybeSingle();
        if (ind) indicatorName = `${ind.code} – ${ind.name}`;
      }
      setForm((f) => ({
        ...f,
        of_id: data.of_id ?? "",
        quality_check_id: data.id,
        product_id: data.product_id ?? "",
        production_line_id: data.production_line_id ?? "",
        nc_type: "produit_fini",
        title: indicatorName ? `Non-conformité contrôle ${indicatorName}` : "Non-conformité contrôle qualité",
        description: data.comment || "",
        unit: data.unit || "",
      }));
      setOpen(true);
    })();
  }, [searchParams]);

  const filtersActive =
    filters.q !== "" || filters.of !== ALL || filters.type !== ALL ||
    filters.severity !== ALL || filters.status !== ALL || filters.dateFrom !== "" || filters.dateTo !== "";

  const filtered = useMemo(() => filterNc(rows, filters, { ofLabel }), [rows, filters, ofById]);

  const openNew = () => {
    setForm(emptyNcForm());
    setOpen(true);
  };

  const handleSave = async (statusToSet: "draft" | "declared") => {
    const err = validateNcForm(form);
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    setSaving(true);
    const payload = buildNcInsertPayload(form, user?.id ?? null, statusToSet);
    const { data, error } = await (supabase as any)
      .from("quality_non_conformities").insert(payload).select().single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    await logAudit({
      action_type: "create",
      module: "qualite" as any,
      entity_type: "quality_non_conformity",
      entity_id: data.id,
      entity_code: data.nc_number,
      entity_label: data.title,
      action_label: statusToSet === "declared" ? "NC déclarée" : "NC créée (brouillon)",
      new_values: payload,
      severity: ncSeverityMeta(form.severity).audit,
    });
    toast({ title: "Non-conformité enregistrée", description: data.nc_number });
    setOpen(false);
    setSaving(false);
    load();
  };

  const openDecision = (r: NcRow) => {
    setDecisionFor(r);
    setDecision(r.decision || "");
    setDecisionComment("");
    setApplyQualityBlock(true);
    setClosureComment("");
  };

  const handleSaveDecision = async () => {
    if (!decisionFor) return;
    if (!decision) { toast({ title: "Décision requise", variant: "destructive" }); return; }
    setDecisionSaving(true);

    const ncUpdate: any = {
      decision,
      decision_by: user?.id ?? null,
      decision_at: new Date().toISOString(),
      status: decision === "bloquer_lot" ? "blocked" : "decision_pending",
    };
    if (decisionComment.trim()) {
      ncUpdate.immediate_action = (decisionFor.immediate_action ? decisionFor.immediate_action + "\n" : "") + decisionComment.trim();
    }

    const { error } = await (supabase as any)
      .from("quality_non_conformities").update(ncUpdate).eq("id", decisionFor.id);
    if (error) {
      toast({ title: "Erreur décision", description: error.message, variant: "destructive" });
      setDecisionSaving(false);
      return;
    }

    // ONLY if decision = bloquer_lot, OF linked, and user opted in → update OF quality_status (NOT statut)
    const blockArgs = buildBlockLotRpcArgs(decision, decisionFor.of_id, decisionComment, applyQualityBlock);
    if (blockArgs) {
      const { error: rpcErr } = await (supabase as any).rpc("set_of_quality_status", blockArgs);
      if (rpcErr) {
        toast({ title: "Statut qualité OF non mis à jour", description: rpcErr.message, variant: "destructive" });
      }
    }

    await logAudit({
      action_type: "update",
      module: "qualite" as any,
      entity_type: "quality_non_conformity",
      entity_id: decisionFor.id,
      entity_code: decisionFor.nc_number ?? "",
      entity_label: decisionFor.title,
      action_label: `Décision : ${ncDecisionLabel(decision)}`,
      new_values: { ...ncUpdate, applied_quality_block: !!blockArgs },
      severity: ncSeverityMeta(decisionFor.severity).audit,
    });

    toast({ title: "Décision enregistrée" });
    setDecisionFor(null);
    setDecisionSaving(false);
    load();
  };

  const handleClose = async () => {
    if (!decisionFor) return;
    const payload = buildClosurePayload(closureComment, user?.id ?? null);
    if (typeof payload === "string") {
      toast({ title: payload, variant: "destructive" });
      return;
    }
    setDecisionSaving(true);
    const { error } = await (supabase as any)
      .from("quality_non_conformities").update(payload).eq("id", decisionFor.id);
    if (error) {
      toast({ title: "Erreur clôture", description: error.message, variant: "destructive" });
      setDecisionSaving(false);
      return;
    }
    await logAudit({
      action_type: "update",
      module: "qualite" as any,
      entity_type: "quality_non_conformity",
      entity_id: decisionFor.id,
      entity_code: decisionFor.nc_number ?? "",
      entity_label: decisionFor.title,
      action_label: "NC clôturée",
      new_values: payload,
      severity: ncSeverityMeta(decisionFor.severity).audit,
    });
    toast({ title: "NC clôturée" });
    setDecisionFor(null);
    setDecisionSaving(false);
    load();
  };

  const handleExport = () => {
    exportToCsv(filtered as any, [
      { key: "nc_number", label: "NC#" },
      { key: "detected_at", label: "Détectée le" },
      { key: "nc_type", label: "Type", format: (v) => ncTypeLabel(v as string) },
      { key: "severity", label: "Sévérité", format: (v) => ncSeverityMeta(v as string).label },
      { key: "status", label: "Statut", format: (v) => ncStatusMeta(v as string).label },
      { key: "of_id", label: "OF", format: (v) => v ? ofLabel(v as string) : "" },
      { key: "title", label: "Titre" },
      { key: "batch_number", label: "Batch" },
      { key: "lot_number", label: "Lot" },
      { key: "decision", label: "Décision", format: (v) => v ? ncDecisionLabel(v as string) : "" },
      { key: "affected_quantity", label: "Qté affectée" },
      { key: "unit", label: "Unité" },
      { key: "closure_comment", label: "Commentaire clôture" },
    ], "non_conformites");
  };

  const resetFilters = () => setFilters(emptyNcFilters());

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <AlertOctagon className="h-6 w-6 text-primary" />
            Non-conformités
          </h1>
          <p className="text-sm text-muted-foreground">Déclaration, décision et clôture des NC qualité</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0} className="h-11">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {canManage && (
            <Button onClick={openNew} className="h-11"><Plus className="h-4 w-4" /> Nouvelle NC</Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Recherche NC#, titre, OF, lot, batch…"
                className="pl-9 h-11"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
            </div>
            <Select value={filters.of} onValueChange={(v) => setFilters({ ...filters, of: v })}>
              <SelectTrigger className="h-11"><SelectValue placeholder="OF" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous OFs</SelectItem>
                {ofs.map((o) => <SelectItem key={o.id} value={o.id}>{o.numero}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous types</SelectItem>
                {NC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.severity} onValueChange={(v) => setFilters({ ...filters, severity: v })}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Sévérité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes sévérités</SelectItem>
                {NC_SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous statuts</SelectItem>
                {NC_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div>
              <Label className="text-xs">Du</Label>
              <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="h-11" />
            </div>
            <div>
              <Label className="text-xs">Au</Label>
              <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="h-11" />
            </div>
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" /> Réinitialiser les filtres
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NC#</TableHead>
                <TableHead>Détectée le</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sévérité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>OF</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Décision</TableHead>
                <TableHead className="w-[160px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Chargement…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Aucune non-conformité</TableCell></TableRow>
              ) : filtered.map((r) => {
                const sev = ncSeverityMeta(r.severity);
                const st = ncStatusMeta(r.status);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.nc_number ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(r.detected_at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-xs">{ncTypeLabel(r.nc_type)}</TableCell>
                    <TableCell><Badge variant={sev.variant}>{sev.label}</Badge></TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.of_id ? ofLabel(r.of_id) : "—"}</TableCell>
                    <TableCell className="text-xs">{r.product_id ? labelOf(prodById.get(r.product_id)) : "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.title}</TableCell>
                    <TableCell className="text-xs">{r.decision ? ncDecisionLabel(r.decision) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canManage && r.status !== "closed" && r.status !== "cancelled" && (
                          <Button size="sm" variant="outline" onClick={() => openDecision(r)} title="Décision / Clôture">
                            <Gavel className="h-3.5 w-3.5" /> Action
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" asChild title="Créer une action qualité">
                          <Link to={`/qualite/actions?from_nc=${r.id}${r.of_id ? `&from_of=${r.of_id}` : ""}`}>
                            <ListChecks className="h-3.5 w-3.5" /> CAPA
                          </Link>
                        </Button>
                        {(r.status === "closed" || r.status === "cancelled") && (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New NC Dialog */}
      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Nouvelle non-conformité" className="sm:max-w-3xl">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Détectée le *</Label>
              <Input type="datetime-local" value={form.detected_at} onChange={(e) => setForm({ ...form, detected_at: e.target.value })} className="h-11" />
            </div>
            <div>
              <Label>OF lié</Label>
              <Select value={form.of_id || NONE} onValueChange={(v) => setForm({ ...form, of_id: v === NONE ? "" : v })}>
                <SelectTrigger className="h-11"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {ofs.map((o) => <SelectItem key={o.id} value={o.id}>{o.numero}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={form.nc_type} onValueChange={(v) => setForm({ ...form, nc_type: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sévérité *</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NC_SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Catégorie</Label>
              <Input value={form.nc_category} onChange={(e) => setForm({ ...form, nc_category: e.target.value })} className="h-11" placeholder="Ex: étiquetage code-barres" />
            </div>
            <div className="sm:col-span-2">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Batch</Label>
              <Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} className="h-11" />
            </div>
            <div>
              <Label>Lot</Label>
              <Input value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} className="h-11" />
            </div>
            <div>
              <Label>Quantité détectée</Label>
              <Input inputMode="decimal" value={form.detected_quantity} onChange={(e) => setForm({ ...form, detected_quantity: e.target.value })} className="h-11" />
            </div>
            <div>
              <Label>Quantité affectée</Label>
              <Input inputMode="decimal" value={form.affected_quantity} onChange={(e) => setForm({ ...form, affected_quantity: e.target.value })} className="h-11" />
            </div>
            <div>
              <Label>Unité</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-11" placeholder="g, kg, u…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Action immédiate</Label>
              <Textarea rows={2} value={form.immediate_action} onChange={(e) => setForm({ ...form, immediate_action: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving} className="h-11">Annuler</Button>
            <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving} className="h-11">
              Enregistrer brouillon
            </Button>
            <Button onClick={() => handleSave("declared")} disabled={saving} className="h-11">
              {saving ? "Enregistrement…" : "Déclarer"}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Decision / Closure Dialog */}
      <ResponsiveDialog
        open={!!decisionFor}
        onOpenChange={(o) => !o && setDecisionFor(null)}
        title={decisionFor ? `Action sur ${decisionFor.nc_number}` : ""}
        description={decisionFor?.title}
        className="sm:max-w-2xl"
      >
        {decisionFor && (
          <div className="space-y-5">
            {/* Decision */}
            <div className="space-y-3 border rounded-md p-3">
              <div className="font-medium flex items-center gap-2"><Gavel className="h-4 w-4" /> Prendre une décision</div>
              <div>
                <Label>Décision</Label>
                <Select value={decision || NONE} onValueChange={(v) => setDecision(v === NONE ? "" : v)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {NC_DECISIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Motif / commentaire</Label>
                <Textarea rows={2} value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} />
              </div>
              {decision === "bloquer_lot" && decisionFor.of_id && (
                <label className="flex items-start gap-2 text-sm rounded-md bg-muted/40 p-2">
                  <Switch checked={applyQualityBlock} onCheckedChange={setApplyQualityBlock} />
                  <span>
                    Appliquer le statut qualité « Bloqué » sur l'OF lié
                    <span className="block text-xs text-muted-foreground">
                      N'affecte pas le statut production de l'OF.
                    </span>
                  </span>
                </label>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSaveDecision} disabled={decisionSaving || !decision} className="h-11">
                  Enregistrer la décision
                </Button>
              </div>
            </div>

            {/* Closure */}
            <div className="space-y-3 border rounded-md p-3">
              <div className="font-medium flex items-center gap-2"><Lock className="h-4 w-4" /> Clôturer la non-conformité</div>
              <div>
                <Label>Commentaire de clôture *</Label>
                <Textarea rows={2} value={closureComment} onChange={(e) => setClosureComment(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button variant="destructive" onClick={handleClose} disabled={decisionSaving || !closureComment.trim()} className="h-11">
                  Clôturer
                </Button>
              </div>
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
