import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveDialog } from "@/components/responsive/ResponsiveDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, RotateCcw, Download, Search, Power, PowerOff, ClipboardCheck, Link2 } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { logAudit } from "@/lib/audit";
import QualityIndicatorAssignments from "@/components/qualite/QualityIndicatorAssignments";

/** Parse decimal accepting both `.` and `,` as separator. Returns null if blank. */
export const parseDecimal = (s: string): number | null => {
  const t = (s ?? "").toString().trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export const INDICATOR_TYPES = [
  { value: "numeric", label: "Numérique" },
  { value: "boolean", label: "Booléen" },
  { value: "text", label: "Texte" },
  { value: "select", label: "Liste" },
] as const;

export const FREQUENCIES = [
  { value: "hourly", label: "Horaire" },
  { value: "shift", label: "Par poste" },
  { value: "daily", label: "Quotidien" },
  { value: "per_of", label: "Par OF" },
  { value: "per_lot", label: "Par lot" },
  { value: "manual", label: "Manuel" },
] as const;

export const CATEGORIES = [
  { value: "physico_chimique", label: "Physico-chimique" },
  { value: "conditionnement", label: "Conditionnement" },
  { value: "organoleptique", label: "Organoleptique" },
  { value: "produit_fini", label: "Produit fini" },
  { value: "emballage", label: "Emballage" },
  { value: "process", label: "Process" },
  { value: "hygiene", label: "Hygiène" },
  { value: "poids", label: "Poids" },
  { value: "controle_visuel", label: "Contrôle visuel" },
  { value: "autre", label: "Autre" },
] as const;

const labelOf = (arr: readonly { value: string; label: string }[], v?: string | null) =>
  arr.find((x) => x.value === v)?.label ?? v ?? "—";

interface FormState {
  code: string;
  name: string;
  description: string;
  indicator_type: "numeric" | "boolean" | "text" | "select";
  category: string;
  frequency_type: string;
  frequency_minutes?: string;
  unit: string;
  target_value: string;
  min_value: string;
  max_value: string;
  tolerance_minus: string;
  tolerance_plus: string;
  select_options: string;
  is_required: boolean;
  is_blocking: boolean;
  is_active: boolean;
}

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  description: "",
  indicator_type: "numeric",
  category: "autre",
  frequency_type: "manual",
  frequency_minutes: "",
  unit: "",
  target_value: "",
  min_value: "",
  max_value: "",
  tolerance_minus: "",
  tolerance_plus: "",
  select_options: "",
  is_required: false,
  is_blocking: false,
  is_active: true,
});

/**
 * Build the DB payload from the form. Exported for tests.
 */
export function buildIndicatorPayload(f: FormState) {
  const isNum = f.indicator_type === "numeric";
  const isSelect = f.indicator_type === "select";
  const num = (s: string) => {
    const v = parseDecimal(s);
    return v === null || Number.isNaN(v) ? null : v;
  };
  return {
    code: f.code.trim(),
    name: f.name.trim(),
    description: f.description.trim() || null,
    indicator_type: f.indicator_type,
    category: f.category as any,
    frequency_type: f.frequency_type as any,
    frequency_minutes: (() => { const v = parseDecimal(f.frequency_minutes ?? ""); return v && v > 0 ? Math.round(v) : null; })(),
    unit: isNum ? (f.unit.trim() || null) : null,
    target_value: isNum ? num(f.target_value) : null,
    min_value: isNum ? num(f.min_value) : null,
    max_value: isNum ? num(f.max_value) : null,
    tolerance_minus: isNum ? num(f.tolerance_minus) : null,
    tolerance_plus: isNum ? num(f.tolerance_plus) : null,
    select_options: isSelect
      ? f.select_options.split(",").map((s) => s.trim()).filter(Boolean)
      : null,
    is_required: !!f.is_required,
    is_blocking: !!f.is_blocking,
    is_active: !!f.is_active,
  };
}

/**
 * Frontend validation. Exported for tests.
 */
export function validateIndicator(f: FormState): string | null {
  if (!f.code.trim()) return "Code obligatoire";
  if (!/^[A-Z0-9_-]+$/.test(f.code.trim())) return "Code invalide (A-Z, 0-9, _, -)";
  if (!f.name.trim()) return "Nom obligatoire";
  if (f.indicator_type === "numeric") {
    const min = parseDecimal(f.min_value);
    const max = parseDecimal(f.max_value);
    if (min !== null && max !== null && min > max) return "min doit être ≤ max";
    const tm = parseDecimal(f.tolerance_minus);
    const tp = parseDecimal(f.tolerance_plus);
    if (tm !== null && tm < 0) return "Tolérance − doit être ≥ 0";
    if (tp !== null && tp < 0) return "Tolérance + doit être ≥ 0";
  }
  return null;
}

