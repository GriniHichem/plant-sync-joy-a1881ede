import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { logAudit } from "@/lib/audit";

interface Team { id: string; code: string; name: string; }
interface Profile { user_id: string; first_name: string | null; last_name: string | null; poste: string | null; }
interface Member {
  id: string;
  user_id: string;
  role_in_team: string;
  autorisation_libre: boolean;
  is_active: boolean;
  profile?: Profile | null;
}

const ROLES = [
  { v: "membre", l: "Membre" },
  { v: "chef", l: "Chef d'équipe" },
];

const fullName = (p?: Profile | null) =>
  p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—" : "—";

export function MembersTab() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [newUser, setNewUser] = useState("");
  const [newRole, setNewRole] = useState("membre");
  const [newLibre, setNewLibre] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [tRes, pRes] = await Promise.all([
        supabase.from("shift_teams").select("id, code, name").eq("is_active", true).order("code"),
        supabase.from("profiles").select("user_id, first_name, last_name, poste").eq("is_active", true).order("first_name"),
      ]);
      const t = (tRes.data as Team[]) ?? [];
      setTeams(t);
      setProfiles((pRes.data as Profile[]) ?? []);
      if (t.length && !teamId) setTeamId(t[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMembers = async (tid: string) => {
    if (!tid) return;
    setLoading(true);
    const { data } = await supabase
      .from("shift_team_members")
      .select("id, user_id, role_in_team, autorisation_libre, is_active")
      .eq("team_id", tid);
    const rows = (data as Member[]) ?? [];
    const byUser = new Map(profiles.map((p) => [p.user_id, p]));
    setMembers(rows.map((r) => ({ ...r, profile: byUser.get(r.user_id) })));
    setLoading(false);
  };

  useEffect(() => { if (teamId && profiles.length) loadMembers(teamId); }, [teamId, profiles]); // eslint-disable-line

  const memberIds = new Set(members.map((m) => m.user_id));
  const available = profiles.filter((p) => !memberIds.has(p.user_id));

  const addMember = async () => {
    if (!newUser) { toast({ title: "Sélectionnez un employé", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("shift_team_members").insert({
        team_id: teamId, user_id: newUser, role_in_team: newRole, autorisation_libre: newLibre, is_active: true,
      });
      if (error) throw error;
      await logAudit({ action_type: "create", module: "parametres", action: "shift_member_add", entity_type: "shift_team_members", description: "Membre ajouté à une équipe" });
      toast({ title: "Membre ajouté" });
      setOpen(false); setNewUser(""); setNewRole("membre"); setNewLibre(false);
      await loadMembers(teamId);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const patch = async (m: Member, fields: Partial<Member>) => {
    const { error } = await supabase.from("shift_team_members").update(fields).eq("id", m.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAudit({ action_type: "update", module: "parametres", action: "shift_member_update", entity_type: "shift_team_members", entity_id: m.id, description: "Membre d'équipe modifié" });
    await loadMembers(teamId);
  };

  const remove = async (m: Member) => {
    if (!confirm(`Retirer ${fullName(m.profile)} de l'équipe ?`)) return;
    const { error } = await supabase.from("shift_team_members").delete().eq("id", m.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAudit({ action_type: "delete", module: "parametres", action: "shift_member_remove", entity_type: "shift_team_members", entity_id: m.id, description: "Membre retiré d'une équipe" });
    toast({ title: "Membre retiré" });
    await loadMembers(teamId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="space-y-1.5 w-64">
          <Label>Équipe</Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger><SelectValue placeholder="Choisir une équipe" /></SelectTrigger>
            <SelectContent>
              {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.code} — {t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!teamId}><UserPlus className="h-4 w-4 mr-2" /> Ajouter un membre</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un membre</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Employé</Label>
                <Select value={newUser} onValueChange={setNewUser}>
                  <SelectTrigger><SelectValue placeholder="Choisir un employé" /></SelectTrigger>
                  <SelectContent>
                    {available.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {fullName(p)}{p.poste ? ` · ${p.poste}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rôle dans l'équipe</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newLibre} onCheckedChange={setNewLibre} />
                <Label>Autorisation libre (auto-ouverture de session)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={addMember} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ajouter</Button>
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
              <TableHead>Employé</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Autorisation libre</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{fullName(m.profile)}</TableCell>
                <TableCell>
                  <Select value={m.role_in_team} onValueChange={(v) => patch(m, { role_in_team: v })}>
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch checked={m.autorisation_libre} onCheckedChange={(v) => patch(m, { autorisation_libre: v })} />
                </TableCell>
                <TableCell>
                  <Switch checked={m.is_active} onCheckedChange={(v) => patch(m, { is_active: v })} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => remove(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun membre dans cette équipe.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
