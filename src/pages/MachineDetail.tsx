import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { ArrowLeft, Edit, FileText, Package, Wrench, CalendarCheck, Upload, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [machine, setMachine] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [pdrList, setPdrList] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [mRes, tRes, pdrRes, plansRes, docsRes] = await Promise.all([
        supabase.from("machines").select("*, machine_families(name)").eq("id", id).single(),
        supabase.from("tickets").select("*").eq("machine_id", id).order("created_at", { ascending: false }),
        supabase.from("machine_pdr").select("*, pdr(*)").eq("machine_id", id),
        supabase.from("preventive_plans").select("*").eq("machine_id", id),
        supabase.from("machine_documents").select("*").eq("machine_id", id).order("created_at", { ascending: false }),
      ]);
      setMachine(mRes.data);
      setTickets(tRes.data || []);
      setPdrList(pdrRes.data || []);
      setPlans(plansRes.data || []);
      setDocuments(docsRes.data || []);
      setPlans(plansRes.data || []);
    };
    load();
  }, [id]);

  if (!machine) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

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
        <Button variant="outline" onClick={() => navigate(`/machines/${id}/edit`)} className="h-12 px-6">
          <Edit className="h-4 w-4 mr-2" /> Modifier
        </Button>
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
          <TabsTrigger value="tickets" className="h-9">
            <Wrench className="h-3.5 w-3.5 mr-1" /> Interventions
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
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucune PDR liée
                      </TableCell>
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

        <TabsContent value="tickets">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucun ticket
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((t) => (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tickets/${t.id}`)}>
                        <TableCell className="font-mono font-medium">{t.numero}</TableCell>
                        <TableCell><StatusBadge type="priority" value={t.priorite} /></TableCell>
                        <TableCell><StatusBadge type="ticket" value={t.statut} /></TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {new Date(t.heure_declaration).toLocaleDateString("fr-FR")}
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
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Aucun plan préventif
                      </TableCell>
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
