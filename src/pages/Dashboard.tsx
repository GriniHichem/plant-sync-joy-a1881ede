import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, Cog, CalendarCheck, Wrench, TrendingUp, Package, ShieldAlert, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter";
import { KpiCardComparison } from "@/components/analytics/KpiCardComparison";
import { useDateFilter, filterByDateRange } from "@/hooks/useDateFilter";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [preventivePlans, setPreventivePlans] = useState<any[]>([]);
  const [pdrList, setPdrList] = useState<any[]>([]);
  const [prevExecutions, setPrevExecutions] = useState<any[]>([]);
  const navigate = useNavWithFrom();
  const df = useDateFilter("this_month");

  useEffect(() => {
    const loadData = async () => {
      const [ticketsRes, machinesRes, plansRes, pdrRes, execRes] = await Promise.all([
        supabase.from("tickets").select("*, machines(designation, code)").order("created_at", { ascending: false }),
        supabase.from("machines").select("*").eq("is_active", true),
        supabase.from("preventive_plans").select("*, machines(designation, code)").eq("is_active", true).order("prochaine_echeance", { ascending: true }),
        supabase.from("pdr").select("*, pdr_families(name)").eq("is_active", true),
        supabase.from("preventive_executions").select("*").order("date_execution", { ascending: false }),
      ]);
      setTickets(ticketsRes.data || []);
      setMachines(machinesRes.data || []);
      setPreventivePlans(plansRes.data || []);
      setPdrList(pdrRes.data || []);
      setPrevExecutions(execRes.data || []);
    };
    loadData();
  }, []);

  const fTickets = useMemo(() => filterByDateRange(tickets, df.range, (t) => t.heure_declaration || t.created_at), [tickets, df.range]);
  const cTickets = useMemo(() => df.compareRange ? filterByDateRange(tickets, df.compareRange, (t) => t.heure_declaration || t.created_at) : [], [tickets, df.compareRange]);
  const fExecs = useMemo(() => filterByDateRange(prevExecutions, df.range, (e) => e.date_execution), [prevExecutions, df.range]);
  const cExecs = useMemo(() => df.compareRange ? filterByDateRange(prevExecutions, df.compareRange, (e) => e.date_execution) : [], [prevExecutions, df.compareRange]);

  const openTickets = fTickets.filter((t) => t.statut !== "cloture" && t.statut !== "resolu").length;
  const prevOpen = cTickets.filter((t) => t.statut !== "cloture" && t.statut !== "resolu").length;

  const machinesDown = machines.filter((m) => m.statut === "arret").length;
  const inMaintenance = machines.filter((m) => m.statut === "maintenance").length;

  const resolved = fTickets.filter((t) => t.temps_intervention_minutes);
  const avgMttr = resolved.length > 0 ? Math.round(resolved.reduce((s, t) => s + t.temps_intervention_minutes, 0) / resolved.length) : 0;
  const prevResolved = cTickets.filter((t) => t.temps_intervention_minutes);
  const prevMttr = prevResolved.length > 0 ? Math.round(prevResolved.reduce((s, t) => s + t.temps_intervention_minutes, 0) / prevResolved.length) : 0;

  // PDR KPIs
  const pdrRupture = pdrList.filter((p) => p.stock_actuel === 0).length;
  const pdrCritique = pdrList.filter((p) => p.stock_actuel > 0 && p.stock_actuel <= p.stock_min).length;
  const pdrSecurite = pdrList.filter((p) => p.stock_actuel > p.stock_min && p.stock_actuel <= p.stock_securite).length;
  const pdrCommande = pdrList.filter((p) => p.stock_actuel <= p.point_commande && p.stock_actuel > 0).length;
  const valeurStock = pdrList.reduce((s, p) => s + (p.stock_actuel * (p.pmp || 0)), 0);
  const pdrStrategiques = pdrList.filter((p) => p.statut_pdr === "strategique").length;

  // Preventive KPIs
  const now = new Date();
  const plansValides = preventivePlans.filter((p) => p.statut_plan === "valide");
  const plansBrouillon = preventivePlans.filter((p) => p.statut_plan === "brouillon");
  const plansEnRetard = plansValides.filter((p) => p.prochaine_echeance && new Date(p.prochaine_echeance) < now);
  const execCount = fExecs.length;
  const prevExecCount = cExecs.length;
  const tauxExec = plansValides.length > 0 ? Math.round((execCount / plansValides.length) * 100) : 0;

  // Top 5 plans à venir (non en retard)
  const upcomingPlans = plansValides
    .filter((p) => p.prochaine_echeance && new Date(p.prochaine_echeance) >= now)
    .slice(0, 5);

  // PDR en alerte (rupture + critique, top 5)
  const pdrAlerts = pdrList
    .filter((p) => p.stock_actuel <= p.stock_min)
    .sort((a, b) => a.stock_actuel - b.stock_actuel)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard GMAO</h1>
          <p className="text-muted-foreground text-sm">Vue d'ensemble de la maintenance</p>
        </div>
        <DateRangeFilter {...df} />
      </div>

      {/* Row 1: Tickets & Machines */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCardComparison title="Tickets ouverts" value={openTickets} icon={AlertTriangle}
          subtitle={`${fTickets.length} total`} currentNumeric={openTickets} previousValue={df.compareEnabled ? prevOpen : undefined} invertTrend />
        <KpiCardComparison title="MTTR moyen" value={avgMttr ? `${avgMttr} min` : "—"} icon={Clock}
          subtitle="Temps moyen de réparation" currentNumeric={avgMttr} previousValue={df.compareEnabled ? prevMttr : undefined} unit=" min" invertTrend />
        <KpiCardComparison title="Machines en arrêt" value={machinesDown} icon={Cog}
          subtitle={`${inMaintenance} en maintenance`} />
        <KpiCardComparison title="Parc machines" value={machines.length} icon={TrendingUp} subtitle="Actives" />
      </div>

      {/* Row 2: PDR & Préventif KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCardComparison title="PDR en rupture" value={pdrRupture} icon={ShieldAlert}
          subtitle={`${pdrCritique} en stock critique`} />
        <KpiCardComparison title="PDR à commander" value={pdrCommande} icon={Package}
          subtitle={`${pdrStrategiques} stratégique(s)`} />
        <KpiCardComparison title="Valeur stock PDR" value={`${Math.round(valeurStock).toLocaleString("fr-FR")} DA`} icon={BarChart3}
          subtitle={`${pdrList.length} références`} />
        <KpiCardComparison title="Plans en retard" value={plansEnRetard.length} icon={CalendarCheck}
          subtitle={`${plansBrouillon.length} brouillon(s)`} />
        <KpiCardComparison title="Exécutions préventives" value={execCount} icon={Wrench}
          subtitle={`Taux: ${tauxExec}%`} currentNumeric={execCount} previousValue={df.compareEnabled ? prevExecCount : undefined} />
        <KpiCardComparison title="Plans actifs" value={plansValides.length} icon={CalendarCheck}
          subtitle={`${preventivePlans.length} total`} />
      </div>

      {/* Row 3: Lists */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Tickets récents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Tickets récents
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {fTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun ticket</p>
            ) : (
              <div className="space-y-2">
                {fTickets.slice(0, 5).map((t) => (
                  <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.numero}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.machines?.designation || "Machine inconnue"}</p>
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

        {/* Préventif à venir / en retard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Préventif
              {plansEnRetard.length > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{plansEnRetard.length} retard</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Plans en retard */}
            {plansEnRetard.length > 0 && (
              <div className="space-y-2 mb-3">
                {plansEnRetard.slice(0, 3).map((p) => (
                  <div key={p.id} onClick={() => navigate(`/preventif/${p.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.machines?.designation}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-destructive font-medium tabular-nums">
                        {p.prochaine_echeance ? new Date(p.prochaine_echeance).toLocaleDateString("fr-FR") : "—"}
                      </p>
                      <p className="text-[10px] text-destructive font-bold">EN RETARD</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Plans à venir */}
            {upcomingPlans.length === 0 && plansEnRetard.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun plan préventif</p>
            ) : (
              <div className="space-y-2">
                {upcomingPlans.map((p) => (
                  <div key={p.id} onClick={() => navigate(`/preventif/${p.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.machines?.designation}</p>
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {p.prochaine_echeance ? new Date(p.prochaine_echeance).toLocaleDateString("fr-FR") : "Non planifié"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PDR Alertes stock */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-warning" />
              Alertes stock PDR
              {(pdrRupture + pdrCritique) > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{pdrRupture + pdrCritique}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {pdrAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Stock OK — aucune alerte</p>
            ) : (
              <div className="space-y-2">
                {pdrAlerts.map((p) => {
                  const isRupture = p.stock_actuel === 0;
                  const pct = p.stock_min > 0 ? Math.min(100, Math.round((p.stock_actuel / p.stock_min) * 100)) : 0;
                  return (
                    <div key={p.id} onClick={() => navigate(`/pdr/${p.id}`)}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${isRupture ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"}`}>
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate font-mono">{p.reference}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.designation}</p>
                        </div>
                        <Badge variant={isRupture ? "destructive" : "outline"} className="text-[10px] shrink-0">
                          {isRupture ? "RUPTURE" : "CRITIQUE"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs tabular-nums font-medium text-muted-foreground">
                          {p.stock_actuel}/{p.stock_min}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                <div key={m.id} onClick={() => navigate(`/machines/${m.id}`)}
                  className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors">
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
