import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PackageCheck, PackageX, Clock, Wrench, RotateCcw, Search,
  AlertTriangle, PackagePlus, ArrowDownUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePdrRequestQueue, setItemReady, refuseItem, type PdrRequest, type PdrRequestItem } from "@/hooks/usePdrRequests";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  demandee: { label: "Demandée", cls: "text-amber-600 border-amber-600/40" },
  prete: { label: "Prête", cls: "text-emerald-600 border-emerald-600/40" },
  partielle: { label: "Partielle", cls: "text-sky-600 border-sky-600/40" },
  prise: { label: "Prise", cls: "text-primary border-primary/40" },
  refusee: { label: "Refusée", cls: "text-destructive border-destructive/40" },
  annulee: { label: "Annulée", cls: "text-muted-foreground" },
};

const PRIORITY_RANK: Record<string, number> = { critique: 0, haute: 1, normale: 2, basse: 3 };

const dispoOf = (it: PdrRequestItem) => (it.pdr?.stock_actuel ?? 0) - (it.pdr?.stock_reserve ?? 0);
const isShort = (it: PdrRequestItem) => it.statut === "demandee" && it.quantite_demandee > dispoOf(it);

/**
 * Reusable warehouse-keeper queue: counters, filters, "à traiter" / "historique"
 * tabs, and the prepare/refuse actions. Used both in the GMAO page and the
 * magasin shift kiosk. The validation cycle is untouched (RPC wrappers only).
 */
