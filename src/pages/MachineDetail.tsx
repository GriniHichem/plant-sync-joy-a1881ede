import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { ArrowLeft, Edit, FileText, Package, Wrench, CalendarCheck, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";

export default function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const [machine, setMachine] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [pdrList, setPdrList] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [mRes, tRes, pdrRes, plansRes, docsRes] = await Promise.all([
        supabase.from("machines").select("*, machine_families(name)").eq("id", id).single(),
        supabase.from("tickets").select("*, panne_types(name)").eq("machine_id", id).order("created_at", { ascending: false }),
        supabase.from("machine_pdr").select("*, pdr(*)").eq("machine_id", id),
        supabase.from("preventive_plans").select("*").eq("machine_id", id),
        supabase.from("machine_documents").select("*").eq("machine_id", id).order("created_at", { ascending: false }),
      ]);
      setMachine(mRes.data);
      setTickets(tRes.data || []);
      setPdrList(pdrRes.data || []);
      setPlans(plansRes.data || []);
      setDocuments(docsRes.data || []);

      // Load interventions for all tickets of this machine
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

  // Compute maintenance cost
  const totalPdrUsed = interventions.reduce((sum, i) => {
    return sum + (i.intervention_pdr || []).reduce((s: number, ip: any) => s + (ip.quantite || 0), 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/machines")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{machine.code} — {machine.designation}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge type="machine" value={machine.statut} />
            <StatusBadge type="criticite" value={machine.criticite} />
            {machine.machine_families?.name && (
              <span className="text-xs text-muted-foreground">• {machine.machine_families.name}</span>
            )}
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
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
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
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-5">
              {documents.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Aucun document — <button onClick={() => navigate(`/machines/${id}/edit`)} className="underline text-primary">ajouter des documents</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {documents.map((doc) => (
                    <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener" className="rounded-lg border p-3 hover:border-primary/30 transition-colors">
                      {doc.file_type === "image" ? (
                        <img src={doc.file_url} alt={doc.name} className="h-20 w-full rounded object-cover mb-2" />
                      ) : (
                        <div className="h-20 w-full rounded bg-muted flex items-center justify-center mb-2">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-xs truncate">{doc.name}</p>
                    </a>
                  ))}
                </div>
              )}
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

        {/* NEW: Interventions timeline */}
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
                  {/* Timeline line */}
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-4">
                    {interventions.map((i) => {
                      const duration = i.date_fin && i.date_debut
                        ? Math.round((new Date(i.date_fin).getTime() - new Date(i.date_debut).getTime()) / 60000)
                        : null;
                      return (
                        <div key={i.id} className="relative pl-8">
                          {/* Timeline dot */}
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
                            {/* PDR used */}
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
                      <TableRow key={p.id}>
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
      </Tabs>
    </div>
  );
}
