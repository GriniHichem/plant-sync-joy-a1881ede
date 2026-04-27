import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";

const arretTypeLabels: Record<string, string> = {
  panne: "Panne",
  changement_serie: "Changement série",
  pause: "Pause",
  nettoyage: "Nettoyage",
  attente_matiere: "Attente matière",
  qualite: "Qualité",
  autre: "Autre",
};

export default function StopsPage() {
  const [stops, setStops] = useState<any[]>([]);
  const navigate = useNavWithFrom();

  useEffect(() => {
    supabase.from("production_stops")
      .select("*, production_lines(code, designation), ordres_fabrication(numero), machines(code, designation)")
      .order("heure_debut", { ascending: false })
      .limit(50)
      .then(({ data }) => setStops(data || []));
  }, []);

  const totalMin = stops.reduce((s, st) => s + (st.duree_minutes || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Suivi des arrêts</h1>
        <p className="text-muted-foreground">
          {stops.length} arrêts — Total: <span className="font-bold tabular-nums text-destructive">{totalMin} min</span>
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>OF</TableHead>
                <TableHead>Ligne</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Ticket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stops.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground"><AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucun arrêt</TableCell></TableRow>
              ) : stops.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{arretTypeLabels[s.type] || s.type}</TableCell>
                  <TableCell className="font-mono">{s.ordres_fabrication?.numero || "—"}</TableCell>
                  <TableCell>{s.production_lines?.designation || "—"}</TableCell>
                  <TableCell>{s.machines?.code || "—"}</TableCell>
                  <TableCell className="tabular-nums">{new Date(s.heure_debut).toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="tabular-nums">{s.heure_fin ? new Date(s.heure_fin).toLocaleString("fr-FR") : <span className="text-warning font-medium">En cours</span>}</TableCell>
                  <TableCell className="tabular-nums font-bold">{s.duree_minutes ? `${s.duree_minutes} min` : "—"}</TableCell>
                  <TableCell>{s.ticket_id ? <span className="text-primary underline cursor-pointer" onClick={() => navigate(`/tickets/${s.ticket_id}`)}>Voir</span> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