export function PdrQueuePanel({ readOnly = false }: { readOnly?: boolean }) {
  const { toast } = useToast();
  const { requests: openReqs, loading } = usePdrRequestQueue(false);
  const { requests: closedReqs, loading: loadingClosed } = usePdrRequestQueue(true);

  const [readyItem, setReadyItem] = useState<PdrRequestItem | null>(null);
  const [readyQte, setReadyQte] = useState("1");
  const [refuseTarget, setRefuseTarget] = useState<PdrRequestItem | null>(null);
  const [refuseMotif, setRefuseMotif] = useState("");
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("urgence");

  const filtersActive =
    search.trim() !== "" || statusFilter !== "all" || typeFilter !== "all" || priorityFilter !== "all" || sortBy !== "urgence";

  const resetFilters = () => {
    setSearch(""); setStatusFilter("all"); setTypeFilter("all"); setPriorityFilter("all"); setSortBy("urgence");
  };

  const openReady = (it: PdrRequestItem) => { setReadyItem(it); setReadyQte(String(it.quantite_demandee)); };

  const confirmReady = async () => {
    if (!readyItem) return;
    setBusy(true);
    try {
      await setItemReady(readyItem.id, parseInt(readyQte, 10) || readyItem.quantite_demandee);
      toast({ title: "Pièce marquée prête" });
      setReadyItem(null);
    } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const confirmRefuse = async () => {
    if (!refuseTarget || !refuseMotif.trim()) { toast({ title: "Motif requis", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await refuseItem(refuseTarget.id, refuseMotif.trim());
      toast({ title: "Pièce refusée" });
      setRefuseTarget(null); setRefuseMotif("");
    } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const prepareAll = async (req: PdrRequest) => {
    const lines = (req.items ?? []).filter((it) => it.statut === "demandee" && !isShort(it));
    if (lines.length === 0) return;
    setBusy(true);
    try {
      for (const it of lines) await setItemReady(it.id, it.quantite_demandee);
      toast({ title: `${lines.length} pièce(s) marquée(s) prête(s)` });
    } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const counters = useMemo(() => {
    let toPrepare = 0, ready = 0, short = 0;
    for (const r of openReqs) for (const it of r.items ?? []) {
      if (it.statut === "demandee") { toPrepare++; if (isShort(it)) short++; }
      if (it.statut === "prete") ready++;
    }
    return { toPrepare, ready, short };
  }, [openReqs]);

  const applyFilters = (list: PdrRequest[], openMode: boolean) => {
    const q = search.trim().toLowerCase();
    let out = list.filter((req) => {
      if (typeFilter !== "all" && req.type !== typeFilter) return false;
      if (priorityFilter !== "all" && req.priorite !== priorityFilter) return false;
      if (statusFilter !== "all" && !(req.items ?? []).some((it) => it.statut === statusFilter)) return false;
      if (q) {
        const hay = [
          req.numero, req.tickets?.numero, req.machines?.code, req.machines?.designation,
          ...(req.items ?? []).flatMap((it) => [it.pdr?.reference, it.pdr?.designation]),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      if (openMode && sortBy === "urgence") {
        const pa = PRIORITY_RANK[a.priorite] ?? 9, pb = PRIORITY_RANK[b.priorite] ?? 9;
        if (pa !== pb) return pa - pb;
        return +new Date(a.created_at) - +new Date(b.created_at);
      }
      if (openMode && sortBy === "anciennete") return +new Date(a.created_at) - +new Date(b.created_at);
      return +new Date(b.created_at) - +new Date(a.created_at);
    });
    return out;
  };

  const openFiltered = useMemo(() => applyFilters(openReqs, true), [openReqs, search, statusFilter, typeFilter, priorityFilter, sortBy]);
  const closedOnly = useMemo(() => closedReqs.filter((r) => ["prise", "refusee", "annulee"].includes(r.statut)), [closedReqs]);
  const closedFiltered = useMemo(() => applyFilters(closedOnly, false), [closedOnly, search, statusFilter, typeFilter, priorityFilter]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;

  const actionable = !readOnly;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <CounterCard label="À préparer" value={counters.toPrepare} cls="text-amber-600" icon={<PackagePlus className="h-4 w-4" />} />
        <CounterCard label="Prêtes en attente" value={counters.ready} cls="text-emerald-600" icon={<PackageCheck className="h-4 w-4" />} />
        <CounterCard label="En rupture" value={counters.short} cls="text-destructive" icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher : réf, désignation, n° demande, ticket, machine…"
              className="h-11 pl-9"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="demandee">Demandée</SelectItem>
                <SelectItem value="prete">Prête</SelectItem>
                <SelectItem value="prise">Prise</SelectItem>
                <SelectItem value="refusee">Refusée</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="curative">Curatif</SelectItem>
                <SelectItem value="preventive">Préventif</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Priorité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="critique">Critique</SelectItem>
                <SelectItem value="haute">Haute</SelectItem>
                <SelectItem value="normale">Normale</SelectItem>
                <SelectItem value="basse">Basse</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-11"><ArrowDownUp className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="urgence">Tri : urgence</SelectItem>
                <SelectItem value="anciennete">Tri : ancienneté</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" className="h-9" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Réinitialiser les filtres
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="traiter">
        <TabsList className="grid grid-cols-2 h-11 w-full">
          <TabsTrigger value="traiter" className="text-xs">À traiter ({openFiltered.length})</TabsTrigger>
          <TabsTrigger value="historique" className="text-xs">Historique ({closedFiltered.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="traiter" className="mt-3 space-y-4">
          {openFiltered.length === 0 && <EmptyState text="Aucune demande en cours" />}
          {openFiltered.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              actionable={actionable}
              onReady={openReady}
              onRefuse={setRefuseTarget}
              onPrepareAll={prepareAll}
              busy={busy}
            />
          ))}
        </TabsContent>

        <TabsContent value="historique" className="mt-3 space-y-4">
          {loadingClosed && <div className="p-6 text-center text-muted-foreground text-sm">Chargement…</div>}
          {!loadingClosed && closedFiltered.length === 0 && <EmptyState text="Aucune demande clôturée" />}
          {closedFiltered.map((req) => (
            <RequestCard key={req.id} req={req} actionable={false} busy={busy} />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!readyItem} onOpenChange={(o) => !o && setReadyItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Préparer la pièce</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-mono">{readyItem?.pdr?.reference} — {readyItem?.pdr?.designation}</p>
            <p className="text-xs text-muted-foreground">
              Demandé : <strong>{readyItem?.quantite_demandee}</strong> · Stock disponible : <strong>{readyItem ? dispoOf(readyItem) : 0}</strong>
            </p>
            {readyItem && isShort(readyItem) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Stock insuffisant — préparation partielle possible.
              </p>
            )}
            <div>
              <Label>Quantité préparée</Label>
              <Input type="number" min={1} value={readyQte} onChange={(e) => setReadyQte(e.target.value)} className="h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReadyItem(null)}>Annuler</Button>
            <Button onClick={confirmReady} disabled={busy}>Marquer prête</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refuseTarget} onOpenChange={(o) => !o && setRefuseTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refuser la demande</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-mono">{refuseTarget?.pdr?.reference} — {refuseTarget?.pdr?.designation}</p>
            <div>
              <Label>Motif du refus *</Label>
              <Textarea rows={3} value={refuseMotif} onChange={(e) => setRefuseMotif(e.target.value)} placeholder="Rupture de stock, mauvaise référence…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmRefuse} disabled={busy}>Refuser</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CounterCard({ label, value, cls, icon }: { label: string; value: number; cls: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${cls}`}>{icon}{label}</div>
        <p className={`text-2xl font-bold tabular-nums mt-1 ${cls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function RequestCard({
  req, actionable, onReady, onRefuse, onPrepareAll, busy,
}: {
  req: PdrRequest;
  actionable: boolean;
  onReady?: (it: PdrRequestItem) => void;
  onRefuse?: (it: PdrRequestItem) => void;
  onPrepareAll?: (req: PdrRequest) => void;
  busy: boolean;
}) {
  const pending = (req.items ?? []).filter((it) => it.statut === "demandee");
  const canPrepareAll = actionable && pending.length > 0 && pending.every((it) => !isShort(it));

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b border-border/50">
        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold">{req.numero}</span>
          <Badge variant={req.priorite === "critique" || req.priorite === "haute" ? "destructive" : "secondary"} className="text-[10px]">{req.priorite}</Badge>
          <Badge variant="outline" className="text-[10px] capitalize">{req.type}</Badge>
          {req.tickets && <Badge variant="outline" className="text-[10px] gap-1"><Wrench className="h-3 w-3" />{req.tickets.numero}</Badge>}
          {req.machines && <span className="text-xs text-muted-foreground font-normal">{req.machines.code}</span>}
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground font-normal">
            <Clock className="h-3 w-3" />{new Date(req.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
        </CardTitle>
        {req.commentaire && <p className="text-xs text-muted-foreground mt-1">{req.commentaire}</p>}
        {canPrepareAll && (
          <Button size="sm" className="h-9 mt-2 w-fit" disabled={busy} onClick={() => onPrepareAll?.(req)}>
            <PackageCheck className="h-4 w-4 mr-1.5" /> Tout préparer ({pending.length})
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border/40">
        {(req.items ?? []).map((it) => {
          const dispo = dispoOf(it);
          const b = STATUS_BADGE[it.statut];
          const short = isShort(it);
          return (
            <div key={it.id} className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold truncate">{it.pdr?.reference}</p>
                <p className="text-xs text-muted-foreground truncate">{it.pdr?.designation}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Demandé : <strong>{it.quantite_demandee}</strong> · Stock dispo : <strong className={short ? "text-destructive" : ""}>{dispo}</strong>
                  {it.refused_reason && <span className="text-destructive"> · {it.refused_reason}</span>}
                </p>
              </div>
              {short && (
                <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40 gap-1">
                  <AlertTriangle className="h-3 w-3" /> Rupture
                </Badge>
              )}
              <Badge variant="outline" className={`text-[10px] ${b?.cls ?? ""}`}>{b?.label ?? it.statut}</Badge>
              {actionable && it.statut === "demandee" && (
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-9" onClick={() => onReady?.(it)}>
                    <PackageCheck className="h-4 w-4 mr-1" /> Prête
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 text-destructive" onClick={() => onRefuse?.(it)}>
                    <PackageX className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="border-dashed"><CardContent className="py-16 text-center text-muted-foreground">
      <PackageCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p className="font-medium">{text}</p>
    </CardContent></Card>
  );
}
