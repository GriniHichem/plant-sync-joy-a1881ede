import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OfStatusBadge } from "./GpaoDashboard";
import { ArrowLeft, Play, CheckCircle, BarChart3, Package, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Progress } from "@/components/ui/progress";

export default function OfDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [of, setOf] = useState<any>(null);
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  const load = async () => {
    if (!id) return;
    const [ofRes, declRes, consRes, stopRes, tickRes] = await Promise.all([
      supabase.from("ordres_fabrication").select("*, products(code, designation, unite), production_lines(code, designation), recipes(name)").eq("id", id).single(),
      supabase.from("production_declarations").select("*").eq("of_id", id).order("heure_production", { ascending: false }),
      supabase.from("consumptions").select("*, articles(code, designation, unite)").eq("of_id", id).order("created_at", { ascending: false }),
      supabase.from("production_stops").select("*, production_lines(designation)").eq("of_id", id).order("heure_debut", { ascending: false }),
      supabase.from("tickets").select("*, machines(code, designation)").eq("of_id", id).order("created_at", { ascending: false }),
    ]);
    setOf(ofRes.data);
    setDeclarations(declRes.data || []);
    setConsumptions(consRes.data || []);
    setStops(stopRes.data || []);
    setTickets(tickRes.data || []);
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

  if (!of) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const progress = of.quantite_prevue > 0 ? Math.round((of.quantite_produite / of.quantite_prevue) * 100) : 0;
  const totalStopMin = stops.reduce((s, st) => s + (st.duree_minutes || 0), 0);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/gpao/of")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{of.numero}</h1>
          <div className="flex items-center gap-2 mt-1">
            <OfStatusBadge value={of.statut} />
            <span className="text-sm text-muted-foreground">{of.products?.designation}</span>
          </div>
        </div>
        {of.statut === "planifie" && (
          <Button onClick={handleStartOf} className="h-12 px-6"><Play className="h-4 w-4 mr-2" /> Démarrer</Button>
        )}
        {of.statut === "en_cours" && (
          <Button onClick={handleFinishOf} variant="outline" className="h-12 px-6"><CheckCircle className="h-4 w-4 mr-2" /> Terminer</Button>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Ligne", of.production_lines?.designation || "—"],
          ["Recette", of.recipes?.name || "—"],
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

      <Tabs defaultValue="declarations" className="space-y-4">
        <TabsList className="h-11">
          <TabsTrigger value="declarations" className="h-9"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Production</TabsTrigger>
          <TabsTrigger value="consumptions" className="h-9"><Package className="h-3.5 w-3.5 mr-1" /> Consommations</TabsTrigger>
          <TabsTrigger value="stops" className="h-9"><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Arrêts</TabsTrigger>
          <TabsTrigger value="tickets" className="h-9">Tickets</TabsTrigger>
        </TabsList>

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

        <TabsContent value="consumptions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
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
      </Tabs>
    </div>
  );
}
