import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Package, Edit, History, ShieldAlert } from "lucide-react";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { useEntityPrimaryImages } from "@/hooks/useEntityPrimaryImages";

export default function ConsumptionPage() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [filterOfId, setFilterOfId] = useState("all");
  const [ofs, setOfs] = useState<any[]>([]);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editQte, setEditQte] = useState("");
  const [editMotif, setEditMotif] = useState("");

  // Audit trail
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const canCorrect = hasRole("admin") || hasRole("resp_production");

  const load = async () => {
    const { data } = await supabase
      .from("consumptions")
      .select("*, articles(code, designation, unite), ordres_fabrication(numero), shifts(date_shift, shift_type, shift_teams(name))")
      .order("created_at", { ascending: false })
      .limit(200);
    setConsumptions(data || []);
  };

  useEffect(() => {
    load();
    supabase.from("ordres_fabrication").select("id, numero").order("numero", { ascending: false }).limit(50).then(({ data }) => setOfs(data || []));
  }, []);

  const filtered = consumptions.filter((c) => {
    if (filterOfId !== "all" && c.of_id !== filterOfId) return false;
    return true;
  });

  const articleIds = consumptions.map((c) => c.article_id).filter(Boolean);
  const articleImageMap = useEntityPrimaryImages("article", articleIds);

  const openEdit = (c: any) => {
    setEditItem(c);
    setEditQte(String(c.quantite));
    setEditMotif("");
    setEditDialogOpen(true);
  };

  const handleSaveCorrection = async () => {
    if (!editItem || !editMotif.trim()) {
      toast({ title: "Erreur", description: "Le motif de correction est obligatoire", variant: "destructive" });
      return;
    }
    const newQte = parseFloat(editQte);
    if (isNaN(newQte) || newQte < 0) {
      toast({ title: "Erreur", description: "Quantité invalide", variant: "destructive" });
      return;
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      table_name: "consumptions",
      action: "correction_hors_jour",
      record_id: editItem.id,
      user_id: user?.id,
      old_values: { quantite: editItem.quantite, motif: editMotif },
      new_values: { quantite: newQte, motif: editMotif },
    });

    // Update consumption
    const { error } = await supabase.from("consumptions").update({ quantite: newQte }).eq("id", editItem.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Correction enregistrée", description: `${editItem.quantite} → ${newQte} (${editMotif})` });
    setEditDialogOpen(false);
    load();
  };

  const openAudit = async (consumptionId: string) => {
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("table_name", "consumptions")
      .eq("record_id", consumptionId)
      .order("created_at", { ascending: false });
    setAuditLogs(data || []);
    setAuditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isMobile ? "flex-col items-stretch gap-2" : ""}`}>
        <div>
          <h1 className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}>Consommations hors jour</h1>
          <p className="text-muted-foreground text-sm">Corrections et modifications des consommations d'anciens shifts</p>
        </div>
        {!canCorrect && (
          <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50">
            <ShieldAlert className="h-3 w-3 mr-1" /> Lecture seule
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className={`flex gap-3 ${isMobile ? "flex-col" : "items-end"}`}>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Filtrer par OF</Label>
              <Select value={filterOfId} onValueChange={setFilterOfId}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les OFs</SelectItem>
                  {ofs.map((o) => <SelectItem key={o.id} value={o.id}>{o.numero}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isMobile ? (
            /* Mobile: card list */
            <div className="divide-y">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune consommation</p>
                </div>
              ) : filtered.map((c) => (
                <div key={c.id} className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{c.ordres_fabrication?.numero}</span>
                    <div className="flex items-center gap-1">
                      {canCorrect && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openAudit(c.id)}>
                        <History className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <EntityThumbnail imageUrl={articleImageMap[c.article_id]} alt={c.articles?.designation} size="sm" rounded="md" />
                    <p className="text-sm">{c.articles?.code} — {c.articles?.designation}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="tabular-nums font-medium">{c.quantite} {c.unite}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {c.shifts?.date_shift} — {c.shifts?.shift_type === "matin" ? "M" : c.shifts?.shift_type === "apres_midi" ? "AM" : "N"}
                      {c.shifts?.shift_teams?.name && ` (${c.shifts.shift_teams.name})`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop/tablet: table */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OF</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Date</TableHead>
                  {canCorrect && <TableHead className="w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucune consommation</TableCell></TableRow>
                ) : filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.ordres_fabrication?.numero}</TableCell>
                    <TableCell>{c.articles?.code} — {c.articles?.designation}</TableCell>
                    <TableCell className="tabular-nums font-medium">{c.quantite}</TableCell>
                    <TableCell>{c.unite}</TableCell>
                    <TableCell className="text-xs">
                      {c.shifts?.shift_type === "matin" ? "Matin" : c.shifts?.shift_type === "apres_midi" ? "Après-midi" : c.shifts?.shift_type === "nuit" ? "Nuit" : "—"}
                      {c.shifts?.shift_teams?.name && <span className="text-muted-foreground ml-1">({c.shifts.shift_teams.name})</span>}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{c.shifts?.date_shift || new Date(c.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    {canCorrect && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)} title="Corriger">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openAudit(c.id)} title="Historique">
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/correction dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className={isMobile ? "max-w-[95vw]" : "max-w-md"}>
          <DialogHeader><DialogTitle>Corriger une consommation</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><span className="text-muted-foreground">OF :</span> {editItem.ordres_fabrication?.numero}</p>
                <p><span className="text-muted-foreground">Article :</span> {editItem.articles?.code} — {editItem.articles?.designation}</p>
                <p><span className="text-muted-foreground">Valeur actuelle :</span> <span className="tabular-nums font-bold">{editItem.quantite} {editItem.unite}</span></p>
              </div>
              <div className="space-y-2">
                <Label>Nouvelle quantité *</Label>
                <Input type="number" value={editQte} onChange={(e) => setEditQte(e.target.value)} className="h-12 text-lg" />
              </div>
              <div className="space-y-2">
                <Label>Motif de correction *</Label>
                <Textarea value={editMotif} onChange={(e) => setEditMotif(e.target.value)} placeholder="Indiquez la raison de la modification..." className="min-h-[80px]" />
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-800 dark:text-amber-200">
                Cette correction sera tracée dans l'historique avec l'ancienne valeur, la nouvelle, votre identité et le motif.
              </div>
              <Button onClick={handleSaveCorrection} className="w-full h-12" disabled={!editMotif.trim()}>
                Enregistrer la correction
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit trail dialog */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className={isMobile ? "max-w-[95vw]" : "max-w-lg"}>
          <DialogHeader><DialogTitle>Historique des modifications</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Aucune modification enregistrée</p>
            ) : auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-lg border space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{log.action}</Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">{new Date(log.created_at).toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span>
                    <span className="text-muted-foreground">Ancien :</span>{" "}
                    <span className="tabular-nums font-medium">{(log.old_values as any)?.quantite ?? "—"}</span>
                  </span>
                  <span>→</span>
                  <span>
                    <span className="text-muted-foreground">Nouveau :</span>{" "}
                    <span className="tabular-nums font-bold">{(log.new_values as any)?.quantite ?? "—"}</span>
                  </span>
                </div>
                {(log.old_values as any)?.motif && (
                  <p className="text-xs text-muted-foreground">Motif : {(log.old_values as any).motif}</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