interface Indicator {
  id: string;
  code: string;
  name: string;
  description: string | null;
  indicator_type: string;
  category: string;
  frequency_type: string;
  frequency_minutes: number | null;
  unit: string | null;
  target_value: number | null;
  min_value: number | null;
  max_value: number | null;
  tolerance_minus: number | null;
  tolerance_plus: number | null;
  select_options: string[] | null;
  is_required: boolean;
  is_blocking: boolean;
  is_active: boolean;
  updated_at: string;
}

export default function QualiteIndicateurs() {
  const { user } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { toast } = useToast();

  const [rows, setRows] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [fCategory, setFCategory] = useState("__all__");
  const [fType, setFType] = useState("__all__");
  const [fStatus, setFStatus] = useState("__all__");

  // dialog
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const canManage = canCreate("qualite_indicateurs") || canEdit("qualite_indicateurs");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("quality_indicators")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
    }
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtersActive =
    q.trim() !== "" || fCategory !== "__all__" || fType !== "__all__" || fStatus !== "__all__";

  const resetFilters = () => {
    setQ(""); setFCategory("__all__"); setFType("__all__"); setFStatus("__all__");
  };

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (fCategory !== "__all__" && r.category !== fCategory) return false;
      if (fType !== "__all__" && r.indicator_type !== fType) return false;
      if (fStatus === "active" && !r.is_active) return false;
      if (fStatus === "inactive" && r.is_active) return false;
      if (ql) {
        const hay = `${r.code} ${r.name} ${r.description ?? ""}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, q, fCategory, fType, fStatus]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (r: Indicator) => {
    setEditId(r.id);
    setForm({
      code: r.code,
      name: r.name,
      description: r.description ?? "",
      indicator_type: r.indicator_type as any,
      category: r.category,
      frequency_type: r.frequency_type,
      frequency_minutes: r.frequency_minutes != null ? String(r.frequency_minutes) : "",
      unit: r.unit ?? "",
      target_value: r.target_value?.toString() ?? "",
      min_value: r.min_value?.toString() ?? "",
      max_value: r.max_value?.toString() ?? "",
      tolerance_minus: r.tolerance_minus?.toString() ?? "",
      tolerance_plus: r.tolerance_plus?.toString() ?? "",
      select_options: Array.isArray(r.select_options) ? r.select_options.join(", ") : "",
      is_required: r.is_required,
      is_blocking: r.is_blocking,
      is_active: r.is_active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const err = validateIndicator(form);
    if (err) {
      toast({ title: err, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = buildIndicatorPayload(form);
    const isEdit = !!editId;
    const meta = isEdit
      ? { ...payload, updated_by: user?.id ?? null }
      : { ...payload, created_by: user?.id ?? null, updated_by: user?.id ?? null };

    const res = isEdit
      ? await (supabase as any).from("quality_indicators").update(meta).eq("id", editId).select().single()
      : await (supabase as any).from("quality_indicators").insert(meta).select().single();

    if (res.error) {
      toast({ title: "Erreur", description: res.error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    await logAudit({
      action_type: isEdit ? "update" : "create",
      module: "parametres" as any,
      entity_type: "quality_indicator",
      entity_id: res.data.id,
      entity_code: res.data.code,
      entity_label: res.data.name,
      action_label: isEdit ? "Indicateur qualité modifié" : "Indicateur qualité créé",
      new_values: payload,
      severity: "info",
    });

    toast({ title: isEdit ? "Indicateur modifié" : "Indicateur créé" });
    setOpen(false);
    setSaving(false);
    load();
  };

  const toggleActive = async (r: Indicator) => {
    const newActive = !r.is_active;
    const { error } = await (supabase as any)
      .from("quality_indicators")
      .update({ is_active: newActive, updated_by: user?.id ?? null })
      .eq("id", r.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit({
      action_type: "status_change",
      module: "parametres" as any,
      entity_type: "quality_indicator",
      entity_id: r.id,
      entity_code: r.code,
      entity_label: r.name,
      action_label: newActive ? "Indicateur activé" : "Indicateur désactivé",
      new_values: { is_active: newActive },
      severity: newActive ? "info" : "low",
    });
    toast({ title: newActive ? "Indicateur activé" : "Indicateur désactivé" });
    load();
  };

  const handleExport = () => {
    exportToCsv(
      filtered,
      [
        { key: "code", label: "Code" },
        { key: "name", label: "Nom" },
        { key: "category", label: "Catégorie", format: (v) => labelOf(CATEGORIES, v) },
        { key: "indicator_type", label: "Type", format: (v) => labelOf(INDICATOR_TYPES, v) },
        { key: "unit", label: "Unité" },
        { key: "target_value", label: "Cible" },
        { key: "min_value", label: "Min" },
        { key: "max_value", label: "Max" },
        { key: "tolerance_minus", label: "Tol −" },
        { key: "tolerance_plus", label: "Tol +" },
        { key: "frequency_type", label: "Fréquence", format: (v) => labelOf(FREQUENCIES, v) },
        { key: "is_required", label: "Requis", format: (v) => (v ? "Oui" : "Non") },
        { key: "is_blocking", label: "Bloquant", format: (v) => (v ? "Oui" : "Non") },
        { key: "is_active", label: "Actif", format: (v) => (v ? "Oui" : "Non") },
      ],
      "indicateurs_qualite",
    );
  };

  const isNum = form.indicator_type === "numeric";
  const isSel = form.indicator_type === "select";

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Indicateurs qualité
          </h1>
          <p className="text-sm text-muted-foreground">Référentiel & affectations des indicateurs configurables</p>
        </div>
      </div>

      <Tabs defaultValue="indicators" className="space-y-4">
        <TabsList>
          <TabsTrigger value="indicators"><ClipboardCheck className="h-4 w-4 mr-1" /> Indicateurs</TabsTrigger>
          <TabsTrigger value="assignments"><Link2 className="h-4 w-4 mr-1" /> Affectations</TabsTrigger>
        </TabsList>

        <TabsContent value="indicators" className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {canCreate("qualite_indicateurs") && (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nouvel indicateur
            </Button>
          )}
        </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Recherche code, nom, description…"
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={fCategory} onValueChange={setFCategory}>
              <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes catégories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fType} onValueChange={setFType}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous types</SelectItem>
                {INDICATOR_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" /> Réinitialiser les filtres
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Min/Max</TableHead>
                <TableHead>Tolérance</TableHead>
                <TableHead>Fréquence</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">Chargement…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">Aucun indicateur</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id} className={!r.is_active ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline">{labelOf(CATEGORIES, r.category)}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{labelOf(INDICATOR_TYPES, r.indicator_type)}</Badge></TableCell>
                  <TableCell>{r.unit ?? "—"}</TableCell>
                  <TableCell>{r.target_value ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.min_value ?? "—"} / {r.max_value ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    −{r.tolerance_minus ?? "—"} / +{r.tolerance_plus ?? "—"}
                  </TableCell>
                  <TableCell>{labelOf(FREQUENCIES, r.frequency_type)}</TableCell>
                  <TableCell className="space-x-1">
                    {r.is_required && <Badge variant="outline">Requis</Badge>}
                    {r.is_blocking && <Badge variant="destructive">Bloquant</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? "default" : "outline"}>
                      {r.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {canEdit("qualite_indicateurs") && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(r)} title={r.is_active ? "Désactiver" : "Activer"}>
                          {r.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="assignments">
        <QualityIndicatorAssignments />
      </TabsContent>
      </Tabs>

      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={editId ? "Modifier l'indicateur" : "Nouvel indicateur qualité"}
        className="sm:max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="POIDS_NET" />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Type *</Label>
              <Select value={form.indicator_type} onValueChange={(v) => setForm({ ...form, indicator_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDICATOR_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fréquence *</Label>
              <Select value={form.frequency_type} onValueChange={(v) => setForm({ ...form, frequency_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Fréquence (minutes)</Label>
            <Input
              inputMode="numeric"
              value={form.frequency_minutes ?? ""}
              onChange={(e) => setForm({ ...form, frequency_minutes: e.target.value })}
              placeholder="ex : 30, 60 — cadence de contrôle en ligne"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Intervalle par défaut entre deux contrôles sur un OF. Surchargé par l'affectation produit.
            </p>
          </div>

          {isNum && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Unité</Label>
                  <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="g, kg, %, °C…" />
                </div>
                <div>
                  <Label>Cible</Label>
                  <Input value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Min</Label>
                  <Input value={form.min_value} onChange={(e) => setForm({ ...form, min_value: e.target.value })} />
                </div>
                <div>
                  <Label>Max</Label>
                  <Input value={form.max_value} onChange={(e) => setForm({ ...form, max_value: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Tolérance −</Label>
                  <Input value={form.tolerance_minus} onChange={(e) => setForm({ ...form, tolerance_minus: e.target.value })} />
                </div>
                <div>
                  <Label>Tolérance +</Label>
                  <Input value={form.tolerance_plus} onChange={(e) => setForm({ ...form, tolerance_plus: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {isSel && (
            <div>
              <Label>Options (séparées par des virgules)</Label>
              <Textarea rows={2} value={form.select_options} onChange={(e) => setForm({ ...form, select_options: e.target.value })} placeholder="Conforme, Non conforme, À revoir" />
            </div>
          )}

          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2"><Switch checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: v })} /> Requis</label>
            <label className="flex items-center gap-2"><Switch checked={form.is_blocking} onCheckedChange={(v) => setForm({ ...form, is_blocking: v })} /> Bloquant</label>
            <label className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Actif</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !canManage}>
              {saving ? "Enregistrement…" : editId ? "Modifier" : "Créer"}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
