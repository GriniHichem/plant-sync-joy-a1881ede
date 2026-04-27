import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, AlertCircle, FileText, Package, Truck, History, BarChart3, Plus, Trash2, Wrench, Clock } from "lucide-react";
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
  const navigate = useNavWithFrom();
  const goBack = useSmartBack("/pdr");
  const { canEdit } = usePermissions();
  const { toast } = useToast();
  const { user } = useAuth();
  const entityImages = useEntityImages("pdr", id);
  const [pdr, setPdr] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [linkedMachines, setLinkedMachines] = useState<any[]>([]);
  const [entityLinks, setEntityLinks] = useState<any[]>([]);
  const [allMachines, setAllMachines] = useState<any[]>([]);
  const [allEquipements, setAllEquipements] = useState<any[]>([]);
  const [allOrganes, setAllOrganes] = useState<any[]>([]);
  const [linkDialog, setLinkDialog] = useState(false);
  const [linkForm, setLinkForm] = useState({ entity_type: "machine" as "machine" | "equipement" | "organe", entity_id: "", quantite_recommandee: 1 });
  const [consumptionHistory, setConsumptionHistory] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);

  // Supplier dialog
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState({ nom: "", reference_fournisseur: "", prix: null as number | null, delai_jours: 0, email: "", tel: "", adresse: "", url1: "", url2: "", notes: "", is_principal: false });

  // Movement dialog
  const [movementDialog, setMovementDialog] = useState(false);
  const [mvtForm, setMvtForm] = useState({ type: "entree" as string, quantite: 0, prix_unitaire: 0, motif: "", ref_document_erp: "" });

  const loadAll = async () => {
    if (!id) return;
    const [pRes, sRes, mRes, mlRes, cRes, iRes, elRes, machRes, eqRes, orgRes] = await Promise.all([
      supabase.from("pdr").select("*, pdr_families(name, approvisionnement, statut_default)").eq("id", id).single(),
      supabase.from("pdr_suppliers").select("*").eq("pdr_id", id).order("is_principal", { ascending: false }),
      supabase.from("pdr_stock_movements").select("*").eq("pdr_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("machine_pdr").select("*, machines(code, designation)").eq("pdr_id", id),
      supabase.from("intervention_pdr").select("*, interventions(ticket_id, date_debut, tickets(numero, machines(code)))").eq("pdr_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("pdr_instances").select("*, machines(code, designation), equipements(code, designation)").eq("pdr_id", id).order("date_installation", { ascending: false }),
      supabase.from("pdr_entity_links" as any).select("*").eq("pdr_id", id),
      supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code"),
      supabase.from("equipements").select("id, code, designation").eq("is_active", true).order("code"),
      supabase.from("organes" as any).select("id, code, designation, machine_id, equipement_id").eq("is_active", true).order("code"),
    ]);
    if (pRes.data) setPdr(pRes.data);
    setSuppliers(sRes.data || []);
    setMovements(mRes.data || []);
    setLinkedMachines(mlRes.data || []);
    setConsumptionHistory(cRes.data || []);
    setInstances(iRes.data || []);
    setEntityLinks((elRes.data as any) || []);
    setAllMachines(machRes.data || []);
    setAllEquipements(eqRes.data || []);
    setAllOrganes((orgRes.data as any) || []);
  };

  useEffect(() => { loadAll(); }, [id]);

  const handleAddLink = async () => {
    if (!linkForm.entity_id) { toast({ title: "Sélectionner un actif", variant: "destructive" }); return; }
    const { error } = await supabase.from("pdr_entity_links" as any).insert({
      pdr_id: id, entity_type: linkForm.entity_type, entity_id: linkForm.entity_id,
      quantite_recommandee: linkForm.quantite_recommandee || 1,
    } as any);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Actif lié" });
    setLinkDialog(false);
    setLinkForm({ entity_type: "machine", entity_id: "", quantite_recommandee: 1 });
    loadAll();
  };

  const handleRemoveLink = async (linkId: string) => {
    await supabase.from("pdr_entity_links" as any).delete().eq("id", linkId);
    toast({ title: "Lien supprimé" });
    loadAll();
  };

  // Movement save
  const handleSaveMovement = async () => {
    if (mvtForm.quantite <= 0) { toast({ title: "Quantité invalide", variant: "destructive" }); return; }
    if (mvtForm.type === "sortie" && mvtForm.quantite > pdr.stock_actuel) {
      toast({ title: "Stock insuffisant", description: `Stock actuel: ${pdr.stock_actuel}`, variant: "destructive" }); return;
    }
    if ((mvtForm.type === "entree" || mvtForm.type === "sortie") && !mvtForm.ref_document_erp.trim()) {
      toast({ title: "Réf document ERP obligatoire", variant: "destructive" }); return;
    }
    const stockAvant = pdr.stock_actuel;
    let stockApres: number;
    if (mvtForm.type === "inventaire") {
      stockApres = mvtForm.quantite; // For inventory, quantity IS the new stock
    } else if (mvtForm.type === "correction") {
      stockApres = Math.max(0, stockAvant + mvtForm.quantite); // Correction can be + or -
    } else {
      const delta = mvtForm.type === "entree" ? mvtForm.quantite : -mvtForm.quantite;
      stockApres = Math.max(0, stockAvant + delta);
    }

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
    setMvtForm({ type: "entree", quantite: 0, prix_unitaire: 0, motif: "", ref_document_erp: "" });
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
    setSupplierForm({ nom: "", reference_fournisseur: "", prix: null, delai_jours: 0, email: "", tel: "", adresse: "", url1: "", url2: "", notes: "", is_principal: false });
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
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
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
          <TabsTrigger value="instances" className="h-9"><Clock className="h-3.5 w-3.5 mr-1" />Instances</TabsTrigger>
          <TabsTrigger value="fournisseurs" className="h-9"><Truck className="h-3.5 w-3.5 mr-1" />Fournisseurs</TabsTrigger>
          <TabsTrigger value="machines" className="h-9"><Wrench className="h-3.5 w-3.5 mr-1" />Actifs liés</TabsTrigger>
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
                ["Durée vie min", (pdr as any).duree_vie_min_jours ? `${(pdr as any).duree_vie_min_jours} jours` : "—"],
                ["Durée vie max (dead age)", (pdr as any).duree_vie_max_jours ? `${(pdr as any).duree_vie_max_jours} jours` : "—"],
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

        {/* INSTANCES */}
        <TabsContent value="instances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Pièces installées ({instances.filter((i: any) => i.statut === "active").length} actives)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Installation</TableHead>
                    <TableHead>Âge (jours)</TableHead>
                    <TableHead>Remplacement</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune instance</TableCell></TableRow>
                  ) : instances.map((inst: any) => {
                    const ageJours = Math.floor((Date.now() - new Date(inst.date_installation).getTime()) / 86400000);
                    const deadAge = (pdr as any).duree_vie_max_jours;
                    const isExpired = inst.statut === "active" && deadAge && ageJours >= deadAge;
                    const isWarning = inst.statut === "active" && (pdr as any).duree_vie_min_jours && ageJours >= (pdr as any).duree_vie_min_jours && !isExpired;
                    return (
                      <TableRow key={inst.id} className={isExpired ? "bg-destructive/5" : isWarning ? "bg-warning/5" : ""}>
                        <TableCell>
                          <Badge variant={inst.statut === "active" ? "default" : "secondary"} className="text-xs">
                            {inst.statut === "active" ? "Active" : "Passive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {inst.machines?.code || inst.equipements?.code || "—"}
                          {(inst.machines?.designation || inst.equipements?.designation) && (
                            <span className="text-muted-foreground ml-1">{inst.machines?.designation || inst.equipements?.designation}</span>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">{new Date(inst.date_installation).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell className={`tabular-nums font-medium ${isExpired ? "text-destructive" : isWarning ? "text-warning" : ""}`}>
                          {inst.statut === "active" ? ageJours : "—"}
                          {isExpired && <AlertCircle className="h-3.5 w-3.5 inline ml-1 text-destructive" />}
                        </TableCell>
                        <TableCell className="tabular-nums text-xs text-muted-foreground">
                          {inst.date_remplacement ? new Date(inst.date_remplacement).toLocaleDateString("fr-FR") : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{inst.notes || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* Dead age alert */}
          {instances.some((i: any) => i.statut === "active" && (pdr as any).duree_vie_max_jours && Math.floor((Date.now() - new Date(i.date_installation).getTime()) / 86400000) >= (pdr as any).duree_vie_max_jours) && (
            <Card className="mt-3 border-destructive">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Pièce(s) ayant atteint la durée de vie maximale</p>
                  <p className="text-xs text-muted-foreground">Un plan préventif de remplacement devrait être créé.</p>
                </div>
                <Button size="sm" variant="destructive" className="ml-auto" onClick={() => navigate(`/preventif/new?machine=${pdr.machines?.id || ""}&pdr=${id}`)}>
                  Générer plan préventif
                </Button>
              </CardContent>
            </Card>
          )}
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
                <Button size="sm" onClick={() => { setEditingSupplierId(null); setSupplierForm({ nom: "", reference_fournisseur: "", prix: null, delai_jours: 0, email: "", tel: "", adresse: "", url1: "", url2: "", notes: "", is_principal: false }); setSupplierDialog(true); }}>
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
                    <TableHead>Email / Tél</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {s.email && <span className="block">{s.email}</span>}
                        {s.tel && <span className="block">{s.tel}</span>}
                        {!s.email && !s.tel && "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setEditingSupplierId(s.id);
                            setSupplierForm({ nom: s.nom, reference_fournisseur: s.reference_fournisseur || "", prix: s.prix || null, delai_jours: s.delai_jours || 0, email: s.email || "", tel: s.tel || "", adresse: s.adresse || "", url1: s.url1 || "", url2: s.url2 || "", notes: s.notes || "", is_principal: s.is_principal });
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

        {/* ACTIFS LIÉS */}
        <TabsContent value="machines">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Actifs liés (Machines / Équipements / Organes)</CardTitle>
              {canEdit("pdr") && (
                <Button size="sm" onClick={() => setLinkDialog(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Lier un actif
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {pdr.statut_pdr === "strategique" && entityLinks.length === 0 && linkedMachines.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded border border-destructive bg-destructive/5">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">PDR stratégique sans actif lié — au moins un lien est requis.</p>
                </div>
              )}

              {/* Liens via pdr_entity_links */}
              {(["machine", "equipement", "organe"] as const).map((etype) => {
                const items = entityLinks.filter((l: any) => l.entity_type === etype);
                if (items.length === 0) return null;
                const label = etype === "machine" ? "Machines" : etype === "equipement" ? "Équipements" : "Organes";
                const list = etype === "machine" ? allMachines : etype === "equipement" ? allEquipements : allOrganes;
                const route = etype === "machine" ? "/machines" : etype === "equipement" ? "/equipements" : "/organes";
                return (
                  <div key={etype}>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
                    <div className="space-y-2">
                      {items.map((l: any) => {
                        const ent = list.find((e: any) => e.id === l.entity_id);
                        return (
                          <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm cursor-pointer hover:underline" onClick={() => navigate(`${route}/${l.entity_id}`)}>
                              {ent?.code || l.entity_id.slice(0, 8)}
                            </span>
                            <span className="text-sm text-muted-foreground">{ent?.designation || ""}</span>
                            {l.quantite_recommandee && <Badge variant="outline" className="text-xs ml-auto">Qté rec. {l.quantite_recommandee}</Badge>}
                            {canEdit("pdr") && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveLink(l.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Legacy machine_pdr (lecture seule, fallback) */}
              {linkedMachines.filter((lm: any) => !entityLinks.some((el: any) => el.entity_type === "machine" && el.entity_id === lm.machine_id)).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Machines (legacy)</p>
                  <div className="space-y-2">
                    {linkedMachines
                      .filter((lm: any) => !entityLinks.some((el: any) => el.entity_type === "machine" && el.entity_id === lm.machine_id))
                      .map((lm: any) => (
                        <div key={lm.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/machines/${lm.machine_id}`)}>
                          <Wrench className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{lm.machines?.code}</span>
                          <span className="text-sm text-muted-foreground">{lm.machines?.designation}</span>
                          {lm.quantite_recommandee && <Badge variant="outline" className="text-xs ml-auto">Qté rec. {lm.quantite_recommandee}</Badge>}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {entityLinks.length === 0 && linkedMachines.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun actif lié</p>
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
                    <TableHead>Réf doc. ERP</TableHead>
                    <TableHead>Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Aucun mouvement</TableCell></TableRow>
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
                      <TableCell className="font-mono text-sm">{m.ref_document_erp || "—"}</TableCell>
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
              <Label>
                {mvtForm.type === "entree" ? "Réf bon d'entrée / réception (ERP)" :
                 mvtForm.type === "sortie" ? "Réf bon de sortie (ERP)" :
                 mvtForm.type === "inventaire" ? "Réf document d'inventaire (ERP)" :
                 "Réf document (ERP)"}
              </Label>
              <Input value={mvtForm.ref_document_erp} onChange={(e) => setMvtForm((f) => ({ ...f, ref_document_erp: e.target.value }))} className="h-12"
                placeholder={mvtForm.type === "entree" ? "Ex: BR-2026-001" : mvtForm.type === "sortie" ? "Ex: BS-2026-015" : mvtForm.type === "inventaire" ? "Ex: INV-2026-03" : "Référence..."} />
            </div>
            <div className="space-y-2">
              <Label>Motif</Label>
              <Textarea value={mvtForm.motif} onChange={(e) => setMvtForm((f) => ({ ...f, motif: e.target.value }))} rows={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              Stock actuel: <span className="font-bold">{pdr.stock_actuel}</span> → Après: <span className="font-bold">
                {mvtForm.type === "inventaire" ? mvtForm.quantite
                  : mvtForm.type === "entree" ? pdr.stock_actuel + mvtForm.quantite
                  : Math.max(0, pdr.stock_actuel - mvtForm.quantite)}
              </span>
              {mvtForm.type === "sortie" && mvtForm.quantite > pdr.stock_actuel && (
                <span className="text-destructive ml-2 font-medium">⚠ Stock insuffisant</span>
              )}
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
                <Input type="number" value={supplierForm.prix ?? ""} onChange={(e) => setSupplierForm((f) => ({ ...f, prix: e.target.value ? Number(e.target.value) : null }))} className="h-12" placeholder="Optionnel" />
              </div>
              <div className="space-y-2">
                <Label>Délai (jours)</Label>
                <Input type="number" value={supplierForm.delai_jours} onChange={(e) => setSupplierForm((f) => ({ ...f, delai_jours: Number(e.target.value) }))} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))} className="h-12" placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={supplierForm.tel} onChange={(e) => setSupplierForm((f) => ({ ...f, tel: e.target.value }))} className="h-12" placeholder="+213..." />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Adresse</Label>
                <Input value={supplierForm.adresse} onChange={(e) => setSupplierForm((f) => ({ ...f, adresse: e.target.value }))} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>URL 1</Label>
                <Input value={supplierForm.url1} onChange={(e) => setSupplierForm((f) => ({ ...f, url1: e.target.value }))} className="h-12" placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>URL 2</Label>
                <Input value={supplierForm.url2} onChange={(e) => setSupplierForm((f) => ({ ...f, url2: e.target.value }))} className="h-12" placeholder="https://..." />
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

      {/* Link Asset Dialog */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lier un actif à cette PDR</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type d'actif</Label>
              <Select value={linkForm.entity_type} onValueChange={(v) => setLinkForm((f) => ({ ...f, entity_type: v as any, entity_id: "" }))}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="equipement">Équipement</SelectItem>
                  <SelectItem value="organe">Organe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Actif *</Label>
              <Select value={linkForm.entity_id || "__none__"} onValueChange={(v) => setLinkForm((f) => ({ ...f, entity_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucun —</SelectItem>
                  {(linkForm.entity_type === "machine" ? allMachines : linkForm.entity_type === "equipement" ? allEquipements : allOrganes)
                    .filter((e: any) => !entityLinks.some((l: any) => l.entity_type === linkForm.entity_type && l.entity_id === e.id))
                    .map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.code} — {e.designation}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantité recommandée</Label>
              <Input type="number" min="1" value={linkForm.quantite_recommandee}
                onChange={(e) => setLinkForm((f) => ({ ...f, quantite_recommandee: Number(e.target.value) || 1 }))} className="h-12" />
            </div>
            <Button onClick={handleAddLink} className="w-full h-12">Lier</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
