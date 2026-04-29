import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveDialog } from "@/components/responsive/ResponsiveDialog";
import { ListChecks, Plus, RotateCcw, Search, Download, CheckCircle2, ShieldCheck, Lock } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { logAudit } from "@/lib/audit";

const ALL = "__all__";
const NONE = "__none__";

// ----------------- Enums -----------------

export const QA_TYPES = [
  { value: "curative", label: "Curative" },
  { value: "corrective", label: "Corrective" },
  { value: "preventive", label: "Préventive" },
] as const;

export const QA_PRIORITIES = [
  { value: "low", label: "Basse", variant: "outline" as const, audit: "info" as const },
  { value: "medium", label: "Moyenne", variant: "secondary" as const, audit: "info" as const },
  { value: "high", label: "Haute", variant: "default" as const, audit: "medium" as const },
  { value: "critical", label: "Critique", variant: "destructive" as const, audit: "medium" as const },
] as const;

export const QA_STATUSES = [
  { value: "open", label: "Ouverte", variant: "secondary" as const },
  { value: "in_progress", label: "En cours", variant: "default" as const },
  { value: "done", label: "Terminée", variant: "default" as const },
  { value: "verified", label: "Vérifiée", variant: "default" as const },
  { value: "closed", label: "Clôturée", variant: "outline" as const },
  { value: "cancelled", label: "Annulée", variant: "outline" as const },
] as const;

export const qaTypeLabel = (v: string | null | undefined) =>
  QA_TYPES.find((t) => t.value === v)?.label ?? v ?? "—";
export const qaPriorityMeta = (v: string | null | undefined) =>
  QA_PRIORITIES.find((p) => p.value === v) ?? QA_PRIORITIES[1];
export const qaStatusMeta = (v: string | null | undefined) =>
  QA_STATUSES.find((s) => s.value === v) ?? QA_STATUSES[0];

// ----------------- Pure helpers (exported for tests) -----------------

export interface QaFormState {
  nc_id: string;
  of_id: string;
  title: string;
  description: string;
  action_type: string;
  priority: string;
  responsible_user_id: string;
  due_date: string;
}

export const emptyQaForm = (): QaFormState => ({
  nc_id: "",
  of_id: "",
  title: "",
  description: "",
  action_type: "corrective",
  priority: "medium",
  responsible_user_id: "",
  due_date: "",
});

export function validateQaForm(f: QaFormState): string | null {
  if (!f.title.trim()) return "Titre obligatoire";
  if (!f.action_type) return "Type d'action obligatoire";
  return null;
}

export function buildQaInsertPayload(f: QaFormState, userId: string) {
  return {
    nc_id: f.nc_id || null,
    of_id: f.of_id || null,
    title: f.title.trim(),
    description: f.description.trim() || null,
    action_type: f.action_type,
    priority: f.priority,
    status: "open",
    responsible_user_id: f.responsible_user_id || null,
    due_date: f.due_date || null,
    created_by: userId,
  };
}

export interface QaUpdateInput {
  status: string;
  verification_comment?: string;
  responsible_user_id?: string | null;
  due_date?: string | null;
  priority?: string;
}

export function buildQaStatusUpdatePayload(
  input: QaUpdateInput,
  userId: string
): Record<string, any> | string {
  if (input.status === "closed") {
    if (!input.verification_comment || !input.verification_comment.trim()) {
      return "Commentaire de vérification obligatoire pour clôturer";
    }
  }
  const out: Record<string, any> = { status: input.status };
  if (input.verification_comment !== undefined) {
    out.verification_comment = input.verification_comment?.trim() || null;
  }
  if (input.responsible_user_id !== undefined) out.responsible_user_id = input.responsible_user_id || null;
  if (input.due_date !== undefined) out.due_date = input.due_date || null;
  if (input.priority !== undefined) out.priority = input.priority;
  if (input.status === "closed") {
    out.closed_at = new Date().toISOString();
    out.closed_by = userId;
  }
  if (input.status === "verified") {
    out.verified_at = new Date().toISOString();
    out.verified_by = userId;
  }
  return out;
}

