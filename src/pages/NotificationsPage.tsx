import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCheck, Settings, ChevronLeft, ChevronRight, Check, Archive, ExternalLink } from "lucide-react";
import { useNotifications, type NotificationFilters, type NotificationRow } from "@/hooks/useNotifications";
import { NotificationKpiCards, type NotifKpis } from "@/components/notifications/NotificationKpiCards";
import { NotificationFiltersBar } from "@/components/notifications/NotificationFilters";
import { NotificationDetailSheet } from "@/components/notifications/NotificationDetailSheet";
import { markAllNotificationsRead, markNotificationRead, archiveNotification, SEVERITY_BADGE_CLASS } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const DEFAULT_FILTERS: NotificationFilters = { status: "all" };

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user, roles, hasRole } = useAuth();
  const [filters, setFilters] = useState<NotificationFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<NotificationRow | null>(null);
  const { rows, total, loading, pageSize, refetch } = useNotifications(filters, page);
  const [kpis, setKpis] = useState<NotifKpis>({
    total: 0, unread: 0, critical: 0, today: 0, pdr: 0, maintenance: 0, production: 0, security: 0,
  });

  const canConfigure = hasRole("admin") || hasRole("responsable_si") || hasRole("resp_maintenance") || hasRole("resp_production");

  useEffect(() => { setPage(0); }, [filters]);

  // Fetch KPIs
  useEffect(() => {
    void (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const baseHead = () => supabase.from("notifications").select("id", { count: "exact", head: true });
      const [
        { count: total },
        { count: unread },
        { count: critical },
        { count: todayCount },
        { count: pdrCount },
        { count: maintCount },
        { count: prodCount },
        { count: secCount },
      ] = await Promise.all([
        baseHead(),
        baseHead().eq("status", "unread"),
        baseHead().eq("severity", "critical"),
        baseHead().gte("created_at", todayIso),
        baseHead().in("module", ["pdr", "pdr_stock"]),
        baseHead().in("module", ["machines", "equipements", "organes", "tickets", "interventions", "preventif", "lignes"]),
        baseHead().in("module", ["gpao", "of", "produits", "articles", "recettes", "consommations", "arrets"]),
        baseHead().in("module", ["auth", "users", "roles", "permissions", "audit"]),
      ]);
      setKpis({
        total: total ?? 0, unread: unread ?? 0, critical: critical ?? 0, today: todayCount ?? 0,
        pdr: pdrCount ?? 0, maintenance: maintCount ?? 0, production: prodCount ?? 0, security: secCount ?? 0,
      });
    })();
  }, [rows]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id, roles as string[]);
    await refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Centre des alertes et événements importants</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleMarkAll}>
            <CheckCheck size={14} />
            Tout marquer lu
          </Button>
          {canConfigure && (
            <Button size="sm" onClick={() => navigate("/parametres/notifications")}>
              <Settings size={14} />
              Configurer les règles
            </Button>
          )}
        </div>
      </div>

      <NotificationKpiCards kpis={kpis} />
      <NotificationFiltersBar filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Date</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead className="w-[120px]">Module</TableHead>
              <TableHead className="w-[150px]">Entité</TableHead>
              <TableHead className="w-[90px]">Sévérité</TableHead>
              <TableHead className="w-[80px]">Statut</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                  Aucune notification
                </TableCell>
              </TableRow>
            ) : (
              rows.map((n) => (
                <TableRow
                  key={n.id}
                  className={cn("cursor-pointer", n.status === "unread" && "bg-primary/5")}
                  onClick={() => setSelected(n)}
                >
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{n.title}</div>
                    {n.message && <div className="text-xs text-muted-foreground line-clamp-1">{n.message}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{n.module}</Badge></TableCell>
                  <TableCell className="text-xs">{n.entity_code || n.entity_label || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", SEVERITY_BADGE_CLASS[n.severity])}>
                      {n.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={n.status === "unread" ? "default" : "outline"} className="text-[10px]">
                      {n.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {n.status === "unread" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await markNotificationRead(n.id); refetch(); }}>
                          <Check size={13} />
                        </Button>
                      )}
                      {n.status !== "archived" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await archiveNotification(n.id); refetch(); }}>
                          <Archive size={13} />
                        </Button>
                      )}
                      {n.action_url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(n.action_url!)}>
                          <ExternalLink size={13} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between p-3 border-t">
          <span className="text-xs text-muted-foreground">
            {total} notification{total > 1 ? "s" : ""} · page {page + 1} / {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>

      <NotificationDetailSheet
        notification={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onRefresh={refetch}
      />
    </div>
  );
}
