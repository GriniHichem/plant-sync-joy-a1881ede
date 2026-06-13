import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Save, CalendarClock, Trash2, X } from "lucide-react";
import { logAudit } from "@/lib/audit";
import {
  tokenForDate,
  surfaceTokenForDate,
  tokenLabel,
  formatDateLocal,
  type PatternToken,
} from "@/lib/shiftRotation";

const SCOPES = [
  { value: "maintenance", label: "Maintenance" },
  { value: "production", label: "Production" },
  { value: "quality", label: "Qualité" },
];

const TOKEN_OPTIONS: PatternToken[] = ["matin", "midi", "nuit", "jour", "repos"];

interface Assignment {
  id: string;
  user_id: string;
  system_id: string;
  scope_kind: string;
  shift_team_id: string | null;
  line_ids: string[];
  pattern: PatternToken[];
  anchor_date: string;
  autorisation_libre: boolean;
  is_active: boolean;
}

export default function RotationsAdmin() {
  const { hasRole, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const canManage = hasRole("admin") || hasRole("resp_maintenance") || hasRole("resp_production") || hasRole("responsable_controle_qualite");

  const [profiles, setProfiles] = useState<any[]>([]);
  const [systems, setSystems] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // dialog state
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string>("");
  const [systemId, setSystemId] = useState<string>("");
  const [scope, setScope] = useState("maintenance");
  const [teamId, setTeamId] = useState<string>("__none__");
  const [lineIds, setLineIds] = useState<string[]>([]);
  const [pattern, setPattern] = useState<PatternToken[]>([]);
  const [anchorDate, setAnchorDate] = useState(formatDateLocal(new Date()));
  const [autoLibre, setAutoLibre] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [pRes, sRes, tRes, lRes, aRes] = await Promise.all([
      supabase.from("profiles").select("user_id, first_name, last_name, poste").order("first_name"),
      supabase.from("work_shift_systems" as any).select("*").eq("is_active", true).order("nb_shifts"),
      supabase.from("shift_teams").select("*").eq("is_active", true).order("code"),
      supabase.from("production_lines").select("id, code, designation").order("code"),
      supabase.from("employee_shift_assignments" as any).select("*"),
    ]);
    setProfiles(pRes.data || []);
    setSystems((sRes.data as any[]) || []);
    setTeams(tRes.data || []);
    setLines(lRes.data || []);
    setAssignments(((aRes.data as any[]) || []).map((a) => ({ ...a, pattern: a.pattern ?? [] })));
    setLoading(false);
  }

  const systemById = useMemo(() => Object.fromEntries(systems.map((s) => [s.id, s])), [systems]);
  const assignByUser = useMemo(() => Object.fromEntries(assignments.map((a) => [a.user_id, a])), [assignments]);
  const selectedSystem = systemId ? systemById[systemId] : null;
  const isSurface = selectedSystem?.cycle_type === "fixed_weekly";

  function openEditor(userId: string) {
    const a = assignByUser[userId];
    setEditingUser(userId);
    if (a) {
      setSystemId(a.system_id);
      setScope(a.scope_kind);
      setTeamId(a.shift_team_id ?? "__none__");
      setLineIds(a.line_ids ?? []);
      setPattern(a.pattern ?? []);
      setAnchorDate(a.anchor_date);
      setAutoLibre(a.autorisation_libre);
      setIsActive(a.is_active);
    } else {
      setSystemId(systems[0]?.id ?? "");
      setScope("maintenance");
      setTeamId("__none__");
      setLineIds([]);
      setPattern([]);
      setAnchorDate(formatDateLocal(new Date()));
      setAutoLibre(false);
      setIsActive(true);
    }
    setOpen(true);
  }

  function nextShiftPreview(): string {
    if (!selectedSystem) return "—";
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = formatDateLocal(d);
      const tok = isSurface ? surfaceTokenForDate(ds) : tokenForDate(pattern, anchorDate, ds);
      if (tok && tok !== "repos") {
        return `${ds} → ${tokenLabel(tok)}`;
      }
    }
    return "Aucun shift prévu (14 j)";
  }

  async function save() {
    if (!editingUser || !systemId) {
      toast({ title: "Champs requis", description: "Sélectionnez un système.", variant: "destructive" });
      return;
    }
    if (!isSurface && pattern.length === 0) {
      toast({ title: "Motif requis", description: "Ajoutez au moins un jour au motif de cycle.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: editingUser,
      system_id: systemId,
      scope_kind: scope,
      shift_team_id: teamId === "__none__" ? null : teamId,
      line_ids: lineIds,
      pattern: isSurface ? [] : pattern,
      anchor_date: anchorDate,
      autorisation_libre: autoLibre,
      is_active: isActive,
      created_by: user?.id ?? null,
    };
    const existing = assignByUser[editingUser];
    const { error } = await supabase
      .from("employee_shift_assignments" as any)
      .upsert(payload, { onConflict: "user_id" });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    await logAudit({
      action_type: existing ? "update" : "create",
      module: "parametres",
      entity_type: "employee_shift_assignment",
      entity_id: editingUser,
      description: `Configuration rotation (${scope}, système ${selectedSystem?.code})`,
      new_values: payload,
      old_values: (existing as unknown as Record<string, unknown>) ?? undefined,
    });
    toast({ title: "Enregistré", description: "Affectation de rotation mise à jour." });
    setOpen(false);
    setSaving(false);
    loadAll();
  }

  async function toggleAutoLibre(a: Assignment, value: boolean) {
    const { error } = await supabase
      .from("employee_shift_assignments" as any)
      .update({ autorisation_libre: value })
      .eq("id", a.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit({
      action_type: "update",
      module: "parametres",
      entity_type: "employee_shift_assignment",
      entity_id: a.user_id,
      description: `Autorisation Libre ${value ? "activée" : "désactivée"}`,
      old_values: { autorisation_libre: a.autorisation_libre },
      new_values: { autorisation_libre: value },
    });
    loadAll();
  }

  function profileName(p: any) {
    const n = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
    return n || p.poste || p.user_id.slice(0, 8);
  }

  if (!canManage) {
    return <div className="p-8 text-muted-foreground">Accès réservé aux responsables.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <CalendarClock className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Rotations & Autorisations</h1>
          <p className="text-sm text-muted-foreground">Systèmes, motifs de cycle et ouverture automatique de session par employé</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Employés</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Système</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Date d'ancrage</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-center">Autorisation Libre</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7}>Chargement…</TableCell></TableRow>}
              {!loading && profiles.map((p) => {
                const a = assignByUser[p.user_id];
                const sys = a ? systemById[a.system_id] : null;
                return (
                  <TableRow key={p.user_id}>
                    <TableCell className="font-medium">{profileName(p)}</TableCell>
                    <TableCell>{sys ? <Badge variant="secondary">{sys.code}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {a ? (
                        sys?.cycle_type === "fixed_weekly" ? <span className="text-xs text-muted-foreground">5/7 (Lun–Ven)</span> :
                        <div className="flex flex-wrap gap-1">
                          {(a.pattern ?? []).map((t, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{tokenLabel(t)}</Badge>
                          ))}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{a?.anchor_date ?? "—"}</TableCell>
                    <TableCell>{a ? SCOPES.find((s) => s.value === a.scope_kind)?.label : "—"}</TableCell>
                    <TableCell className="text-center">
                      {a ? (
                        <Switch checked={a.autorisation_libre} onCheckedChange={(v) => toggleAutoLibre(a, v)} />
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEditor(p.user_id)}>
                        {a ? "Configurer" : <><Plus className="h-4 w-4 mr-1" />Affecter</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration de rotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Système</Label>
                <Select value={systemId} onValueChange={setSystemId}>
                  <SelectTrigger><SelectValue placeholder="Système" /></SelectTrigger>
                  <SelectContent>
                    {systems.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scope (session)</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!isSurface && (
              <div>
                <Label>Motif de cycle</Label>
                <div className="flex flex-wrap gap-1 mb-2 min-h-[2rem] p-2 rounded border bg-muted/30">
                  {pattern.length === 0 && <span className="text-xs text-muted-foreground">Ajoutez des jours ci-dessous…</span>}
                  {pattern.map((t, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {tokenLabel(t)}
                      <button onClick={() => setPattern(pattern.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {TOKEN_OPTIONS.map((t) => (
                    <Button key={t} size="sm" variant="outline" onClick={() => setPattern([...pattern, t])}>
                      + {tokenLabel(t)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {isSurface && (
              <div className="text-sm text-muted-foreground rounded border p-3 bg-muted/30">
                Système Surface : logique calendaire fixe 5/7 (travail Lun–Ven, repos Sam/Dim). Aucun motif à configurer.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date d'ancrage</Label>
                <Input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} disabled={isSurface} />
              </div>
              <div>
                <Label>Équipe</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {scope !== "production" && (
              <div>
                <Label>Lignes couvertes</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {lines.map((l) => {
                    const active = lineIds.includes(l.id);
                    return (
                      <Button key={l.id} size="sm" variant={active ? "default" : "outline"}
                        onClick={() => setLineIds(active ? lineIds.filter((x) => x !== l.id) : [...lineIds, l.id])}>
                        {l.code}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <Label className="text-sm">Autorisation Libre</Label>
                <p className="text-xs text-muted-foreground">Autoriser l'ouverture auto de session pendant le créneau calculé</p>
              </div>
              <Switch checked={autoLibre} onCheckedChange={setAutoLibre} />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <Label className="text-sm">Affectation active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="rounded border p-3 bg-primary/5 text-sm">
              <span className="font-medium">Prochain shift : </span>{nextShiftPreview()}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
