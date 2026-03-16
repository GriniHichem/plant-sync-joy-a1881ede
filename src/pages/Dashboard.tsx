import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/gmao/KpiCard";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, Cog, CalendarCheck, Wrench, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [preventivePlans, setPreventivePlans] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const [ticketsRes, machinesRes, plansRes] = await Promise.all([
        supabase.from("tickets").select("*, machines(designation, code)").order("created_at", { ascending: false }).limit(10),
        supabase.from("machines").select("*").eq("is_active", true),
        supabase.from("preventive_plans").select("*, machines(designation, code)").eq("is_active", true).order("prochaine_echeance", { ascending: true }).limit(5),
      ]);
      setTickets(ticketsRes.data || []);
      setMachines(machinesRes.data || []);
      setPreventivePlans(plansRes.data || []);
    };
    loadData();
  }, []);

  const openTickets = tickets.filter((t) => t.statut !== "cloture" && t.statut !== "resolu").length;
  const machinesDown = machines.filter((m) => m.statut === "arret").length;
  const inMaintenance = machines.filter((m) => m.statut === "maintenance").length;

  // Calculate average MTTR from resolved/closed tickets
  const resolvedTickets = tickets.filter((t) => t.temps_intervention_minutes);
  const avgMttr = resolvedTickets.length > 0
    ? Math.round(resolvedTickets.reduce((sum, t) => sum + (t.temps_intervention_minutes || 0), 0) / resolvedTickets.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard GMAO</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la maintenance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Tickets ouverts"
          value={openTickets}
          icon={AlertTriangle}
          subtitle={`${tickets.length} total`}
        />
        <KpiCard
          title="MTTR moyen"
          value={avgMttr ? `${avgMttr} min` : "—"}
          icon={Clock}
          subtitle="Temps moyen de réparation"
        />
        <KpiCard
          title="Machines en arrêt"
          value={machinesDown}
          icon={Cog}
          subtitle={`${inMaintenance} en maintenance`}
          trend={machinesDown > 0 ? "down" : "neutral"}
        />
        <KpiCard
          title="Parc machines"
          value={machines.length}
          icon={TrendingUp}
          subtitle="Actives"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent tickets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Tickets récents
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun ticket</p>
            ) : (
              <div className="space-y-2">
                {tickets.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.numero}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.machines?.designation || "Machine inconnue"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge type="priority" value={t.priorite} />
                      <StatusBadge type="ticket" value={t.statut} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming preventive maintenance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Préventif à venir
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {preventivePlans.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun plan préventif</p>
            ) : (
              <div className="space-y-2">
                {preventivePlans.map((p) => {
                  const isOverdue = p.prochaine_echeance && new Date(p.prochaine_echeance) < new Date();
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${isOverdue ? "border-destructive/30 bg-destructive/5" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.machines?.designation}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-medium tabular-nums ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                          {p.prochaine_echeance
                            ? new Date(p.prochaine_echeance).toLocaleDateString("fr-FR")
                            : "Non planifié"}
                        </p>
                        {isOverdue && <p className="text-[10px] text-destructive font-medium">EN RETARD</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Machines in downtime */}
      {machinesDown > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-destructive" />
              Machines en arrêt
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {machines.filter((m) => m.statut === "arret").map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/machines/${m.id}`)}
                  className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                >
                  <p className="text-sm font-medium">{m.code}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.designation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
