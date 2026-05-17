import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowDown,
  ArrowUp,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  History,
  RotateCcw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";

type SortField = "date" | "machine" | "duration";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;
const ANY = "__any__";

interface InterventionRow {
  id: string;
  date_debut: string | null;
  date_fin: string | null;
  statut: string | null;
  description: string | null;
  technicien_id: string | null;
  ticket_id: string;
  ticket: {
    id: string;
    numero: string | null;
    description: string | null;
    statut: string | null;
    machine_id: string | null;
    ligne_id: string | null;
    shift_id: string | null;
    temps_arret_minutes: number | null;
    temps_intervention_minutes: number | null;
    machines: { id: string; code: string | null; designation: string | null } | null;
  } | null;
}

function durationMin(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!isFinite(a) || !isFinite(b) || b <= a) return null;
  return Math.round((b - a) / 60000);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: fr });
}

const STATUS_STYLES: Record<string, string> = {
  ouvert: "bg-destructive/15 text-destructive border-destructive/30",
  pris_en_charge: "bg-info/15 text-info border-info/30",
  en_cours: "bg-info/15 text-info border-info/30",
  resolu: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  ferme: "bg-muted text-muted-foreground border-border",
  termine: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

export default function InterventionHistory() {
  const navigate = useNavigate();

  // Filter options
  const [lines, setLines] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterShift, setFilterShift] = useState(ANY);
  const [filterMachine, setFilterMachine] = useState(ANY);
  const [filterLine, setFilterLine] = useState(ANY);
  const [filterTicket, setFilterTicket] = useState(ANY);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Sort
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Data
  const [rows, setRows] = useState<InterventionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Audit drawer
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditFor, setAuditFor] = useState<InterventionRow | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Load filter options once
  useEffect(() => {
    (async () => {
      const [l, m, s, t, p] = await Promise.all([
        supabase.from("production_lines").select("id, code, designation").eq("is_active", true).order("code"),
        supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code"),
        supabase
          .from("shifts")
          .select("id, date_shift, shift_type, line_id")
          .order("date_shift", { ascending: false })
          .limit(200),
        supabase.from("tickets").select("id, numero").order("created_at", { ascending: false }).limit(5000),
        supabase.from("profiles").select("user_id, first_name, last_name"),
      ]);
      setLines(l.data || []);
      setMachines(m.data || []);
      setShifts(s.data || []);
      setTickets(t.data || []);
      setProfiles(p.data || []);
    })();
  }, []);

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach((p) => {
      m[p.user_id] = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—";
    });
    return m;
  }, [profiles]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, filterShift, filterMachine, filterLine, filterTicket, dateFrom, dateTo, sortField, sortDir]);

  // Load interventions with server-side pagination + filters + sort
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("interventions")
        .select(
          `id, date_debut, date_fin, statut, description, technicien_id, ticket_id,
           ticket:tickets!inner(
             id, numero, description, statut, machine_id, ligne_id, shift_id,
             temps_arret_minutes, temps_intervention_minutes,
             machines(id, code, designation)
           )`,
          { count: "exact" },
        );

      // Sorting
      const ascending = sortDir === "asc";
      if (sortField === "date") {
        q = q.order("date_debut", { ascending, nullsFirst: false });
      } else if (sortField === "duration") {
        // Sort by ticket.temps_intervention_minutes (foreign table column)
        q = q.order("temps_intervention_minutes", {
          ascending,
          nullsFirst: false,
          foreignTable: "ticket",
        });
      } else if (sortField === "machine") {
        // Sort by machine code via the joined machines relation
        q = q.order("code", { ascending, nullsFirst: false, foreignTable: "ticket.machines" });
      }

      if (filterTicket !== ANY) q = q.eq("ticket_id", filterTicket);
      if (filterShift !== ANY) q = q.eq("ticket.shift_id", filterShift);
      if (filterMachine !== ANY) q = q.eq("ticket.machine_id", filterMachine);
      if (filterLine !== ANY) q = q.eq("ticket.ligne_id", filterLine);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        q = q.gte("date_debut", from.toISOString());
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        q = q.lte("date_debut", to.toISOString());
      }
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`description.ilike.${s},ticket.numero.ilike.${s}`);
      }

      const fromIdx = page * PAGE_SIZE;
      const toIdx = fromIdx + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(fromIdx, toIdx);
      if (cancelled) return;
      if (error) {
        console.error("[InterventionHistory] load error", error);
        setRows([]);
        setTotal(0);
      } else {
        setRows((data ?? []) as any);
        setTotal(count ?? 0);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page, search, filterShift, filterMachine, filterLine, filterTicket, dateFrom, dateTo, sortField, sortDir]);

  const lineMap = useMemo(() => {
    const m: Record<string, string> = {};
    lines.forEach((l) => (m[l.id] = `${l.code} — ${l.designation}`));
    return m;
  }, [lines]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    search.trim() !== "" ||
    filterShift !== ANY ||
    filterMachine !== ANY ||
    filterLine !== ANY ||
    filterTicket !== ANY ||
    !!dateFrom ||
    !!dateTo ||
    sortField !== "date" ||
    sortDir !== "desc";

  function resetFilters() {
    setSearch("");
    setFilterShift(ANY);
    setFilterMachine(ANY);
    setFilterLine(ANY);
    setFilterTicket(ANY);
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortField("date");
    setSortDir("desc");
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "machine" ? "asc" : "desc");
    }
  }

  async function openAudit(row: InterventionRow) {
    setAuditFor(row);
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditLogs([]);
    // Load audit_logs for this intervention + its parent ticket (chronological)
    const ids = [row.id];
    if (row.ticket?.id) ids.push(row.ticket.id);
    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        "id, created_at, action, action_label, action_type, description, user_full_name, user_email, severity, status, entity_type, entity_label, entity_code, changed_fields, old_values, new_values, module",
      )
      .in("entity_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) console.error("[InterventionHistory] audit load", error);
    setAuditLogs(data ?? []);
    setAuditLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" /> Historique des interventions
          </h1>
          <p className="text-muted-foreground text-sm">
            {loading ? "Chargement…" : `${total} intervention(s) — page ${page + 1} / ${totalPages}`}
          </p>
        </div>
        <ExportCsvButton
          data={rows}
          columns={[
            { key: "date_debut", label: "Début" },
            { key: "date_fin", label: "Fin" },
            { key: "statut", label: "Statut" },
            { key: "description", label: "Description" },
            { key: "ticket.numero", label: "Ticket" },
            { key: "ticket.machines.code", label: "Machine code" },
            { key: "ticket.machines.designation", label: "Machine" },
            { key: "ticket.temps_arret_minutes", label: "Temps arrêt (min)" },
            { key: "ticket.temps_intervention_minutes", label: "Temps intervention (min)" },
          ]}
          filename="interventions_historique"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtres</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (n° ticket, description)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={filterShift} onValueChange={setFilterShift}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Shift" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Tous les shifts</SelectItem>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {format(new Date(s.date_shift), "dd/MM", { locale: fr })} · {s.shift_type}
                    {lineMap[s.line_id] ? ` · ${lineMap[s.line_id]}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterLine} onValueChange={setFilterLine}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Ligne" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Toutes les lignes</SelectItem>
                {lines.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.code} — {l.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterMachine} onValueChange={setFilterMachine}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Machine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Toutes les machines</SelectItem>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTicket} onValueChange={setFilterTicket}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Ticket" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Tous les tickets</SelectItem>
                {tickets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.numero}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("h-9 justify-start text-left font-normal text-xs", !dateFrom && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: fr }) : "Du"}
                  {dateFrom && (
                    <X
                      className="ml-auto h-3 w-3 hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  disabled={(d) => (dateTo ? d > dateTo : false)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("h-9 justify-start text-left font-normal text-xs", !dateTo && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: fr }) : "Au"}
                  {dateTo && (
                    <X
                      className="ml-auto h-3 w-3 hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); setDateTo(undefined); }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  disabled={(d) => (dateFrom ? d < dateFrom : false)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Sort + reset row */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs text-muted-foreground mr-1">Trier par :</span>
            {([
              { f: "date" as const, label: "Date" },
              { f: "machine" as const, label: "Machine" },
              { f: "duration" as const, label: "Temps d'intervention" },
            ]).map(({ f, label }) => {
              const active = sortField === f;
              return (
                <Button
                  key={f}
                  variant={active ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => toggleSort(f)}
                >
                  {label}
                  {active && (sortDir === "asc"
                    ? <ArrowUp className="ml-1 h-3 w-3" />
                    : <ArrowDown className="ml-1 h-3 w-3" />)}
                </Button>
              );
            })}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-3 text-muted-foreground ml-auto">
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune intervention trouvée pour ces filtres.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const dur = r.ticket?.temps_intervention_minutes ?? durationMin(r.date_debut, r.date_fin);
            const dt = r.ticket?.temps_arret_minutes;
            const status = r.statut || r.ticket?.statut || "—";
            return (
              <Card key={r.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{r.ticket?.numero ?? "—"}</span>
                          <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[status] ?? "")}>
                            {status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        {(r.description || r.ticket?.description) && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {r.description || r.ticket?.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          {r.ticket?.machines && (
                            <span className="font-mono">
                              {r.ticket.machines.code} — {r.ticket.machines.designation}
                            </span>
                          )}
                          {r.ticket?.ligne_id && lineMap[r.ticket.ligne_id] && (
                            <span>Ligne: {lineMap[r.ticket.ligne_id]}</span>
                          )}
                          {r.technicien_id && (
                            <span>Par: <span className="font-medium text-foreground">{profileMap[r.technicien_id] ?? "—"}</span></span>
                          )}
                          {dur != null && <span className="tabular-nums">⏱ {dur} min</span>}
                          {dt != null && dt > 0 && <span className="tabular-nums">⏸ arrêt {dt} min</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-2">
                      <div>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {r.date_debut ? format(new Date(r.date_debut), "dd/MM/yyyy", { locale: fr }) : "—"}
                        </p>
                        <p className="text-[10px] tabular-nums text-muted-foreground">
                          {r.date_debut ? format(new Date(r.date_debut), "HH:mm", { locale: fr }) : ""}
                        </p>
                      </div>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openAudit(r)}>
                          <History className="h-3.5 w-3.5 mr-1" /> Audit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => navigate(`/tickets/${r.ticket_id}`)}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ticket
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              Page {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Suivant <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Audit drawer */}
      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Journal d'audit — {auditFor?.ticket?.numero ?? "Intervention"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {auditLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun événement audit pour cette intervention.</p>
            ) : (
              auditLogs.map((log) => (
                <Card key={log.id} className="border-l-4 border-l-primary/40">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium">{log.action_label || log.action}</span>
                      <Badge variant="outline" className="text-[10px]">{log.severity || "info"}</Badge>
                    </div>
                    {log.description && (
                      <p className="text-xs text-muted-foreground">{log.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums flex-wrap">
                      <span>{fmtDate(log.created_at)}</span>
                      {log.user_full_name && <span>· {log.user_full_name}</span>}
                      {log.module && <span>· {log.module}</span>}
                      {log.status && <span>· {log.status}</span>}
                    </div>
                    {log.changed_fields && Array.isArray(log.changed_fields) && log.changed_fields.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {log.changed_fields.map((f: string) => (
                          <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
