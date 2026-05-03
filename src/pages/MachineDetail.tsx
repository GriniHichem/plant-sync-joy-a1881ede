import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, FileText, Package, Wrench, CalendarCheck, Clock, Factory, Component, ImageIcon, MapPin } from "lucide-react";
import { EntityDocumentManager } from "@/components/documents/EntityDocumentManager";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdrPositionsManager } from "@/components/pdr/PdrPositionsManager";

const ROLE_LABELS: Record<string, string> = {
  alimentation: "Alimentation", transformation: "Transformation", dosage: "Dosage",
  melange: "Mélange", convoyage: "Convoyage", conditionnement: "Conditionnement",
  controle: "Contrôle", evacuation: "Évacuation", utilite: "Utilité", autre: "Autre",
};
const IMPACT_LABELS: Record<string, string> = {
  arret_complet: "Arrêt complet", arret_partiel: "Arrêt partiel", degradation: "Dégradation", aucun: "Aucun",
};
const CRIT_MAINT_LABELS: Record<string, string> = {
  faible: "Faible", moyenne: "Moyenne", elevee: "Élevée", critique: "Critique",
};
const DISPO_LABELS: Record<string, string> = {
  disponible: "Disponible", partiel: "Partiel", indisponible: "Indisponible",
};
const PRIORITY_LABELS: Record<number, string> = { 1: "Principale", 2: "Secondaire", 3: "Tertiaire" };

