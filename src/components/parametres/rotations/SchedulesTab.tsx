import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { logAudit } from "@/lib/audit";

interface Team { id: string; code: string; name: string; }
interface Template { id: string; code: string; label: string; shift_mode_id: string | null; }
interface ShiftSystem { id: string; code: string; label: string; }
interface Line { id: string; code: string; designation: string; }
interface Schedule {
  id: string;
  team_id: string;
  template_id: string;
  scope_kind: string;
  line_ids: string[];
  date_debut: string;
  date_fin: string | null;
  weekdays: number[];
  is_active: boolean;
}

const SCOPES = [
  { v: "all", l: "Tous" },
  { v: "production", l: "Production" },
  { v: "maintenance", l: "Maintenance" },
  { v: "quality", l: "Qualité" },
];
const WD = [
  { v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mer" },
  { v: 4, l: "Jeu" }, { v: 5, l: "Ven" }, { v: 6, l: "Sam" }, { v: 7, l: "Dim" },
];

const today = () => new Date().toISOString().slice(0, 10);
const BLANK = {
  id: "", team_id: "", template_id: "", scope_kind: "all",
  line_ids: [] as string[], date_debut: today(), date_fin: "",
  weekdays: [] as number[], is_active: true,
};

export function SchedulesTab() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [systems, setSystems] = useState<ShiftSystem[]>([]);
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [lines, setLines] = useState<Line[]>([]);
  const [rows, setRows] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<typeof BLANK>(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [tRes, mRes, lRes, sRes] = await Promise.all([
      supabase.from("shift_teams").select("id, code, name").order("code"),
      supabase.from("shift_templates").select("id, code, label").order("sort_order"),
      supabase.from("production_lines").select("id, code, designation").eq("is_active", true).order("code"),
      supabase.from("shift_schedules").select("*").order("date_debut", { ascending: false }),
    ]);
    setTeams((tRes.data as Team[]) ?? []);
    setTemplates((mRes.data as Template[]) ?? []);
    setLines((lRes.data as Line[]) ?? []);
    setRows((sRes.data as Schedule[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const teamLabel = (id: string) => { const t = teams.find((x) => x.id === id); return t ? t.code : "?"; };
  const tplLabel = (id: string) => { const t = templates.find((x) => x.id === id); return t ? t.label : "?"; };

  const openNew = () => { setDraft({ ...BLANK, team_id: teams[0]?.id ?? "", template_id: templates[0]?.id ?? "" }); setOpen(true); };
  const openEdit = (s: Schedule) => {
    setDraft({ ...s, date_fin: s.date_fin ?? "", line_ids: s.line_ids ?? [], weekdays: s.weekdays ?? [] });
    setOpen(true);
  };

  const toggleLine = (id: string) =>
    setDraft((d) => ({ ...d, line_ids: d.line_ids.includes(id) ? d.line_ids.filter((x) => x !== id) : [...d.line_ids, id] }));
  const toggleWd = (v: number) =>
    setDraft((d) => ({ ...d, weekdays: d.weekdays.includes(v) ? d.weekdays.filter((x) => x !== v) : [...d.weekdays, v] }));

  const save = async () => {
    if (!draft.team_id || !draft.template_id) { toast({ title: "Équipe et modèle requis", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        team_id: draft.team_id,
        template_id: draft.template_id,
        scope_kind: draft.scope_kind,
        line_ids: draft.line_ids,
        date_debut: draft.date_debut,
        date_fin: draft.date_fin || null,
        weekdays: draft.weekdays.sort((a, b) => a - b),
        is_active: draft.is_active,
      };
      if (draft.id) {
        const { error } = await supabase.from("shift_schedules").update(payload).eq("id", draft.id);
        if (error) throw error;
        await logAudit({ action_type: "update", module: "parametres", action: "shift_schedule_update", entity_type: "shift_schedules", entity_id: draft.id, description: "Planning de rotation modifié" });
      } else {
        const { error } = await supabase.from("shift_schedules").insert(payload);
        if (error) throw error;
        await logAudit({ action_type: "create", module: "parametres", action: "shift_schedule_create", entity_type: "shift_schedules", description: "Planning de rotation créé" });
      }
      toast({ title: "Planning enregistré" });
      setOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const remove = async (s: Schedule) => {
    if (!confirm("Supprimer ce planning ?")) return;
    const { error } = await supabase.from("shift_schedules").delete().eq("id", s.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAudit({ action_type: "delete", module: "parametres", action: "shift_schedule_delete", entity_type: "shift_schedules", entity_id: s.id, description: "Planning de rotation supprimé" });
    toast({ title: "Planning supprimé" });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nouveau planning</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{draft.id ? "Modifier" : "Nouveau"} planning de rotation</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Équipe</Label>
                  <Select value={draft.team_id} onValueChange={(v) => setDraft({ ...draft, team_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.code} — {t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Modèle</Label>
                  <Select value={draft.template_id} onValueChange={(v) => setDraft({ ...draft, template_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Portée</Label>
                <Select value={draft.scope_kind} onValueChange={(v) => setDraft({ ...draft, scope_kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCOPES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date début</Label>
                  <Input type="date" value={draft.date_debut} onChange={(e) => setDraft({ ...draft, date_debut: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date fin (optionnel)</Label>
                  <Input type="date" value={draft.date_fin} onChange={(e) => setDraft({ ...draft, date_fin: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Jours (vide = tous les jours)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {WD.map((d) => (
                    <Button key={d.v} type="button" size="sm" variant={draft.weekdays.includes(d.v) ? "default" : "outline"} onClick={() => toggleWd(d.v)}>{d.l}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Lignes couvertes (maintenance / qualité)</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                  {lines.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={draft.line_ids.includes(l.id)} onCheckedChange={() => toggleLine(l.id)} />
                      {l.code}
                    </label>
                  ))}
                  {lines.length === 0 && <span className="text-sm text-muted-foreground">Aucune ligne.</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
                <Label>Actif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Équipe</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead>Portée</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Jours</TableHead>
              <TableHead>Lignes</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold">{teamLabel(s.team_id)}</TableCell>
                <TableCell>{tplLabel(s.template_id)}</TableCell>
                <TableCell><Badge variant="outline">{SCOPES.find((x) => x.v === s.scope_kind)?.l ?? s.scope_kind}</Badge></TableCell>
                <TableCell className="tabular-nums text-xs">{s.date_debut}{s.date_fin ? ` → ${s.date_fin}` : " →"}</TableCell>
                <TableCell className="text-xs">{s.weekdays?.length ? s.weekdays.map((w) => WD.find((d) => d.v === w)?.l).join(" ") : "Tous"}</TableCell>
                <TableCell className="text-xs">{s.line_ids?.length ? `${s.line_ids.length} ligne(s)` : "—"}</TableCell>
                <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Actif" : "Inactif"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucun planning.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
