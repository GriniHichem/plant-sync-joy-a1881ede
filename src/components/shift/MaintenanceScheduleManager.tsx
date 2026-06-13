/**
 * Programmation des shifts maintenance : permet au responsable maintenance
 * de planifier à l'avance des sessions récurrentes par maintenancier.
 * Le système s'ouvre automatiquement au créneau via le RPC
 * apply_maintenance_shift_schedules (cron). L'ouverture manuelle reste possible.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveDialog } from "@/components/responsive/ResponsiveDialog";
import { CalendarClock, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { logAudit } from "@/lib/audit";

const SHIFT_TYPES = [
  { value: "matin", label: "Matin" },
  { value: "apres_midi", label: "Après-midi" },
  { value: "nuit", label: "Nuit" },
];

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 0, label: "Dim" },
];

const shiftLabel = (v: string) => SHIFT_TYPES.find((s) => s.value === v)?.label ?? v;

interface ScheduleForm {
  id?: string;
  maintenancier_id: string;
  shift_type: string;
  shift_team_id: string;
  line_ids: string[];
  weekdays: number[];
  date_debut: string;
  date_fin: string;
  auto_open: boolean;
  is_active: boolean;
}

const emptyForm = (): ScheduleForm => ({
  maintenancier_id: "",
  shift_type: "matin",
  shift_team_id: "",
  line_ids: [],
  weekdays: [],
  date_debut: new Date().toISOString().slice(0, 10),
  date_fin: "",
  auto_open: true,
  is_active: true,
});

export function MaintenanceScheduleManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ScheduleForm>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("maintenance_shift_schedules" as any)
      .select("*, shift_teams(code, name, color)")
      .order("created_at", { ascending: false });
    const rows = (data as any[]) ?? [];
    if (rows.length) {
      const ids = Array.from(new Set(rows.map((r) => r.maintenancier_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", ids);
      const m = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      rows.forEach((r) => (r.profile = m.get(r.maintenancier_id) ?? null));
    }
    setSchedules(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    (async () => {
      const [{ data: roleRows }, teamsRes, linesRes] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("role", "maintenancier" as any),
        supabase.from("shift_teams").select("*").eq("is_active", true).order("code"),
        supabase.from("production_lines").select("id, code, designation").eq("is_active", true).order("code"),
      ]);
      const ids = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", ids)
        : { data: [] as any[] };
      setOperators((profs as any[]) ?? []);
      setTeams(teamsRes.data ?? []);
      setLines(linesRes.data ?? []);
    })();
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(s: any) {
    setForm({
      id: s.id,
      maintenancier_id: s.maintenancier_id,
      shift_type: s.shift_type,
      shift_team_id: s.shift_team_id ?? "",
      line_ids: s.line_ids ?? [],
      weekdays: s.weekdays ?? [],
      date_debut: s.date_debut,
      date_fin: s.date_fin ?? "",
      auto_open: s.auto_open,
      is_active: s.is_active,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.maintenancier_id) {
      toast({ title: "Sélectionnez un maintenancier", variant: "destructive" });
      return;
    }
    if (form.line_ids.length === 0) {
      toast({ title: "Sélectionnez au moins une ligne couverte", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        maintenancier_id: form.maintenancier_id,
        shift_type: form.shift_type,
        shift_team_id: form.shift_team_id || null,
        line_ids: form.line_ids,
        weekdays: form.weekdays,
        date_debut: form.date_debut,
        date_fin: form.date_fin || null,
        auto_open: form.auto_open,
        is_active: form.is_active,
      };
      if (form.id) {
        const { error } = await supabase
          .from("maintenance_shift_schedules" as any)
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        await logAudit({
          action_type: "update", module: "interventions",
          action: "maintenance_schedule_update", entity_type: "maintenance_shift_schedules",
          entity_id: form.id, description: "Modification d'un plan de programmation shift maintenance",
        });
      } else {
        const { data, error } = await supabase
          .from("maintenance_shift_schedules" as any)
          .insert({ ...payload, created_by: user?.id })
          .select()
          .single();
        if (error) throw error;
        await logAudit({
          action_type: "create", module: "interventions",
          action: "maintenance_schedule_create", entity_type: "maintenance_shift_schedules",
          entity_id: (data as any).id, description: "Création d'un plan de programmation shift maintenance",
        });
      }
      toast({ title: "Plan enregistré" });
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(s: any) {
    const { error } = await supabase
      .from("maintenance_shift_schedules" as any)
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit({
      action_type: "update", module: "interventions",
      action: "maintenance_schedule_toggle", entity_type: "maintenance_shift_schedules",
      entity_id: s.id, description: `Plan ${!s.is_active ? "activé" : "désactivé"}`,
    });
    load();
  }

  async function handleDelete(s: any) {
    if (!window.confirm("Supprimer ce plan de programmation ?")) return;
    const { error } = await supabase
      .from("maintenance_shift_schedules" as any)
      .delete()
      .eq("id", s.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit({
      action_type: "delete", module: "interventions",
      action: "maintenance_schedule_delete", entity_type: "maintenance_shift_schedules",
      entity_id: s.id, description: "Suppression d'un plan de programmation shift maintenance",
    });
    load();
  }

  function toggleWeekday(d: number) {
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d],
    }));
  }

  function toggleLine(id: string) {
    setForm((f) => ({
      ...f,
      line_ids: f.line_ids.includes(id) ? f.line_ids.filter((x) => x !== id) : [...f.line_ids, id],
    }));
  }

  const operatorName = (s: any) =>
    `${s.profile?.first_name ?? ""} ${s.profile?.last_name ?? ""}`.trim() || "—";

  const weekdaysLabel = (arr: number[]) =>
    !arr || arr.length === 0
      ? "Tous les jours"
      : WEEKDAYS.filter((w) => arr.includes(w.value)).map((w) => w.label).join(", ");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> Programmation automatique
        </CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Programmer un shift
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Les sessions programmées s'ouvrent automatiquement au créneau, sans intervention manuelle.
        </p>
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Aucun plan de programmation. Cliquez sur « Programmer un shift ».
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="p-3 border rounded-lg flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {s.is_active ? (
                    s.auto_open ? (
                      <Badge variant="default" className="text-xs">Auto</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Manuel</Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-xs">Désactivé</Badge>
                  )}
                  <span className="font-semibold text-sm">{operatorName(s)}</span>
                  <Badge variant="outline" className="text-xs capitalize">{shiftLabel(s.shift_type)}</Badge>
                  {s.shift_teams && <Badge variant="outline" className="text-xs">Équipe {s.shift_teams.code}</Badge>}
                  <span className="text-xs text-muted-foreground">{weekdaysLabel(s.weekdays)}</span>
                  <span className="text-xs text-muted-foreground">{(s.line_ids?.length ?? 0)} ligne(s)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(s)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={form.id ? "Modifier le plan" : "Programmer un shift maintenance"}
        description="Le shift s'ouvrira automatiquement au créneau, les jours sélectionnés."
      >
        <div className="space-y-4">
          <div>
            <Label>Maintenancier *</Label>
            <Select value={form.maintenancier_id} onValueChange={(v) => setForm((f) => ({ ...f, maintenancier_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {operators.map((o) => (
                  <SelectItem key={o.user_id} value={o.user_id}>{o.first_name} {o.last_name}</SelectItem>
                ))}
                {operators.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Aucun maintenancier</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Créneau</Label>
              <Select value={form.shift_type} onValueChange={(v) => setForm((f) => ({ ...f, shift_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Équipe</Label>
              <Select value={form.shift_team_id || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, shift_team_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucune —</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.code} — {t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Jours de la semaine</Label>
            <p className="text-xs text-muted-foreground mb-1.5">Aucun sélectionné = tous les jours.</p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((w) => (
                <Button
                  key={w.value}
                  type="button"
                  size="sm"
                  variant={form.weekdays.includes(w.value) ? "default" : "outline"}
                  onClick={() => toggleWeekday(w.value)}
                >
                  {w.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date de début</Label>
              <Input type="date" value={form.date_debut} onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))} />
            </div>
            <div>
              <Label>Date de fin (optionnel)</Label>
              <Input type="date" value={form.date_fin} onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Lignes couvertes *</Label>
            <div className="border rounded-md p-2 max-h-44 overflow-auto space-y-1 mt-1">
              {lines.map((l) => (
                <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50 rounded cursor-pointer">
                  <Checkbox checked={form.line_ids.includes(l.id)} onCheckedChange={() => toggleLine(l.id)} />
                  <span className="text-sm">{l.code} — {l.designation}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <Label className="cursor-pointer">Ouverture automatique</Label>
              <p className="text-xs text-muted-foreground">Désactivez pour garder le plan sans ouverture auto.</p>
            </div>
            <Switch checked={form.auto_open} onCheckedChange={(c) => setForm((f) => ({ ...f, auto_open: c }))} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Annuler</Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </Card>
  );
}
