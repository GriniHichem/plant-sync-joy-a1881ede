import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, AlertCircle, FileText, Package, Truck, History, BarChart3, Plus, Trash2, Wrench } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";
import { EntityDocumentManager } from "@/components/documents/EntityDocumentManager";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function PdrDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const { toast } = useToast();
  const { user } = useAuth();
  const entityImages = useEntityImages("pdr", id);
  const [pdr, setPdr] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [linkedMachines, setLinkedMachines] = useState<any[]>([]);
  const [consumptionHistory, setConsumptionHistory] = useState<any[]>([]);

  // Supplier dialog
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState({ nom: "", reference_fournisseur: "", prix: 0, delai_jours: 0, contact: "", notes: "", is_principal: false });

  // Movement dialog
  const [movementDialog, setMovementDialog] = useState(false);
  const [mvtForm, setMvtForm] = useState({ type: "entree" as string, quantite: 0, prix_unitaire: 0, motif: "", ref_document_erp: "" });

  const loadAll = async () => {
    if (!id) return;
    const [pRes, sRes, mRes, mlRes, cRes] = await Promise.all([
      supabase.from("pdr").select("*, pdr_families(name, approvisionnement, statut_default)").eq("id", id).single(),
      supabase.from("pdr_suppliers").select("*").eq("pdr_id", id).order("is_principal", { ascending: false }),
      supabase.from("pdr_stock_movements").select("*").eq("pdr_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("machine_pdr").select("*, machines(code, designation)").eq("pdr_id", id),
      supabase.from("intervention_pdr").select("*, interventions(ticket_id, date_debut, tickets(numero, machines(code)))").eq("pdr_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (pRes.data) setPdr(pRes.data);
    setSuppliers(sRes.data || []);
    setMovements(mRes.data || []);
    setLinkedMachines(mlRes.data || []);
    setConsumptionHistory(cRes.data || []);
  };

  useEffect(() => { loadAll(); }, [id]);

  // Movement save
  const handleSaveMovement = async () => {
    if (mvtForm.quantite <= 0) { toast({ title: "Quantité invalide", variant: "destructive" }); return; }
    const stockAvant = pdr.stock_actuel;
    const delta = mvtForm.type === "entree" ? mvtForm.quantite : -mvtForm.quantite;
    const stockApres = Math.max(0, stockAvant + delta);

    // PMP calculation for entries
    let newPmp = pdr.pmp || 0;
    if (mvtForm.type === "entree" && mvtForm.prix_unitaire > 0) {
      newPmp = stockAvant + mvtForm.quantite > 0
        ? (stockAvant * (pdr.pmp || 0) + mvtForm.quantite * mvtForm.prix_unitaire) / (stockAvant + mvtForm.quantite)
        : mvtForm.prix_unitaire;
    }

    await supabase.from("pdr_stock_movements").insert({
      pdr_id: id, type: mvtForm.type as any, quantite: mvtForm.quantite,
      stock_avant: stockAvant, stock_apres: stockApres,
      prix_unitaire: mvtForm.prix_unitaire || null, motif: mvtForm.motif || null,
      source_type: "manuel", user_id: user?.id,
      ref_document_erp: mvtForm.ref_document_erp || null,
    });

    await supabase.from("pdr").update({ stock_actuel: stockApres, pmp: Math.round(newPmp * 100) / 100 }).eq("id", id);
    toast({ title: "Mouvement enregistré" });
    setMovementDialog(false);
    setMvtForm({ type: "entree", quantite: 0, prix_unitaire: 0, motif: "" });
    loadAll();
  };

  // Supplier save
  const handleSaveSupplier = async () => {
    if (!supplierForm.nom.trim()) { toast({ title: "Nom obligatoire", variant: "destructive" }); return; }
    const payload: any = { ...supplierForm, pdr_id: id };
    if (editingSupplierId) {
      await supabase.from("pdr_suppliers").update(payload).eq("id", editingSupplierId);
    } else {
      await supabase.from("pdr_suppliers").insert(payload);
    }
    toast({ title: editingSupplierId ? "Fournisseur modifié" : "Fournisseur ajouté" });
    setSupplierDialog(false);
    setEditingSupplierId(null);
    setSupplierForm({ nom: "", reference_fournisseur: "", prix: 0, delai_jours: 0, contact: "", notes: "", is_principal: false });
    loadAll();
  };

  const deleteSupplier = async (sid: string) => {
    await supabase.from("pdr_suppliers").delete().eq("id", sid);
    toast({ title: "Fournisseur supprimé" });
    loadAll();
  };

  if (!pdr) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const lowStock = pdr.stock_actuel <= pdr.stock_min;
  const isRupture = pdr.stock_actuel === 0;
  const isSecurite = pdr.stock_actuel <= (pdr.stock_securite || 0) && pdr.stock_actuel > 0;
  const aCommander = (pdr.point_commande || 0) > 0 && pdr.stock_actuel <= pdr.point_commande;
  const totalConsoQty = consumptionHistory.reduce((s: number, c: any) => s + c.quantite, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pdr")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{pdr.reference} — {pdr.designation}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={pdr.statut_pdr === "strategique" ? "destructive" : "secondary"} className="text-xs">
              {pdr.statut_pdr === "strategique" ? "Stratégique" : "Commune"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {pdr.approvisionnement === "importation" ? "Import" : pdr.approvisionnement === "mixte" ? "Mixte" : "Local"}
            </Badge>
            {pdr.pdr_families?.name && <Badge variant="outline" className="text-xs">{pdr.pdr_families.name}</Badge>}
            {isRupture && <Badge variant="destructive" className="text-xs animate-pulse"><AlertCircle className="h-3 w-3 mr-1" />Rupture</Badge>}
            {!isRupture && lowStock && <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Critique</Badge>}
            {isSecurite && <Badge className="text-xs bg-warning text-warning-foreground">Sécurité</Badge>}
            {aCommander && <Badge className="text-xs bg-info text-info-foreground">À commander</Badge>}
          </div>
        </div>
        {canEdit("pdr") && (
          <Button variant="outline" onClick={() => navigate(`/pdr/${id}/edit`)} className="h-12 px-6">
            <Edit className="h-4 w-4 mr-2" /> Modifier
          </Button>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList className="h-11 flex-wrap">
          <TabsTrigger value="info" className="h-9">Infos</TabsTrigger>
          <TabsTrigger value="stock" className="h-9"><Package className="h-3.5 w-3.5 mr-1" />Stock</TabsTrigger>
          <TabsTrigger value="fournisseurs" className="h-9"><Truck className="h-3.5 w-3.5 mr-1" />Fournisseurs</TabsTrigger>
          <TabsTrigger value="machines" className="h-9"><Wrench className="h-3.5 w-3.5 mr-1" />Machines</TabsTrigger>
          <TabsTrigger value="mouvements" className="h-9"><History className="h-3.5 w-3.5 mr-1" />Mouvements</TabsTrigger>
          <TabsTrigger value="consommation" className="h-9"><BarChart3 className="h-3.5 w-3.5 mr-1" />Conso.</TabsTrigger>
          <TabsTrigger value="photos" className="h-9">Photos</TabsTrigger>
          <TabsTrigger value="documents" className="h-9"><FileText className="h-3.5 w-3.5 mr-1" />Docs</TabsTrigger>
        </TabsList>

        {/* INFO */}
        <TabsContent value="info">
          <Card>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6">
              {[
                ["Référence", pdr.reference],
                ["Désignation", pdr.designation],
                ["Famille", pdr.pdr_families?.name || "—"],
                ["Statut", pdr.statut_pdr === "strategique" ? "Stratégique" : "Commune"],
                ["Approvisionnement", pdr.approvisionnement],
                ["Fournisseur", pdr.fournisseur || "—"],
                ["Emplacement", pdr.emplacement || "—"],
                ["Délai appro.", pdr.delai_approvisionnement ? `${pdr.delai_approvisionnement} jours` : "—"],
                ["Prix unit.", pdr.prix_unitaire ? `${pdr.prix_unitaire} DA` : "—"],
                ["PMP", pdr.pmp ? `${Number(pdr.pmp).toLocaleString("fr-FR")} DA` : "—"],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{String(value)}</p>
                </div>
              ))}
              {pdr.description && (
                <div className="col-span-full">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{pdr.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STOCK */}
        <TabsContent value="stock">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Actuel", value: pdr.stock_actuel, color: lowStock ? "text-destructive" : "text-success" },
              { label: "Minimum", value: pdr.stock_min },
              { label: "Maximum", value: pdr.stock_max || 0 },
              { label: "Sécurité", value: pdr.stock_securite || 0 },
              { label: "Pt commande", value: pdr.point_commande || 0 },
              { label: "Délai (j)", value: pdr.delai_approvisionnement || 0 },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold tabular-nums ${s.color || ""}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-3">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Valeur stock</p>
                  <p className="text-2xl font-bold tabular-nums">{(pdr.stock_actuel * (pdr.pmp || pdr.prix_unitaire || 0)).toLocaleString("fr-FR")} DA</p>
                </div>
                {canEdit("pdr") && (
                  <Button onClick={() => setMovementDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Mouvement
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FOURNISSEURS */}
        <TabsContent value="fournisseurs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Fournisseurs liés</CardTitle>
              {canEdit("pdr") && (
                <Button size="sm" onClick={() => { setEditingSupplierId(null); setSupplierForm({ nom: "", reference_fournisseur: "", prix: 0, delai_jours: 0, contact: "", notes: "", is_principal: false }); setSupplierDialog(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Réf. fourn.</TableHead>
                    <TableHead>Prix (DA)</TableHead>
                    <TableHead>Délai (j)</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucun fournisseur</TableCell></TableRow>
                  ) : suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.nom} {s.is_principal && <Badge variant="default" className="text-xs ml-1">Principal</Badge>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{s.reference_fournisseur || "—"}</TableCell>
                      <TableCell className="tabular-nums">{s.prix ? Number(s.prix).toLocaleString("fr-FR") : "—"}</TableCell>
                      <TableCell className="tabular-nums">{s.delai_jours || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.contact || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setEditingSupplierId(s.id);
                            setSupplierForm({ nom: s.nom, reference_fournisseur: s.reference_fournisseur || "", prix: s.prix || 0, delai_jours: s.delai_jours || 0, contact: s.contact || "", notes: s.notes || "", is_principal: s.is_principal });
                            setSupplierDialog(true);
                          }}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSupplier(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MACHINES */}
        <TabsContent value="machines">
          <Card>
            <CardHeader><CardTitle className="text-base">Machines liées</CardTitle></CardHeader>
            <CardContent>
              {linkedMachines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune machine liée</p>
              ) : (
                <div className="space-y-2">
                  {linkedMachines.map((lm: any) => (
                    <div key={lm.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/machines/${lm.machine_id}`)}>
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{lm.machines?.code}</span>
                      <span className="text-sm text-muted-foreground">{lm.machines?.designation}</span>
                      {lm.quantite_recommandee && <Badge variant="outline" className="text-xs ml-auto">Qté rec. {lm.quantite_recommandee}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOUVEMENTS */}
        <TabsContent value="mouvements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Historique des mouvements</CardTitle>
              {canEdit("pdr") && (
                <Button size="sm" onClick={() => setMovementDialog(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Mouvement
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead>Avant</TableHead>
                    <TableHead>Après</TableHead>
                    <TableHead>Prix unit.</TableHead>
                    <TableHead>Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Aucun mouvement</TableCell></TableRow>
                  ) : movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="tabular-nums text-xs">{new Date(m.created_at).toLocaleString("fr-FR")}</TableCell>
                      <TableCell>
                        <Badge variant={m.type === "entree" ? "default" : m.type === "sortie" ? "destructive" : "secondary"} className="text-xs">
                          {m.type === "entree" ? "Entrée" : m.type === "sortie" ? "Sortie" : m.type === "correction" ? "Correction" : "Inventaire"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">{m.type === "sortie" ? `-${m.quantite}` : `+${m.quantite}`}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{m.stock_avant}</TableCell>
                      <TableCell className="tabular-nums font-medium">{m.stock_apres}</TableCell>
                      <TableCell className="tabular-nums">{m.prix_unitaire ? `${m.prix_unitaire} DA` : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.motif || m.source_type || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONSOMMATION */}
        <TabsContent value="consommation">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique de consommation ({totalConsoQty} unités)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Qté</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumptionHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Aucune consommation</TableCell></TableRow>
                  ) : consumptionHistory.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="tabular-nums text-xs">{new Date(c.created_at).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="font-mono text-sm cursor-pointer text-primary hover:underline"
                        onClick={() => c.interventions?.ticket_id && navigate(`/tickets/${c.interventions.ticket_id}`)}>
                        {c.interventions?.tickets?.numero || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{c.interventions?.tickets?.machines?.code || "—"}</TableCell>
                      <TableCell className="tabular-nums font-medium">×{c.quantite}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PHOTOS */}
        <TabsContent value="photos">
          <Card>
            <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
            <CardContent>
              <EntityImageUploader
                images={entityImages.images} primaryImage={entityImages.primaryImage}
                uploading={entityImages.uploading} onUpload={entityImages.uploadImage}
                onDelete={entityImages.deleteImage} onSetPrimary={entityImages.setPrimary}
                canEdit={canEdit("pdr")} maxSizeMb={entityImages.maxSizeMb}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents">
          <Card>
            <CardContent className="p-6">
              <EntityDocumentManager entityType="pdr" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement Dialog */}
      <Dialog open={movementDialog} onOpenChange={setMovementDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau mouvement de stock</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={mvtForm.type} onValueChange={(v) => setMvtForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entree">Entrée</SelectItem>
                  <SelectItem value="sortie">Sortie</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                  <SelectItem value="inventaire">Inventaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantité *</Label>
                <Input type="number" value={mvtForm.quantite} onChange={(e) => setMvtForm((f) => ({ ...f, quantite: Number(e.target.value) }))} className="h-12" min="1" />
              </div>
              {mvtForm.type === "entree" && (
                <div className="space-y-2">
                  <Label>Prix unitaire (DA)</Label>
                  <Input type="number" step="0.01" value={mvtForm.prix_unitaire} onChange={(e) => setMvtForm((f) => ({ ...f, prix_unitaire: Number(e.target.value) }))} className="h-12" min="0" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Motif</Label>
              <Textarea value={mvtForm.motif} onChange={(e) => setMvtForm((f) => ({ ...f, motif: e.target.value }))} rows={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              Stock actuel: <span className="font-bold">{pdr.stock_actuel}</span> → Après: <span className="font-bold">
                {mvtForm.type === "entree" ? pdr.stock_actuel + mvtForm.quantite : Math.max(0, pdr.stock_actuel - mvtForm.quantite)}
              </span>
            </p>
            <Button onClick={handleSaveMovement} className="w-full h-12">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSupplierId ? "Modifier" : "Ajouter"} fournisseur</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={supplierForm.nom} onChange={(e) => setSupplierForm((f) => ({ ...f, nom: e.target.value }))} className="h-12" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Réf. fournisseur</Label>
                <Input value={supplierForm.reference_fournisseur} onChange={(e) => setSupplierForm((f) => ({ ...f, reference_fournisseur: e.target.value }))} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Prix (DA)</Label>
                <Input type="number" value={supplierForm.prix} onChange={(e) => setSupplierForm((f) => ({ ...f, prix: Number(e.target.value) }))} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Délai (jours)</Label>
                <Input type="number" value={supplierForm.delai_jours} onChange={(e) => setSupplierForm((f) => ({ ...f, delai_jours: Number(e.target.value) }))} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input value={supplierForm.contact} onChange={(e) => setSupplierForm((f) => ({ ...f, contact: e.target.value }))} className="h-12" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={supplierForm.is_principal} onChange={(e) => setSupplierForm((f) => ({ ...f, is_principal: e.target.checked }))} className="rounded border-input" />
              Fournisseur principal
            </label>
            <Button onClick={handleSaveSupplier} className="w-full h-12">{editingSupplierId ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
