import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, ClipboardCheck, Plus, Trash2, RotateCcw } from "lucide-react";

interface Profile { id: string; display_name: string | null; }
interface Team { id: string; name: string; code: string; }
interface LineRow { id: string; code: string; designation: string; }
interface Assignment {
  id: string;
  controller_id: string;
  shift_type: "matin" | "apres_midi" | "nuit";
  shift_team_id: string | null;
  line_ids: string[];
}

const SHIFT_LABELS: Record<string, string> = {
  matin: "Matin (5h-13h)",
  apres_midi: "Après-midi (13h-21h)",
  nuit: "Nuit (21h-5h)",
};

const NONE = "__none__";

export default function QualiteShiftPlanAdmin() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [controllers, setControllers] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filterController, setFilterController] = useState<string>(NONE);

  const [editing, setEditing] = useState<Assignment | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [a, t, l, c] = await Promise.all([
      supabase.from("quality_shift_assignments" as any).select("*"),
      supabase.from("shift_teams").select("id, name, code").order("code"),
      supabase.from("production_lines").select("id, code, designation").order("code"),
      // contrôleurs et resp. CQ
      supabase.rpc("get_users_with_role" as any, { _role: "controleur_qualite" }).then(async (res) => {
        if (res.error) {
          // fallback : tous les profils
          const all = await supabase.from("profiles").select("id, display_name").order("display_name");
          return { data: all.data ?? [], error: null };
        }
        return res;
      }),
    ]);
    setAssignments((a.data as any[]) ?? []);
    setTeams((t.data as any[]) ?? []);
    setLines((l.data as any[]) ?? []);
    setControllers((c.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const controllerName = (id: string) =>
    controllers.find((u) => u.id === id)?.display_name ?? id.slice(0, 8);
  const teamLabel = (id: string | null) =>
    id ? (teams.find((t) => t.id === id)?.code ?? "—") : "—";
  const lineLabels = (ids: string[]) =>
    ids.map((id) => lines.find((l) => l.id === id)?.code ?? "?").join(", ") || "—";

  const filtered = filterController === NONE
    ? assignments
    : assignments.filter((a) => a.controller_id === filterController);

  const openNew = () => {
    setEditing({
      id: "",
      controller_id: "",
      shift_type: "matin",
      shift_team_id: null,
      line_ids: [],
    });
    setOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditing({ ...a });
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.controller_id) {
      toast({ title: "Contrôleur requis", variant: "destructive" });
      return;
    }
    const payload = {
      controller_id: editing.controller_id,
      shift_type: editing.shift_type,
      shift_team_id: editing.shift_team_id,
      line_ids: editing.line_ids,
    };
    const res = editing.id
      ? await supabase.from("quality_shift_assignments" as any).update(payload).eq("id", editing.id)
      : await supabase.from("quality_shift_assignments" as any).insert(payload);
    if (res.error) {
      toast({ title: "Échec", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plan enregistré" });
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette affectation ?")) return;
    const { error } = await supabase.from("quality_shift_assignments" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Échec", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Supprimé" });
    load();
  };

  const toggleLine = (lid: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      line_ids: editing.line_ids.includes(lid)
        ? editing.line_ids.filter((x) => x !== lid)
        : [...editing.line_ids, lid],
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/parametres/qualite"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Plan shifts qualité</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Affecte les contrôleurs aux créneaux et lignes — les sessions qualité sont créées automatiquement à l'heure serveur (Africa/Algiers).
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Affecter</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-3">
            <span>Affectations en cours</span>
            <div className="flex items-center gap-2">
              <Select value={filterController} onValueChange={setFilterController}>
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue placeholder="Filtrer par contrôleur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Tous les contrôleurs</SelectItem>
                  {controllers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.display_name ?? c.id.slice(0,8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterController !== NONE && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFilterController(NONE)} title="Réinitialiser">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune affectation. Cliquer sur « Affecter » pour démarrer.</p>
          ) : (
            <div className="grid gap-2">
              {filtered.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 border rounded-md hover:border-primary/40 cursor-pointer"
                  onClick={() => openEdit(a)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{controllerName(a.controller_id)}</span>
                      <Badge variant="secondary" className="text-xs">{SHIFT_LABELS[a.shift_type]}</Badge>
                      <Badge variant="outline" className="text-xs">Équipe {teamLabel(a.shift_team_id)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">Lignes : {lineLabels(a.line_ids)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(a.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier l'affectation" : "Nouvelle affectation"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Contrôleur</label>
                <Select
                  value={editing.controller_id || NONE}
                  onValueChange={(v) => setEditing({ ...editing, controller_id: v === NONE ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Choisir un contrôleur" /></SelectTrigger>
                  <SelectContent>
                    {controllers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.display_name ?? c.id.slice(0,8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Créneau</label>
                  <Select
                    value={editing.shift_type}
                    onValueChange={(v: any) => setEditing({ ...editing, shift_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SHIFT_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Équipe (optionnel)</label>
                  <Select
                    value={editing.shift_team_id ?? NONE}
                    onValueChange={(v) => setEditing({ ...editing, shift_team_id: v === NONE ? null : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Aucune</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.code} — {t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Lignes couvertes</label>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto p-2 border rounded">
                  {lines.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editing.line_ids.includes(l.id)}
                        onChange={() => toggleLine(l.id)}
                      />
                      <span>{l.code} — {l.designation}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{editing.line_ids.length} ligne(s) sélectionnée(s)</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
