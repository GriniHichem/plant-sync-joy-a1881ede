import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PreventifList() {
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("preventive_plans")
      .select("*, machines(code, designation)")
      .eq("is_active", true)
      .order("prochaine_echeance", { ascending: true })
      .then(({ data }) => setPlans(data || []));
  }, []);

  const overdue = plans.filter((p) => p.prochaine_echeance && new Date(p.prochaine_echeance) < new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Préventive</h1>
          <p className="text-muted-foreground">
            {plans.length} plans actifs
            {overdue.length > 0 && <span className="text-destructive ml-2">• {overdue.length} en retard</span>}
          </p>
        </div>
        <Button className="h-12 px-6">
          <Plus className="h-4 w-4 mr-2" /> Nouveau plan
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Fréquence</TableHead>
                <TableHead>Dernière exécution</TableHead>
                <TableHead>Prochaine échéance</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Aucun plan préventif
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((p) => {
                  const isOverdue = p.prochaine_echeance && new Date(p.prochaine_echeance) < new Date();
                  return (
                    <TableRow key={p.id} className={isOverdue ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>
                        <p className="text-sm">{p.machines?.designation}</p>
                        <p className="text-xs text-muted-foreground">{p.machines?.code}</p>
                      </TableCell>
                      <TableCell className="capitalize">{p.frequence}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {p.derniere_execution ? new Date(p.derniere_execution).toLocaleDateString("fr-FR") : "Jamais"}
                      </TableCell>
                      <TableCell className={`tabular-nums ${isOverdue ? "text-destructive font-bold" : ""}`}>
                        {p.prochaine_echeance ? new Date(p.prochaine_echeance).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell>
                        {isOverdue ? (
                          <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded">EN RETARD</span>
                        ) : (
                          <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">À jour</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