export function isQaOverdue(due_date: string | null, status: string): boolean {
  if (!due_date) return false;
  if (["done", "verified", "closed", "cancelled"].includes(status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due_date);
  return d.getTime() < today.getTime();
}

export interface QaRow {
  id: string;
  nc_id: string | null;
  of_id: string | null;
  title: string;
  description: string | null;
  action_type: string;
  priority: string;
  status: string;
  responsible_user_id: string | null;
  due_date: string | null;
  verification_comment: string | null;
  created_by: string | null;
  created_at: string;
  closed_at: string | null;
}

export interface QaFilters {
  q: string;
  status: string;
  priority: string;
  responsible: string;
  nc_id: string;
  dueFrom: string;
  dueTo: string;
}

export const emptyQaFilters = (): QaFilters => ({
  q: "",
  status: ALL,
  priority: ALL,
  responsible: ALL,
  nc_id: "",
  dueFrom: "",
  dueTo: "",
});

export function filterActions(rows: QaRow[], f: QaFilters, ncMap?: Record<string, string>): QaRow[] {
  return rows.filter((r) => {
    if (f.status !== ALL && r.status !== f.status) return false;
    if (f.priority !== ALL && r.priority !== f.priority) return false;
    if (f.responsible !== ALL && r.responsible_user_id !== f.responsible) return false;
    if (f.nc_id) {
      const ncLabel = (r.nc_id && ncMap?.[r.nc_id]) || "";
      if (!ncLabel.toLowerCase().includes(f.nc_id.toLowerCase())) return false;
    }
    if (f.dueFrom && r.due_date && r.due_date < f.dueFrom) return false;
    if (f.dueTo && r.due_date && r.due_date > f.dueTo) return false;
    if (f.q) {
      const hay = `${r.title} ${r.description ?? ""}`.toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });
}

export const hasActiveQaFilters = (f: QaFilters) =>
  f.q !== "" || f.status !== ALL || f.priority !== ALL || f.responsible !== ALL ||
  f.nc_id !== "" || f.dueFrom !== "" || f.dueTo !== "";

// Notification payloads
export function buildAssignmentNotificationPayload(action: {
  id: string;
  title: string;
  responsible_user_id: string | null;
  priority: string;
}) {
  if (!action.responsible_user_id) return null;
  return {
    notification_type: "qualite_action_assigned",
    module: "qualite",
    title: "Action qualité assignée",
    message: `Action "${action.title}" vous a été assignée.`,
    severity: action.priority === "critical" ? "high" : action.priority === "high" ? "medium" : "info",
    recipient_user_id: action.responsible_user_id,
    entity_type: "quality_action",
    entity_id: action.id,
    entity_label: action.title,
    action_url: `/qualite/actions?focus=${action.id}`,
    is_critical: action.priority === "critical",
    source: "app",
  };
}

export function buildClosedNotificationPayload(action: { id: string; title: string; created_by: string | null; }) {
  if (!action.created_by) return null;
  return {
    notification_type: "qualite_action_closed",
    module: "qualite",
    title: "Action qualité clôturée",
    message: `Action "${action.title}" clôturée.`,
    severity: "info",
    recipient_user_id: action.created_by,
    entity_type: "quality_action",
    entity_id: action.id,
    entity_label: action.title,
    action_url: `/qualite/actions?focus=${action.id}`,
    is_critical: false,
    source: "app",
  };
}

// ----------------- Page -----------------

export default function QualiteActions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState<QaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [ncList, setNcList] = useState<{ id: string; nc_number: string; of_id: string | null }[]>([]);
  const [ofList, setOfList] = useState<{ id: string; numero: string }[]>([]);

  const [filters, setFilters] = useState<QaFilters>(emptyQaFilters());
  const [createOpen, setCreateOpen] = useState(false);
  const [updateRow, setUpdateRow] = useState<QaRow | null>(null);
  const [form, setForm] = useState<QaFormState>(emptyQaForm());
  const [updateForm, setUpdateForm] = useState<QaUpdateInput>({ status: "open" });
  const [submitting, setSubmitting] = useState(false);

  const ncMap = useMemo(() => {
    const m: Record<string, string> = {};
    ncList.forEach((n) => { m[n.id] = n.nc_number; });
    return m;
  }, [ncList]);
  const ofMap = useMemo(() => {
    const m: Record<string, string> = {};
    ofList.forEach((o) => { m[o.id] = o.numero; });
    return m;
  }, [ofList]);
  const userMap = useMemo(() => {
    const m: Record<string, string> = {};
    users.forEach((u) => { m[u.id] = u.name; });
    return m;
  }, [users]);

  async function loadAll() {
    setLoading(true);
    const [actionsRes, usersRes, ncRes, ofRes] = await Promise.all([
      (supabase.from("quality_actions") as any).select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("user_id, first_name, last_name").limit(500),
      supabase.from("quality_non_conformities").select("id, nc_number, of_id").order("created_at", { ascending: false }).limit(500),
      supabase.from("ordres_fabrication").select("id, numero").order("created_at", { ascending: false }).limit(200),
    ]);
    if (actionsRes.error) toast({ title: "Erreur", description: actionsRes.error.message, variant: "destructive" });
    setRows((actionsRes.data ?? []) as any);
    setUsers((usersRes.data ?? []).map((u: any) => ({ id: u.user_id, name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Sans nom" })));
    setNcList((ncRes.data ?? []) as any);
    setOfList((ofRes.data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  // Pre-fill from NC link
  useEffect(() => {
    const fromNc = searchParams.get("from_nc");
    const fromOf = searchParams.get("from_of");
    if (fromNc) {
      setForm((f) => ({ ...f, nc_id: fromNc, of_id: fromOf || f.of_id }));
      setCreateOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("from_nc");
      next.delete("from_of");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => filterActions(rows, filters, ncMap), [rows, filters, ncMap]);
  const showReset = hasActiveQaFilters(filters);

  function userLabel(id: string | null) {
    if (!id) return "—";
    return userMap[id] ?? "Utilisateur";
  }

  async function handleCreate() {
    if (!user) return;
    const err = validateQaForm(form);
    if (err) { toast({ title: "Erreur", description: err, variant: "destructive" }); return; }
    setSubmitting(true);
    const payload = buildQaInsertPayload(form, user.id);
    const { data, error } = await (supabase.from("quality_actions") as any).insert(payload).select("*").single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    await logAudit({
      module: "qualite" as any,
      action_type: "create",
      action_label: "Création action qualité",
      entity_type: "quality_action",
      entity_id: data.id,
      entity_label: data.title,
      severity: qaPriorityMeta(data.priority).audit,
      new_values: payload,
    });
    // Notification on assignment
    const notif = buildAssignmentNotificationPayload(data as any);
    if (notif) {
      await (supabase.from("notifications") as any).insert({ ...notif, triggered_by_user_id: user.id });
    }
    toast({ title: "Action créée" });
    setCreateOpen(false);
    setForm(emptyQaForm());
    setSubmitting(false);
    loadAll();
  }

  async function handleUpdate() {
    if (!user || !updateRow) return;
    const result = buildQaStatusUpdatePayload(updateForm, user.id);
    if (typeof result === "string") {
      toast({ title: "Erreur", description: result, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await (supabase
      .from("quality_actions") as any)
      .update(result)
      .eq("id", updateRow.id)
      .select("*")
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    await logAudit({
      module: "qualite" as any,
      action_type: "update",
      action_label: updateForm.status === "closed" ? "Clôture action qualité" : "Mise à jour action qualité",
      entity_type: "quality_action",
      entity_id: updateRow.id,
      entity_label: updateRow.title,
      severity: qaPriorityMeta(data.priority).audit,
      old_values: { status: updateRow.status },
      new_values: result,
    });
    // Notification on assignment change
    if (updateForm.responsible_user_id && updateForm.responsible_user_id !== updateRow.responsible_user_id) {
      const notif = buildAssignmentNotificationPayload(data as any);
      if (notif) await (supabase.from("notifications") as any).insert({ ...notif, triggered_by_user_id: user.id });
    }
    if (updateForm.status === "closed") {
      const notif = buildClosedNotificationPayload(data as any);
      if (notif) await (supabase.from("notifications") as any).insert({ ...notif, triggered_by_user_id: user.id });
    }
    toast({ title: "Action mise à jour" });
    setUpdateRow(null);
    setUpdateForm({ status: "open" });
    setSubmitting(false);
    loadAll();
  }

  function exportCsv() {
    exportToCsv(
      filtered.map((r) => ({
        ...r,
        nc_number: r.nc_id ? (ncMap[r.nc_id] ?? "") : "",
        of_numero: r.of_id ? (ofMap[r.of_id] ?? "") : "",
        responsible_name: userLabel(r.responsible_user_id),
        type_label: qaTypeLabel(r.action_type),
        priority_label: qaPriorityMeta(r.priority).label,
        status_label: qaStatusMeta(r.status).label,
      })),
      [
        { key: "title", label: "Titre" },
        { key: "type_label", label: "Type" },
        { key: "priority_label", label: "Priorité" },
        { key: "status_label", label: "Statut" },
        { key: "responsible_name", label: "Responsable" },
        { key: "due_date", label: "Échéance" },
        { key: "nc_number", label: "NC" },
        { key: "of_numero", label: "OF" },
        { key: "created_at", label: "Créée le" },
        { key: "closed_at", label: "Clôturée le" },
      ],
      "actions_qualite"
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Actions qualité (CAPA)</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { setForm(emptyQaForm()); setCreateOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nouvelle action
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-2 md:grid-cols-7">
            <div className="md:col-span-2">
              <Label className="text-xs">Recherche</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Titre / description"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous</SelectItem>
                  {QA_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priorité</Label>
              <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Toutes</SelectItem>
                  {QA_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Responsable</Label>
              <Select value={filters.responsible} onValueChange={(v) => setFilters({ ...filters, responsible: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">NC</Label>
              <Input placeholder="NC-#####" value={filters.nc_id} onChange={(e) => setFilters({ ...filters, nc_id: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Échéance du / au</Label>
              <div className="flex gap-1">
                <Input type="date" value={filters.dueFrom} onChange={(e) => setFilters({ ...filters, dueFrom: e.target.value })} />
                <Input type="date" value={filters.dueTo} onChange={(e) => setFilters({ ...filters, dueTo: e.target.value })} />
              </div>
            </div>
          </div>
          {showReset && (
            <Button variant="ghost" size="sm" onClick={() => setFilters(emptyQaFilters())} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser les filtres
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>NC</TableHead>
                <TableHead>OF</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Aucune action</TableCell></TableRow>
              ) : (
                filtered.map((r) => {
                  const overdue = isQaOverdue(r.due_date, r.status);
                  const pm = qaPriorityMeta(r.priority);
                  const sm = qaStatusMeta(r.status);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{qaTypeLabel(r.action_type)}</TableCell>
                      <TableCell><Badge variant={pm.variant}>{pm.label}</Badge></TableCell>
                      <TableCell><Badge variant={sm.variant}>{sm.label}</Badge></TableCell>
                      <TableCell>{userLabel(r.responsible_user_id)}</TableCell>
                      <TableCell>
                        {r.due_date ? (
                          <Badge variant={overdue ? "destructive" : "outline"}>{r.due_date}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{r.nc_id ? (ncMap[r.nc_id] ?? "—") : "—"}</TableCell>
                      <TableCell>{r.of_id ? (ofMap[r.of_id] ?? "—") : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setUpdateRow(r);
                            setUpdateForm({
                              status: r.status,
                              verification_comment: r.verification_comment ?? "",
                              responsible_user_id: r.responsible_user_id ?? "",
                              due_date: r.due_date ?? "",
                              priority: r.priority,
                            });
                          }}
                        >
                          Mettre à jour
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <ResponsiveDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nouvelle action qualité"
        description="Créer une action curative, corrective ou préventive"
        className="max-w-2xl"
      >
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>NC liée</Label>
              <Select value={form.nc_id || NONE} onValueChange={(v) => setForm({ ...form, nc_id: v === NONE ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {ncList.map((n) => <SelectItem key={n.id} value={n.id}>{n.nc_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>OF lié</Label>
              <Select value={form.of_id || NONE} onValueChange={(v) => setForm({ ...form, of_id: v === NONE ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {ofList.map((o) => <SelectItem key={o.id} value={o.id}>{o.numero}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Type *</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QA_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QA_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Échéance</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Responsable</Label>
            <Select value={form.responsible_user_id || NONE} onValueChange={(v) => setForm({ ...form, responsible_user_id: v === NONE ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={submitting}>Créer</Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Update dialog */}
      <ResponsiveDialog
        open={!!updateRow}
        onOpenChange={(v) => { if (!v) { setUpdateRow(null); setUpdateForm({ status: "open" }); } }}
        title="Mettre à jour l'action"
        description={updateRow?.title}
        className="max-w-xl"
      >
        {updateRow && (
          <div className="space-y-3">
            <div>
              <Label>Statut</Label>
              <Select value={updateForm.status} onValueChange={(v) => setUpdateForm({ ...updateForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QA_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Responsable</Label>
                <Select
                  value={updateForm.responsible_user_id || NONE}
                  onValueChange={(v) => setUpdateForm({ ...updateForm, responsible_user_id: v === NONE ? "" : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Échéance</Label>
                <Input type="date" value={updateForm.due_date ?? ""} onChange={(e) => setUpdateForm({ ...updateForm, due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={updateForm.priority ?? "medium"} onValueChange={(v) => setUpdateForm({ ...updateForm, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QA_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Commentaire de vérification {updateForm.status === "closed" && <span className="text-destructive">*</span>}</Label>
              <Textarea
                value={updateForm.verification_comment ?? ""}
                onChange={(e) => setUpdateForm({ ...updateForm, verification_comment: e.target.value })}
                placeholder="Obligatoire pour clôturer"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setUpdateRow(null)}>Annuler</Button>
              <Button variant="secondary" className="gap-2" onClick={() => setUpdateForm({ ...updateForm, status: "done" })}>
                <CheckCircle2 className="h-4 w-4" /> Marquer terminée
              </Button>
              <Button variant="secondary" className="gap-2" onClick={() => setUpdateForm({ ...updateForm, status: "verified" })}>
                <ShieldCheck className="h-4 w-4" /> Vérifier
              </Button>
              <Button className="gap-2" onClick={handleUpdate} disabled={submitting}>
                <Lock className="h-4 w-4" /> Enregistrer
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
