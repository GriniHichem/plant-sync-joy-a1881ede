import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Save, Users, Clock, CalendarDays, Settings, Trash2, Layers } from "lucide-react";

export default function ShiftsAdmin() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [rotation, setRotation] = useState<any[]>([]);
  const [shiftModes, setShiftModes] = useState<any[]>([]);
  const [modeSlots, setModeSlots] = useState<any[]>([]);

  // Team dialog
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [teamColor, setTeamColor] = useState("#3b82f6");

  // Time slot dialog
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [slotLabel, setSlotLabel] = useState("");
  const [slotCode, setSlotCode] = useState("");
  const [slotStart, setSlotStart] = useState("06:00");
  const [slotEnd, setSlotEnd] = useState("14:00");

  // Rotation
  const [rotationDate, setRotationDate] = useState(new Date().toISOString().slice(0, 10));
  const [rotationWeekStart, setRotationWeekStart] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [teamsRes, slotsRes, settingsRes] = await Promise.all([
      supabase.from("shift_teams").select("*").order("code"),
      supabase.from("shift_time_slots").select("*").order("sort_order"),
      supabase.from("shift_settings").select("*").order("key"),
    ]);
    setTeams(teamsRes.data || []);
    setTimeSlots(slotsRes.data || []);
    setSettings(settingsRes.data || []);
  }

  async function loadRotation(startDate: string) {
    const end = new Date(startDate);
    end.setDate(end.getDate() + 6);
    const { data } = await supabase
      .from("shift_rotation")
      .select("*, shift_teams(name, code, color), shift_time_slots(label, code)")
      .gte("date_shift", startDate)
      .lte("date_shift", end.toISOString().slice(0, 10))
      .order("date_shift");
    setRotation(data || []);
  }

  useEffect(() => { loadRotation(rotationWeekStart); }, [rotationWeekStart]);

  if (!hasRole("admin") && !hasRole("resp_production")) {
    return <div className="p-8 text-center text-muted-foreground">Accès réservé aux administrateurs.</div>;
  }

  // --- Handlers ---
  async function handleAddTeam() {
    if (!teamName || !teamCode) { toast({ title: "Nom et code requis", variant: "destructive" }); return; }
    const { error } = await supabase.from("shift_teams").insert({ name: teamName, code: teamCode, color: teamColor });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Équipe ajoutée" });
    setTeamDialogOpen(false); setTeamName(""); setTeamCode(""); setTeamColor("#3b82f6");
    loadAll();
  }

  async function handleToggleTeam(id: string, is_active: boolean) {
    await supabase.from("shift_teams").update({ is_active: !is_active }).eq("id", id);
    loadAll();
  }

  async function handleAddSlot() {
    if (!slotLabel || !slotCode) { toast({ title: "Label et code requis", variant: "destructive" }); return; }
    const maxOrder = timeSlots.reduce((m, s) => Math.max(m, s.sort_order), 0);
    const { error } = await supabase.from("shift_time_slots").insert({
      label: slotLabel, code: slotCode, heure_debut: slotStart, heure_fin: slotEnd, sort_order: maxOrder + 1,
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Créneau ajouté" });
    setSlotDialogOpen(false); setSlotLabel(""); setSlotCode("");
    loadAll();
  }

  async function handleUpdateSlot(id: string, field: string, value: string) {
    await supabase.from("shift_time_slots").update({ [field]: value }).eq("id", id);
    loadAll();
  }

  async function handleUpdateSetting(id: string, value: string) {
    await supabase.from("shift_settings").update({ value }).eq("id", id);
    toast({ title: "Paramètre mis à jour" });
    loadAll();
  }

  async function handleSetRotation(teamId: string, date: string, slotId: string | null, isRepos: boolean) {
    // Upsert: delete then insert
    await supabase.from("shift_rotation").delete().eq("shift_team_id", teamId).eq("date_shift", date);
    if (slotId || isRepos) {
      await supabase.from("shift_rotation").insert({
        shift_team_id: teamId, date_shift: date, time_slot_id: isRepos ? null : slotId, is_repos: isRepos,
      });
    }
    loadRotation(rotationWeekStart);
  }

  // Generate week dates
  const weekDates: string[] = [];
  const ws = new Date(rotationWeekStart);
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    weekDates.push(d.toISOString().slice(0, 10));
  }

  const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Paramétrage des Shifts</h1>
          <p className="text-muted-foreground">Équipes, créneaux horaires, rotation et règles</p>
        </div>
      </div>

      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList className="h-11">
          <TabsTrigger value="teams" className="h-9"><Users className="h-3.5 w-3.5 mr-1" /> Équipes</TabsTrigger>
          <TabsTrigger value="slots" className="h-9"><Clock className="h-3.5 w-3.5 mr-1" /> Créneaux</TabsTrigger>
          <TabsTrigger value="rotation" className="h-9"><CalendarDays className="h-3.5 w-3.5 mr-1" /> Rotation</TabsTrigger>
          <TabsTrigger value="settings" className="h-9"><Settings className="h-3.5 w-3.5 mr-1" /> Règles</TabsTrigger>
        </TabsList>

        {/* === ÉQUIPES === */}
        <TabsContent value="teams">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Référentiel des équipes</CardTitle>
              <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nouvelle équipe</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nom *</Label>
                      <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Équipe E" />
                    </div>
                    <div className="space-y-2">
                      <Label>Code *</Label>
                      <Input value={teamCode} onChange={(e) => setTeamCode(e.target.value)} placeholder="E" />
                    </div>
                    <div className="space-y-2">
                      <Label>Couleur</Label>
                      <Input type="color" value={teamColor} onChange={(e) => setTeamColor(e.target.value)} className="h-10 w-20" />
                    </div>
                    <Button onClick={handleAddTeam} className="w-full">Ajouter</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Couleur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono font-bold">{t.code}</TableCell>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded" style={{ backgroundColor: t.color }} />
                          <span className="text-xs text-muted-foreground">{t.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Actif" : "Inactif"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch checked={t.is_active} onCheckedChange={() => handleToggleTeam(t.id, t.is_active)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === CRÉNEAUX HORAIRES === */}
        <TabsContent value="slots">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Créneaux horaires standards</CardTitle>
              <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nouveau créneau</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Label *</Label>
                      <Input value={slotLabel} onChange={(e) => setSlotLabel(e.target.value)} placeholder="Matin" />
                    </div>
                    <div className="space-y-2">
                      <Label>Code *</Label>
                      <Input value={slotCode} onChange={(e) => setSlotCode(e.target.value)} placeholder="matin" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Heure début</Label>
                        <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Heure fin</Label>
                        <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
                      </div>
                    </div>
                    <Button onClick={handleAddSlot} className="w-full">Ajouter</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Début</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Actif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeSlots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.label}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{s.code}</TableCell>
                      <TableCell>
                        <Input type="time" value={s.heure_debut} className="w-28 h-8"
                          onChange={(e) => handleUpdateSlot(s.id, "heure_debut", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input type="time" value={s.heure_fin} className="w-28 h-8"
                          onChange={(e) => handleUpdateSlot(s.id, "heure_fin", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Oui" : "Non"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ROTATION === */}
        <TabsContent value="rotation">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Planning de rotation</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Semaine du</Label>
                  <Input type="date" value={rotationWeekStart} onChange={(e) => setRotationWeekStart(e.target.value)} className="w-40 h-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Équipe</TableHead>
                    {weekDates.map((d) => (
                      <TableHead key={d} className="text-center min-w-[120px]">
                        <div className="text-xs">{dayLabels[new Date(d).getDay()]}</div>
                        <div className="text-xs text-muted-foreground">{new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.filter((t) => t.is_active).map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                          <span className="font-medium text-sm">{team.name}</span>
                        </div>
                      </TableCell>
                      {weekDates.map((date) => {
                        const entry = rotation.find((r: any) => r.shift_team_id === team.id && r.date_shift === date);
                        const currentSlotId = entry?.is_repos ? "repos" : (entry?.time_slot_id || "");
                        return (
                          <TableCell key={date} className="p-1">
                            <Select
                              value={currentSlotId}
                              onValueChange={(val) => {
                                if (val === "repos") handleSetRotation(team.id, date, null, true);
                                else if (val === "") handleSetRotation(team.id, date, null, false);
                                else handleSetRotation(team.id, date, val, false);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="empty_placeholder" className="text-muted-foreground">— Non affecté</SelectItem>
                                {timeSlots.filter((s) => s.is_active).map((slot) => (
                                  <SelectItem key={slot.id} value={slot.id}>{slot.label} ({slot.heure_debut}–{slot.heure_fin})</SelectItem>
                                ))}
                                <SelectItem value="repos" className="text-amber-600">🛏️ Repos</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === RÈGLES === */}
        <TabsContent value="settings">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Règles et paramètres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.label}</p>
                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  </div>
                  <Input
                    value={s.value}
                    onChange={(e) => {
                      setSettings((prev) => prev.map((p) => p.id === s.id ? { ...p, value: e.target.value } : p));
                    }}
                    onBlur={() => handleUpdateSetting(s.id, s.value)}
                    className="w-24 h-9 text-center font-mono"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