export default function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavWithFrom();
  const goBack = useSmartBack("/machines");
  const { canEdit } = usePermissions();
  const [machine, setMachine] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [pdrList, setPdrList] = useState<any[]>([]);
  const [pdrLinks, setPdrLinks] = useState<any[]>([]);
  const [positionDialog, setPositionDialog] = useState<{ linkId: string; label: string } | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [lineAssignments, setLineAssignments] = useState<any[]>([]);
  const [linkedEquipments, setLinkedEquipments] = useState<any[]>([]);
  const [organes, setOrganes] = useState<any[]>([]);
  const entityImages = useEntityImages("machine", id);
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [mRes, tRes, pdrRes, linksRes, plansRes, docsRes, laRes, eqRes, oRes] = await Promise.all([
        supabase.from("machines").select("*, machine_families(name)").eq("id", id).single(),
        supabase.from("tickets").select("*, panne_types(name)").eq("machine_id", id).order("created_at", { ascending: false }),
        supabase.from("machine_pdr").select("*, pdr(*)").eq("machine_id", id),
        (supabase.from("pdr_entity_links" as any) as any).select("id, pdr_id").eq("entity_type", "machine").eq("entity_id", id),
        supabase.from("preventive_plans").select("*").eq("machine_id", id),
        supabase.from("machine_documents").select("*").eq("machine_id", id).order("created_at", { ascending: false }),
        supabase.from("machine_line_assignments").select("*, production_lines(code, designation)").eq("machine_id", id).order("priority"),
        supabase.from("equipements").select("*").eq("machine_id", id).order("code"),
        (supabase.from("organes" as any) as any).select("*").eq("machine_id", id).order("sort_order"),
      ]);
      setMachine(mRes.data);
      setTickets(tRes.data || []);
      setPdrList(pdrRes.data || []);
      setPdrLinks((linksRes.data as any) || []);
      setPlans(plansRes.data || []);
      setDocuments(docsRes.data || []);
      setLineAssignments(laRes.data || []);
      setLinkedEquipments(eqRes.data || []);
      setOrganes((oRes.data as any) || []);

      if (tRes.data && tRes.data.length > 0) {
        const ticketIds = tRes.data.map((t: any) => t.id);
        const { data: intData } = await supabase
          .from("interventions")
          .select("*, intervention_pdr(*, pdr(reference, designation)), tickets(numero, description)")
          .in("ticket_id", ticketIds)
          .order("date_debut", { ascending: false });
        setInterventions(intData || []);
      }
    };
    load();
  }, [id]);

  if (!machine) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const totalPdrUsed = interventions.reduce((sum, i) => {
    return sum + (i.intervention_pdr || []).reduce((s: number, ip: any) => s + (ip.quantite || 0), 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {entityImages.primaryImage && (
          <EntityThumbnail imageUrl={entityImages.primaryImage.image_url} alt={machine.designation} size="lg" rounded="lg" enableLightbox />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{machine.code} — {machine.designation}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge type="machine" value={machine.statut} />
            <StatusBadge type="criticite" value={machine.criticite} />
            {machine.machine_families?.name && (
              <span className="text-xs text-muted-foreground">• {machine.machine_families.name}</span>
            )}
            {lineAssignments.length > 0 && lineAssignments.map((la: any) => (
              <Badge key={la.id} variant={la.priority === 1 ? "default" : "outline"} className="text-xs">
                <Factory className="h-3 w-3 mr-1" />
                {la.production_lines?.code} ({PRIORITY_LABELS[la.priority]})
              </Badge>
            ))}
          </div>
        </div>
        {canEdit("machines") && (
          <Button variant="outline" onClick={() => navigate(`/machines/${id}/edit`)} className="h-12 px-6">
            <Edit className="h-4 w-4 mr-2" /> Modifier
          </Button>
        )}
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="h-11">
          <TabsTrigger value="info" className="h-9">Infos</TabsTrigger>
          <TabsTrigger value="images" className="h-9">
            <ImageIcon className="h-3.5 w-3.5 mr-1" /> Photos
          </TabsTrigger>
          <TabsTrigger value="documents" className="h-9">
            <FileText className="h-3.5 w-3.5 mr-1" /> Documents
          </TabsTrigger>
          <TabsTrigger value="pdr" className="h-9">
            <Package className="h-3.5 w-3.5 mr-1" /> PDR
          </TabsTrigger>
          <TabsTrigger value="interventions" className="h-9">
            <Wrench className="h-3.5 w-3.5 mr-1" /> Interventions ({interventions.length})
          </TabsTrigger>
          <TabsTrigger value="tickets" className="h-9">
            Tickets ({tickets.length})
          </TabsTrigger>
          <TabsTrigger value="preventif" className="h-9">
            <CalendarCheck className="h-3.5 w-3.5 mr-1" /> Préventif
          </TabsTrigger>
          <TabsTrigger value="equipements" className="h-9">
            <Component className="h-3.5 w-3.5 mr-1" /> Équipements ({linkedEquipments.length})
          </TabsTrigger>
          <TabsTrigger value="organes" className="h-9">
            <Component className="h-3.5 w-3.5 mr-1" /> Organes ({organes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {[
                  ["Code", machine.code],
                  ["Désignation", machine.designation],
                  ["Marque", machine.marque],
                  ["Modèle", machine.modele],
                  ["N° Série", machine.numero_serie],
                  ["Localisation", machine.localisation],
                  ["Mise en service", machine.date_mise_en_service ? new Date(machine.date_mise_en_service).toLocaleDateString("fr-FR") : "—"],
                  ["Description", machine.description],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{(value as string) || "—"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Process & Maintenance</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Rôle fonctionnel</p>
                  <p className="text-sm font-medium">{ROLE_LABELS[(machine as any).role_fonctionnel] || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Impact ligne</p>
                  <Badge variant={
                    (machine as any).impact_ligne === "arret_complet" ? "destructive" :
                    (machine as any).impact_ligne === "arret_partiel" ? "default" : "secondary"
                  } className="text-xs mt-0.5">
                    {IMPACT_LABELS[(machine as any).impact_ligne] || "—"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Criticité maintenance</p>
                  <Badge variant={
                    (machine as any).criticite_maintenance === "critique" ? "destructive" :
                    (machine as any).criticite_maintenance === "elevee" ? "default" : "secondary"
                  } className="text-xs mt-0.5">
                    {CRIT_MAINT_LABELS[(machine as any).criticite_maintenance] || "—"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Disponibilité PDR</p>
                  <Badge variant={
                    (machine as any).disponibilite_pdr === "indisponible" ? "destructive" :
                    (machine as any).disponibilite_pdr === "partiel" ? "default" : "secondary"
                  } className="text-xs mt-0.5">
                    {DISPO_LABELS[(machine as any).disponibilite_pdr] || "—"}
                  </Badge>
                </div>
                {lineAssignments.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Lignes de production</p>
                    <div className="flex flex-wrap gap-1">
                      {lineAssignments.map((la: any) => (
                        <Badge key={la.id} variant={la.priority === 1 ? "default" : "outline"} className="text-xs">
                          {la.production_lines?.code} — {la.production_lines?.designation} ({PRIORITY_LABELS[la.priority]})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader><CardTitle className="text-base">Photos de la machine</CardTitle></CardHeader>
            <CardContent>
              <EntityImageUploader
                images={entityImages.images}
                primaryImage={entityImages.primaryImage}
                uploading={entityImages.uploading}
                onUpload={entityImages.uploadImage}
                onDelete={entityImages.deleteImage}
                onSetPrimary={entityImages.setPrimary}
                canEdit={canEdit("machines")}
                maxSizeMb={entityImages.maxSizeMb}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-6">
              <EntityDocumentManager entityType="machine" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdr">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Qté recommandée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pdrList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune PDR liée</TableCell>
                    </TableRow>
                  ) : (
                    pdrList.map((mp) => (
                      <TableRow key={mp.id}>
                        <TableCell className="font-mono">{mp.pdr?.reference}</TableCell>
                        <TableCell>{mp.pdr?.designation}</TableCell>
                        <TableCell className="tabular-nums">
                          <span className={mp.pdr?.stock_actuel <= mp.pdr?.stock_min ? "text-destructive font-medium" : ""}>
                            {mp.pdr?.stock_actuel}
                          </span>
                          <span className="text-muted-foreground"> / min {mp.pdr?.stock_min}</span>
                        </TableCell>
                        <TableCell className="tabular-nums">{mp.quantite_recommandee}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interventions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Historique des interventions
                <span className="text-sm font-normal text-muted-foreground">
                  {totalPdrUsed > 0 && `${totalPdrUsed} pièces utilisées au total`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interventions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Aucune intervention enregistrée
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-4">
                    {interventions.map((i) => {
                      const duration = i.date_fin && i.date_debut
                        ? Math.round((new Date(i.date_fin).getTime() - new Date(i.date_debut).getTime()) / 60000)
                        : null;
                      return (
                        <div key={i.id} className="relative pl-8">
                          <div className={`absolute left-1.5 top-2 h-3 w-3 rounded-full border-2 border-background ${
                            i.statut === "en_cours" ? "bg-amber-500" : i.statut === "terminee" ? "bg-green-500" : "bg-muted-foreground"
                          }`} />
                          <div className="p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">{i.description}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                  Ticket: {i.tickets?.numero}
                                </p>
                              </div>
                              <StatusBadge type="ticket" value={i.statut === "en_cours" ? "en_cours" : i.statut === "terminee" ? "resolu" : "cloture"} />
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 tabular-nums">
                                <Clock className="h-3 w-3" />
                                {new Date(i.date_debut).toLocaleString("fr-FR")}
                              </span>
                              {i.date_fin && (
                                <span className="tabular-nums">→ {new Date(i.date_fin).toLocaleString("fr-FR")}</span>
                              )}
                              {duration != null && (
                                <span className="font-medium text-foreground">Durée: {duration} min</span>
                              )}
                            </div>
                            {i.intervention_pdr && i.intervention_pdr.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {i.intervention_pdr.map((ip: any) => (
                                  <span key={ip.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted">
                                    <Package className="h-3 w-3" />
                                    {ip.pdr?.reference} ×{ip.quantite}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Type panne</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Temps arrêt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun ticket</TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((t) => (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tickets/${t.id}`)}>
                        <TableCell className="font-mono font-medium">{t.numero}</TableCell>
                        <TableCell><StatusBadge type="priority" value={t.priorite} /></TableCell>
                        <TableCell><StatusBadge type="ticket" value={t.statut} /></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{t.panne_types?.name || "—"}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {new Date(t.heure_declaration).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {t.temps_arret_minutes ? <span className="text-destructive font-medium">{t.temps_arret_minutes} min</span> : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preventif">
          <Card>
            <CardContent className="p-0">
              {lineAssignments.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const firstLine = lineAssignments[0];
                      if (firstLine) navigate(`/preventif?line=${firstLine.line_id}`);
                    }}
                    className="text-xs h-8"
                  >
                    <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                    Voir tous les plans de la ligne
                  </Button>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Fréquence</TableHead>
                    <TableHead>Prochaine échéance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Aucun plan préventif</TableCell>
                    </TableRow>
                  ) : (
                    plans.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/preventif/${p.id}`)}>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell className="capitalize">{p.frequence}</TableCell>
                        <TableCell className="tabular-nums">
                          {p.prochaine_echeance ? new Date(p.prochaine_echeance).toLocaleDateString("fr-FR") : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipements">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedEquipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        <Component className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Aucun équipement rattaché
                      </TableCell>
                    </TableRow>
                  ) : linkedEquipments.map((eq: any) => (
                    <TableRow key={eq.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/equipements/${eq.id}`)}>
                      <TableCell className="font-mono font-medium">{eq.code}</TableCell>
                      <TableCell>{eq.designation}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{eq.type?.replace("_", " ")}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={eq.statut === "en_service" ? "default" : eq.statut === "hors_service" ? "destructive" : "secondary"} className="text-xs">
                          {eq.statut?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organes">
          <Card>
            <CardContent className="p-0">
              <div className="flex justify-end p-3 border-b">
                {canEdit("organes") && (
                  <Button size="sm" onClick={() => navigate(`/organes/new?machine_id=${id}`)}>
                    <Component className="h-4 w-4 mr-2" /> Ajouter un organe
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>Désignation</TableHead>
                  <TableHead>Type</TableHead><TableHead>Statut</TableHead><TableHead>Criticité</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {organes.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun organe</TableCell></TableRow>
                  ) : organes.map((o: any) => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/organes/${o.id}`)}>
                      <TableCell className="font-mono font-medium">{o.code}</TableCell>
                      <TableCell>{o.designation}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{o.type}</Badge></TableCell>
                      <TableCell><Badge variant={o.statut === "en_service" ? "default" : o.statut === "en_panne" ? "destructive" : "secondary"} className="text-xs">{o.statut?.replace("_", " ")}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{o.criticite}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
