import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { OfStatusBadge } from "./GpaoDashboard";
import { ArrowLeft, Play, CheckCircle, BarChart3, Package, AlertTriangle, Clock, Users, RefreshCw, History, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import OfQualityTab from "@/components/qualite/OfQualityTab";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { useEntityPrimaryImages } from "@/hooks/useEntityPrimaryImages";

export default function OfDetail() {
  const { id } = useParams();
  const navigate = useNavWithFrom();
  const goBack = useSmartBack("/gpao/of");
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [of, setOf] = useState<any>(null);
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [shiftModes, setShiftModes] = useState<any[]>([]);
  const [modeHistory, setModeHistory] = useState<any[]>([]);

  // Mode change dialog
  const [modeDialogOpen, setModeDialogOpen] = useState(false);
  const [newModeId, setNewModeId] = useState("");
  const [modeChangeReason, setModeChangeReason] = useState("");

  // Detail dialog
  const [detailShift, setDetailShift] = useState<any>(null);
  const [detailDeclarations, setDetailDeclarations] = useState<any[]>([]);
  const [detailConsumptions, setDetailConsumptions] = useState<any[]>([]);
  const [detailTickets, setDetailTickets] = useState<any[]>([]);
  const [detailStops, setDetailStops] = useState<any[]>([]);

  const load = async () => {
    if (!id) return;
    const [ofRes, declRes, consRes, stopRes, tickRes, shiftsRes] = await Promise.all([
      supabase.from("ordres_fabrication").select("*, products(code, designation, unite), production_lines(code, designation), recipes(name), shift_modes(id, code, label)").eq("id", id).single(),
      supabase.from("production_declarations").select("*").eq("of_id", id).order("heure_production", { ascending: false }),
      supabase.from("consumptions").select("*, articles(code, designation, unite)").eq("of_id", id).order("created_at", { ascending: false }),
      supabase.from("production_stops").select("*, production_lines(designation)").eq("of_id", id).order("heure_debut", { ascending: false }),
      supabase.from("tickets").select("*, machines(code, designation)").eq("of_id", id).order("created_at", { ascending: false }),
      supabase.from("shifts").select("*, shift_teams(name, code, color), production_lines(designation)").eq("of_id", id).order("date_shift", { ascending: false }),
    ]);
    setOf(ofRes.data);
    setDeclarations(declRes.data || []);
    setConsumptions(consRes.data || []);
    setStops(stopRes.data || []);
    setTickets(tickRes.data || []);
    setShiftHistory(shiftsRes.data || []);

    // Load shift modes and mode history
    const [modesRes, modeHistRes] = await Promise.all([
      supabase.from("shift_modes").select("*").eq("is_active", true).order("code"),
      supabase.from("of_mode_history").select("*, old_mode:shift_modes!of_mode_history_old_mode_id_fkey(label, code), new_mode:shift_modes!of_mode_history_new_mode_id_fkey(label, code)").eq("of_id", id).order("created_at", { ascending: false }),
    ]);
    setShiftModes(modesRes.data || []);
    setModeHistory(modeHistRes.data || []);
  };

  useEffect(() => { load(); }, [id]);

  const handleStartOf = async () => {
    await supabase.from("ordres_fabrication").update({ statut: "en_cours" as any, date_debut_reelle: new Date().toISOString() }).eq("id", id!);
    toast({ title: "OF démarré" });
    load();
  };

  const handleFinishOf = async () => {
    await supabase.from("ordres_fabrication").update({ statut: "termine" as any, date_fin_reelle: new Date().toISOString() }).eq("id", id!);
    toast({ title: "OF terminé" });
    load();
  };

  const handleChangeMode = async () => {
    if (!newModeId || !modeChangeReason.trim()) {
      toast({ title: "Erreur", description: "Mode et motif obligatoires", variant: "destructive" });
      return;
    }
    // Insert history
    await supabase.from("of_mode_history").insert({
      of_id: id,
      old_mode_id: of.shift_mode_id || null,
      new_mode_id: newModeId,
      changed_by: user?.id,
      reason: modeChangeReason,
    } as any);
    // Update OF
    await supabase.from("ordres_fabrication").update({ shift_mode_id: newModeId } as any).eq("id", id!);
    toast({ title: "Type de créneau modifié" });
    setModeDialogOpen(false);
    setNewModeId("");
    setModeChangeReason("");
    load();
  };

  const openShiftDetail = async (shift: any) => {
    setDetailShift(shift);
    const [dRes, cRes, tRes, sRes] = await Promise.all([
      supabase.from("production_declarations").select("*").eq("of_id", id!).eq("shift_id", shift.id).order("heure_production"),
      supabase.from("consumptions").select("*, articles(code, designation, unite)").eq("of_id", id!).eq("shift_id", shift.id),
      supabase.from("tickets").select("*, machines(code, designation)").eq("of_id", id!).eq("shift_id", shift.id),
      supabase.from("production_stops").select("*").eq("of_id", id!).eq("shift_id", shift.id),
    ]);
    setDetailDeclarations(dRes.data || []);
    setDetailConsumptions(cRes.data || []);
    setDetailTickets(tRes.data || []);
    setDetailStops(sRes.data || []);
  };

  const productImageMap = useEntityPrimaryImages("produit", of ? [of.product_id] : []);
  const articleIds = consumptions.map((c) => c.article_id).filter(Boolean);
  const articleImageMap = useEntityPrimaryImages("article", articleIds);

  if (!of) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const progress = of.quantite_prevue > 0 ? Math.round((of.quantite_produite / of.quantite_prevue) * 100) : 0;
  const totalStopMin = stops.reduce((s, st) => s + (st.duree_minutes || 0), 0);

  function getShiftStats(shiftId: string) {
    const shiftDecls = declarations.filter((d) => d.shift_id === shiftId);
    const qte = shiftDecls.reduce((s, d) => s + (d.quantite_produite || 0), 0);
    const rebut = shiftDecls.reduce((s, d) => s + (d.quantite_rebut || 0), 0);
    const shiftCons = consumptions.filter((c) => c.shift_id === shiftId);
    const shiftTick = tickets.filter((t) => t.shift_id === shiftId);
    const shiftStops = stops.filter((st) => st.shift_id === shiftId);
    const stopMin = shiftStops.reduce((s, st) => s + (st.duree_minutes || 0), 0);
    return { qte, rebut, consCount: shiftCons.length, ticketCount: shiftTick.length, stopMin };
  }

  const formatTime = (ts: string | null) => ts ? new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
  const formatDate = (ts: string | null) => ts ? new Date(ts).toLocaleDateString("fr-FR") : "—";

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <EntityThumbnail
          imageUrl={productImageMap[of.product_id]}
          alt={of.products?.designation}
          size="lg"
          rounded="lg"
          enableLightbox
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{of.numero}</h1>
          <div className="flex items-center gap-2 mt-1">
            <OfStatusBadge value={of.statut} />
            <Badge variant="outline" className="text-xs">{(of as any).shift_modes?.label || "3x8"}</Badge>
            <span className="text-sm text-muted-foreground">{of.products?.designation}</span>
          </div>
        </div>
        {of.statut === "planifie" && (
          <Button onClick={handleStartOf} className="h-12 px-6"><Play className="h-4 w-4 mr-2" /> Démarrer</Button>
        )}
        {of.statut === "en_cours" && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setModeDialogOpen(true)} variant="outline" size="sm">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Changer mode
            </Button>
            <Button onClick={handleFinishOf} variant="outline" className="h-12 px-6"><CheckCircle className="h-4 w-4 mr-2" /> Terminer</Button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex justify-between text-sm mb-2">
            <span>Avancement</span>
            <span className="font-bold tabular-nums">{of.quantite_produite?.toLocaleString("fr-FR")} / {of.quantite_prevue?.toLocaleString("fr-FR")} {of.unite}</span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Rebuts: {of.quantite_rebut} {of.unite}</span>
            <span>{progress}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Ligne", of.production_lines?.designation || "—"],
          ["Recette", of.recipes?.name || "—"],
          ["Mode", (of as any).shift_modes?.label || "3x8"],
          ["Début prévu", of.date_debut_prevue ? new Date(of.date_debut_prevue).toLocaleDateString("fr-FR") : "—"],
          ["Arrêts", totalStopMin > 0 ? `${totalStopMin} min` : "0 min"],
        ].map(([label, val]) => (
          <Card key={label as string}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium">{val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="shifts" className="space-y-4">
        <TabsList className="h-11 flex-wrap">
          <TabsTrigger value="shifts" className="h-9"><Users className="h-3.5 w-3.5 mr-1" /> Historique Shifts</TabsTrigger>
          <TabsTrigger value="declarations" className="h-9"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Production</TabsTrigger>
          <TabsTrigger value="consumptions" className="h-9"><Package className="h-3.5 w-3.5 mr-1" /> Consommations</TabsTrigger>
          <TabsTrigger value="stops" className="h-9"><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Arrêts</TabsTrigger>
          <TabsTrigger value="tickets" className="h-9">Tickets</TabsTrigger>
          <TabsTrigger value="mode_history" className="h-9"><History className="h-3.5 w-3.5 mr-1" /> Historique Mode</TabsTrigger>
          <TabsTrigger value="quality" className="h-9"><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Qualité</TabsTrigger>
        </TabsList>

        {/* === HISTORIQUE SHIFTS === */}
        <TabsContent value="shifts">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Équipe</TableHead>
                    <TableHead>Plage horaire</TableHead>
                    <TableHead>Qté produite</TableHead>
                    <TableHead>Rebuts</TableHead>
                    <TableHead>Conso.</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Arrêts</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Aucun shift enregistré</TableCell></TableRow>
                  ) : shiftHistory.map((s) => {
                    const stats = getShiftStats(s.id);
                    const teamColor = s.shift_teams?.color || "#888";
                    return (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openShiftDetail(s)}
                      >
                        <TableCell className="tabular-nums">{formatDate(s.date_shift)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                            <span className="text-sm">{s.shift_teams?.name || s.shift_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {formatTime(s.heure_debut)} – {formatTime(s.heure_fin)}
                        </TableCell>
                        <TableCell className="tabular-nums font-medium">{stats.qte}</TableCell>
                        <TableCell className="tabular-nums text-destructive">{stats.rebut || 0}</TableCell>
                        <TableCell className="tabular-nums">{stats.consCount}</TableCell>
                        <TableCell>
                          {stats.ticketCount > 0 ? (
                            <Badge variant="destructive" className="text-xs">{stats.ticketCount}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">{stats.stopMin > 0 ? `${stats.stopMin} min` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={s.statut === "termine" ? "secondary" : "default"} className="text-xs capitalize">
                            {(s.statut || "en_cours").replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PRODUCTION === */}
        <TabsContent value="declarations">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Heure</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Rebuts</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Aucune déclaration</TableCell></TableRow>
                  ) : declarations.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="tabular-nums">{new Date(d.heure_production).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="tabular-nums font-medium">{d.quantite_produite}</TableCell>
                      <TableCell className="tabular-nums text-destructive">{d.quantite_rebut || 0}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[200px]">{d.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === CONSOMMATIONS === */}
        <TabsContent value="consumptions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumptions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Aucune consommation</TableCell></TableRow>
                  ) : consumptions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="w-10">
                        <EntityThumbnail imageUrl={articleImageMap[c.article_id]} alt={c.articles?.designation} size="sm" rounded="md" />
                      </TableCell>
                      <TableCell>{c.articles?.code} — {c.articles?.designation}</TableCell>
                      <TableCell className="tabular-nums font-medium">{c.quantite}</TableCell>
                      <TableCell>{c.unite}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{new Date(c.created_at).toLocaleString("fr-FR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ARRÊTS === */}
        <TabsContent value="stops">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Début</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Ticket</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stops.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Aucun arrêt</TableCell></TableRow>
                  ) : stops.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="capitalize">{s.type.replace("_", " ")}</TableCell>
                      <TableCell className="tabular-nums">{new Date(s.heure_debut).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="tabular-nums">{s.heure_fin ? new Date(s.heure_fin).toLocaleString("fr-FR") : "En cours"}</TableCell>
                      <TableCell className="tabular-nums font-medium">{s.duree_minutes ? `${s.duree_minutes} min` : "—"}</TableCell>
                      <TableCell>{s.ticket_id ? <span className="text-primary cursor-pointer" onClick={() => navigate(`/tickets/${s.ticket_id}`)}>Voir</span> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TICKETS === */}
        <TabsContent value="tickets">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Aucun ticket lié</TableCell></TableRow>
                  ) : tickets.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tickets/${t.id}`)}>
                      <TableCell className="font-mono">{t.numero}</TableCell>
                      <TableCell>{t.machines?.designation}</TableCell>
                      <TableCell><StatusBadge type="priority" value={t.priorite} /></TableCell>
                      <TableCell><StatusBadge type="ticket" value={t.statut} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === HISTORIQUE MODE === */}
        <TabsContent value="mode_history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ancien mode</TableHead>
                    <TableHead>Nouveau mode</TableHead>
                    <TableHead>Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modeHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Aucun changement de mode</TableCell></TableRow>
                  ) : modeHistory.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="tabular-nums">{new Date(h.created_at).toLocaleString("fr-FR")}</TableCell>
                      <TableCell>{h.old_mode?.label || "—"}</TableCell>
                      <TableCell className="font-medium">{h.new_mode?.label || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{h.reason || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === QUALITÉ === */}
        <TabsContent value="quality">
          <OfQualityTab
            ofId={of.id}
            ofNumero={of.numero}
            productId={of.product_id ?? null}
            lineId={of.line_id ?? null}
            qualityStatus={of.quality_status ?? null}
            canManage={
              hasRole("admin") || hasRole("resp_production") || hasRole("chef_ligne") || hasRole("bureau_methode")
            }
            onChanged={load}
          />
        </TabsContent>
      </Tabs>
      {/* Shift Detail Dialog */}
      <Dialog open={!!detailShift} onOpenChange={(open) => !open && setDetailShift(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Détail shift — {formatDate(detailShift?.date_shift)}
              {detailShift?.shift_teams && (
                <Badge style={{ backgroundColor: detailShift.shift_teams.color, color: "#fff" }}>
                  {detailShift.shift_teams.name}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Plage horaire</p>
                  <p className="text-sm font-medium">{formatTime(detailShift.heure_debut)} – {formatTime(detailShift.heure_fin)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium capitalize">{detailShift.shift_type?.replace("_", " ")}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Statut</p>
                  <Badge variant="secondary" className="capitalize">{(detailShift.statut || "en_cours").replace("_", " ")}</Badge>
                </CardContent></Card>
              </div>

              {detailShift.observations && (
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Observations</p>
                    <p className="text-sm">{detailShift.observations}</p>
                  </CardContent>
                </Card>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Déclarations horaires ({detailDeclarations.length})</p>
                {detailDeclarations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune déclaration</p>
                ) : (
                  <div className="space-y-1">
                    {detailDeclarations.map((d) => (
                      <div key={d.id} className="flex justify-between text-xs py-1.5 px-3 rounded bg-muted/30">
                        <span className="tabular-nums">{new Date(d.heure_production).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="tabular-nums font-medium">{d.quantite_produite} {of.unite}</span>
                        {d.quantite_rebut > 0 && <span className="text-destructive tabular-nums">rebut: {d.quantite_rebut}</span>}
                        <span className="text-muted-foreground truncate max-w-[120px]">{d.notes || ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {detailConsumptions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Consommations ({detailConsumptions.length})</p>
                  <div className="space-y-1">
                    {detailConsumptions.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs py-1.5 px-3 rounded bg-muted/30">
                        <span>{c.articles?.code} — {c.articles?.designation}</span>
                        <span className="tabular-nums font-medium">{c.quantite} {c.unite}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailTickets.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Tickets maintenance ({detailTickets.length})</p>
                  <div className="space-y-1">
                    {detailTickets.map((t) => (
                      <div key={t.id} className="flex justify-between text-xs py-1.5 px-3 rounded bg-destructive/10 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
                        <span className="font-mono">{t.numero}</span>
                        <span>{t.machines?.designation}</span>
                        <StatusBadge type="ticket" value={t.statut} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailStops.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Arrêts ({detailStops.length})</p>
                  <div className="space-y-1">
                    {detailStops.map((s) => (
                      <div key={s.id} className="flex justify-between text-xs py-1.5 px-3 rounded bg-amber-50 dark:bg-amber-900/20">
                        <span className="capitalize">{s.type.replace("_", " ")}</span>
                        <span className="tabular-nums">{s.duree_minutes ? `${s.duree_minutes} min` : "en cours"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mode Change Dialog */}
      <Dialog open={modeDialogOpen} onOpenChange={setModeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Changer le type de créneau</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">Mode actuel : <span className="font-medium text-foreground">{(of as any).shift_modes?.label || "3x8"}</span></p>
            </div>
            <div className="space-y-2">
              <Label>Nouveau mode *</Label>
              <Select value={newModeId} onValueChange={setNewModeId}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {shiftModes.filter((m) => m.id !== of.shift_mode_id).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label} — {m.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motif du changement *</Label>
              <Textarea value={modeChangeReason} onChange={(e) => setModeChangeReason(e.target.value)} placeholder="Expliquez la raison du changement..." className="min-h-[80px]" />
            </div>
            <Button onClick={handleChangeMode} className="w-full h-12">Confirmer le changement</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
