import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, AlertTriangle, Clock, Ban, Check, Lock, Unlock, MessageSquare, Play, Beaker, ArrowRight } from "lucide-react";
import {
  ticketCreateSchema,
  productionDeclareSchema,
  shiftStartSchema,
  getFieldErrors,
  isValid,
  parseNumericInput,
} from "@/lib/formValidation";

function deriveShiftType(heureDebut: string): "matin" | "apres_midi" | "nuit" {
  const h = parseInt(heureDebut.split(":")[0], 10);
  if (h >= 5 && h < 13) return "matin";
  if (h >= 13 && h < 21) return "apres_midi";
  return "nuit";
}

function buildTimestamp(date: string, time: string): string {
  return `${date}T${time.length === 5 ? time + ":00" : time}`;
}

export default function ShiftScreen() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { canCreate } = usePermissions();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isTablet = !isMobile && typeof window !== "undefined" && window.innerWidth < 1024;

  const [ofs, setOfs] = useState<any[]>([]);
  const [selectedOf, setSelectedOf] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [shiftTeams, setShiftTeams] = useState<any[]>([]);
  const [toleranceHours, setToleranceHours] = useState(1);
  const [modeSlots, setModeSlots] = useState<any[]>([]);

  // Start shift form
  const [startTeamId, setStartTeamId] = useState("");
  const [startSlotId, setStartSlotId] = useState("");
  const [startingShift, setStartingShift] = useState(false);

  // Per-hour declaration form
  const [selectedHourSlot, setSelectedHourSlot] = useState<number | null>(null);
  const [declQte, setDeclQte] = useState("");
  const [declRebut, setDeclRebut] = useState("0");
  const [declNotes, setDeclNotes] = useState("");

  // Observations fin shift
  const [observations, setObservations] = useState("");

  // Step: "production" | "consumption" — tracks the current phase
  const [shiftStep, setShiftStep] = useState<"production" | "consumption">("production");

  // Consumption state
  const [recipeLines, setRecipeLines] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [consumptionEntries, setConsumptionEntries] = useState<Record<string, string>>({});
  const [existingConsumptions, setExistingConsumptions] = useState<any[]>([]);

  // Ticket dialog
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketMachineId, setTicketMachineId] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriorite, setTicketPriorite] = useState("normale");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [ofsRes, linesRes, machinesRes, shiftsRes, teamsRes, settingsRes, articlesRes] = await Promise.all([
      supabase.from("ordres_fabrication").select("*, products(code, designation), production_lines(id, code, designation, machine_id)").eq("statut", "en_cours" as any).order("numero"),
      supabase.from("production_lines").select("*").eq("is_active", true),
      supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code"),
      supabase.from("shifts").select("*, shift_teams(name, code, color)").eq("date_shift", new Date().toISOString().slice(0, 10)).order("heure_debut", { ascending: false }),
      supabase.from("shift_teams").select("*").eq("is_active", true).order("code"),
      supabase.from("shift_settings").select("*"),
      supabase.from("articles").select("*").eq("is_active", true).order("code"),
    ]);
    setOfs(ofsRes.data || []);
    setLines(linesRes.data || []);
    setMachines(machinesRes.data || []);
    setShifts(shiftsRes.data || []);
    setShiftTeams(teamsRes.data || []);
    setArticles(articlesRes.data || []);

    const tol = (settingsRes.data || []).find((s: any) => s.key === "tolerance_saisie_heures");
    if (tol) setToleranceHours(parseInt(tol.value) || 1);

    if (ofsRes.data && ofsRes.data.length > 0 && !selectedOf) setSelectedOf(ofsRes.data[0]);

    const now = new Date();
    const todayShifts = shiftsRes.data || [];
    let active = todayShifts.find((s: any) => s.statut === "en_cours");
    if (!active) {
      active = todayShifts.find((s: any) => {
        const start = new Date(s.heure_debut);
        const end = new Date(s.heure_fin);
        return now >= start && now <= end;
      });
    }
    setActiveShift(active || null);
    if (active) setObservations(active.observations || "");
  }

  // Load mode slots when selectedOf changes
  useEffect(() => {
    if (selectedOf?.shift_mode_id) {
      supabase.from("shift_mode_slots").select("*").eq("shift_mode_id", selectedOf.shift_mode_id).order("sort_order")
        .then(({ data }) => setModeSlots(data || []));
    } else {
      supabase.from("shift_modes").select("id").eq("is_default", true).single()
        .then(({ data: mode }) => {
          if (mode) {
            supabase.from("shift_mode_slots").select("*").eq("shift_mode_id", mode.id).order("sort_order")
              .then(({ data }) => setModeSlots(data || []));
          }
        });
    }
  }, [selectedOf?.shift_mode_id]);

  // Load recipe lines when OF changes
  useEffect(() => {
    if (selectedOf?.recipe_id) {
      supabase.from("recipe_lines").select("*, articles(code, designation, unite)").eq("recipe_id", selectedOf.recipe_id)
        .then(({ data }) => setRecipeLines(data || []));
    } else {
      setRecipeLines([]);
    }
  }, [selectedOf?.recipe_id]);

  // Load existing consumptions for this shift+OF
  useEffect(() => {
    if (selectedOf && activeShift) {
      Promise.all([
        supabase.from("production_declarations").select("*").eq("of_id", selectedOf.id).eq("shift_id", activeShift.id).order("heure_production", { ascending: true }),
        supabase.from("consumptions").select("*").eq("of_id", selectedOf.id).eq("shift_id", activeShift.id),
      ]).then(([declRes, consRes]) => {
        setDeclarations(declRes.data || []);
        setExistingConsumptions(consRes.data || []);
        // Pre-fill consumption entries from existing data
        const entries: Record<string, string> = {};
        (consRes.data || []).forEach((c: any) => {
          entries[c.article_id] = String(c.quantite);
        });
        setConsumptionEntries(entries);
      });
    }
  }, [selectedOf, activeShift]);

  // --- Start Shift ---
  const handleStartShift = async () => {
    if (!startTeamId || !startSlotId || !selectedOf) {
      toast({ title: "Erreur", description: "Sélectionnez une équipe et un créneau horaire", variant: "destructive" });
      return;
    }
    const slot = modeSlots.find((s: any) => s.id === startSlotId);
    if (!slot) return;

    const today = new Date().toISOString().slice(0, 10);
    const heureDebut = buildTimestamp(today, slot.heure_debut);
    let heureFin = buildTimestamp(today, slot.heure_fin);

    if (slot.heure_fin <= slot.heure_debut) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      heureFin = buildTimestamp(tomorrow.toISOString().slice(0, 10), slot.heure_fin);
    }

    const shiftType = deriveShiftType(slot.heure_debut);
    const lineId = selectedOf.line_id || selectedOf.production_lines?.id;

    if (!lineId) {
      toast({ title: "Erreur", description: "L'OF sélectionné n'a pas de ligne de production assignée", variant: "destructive" });
      return;
    }

    setStartingShift(true);
    const { error } = await supabase.from("shifts").insert({
      date_shift: today,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      heure_debut_reelle: new Date().toISOString(),
      shift_type: shiftType,
      shift_team_id: startTeamId,
      chef_ligne_id: user?.id,
      of_id: selectedOf.id,
      line_id: lineId,
      statut: "en_cours",
    });
    setStartingShift(false);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Shift démarré", description: `Créneau ${slot.label} — Bonne production !` });
    setStartTeamId("");
    setStartSlotId("");
    loadData();
  };

  // Generate hourly slots from shift start/end timestamps
  // Uses getTime() arithmetic to avoid any timezone-related hour drift
  const hourlySlots = useMemo(() => {
    if (!activeShift) return [];
    const start = new Date(activeShift.heure_debut);
    const end = new Date(activeShift.heure_fin);
    const ONE_HOUR = 3600000;
    const slots: { hour: number; startTime: Date; endTime: Date; label: string }[] = [];
    let cursorMs = start.getTime();
    const endMs = end.getTime();
    while (cursorMs + ONE_HOUR <= endMs) {
      const slotStart = new Date(cursorMs);
      const slotEnd = new Date(cursorMs + ONE_HOUR);
      const startH = slotStart.getHours().toString().padStart(2, "0");
      const endH = slotEnd.getHours().toString().padStart(2, "0");
      slots.push({
        hour: slotStart.getHours(),
        startTime: slotStart,
        endTime: slotEnd,
        label: `${startH}h – ${endH}h`,
      });
      cursorMs += ONE_HOUR;
    }
    return slots;
  }, [activeShift]);

  // Rule: a slot is editable ONLY after it ends, for toleranceHours (default 1h).
  // The current hour is NEVER editable — you can only enter data for the previous hour.
  // Example (tolerance=1h): from 23h to 00h, only slot 22h–23h is open.
  function canEditSlot(slot: { startTime: Date; endTime: Date }): boolean {
    if (!activeShift) return false;
    const now = new Date();
    // Slot must be finished
    if (now < slot.endTime) return false;
    // Within tolerance window after slot ended
    const toleranceEnd = new Date(slot.endTime.getTime() + toleranceHours * 3600000);
    return now < toleranceEnd;
  }

  function getSlotDeclaration(slot: { startTime: Date; endTime: Date }) {
    return declarations.find((d) => {
      const h = new Date(d.heure_production);
      return h >= slot.startTime && h < slot.endTime;
    });
  }

  const handleDeclareProduction = async () => {
    if (selectedHourSlot === null || !selectedOf || !declQte) {
      toast({ title: "Erreur", description: "Sélectionnez un créneau et entrez la quantité", variant: "destructive" });
      return;
    }
    const slot = hourlySlots[selectedHourSlot];
    if (!canEditSlot(slot)) {
      toast({ title: "Hors délai", description: "La fenêtre de saisie est expirée pour ce créneau.", variant: "destructive" });
      return;
    }

    const { error: declError } = await supabase.from("production_declarations").insert({
      of_id: selectedOf.id,
      shift_id: activeShift?.id,
      heure_production: slot.startTime.toISOString(),
      quantite_produite: parseFloat(declQte),
      quantite_rebut: parseFloat(declRebut) || 0,
      declared_by: user?.id,
      notes: declNotes,
    } as any);

    if (declError) {
      toast({ title: "Erreur", description: declError.message, variant: "destructive" });
      return;
    }

    await supabase.from("ordres_fabrication").update({
      quantite_produite: (selectedOf.quantite_produite || 0) + parseFloat(declQte),
      quantite_rebut: (selectedOf.quantite_rebut || 0) + (parseFloat(declRebut) || 0),
    }).eq("id", selectedOf.id);

    toast({ title: "Production déclarée", description: `${declQte} pour ${slot.label}` });
    setDeclQte(""); setDeclRebut("0"); setDeclNotes(""); setSelectedHourSlot(null);

    const { data: updatedOf } = await supabase.from("ordres_fabrication")
      .select("*, products(code, designation), production_lines(id, code, designation, machine_id)")
      .eq("id", selectedOf.id).single();
    if (updatedOf) setSelectedOf(updatedOf);
    if (activeShift) {
      const { data } = await supabase.from("production_declarations").select("*").eq("of_id", selectedOf.id).eq("shift_id", activeShift.id).order("heure_production", { ascending: true });
      setDeclarations(data || []);
    }
  };

  // --- Completion checks ---
  const allProductionDeclared = hourlySlots.length > 0 && hourlySlots.every((slot) => getSlotDeclaration(slot));

  const consumptionsSaved = recipeLines.length > 0
    ? recipeLines.every((rl: any) => {
        const qte = consumptionEntries[rl.article_id];
        return qte !== undefined && qte !== "" && parseFloat(qte) >= 0;
      }) && existingConsumptions.length > 0
    : existingConsumptions.length > 0;

  const canCloseShift = allProductionDeclared && consumptionsSaved;

  const totalProduced = declarations.reduce((sum, d) => sum + (d.quantite_produite || 0), 0);

  // ===================== Mobile/tablet inline form validation =====================
  const ofLineId = selectedOf?.line_id || selectedOf?.production_lines?.id || "";

  const startShiftErrors = useMemo(
    () => getFieldErrors(shiftStartSchema, {
      team_id: startTeamId,
      slot_id: startSlotId,
      of_id: selectedOf?.id || "",
      line_id: ofLineId,
    }),
    [startTeamId, startSlotId, selectedOf?.id, ofLineId]
  );
  const canStartShift = isValid(startShiftErrors) && !startingShift;

  const declareSlot = selectedHourSlot !== null ? hourlySlots[selectedHourSlot] : null;
  const declareSlotEditable = declareSlot ? canEditSlot(declareSlot) : false;
  const declareErrors = useMemo(
    () => getFieldErrors(productionDeclareSchema, {
      of_id: selectedOf?.id || "",
      slot_index: selectedHourSlot ?? -1,
      quantite_produite: parseNumericInput(declQte),
      quantite_rebut: parseNumericInput(declRebut) || 0,
      slot_editable: declareSlotEditable ? true : undefined,
    }),
    [selectedOf?.id, selectedHourSlot, declQte, declRebut, declareSlotEditable, hourlySlots]
  );
  const canDeclareProduction = isValid(declareErrors);

  const ticketErrors = useMemo(
    () => getFieldErrors(ticketCreateSchema, {
      machine_id: ticketMachineId,
      description: ticketDescription,
      priorite: ticketPriorite,
    }),
    [ticketMachineId, ticketDescription, ticketPriorite]
  );
  const canCreateTicket = isValid(ticketErrors);

  const noEditableSlot = hourlySlots.length > 0 && !hourlySlots.some((s) => canEditSlot(s));

  const handleSaveConsumptions = async () => {
    if (!selectedOf || !activeShift) return;

    const entries = Object.entries(consumptionEntries).filter(([, v]) => v && parseFloat(v) > 0);
    if (entries.length === 0) {
      toast({ title: "Erreur", description: "Saisissez au moins une consommation", variant: "destructive" });
      return;
    }

    // Delete existing consumptions for this shift+OF first
    if (existingConsumptions.length > 0) {
      // Log audit for updates
      for (const ec of existingConsumptions) {
        const newQte = consumptionEntries[ec.article_id];
        if (newQte && parseFloat(newQte) !== ec.quantite) {
          await supabase.from("audit_logs").insert({
            table_name: "consumptions",
            action: "update_from_shift",
            record_id: ec.id,
            user_id: user?.id,
            old_values: { quantite: ec.quantite },
            new_values: { quantite: parseFloat(newQte) },
          });
        }
      }
      await supabase.from("consumptions").delete().eq("of_id", selectedOf.id).eq("shift_id", activeShift.id);
    }

    const rows = entries.map(([articleId, qte]) => {
      const article = articles.find((a) => a.id === articleId);
      return {
        of_id: selectedOf.id,
        shift_id: activeShift.id,
        article_id: articleId,
        quantite: parseFloat(qte),
        unite: article?.unite || "kg",
        declared_by: user?.id,
      };
    });

    const { error } = await supabase.from("consumptions").insert(rows);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Consommations enregistrées" });
    // Reload
    const { data: consRes } = await supabase.from("consumptions").select("*").eq("of_id", selectedOf.id).eq("shift_id", activeShift.id);
    setExistingConsumptions(consRes || []);
  };

  const handleSaveObservations = async () => {
    if (!activeShift) return;
    await supabase.from("shifts").update({ observations } as any).eq("id", activeShift.id);
    toast({ title: "Observations enregistrées" });
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    if (!allProductionDeclared) {
      toast({ title: "Impossible", description: "Toutes les heures de production doivent être saisies avant la clôture.", variant: "destructive" });
      return;
    }
    if (!consumptionsSaved) {
      toast({ title: "Impossible", description: "Les consommations matières doivent être déclarées selon la recette avant la clôture.", variant: "destructive" });
      return;
    }
    await supabase.from("shifts").update({
      statut: "termine",
      heure_fin_reelle: new Date().toISOString(),
      observations,
    } as any).eq("id", activeShift.id);
    toast({ title: "Shift clôturé" });
    setActiveShift(null);
    loadData();
  };

  const handleCreateTicket = async () => {
    if (!ticketMachineId || !ticketDescription) {
      toast({ title: "Erreur", description: "Machine et description obligatoires", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("tickets").insert({
      machine_id: ticketMachineId,
      priorite: ticketPriorite as any,
      description: ticketDescription,
      declarant_id: user?.id,
      numero: "",
      is_from_gpao: true,
      of_id: selectedOf?.id || null,
      ligne_id: selectedOf?.production_lines?.id || null,
      shift_id: activeShift?.id || null,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ticket maintenance créé" });
      setTicketDialogOpen(false);
      setTicketDescription(""); setTicketMachineId("");
    }
  };

  const progress = selectedOf && selectedOf.quantite_prevue > 0
    ? Math.round((selectedOf.quantite_produite / selectedOf.quantite_prevue) * 100) : 0;

  const teamInfo = activeShift?.shift_teams;

  // ===================== RENDER =====================

  return (
    <div className={`space-y-4 ${isMobile ? "px-1" : ""}`}>
      {/* Header — compact on mobile */}
      <div className={`flex items-center justify-between flex-wrap gap-2 ${isMobile ? "flex-col items-stretch" : ""}`}>
        <div>
          <h1 className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}>Écran Shift</h1>
          {!isMobile && <p className="text-muted-foreground">Déclaration de production par créneau horaire</p>}
        </div>
        <div className={`flex items-center gap-2 ${isMobile ? "justify-between" : ""}`}>
          {activeShift ? (
            <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 px-2 py-1">
              <Clock className="h-3 w-3 mr-1" />
              {teamInfo ? `${teamInfo.name}` : ""}
              {!isMobile && ` — ${activeShift.shift_type === "matin" ? "Matin" : activeShift.shift_type === "apres_midi" ? "Après-midi" : "Nuit"}`}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 px-2 py-1">
              <Ban className="h-3 w-3 mr-1" /> Aucun shift
            </Badge>
          )}
          {!isMobile && profile && (
            <Badge variant="secondary" className="px-2 py-1">
              Chef: {profile.first_name} {profile.last_name}
            </Badge>
          )}
          {canCreate("tickets") && (
            <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size={isMobile ? "sm" : "default"} className={isMobile ? "h-9 px-3" : "h-12 px-6"}>
                  <AlertTriangle className="h-4 w-4 mr-1" /> {isMobile ? "Ticket" : "Ticket maintenance"}
                </Button>
              </DialogTrigger>
              <DialogContent className={isMobile ? "max-w-[95vw]" : ""}>
                <DialogHeader><DialogTitle>Ouvrir un ticket maintenance</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Machine *</Label>
                    <Select value={ticketMachineId} onValueChange={setTicketMachineId}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>{machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select value={ticketPriorite} onValueChange={setTicketPriorite}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basse">Basse</SelectItem>
                        <SelectItem value="normale">Normale</SelectItem>
                        <SelectItem value="haute">Haute</SelectItem>
                        <SelectItem value="critique">Critique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} placeholder="Décrivez le problème..." className="min-h-[80px]" />
                  </div>
                  <Button onClick={handleCreateTicket} className="w-full h-12">Créer le ticket</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* OF Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">OF en cours</CardTitle>
        </CardHeader>
        <CardContent>
          {ofs.length === 0 ? (
            <p className="text-muted-foreground text-center py-3 text-sm">Aucun OF en cours</p>
          ) : (
            <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : isTablet ? "grid-cols-2" : "grid-cols-3"}`}>
              {ofs.map((of) => (
                <div
                  key={of.id}
                  onClick={() => setSelectedOf(of)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${selectedOf?.id === of.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <p className="font-mono font-bold text-sm">{of.numero}</p>
                  <p className="text-xs text-muted-foreground truncate">{of.products?.designation}</p>
                  <p className="text-xs tabular-nums mt-0.5">{of.quantite_produite} / {of.quantite_prevue} {of.unite || "kg"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Shift Form */}
      {selectedOf && !activeShift && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Play className="h-4 w-4" /> Démarrer un shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Sélectionnez votre équipe et le créneau horaire pour démarrer.</p>
            <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
              <div className="space-y-1">
                <Label className="text-xs">Équipe *</Label>
                <Select value={startTeamId} onValueChange={setStartTeamId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Choisir une équipe" /></SelectTrigger>
                  <SelectContent>
                    {shiftTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: t.color }} />
                        {t.name} ({t.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Créneau horaire *</Label>
                <Select value={startSlotId} onValueChange={setStartSlotId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Choisir un créneau" /></SelectTrigger>
                  <SelectContent>
                    {modeSlots.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label} ({s.heure_debut} – {s.heure_fin})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!isMobile && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">OF sélectionné</Label>
                  <Input value={`${selectedOf.numero} — ${selectedOf.products?.designation || ""}`} readOnly className="h-12 bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Chef de ligne</Label>
                  <Input value={`${profile?.first_name || ""} ${profile?.last_name || ""}`} readOnly className="h-12 bg-muted" />
                </div>
              </div>
            )}
            <Button onClick={handleStartShift} disabled={!startTeamId || !startSlotId || startingShift} className="w-full h-14 text-lg">
              <Play className="h-5 w-5 mr-2" />{startingShift ? "Démarrage..." : "Démarrer le shift"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active shift content */}
      {selectedOf && activeShift && (
        <>
          {/* Step tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setShiftStep("production")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${shiftStep === "production" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {isMobile ? "Production" : "1. Production horaire"}
            </button>
            <button
              onClick={() => setShiftStep("consumption")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${shiftStep === "consumption" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {isMobile ? "Conso." : "2. Consommations matières"}
              {allProductionDeclared && existingConsumptions.length === 0 && (
                <span className="ml-1 inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Progress bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium truncate">{selectedOf.numero} — {selectedOf.products?.designation}</span>
                <span className="tabular-nums font-bold">{progress}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              {!isMobile && <p className="text-xs text-muted-foreground mt-1">Ligne: {selectedOf.production_lines?.designation || "—"}</p>}
            </CardContent>
          </Card>

          {/* ===== STEP 1: Production ===== */}
          {shiftStep === "production" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Déclaration par créneau
                  <span className="text-xs font-normal text-muted-foreground">Tolérance : {toleranceHours}h</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hourlySlots.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">Aucun créneau horaire</p>
                ) : (
                  <div className={`grid gap-2 ${isMobile ? "grid-cols-2" : isTablet ? "grid-cols-3" : "grid-cols-4"}`}>
                    {hourlySlots.map((slot, idx) => {
                      const existing = getSlotDeclaration(slot);
                      const editable = canEditSlot(slot);
                      const isSelected = selectedHourSlot === idx;
                      const now = new Date();
                      const isPast = now >= slot.endTime;
                      const isCurrent = now >= slot.startTime && now < slot.endTime;

                      return (
                        <div
                          key={idx}
                          onClick={() => { if (!existing && editable) setSelectedHourSlot(isSelected ? null : idx); }}
                          className={`p-2.5 rounded-lg border-2 transition-all ${
                            existing ? "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700"
                              : isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : editable ? "border-border hover:border-primary/40 cursor-pointer"
                              : "border-border bg-muted/30 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`font-mono font-bold ${isMobile ? "text-xs" : "text-sm"}`}>{slot.label}</span>
                            {existing ? <Check className="h-3.5 w-3.5 text-green-600" /> : editable ? <Unlock className="h-3 w-3 text-primary" /> : <Lock className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          {existing ? (
                            <div className="text-xs space-y-0.5">
                              <p className="font-medium tabular-nums">{existing.quantite_produite} {selectedOf.unite}</p>
                              {existing.quantite_rebut > 0 && <p className="text-destructive tabular-nums">Rebut: {existing.quantite_rebut}</p>}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">{isCurrent ? "En cours" : editable ? "Saisie" : isPast ? "Expiré" : "À venir"}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedHourSlot !== null && (
                  <div className="border-t pt-3 mt-3 space-y-3">
                    <p className="text-sm font-medium">
                      Saisie : <span className="text-primary">{hourlySlots[selectedHourSlot]?.label}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantité produite *</Label>
                        <Input type="number" value={declQte} onChange={(e) => setDeclQte(e.target.value)} className="h-14 text-lg" placeholder="0" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rebuts</Label>
                        <Input type="number" value={declRebut} onChange={(e) => setDeclRebut(e.target.value)} className="h-14 text-lg" placeholder="0" />
                      </div>
                    </div>
                    {!isMobile && (
                      <div className="space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Input value={declNotes} onChange={(e) => setDeclNotes(e.target.value)} className="h-10" placeholder="Optionnel" />
                      </div>
                    )}
                    <Button onClick={handleDeclareProduction} className="w-full h-14 text-lg" disabled={!declQte}>Déclarer</Button>
                  </div>
                )}

                {allProductionDeclared && (
                  <Button variant="outline" className="w-full mt-2" onClick={() => setShiftStep("consumption")}>
                    <ArrowRight className="h-4 w-4 mr-2" /> Passer aux consommations matières
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* ===== STEP 2: Consumption ===== */}
          {shiftStep === "consumption" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Beaker className="h-4 w-4" /> Consommations matières — Recette
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recipeLines.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Beaker className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {selectedOf?.recipe_id ? "Aucune ligne dans la recette" : "Aucune recette liée à cet OF"}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Production ce shift : <span className="font-bold tabular-nums">{totalProduced} {selectedOf.unite}</span>
                      {selectedOf.quantite_prevue > 0 && ` — Recette basée sur ${selectedOf.quantite_prevue} ${selectedOf.unite} prévu`}
                    </p>
                    <div className="space-y-2">
                      {/* Header */}
                      {!isMobile && (
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                          <span className="col-span-4">Matière</span>
                          <span className="col-span-2 text-right">Prévu</span>
                          <span className="col-span-3 text-center">Réel</span>
                          <span className="col-span-3 text-right">Écart</span>
                        </div>
                      )}
                      {recipeLines.map((rl: any) => {
                        const article = rl.articles;
                        // Calculate expected: (recipe qty / of total planned) * produced this shift
                        const expectedForShift = selectedOf.quantite_prevue > 0
                          ? (rl.quantite / selectedOf.quantite_prevue) * totalProduced
                          : rl.quantite;
                        const actual = parseFloat(consumptionEntries[rl.article_id] || "0");
                        const ecart = actual - expectedForShift;
                        const ecartPct = expectedForShift > 0 ? ((ecart / expectedForShift) * 100).toFixed(1) : "—";

                        if (isMobile) {
                          return (
                            <div key={rl.id} className="p-3 rounded-lg border space-y-2">
                              <p className="text-sm font-medium">{article?.code} — {article?.designation}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-16">Prévu:</span>
                                <span className="text-xs tabular-nums font-medium">{expectedForShift.toFixed(2)} {rl.unite}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-16">Réel:</span>
                                <Input
                                  type="number"
                                  value={consumptionEntries[rl.article_id] || ""}
                                  onChange={(e) => setConsumptionEntries((prev) => ({ ...prev, [rl.article_id]: e.target.value }))}
                                  className="h-10 flex-1"
                                  placeholder="0"
                                />
                              </div>
                              {actual > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-16">Écart:</span>
                                  <span className={`text-xs tabular-nums font-bold ${ecart > 0 ? "text-destructive" : ecart < 0 ? "text-green-600" : ""}`}>
                                    {ecart > 0 ? "+" : ""}{ecart.toFixed(2)} ({ecartPct}%)
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={rl.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border">
                            <div className="col-span-4">
                              <p className="text-sm font-medium truncate">{article?.code} — {article?.designation}</p>
                              <p className="text-xs text-muted-foreground">{rl.unite}</p>
                            </div>
                            <div className="col-span-2 text-right">
                              <p className="text-sm tabular-nums">{expectedForShift.toFixed(2)}</p>
                            </div>
                            <div className="col-span-3">
                              <Input
                                type="number"
                                value={consumptionEntries[rl.article_id] || ""}
                                onChange={(e) => setConsumptionEntries((prev) => ({ ...prev, [rl.article_id]: e.target.value }))}
                                className="h-10 text-center"
                                placeholder="0"
                              />
                            </div>
                            <div className="col-span-3 text-right">
                              {actual > 0 && (
                                <span className={`text-sm tabular-nums font-bold ${ecart > 0 ? "text-destructive" : ecart < 0 ? "text-green-600" : ""}`}>
                                  {ecart > 0 ? "+" : ""}{ecart.toFixed(2)}
                                  <span className="text-xs ml-1">({ecartPct}%)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button onClick={handleSaveConsumptions} className="w-full h-12">
                      <Beaker className="h-4 w-4 mr-2" /> Enregistrer les consommations
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Observations / Clôture */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Observations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Commentaires, incidents, consignes..."
                className={isMobile ? "min-h-[60px]" : "min-h-[80px]"}
              />
              <div className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
                <Button variant="outline" onClick={handleSaveObservations} className="flex-1">
                  Enregistrer
                </Button>
                <Button variant="destructive" onClick={handleCloseShift} disabled={!canCloseShift}
                  title={!canCloseShift ? "Saisissez toutes les heures de production et les consommations matières avant de clôturer" : ""}>
                  Clôturer le shift
                  {!canCloseShift && <Lock className="h-3 w-3 ml-1" />}
                </Button>
                {!canCloseShift && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {!allProductionDeclared ? "⚠ Production : toutes les heures doivent être saisies. " : ""}
                    {!consumptionsSaved ? "⚠ Consommations matières non déclarées." : ""}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
