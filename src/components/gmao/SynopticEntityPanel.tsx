import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ExternalLink, AlertTriangle, Wrench, Package, Plus, FileText, Component,
} from "lucide-react";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { useIsMobile } from "@/hooks/use-mobile";
import type {
  EntityCounters, EntityKind, MachineRow, EquipementRow, OrganeRow,
  TicketRow, PreventivePlanRow, PdrLinkRow,
} from "@/hooks/useLineSynopticData";

type SelectedEntity =
  | { kind: "machine"; data: MachineRow }
  | { kind: "equipement"; data: EquipementRow }
  | { kind: "organe"; data: OrganeRow };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity: SelectedEntity | null;
  imageUrl?: string;
  counters?: EntityCounters;
  tickets: TicketRow[];
  preventivePlans: PreventivePlanRow[];
  pdrLinks: PdrLinkRow[];
  childOrganes?: OrganeRow[];
  onCreateTicket: (kind: EntityKind, id: string, parentMachineId?: string | null) => void;
  onSelectOrgane?: (org: OrganeRow) => void;
}

const STATUS_LABELS: Record<string, string> = {
  en_marche: "En marche", arret: "En panne", maintenance: "Maintenance",
  en_service: "En service", hors_service: "Hors service", en_maintenance: "En maintenance", reforme: "Réformé",
  en_panne: "En panne",
};

function statusBadge(statut: string) {
  if (["en_marche", "en_service"].includes(statut))
    return <Badge className="bg-green-500 hover:bg-green-500/90 text-white border-0">{STATUS_LABELS[statut] || statut}</Badge>;
  if (["arret", "hors_service", "en_panne"].includes(statut))
    return <Badge variant="destructive">{STATUS_LABELS[statut] || statut}</Badge>;
  if (["maintenance", "en_maintenance"].includes(statut))
    return <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white border-0">{STATUS_LABELS[statut] || statut}</Badge>;
  return <Badge variant="secondary">{STATUS_LABELS[statut] || statut}</Badge>;
}

export function SynopticEntityPanel({
  open, onOpenChange, entity, imageUrl, counters,
  tickets, preventivePlans, pdrLinks, childOrganes,
  onCreateTicket, onSelectOrgane,
}: Props) {
  const nav = useNavWithFrom();
  const isMobile = useIsMobile();
  if (!entity) return null;

  const e = entity.data;
  const kind = entity.kind;
  const detailRoute = kind === "machine" ? `/machines/${e.id}` : kind === "equipement" ? `/equipements/${e.id}` : `/organes/${e.id}`;

  const relevantTickets = tickets.filter((t) =>
    kind === "machine" ? t.machine_id === e.id :
    kind === "equipement" ? t.equipement_id === e.id :
    t.organe_id === e.id
  );
  const relevantPlans = preventivePlans.filter((p) =>
    kind === "machine" ? p.machine_id === e.id :
    kind === "equipement" ? p.equipement_id === e.id :
    p.organe_id === e.id
  );
  const relevantPdr = pdrLinks.filter((l) => l.entity_type === kind && l.entity_id === e.id);
  const now = Date.now();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "w-full h-[92vh] p-0 flex flex-col rounded-t-xl"
            : "w-full sm:max-w-md p-0 flex flex-col"
        }
      >
        <SheetHeader className="p-4 pb-3 border-b">
          <div className="flex items-start gap-3">
            {imageUrl ? (
              <img src={imageUrl} alt={(e as any).designation} className="h-14 w-14 rounded-lg object-cover border bg-muted shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                <Component className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                {kind === "machine" ? "Machine" : kind === "equipement" ? "Équipement" : "Organe"}
              </p>
              <SheetTitle className="font-mono text-base text-primary">{(e as any).code}</SheetTitle>
              <SheetDescription className="text-foreground line-clamp-2 text-sm">{(e as any).designation}</SheetDescription>
              <div className="flex items-center gap-2 mt-1.5">
                {statusBadge((e as any).statut)}
                {(e as any).criticite && (
                  <Badge variant={(e as any).criticite === "A" ? "destructive" : (e as any).criticite === "B" ? "default" : "secondary"} className="text-[10px]">
                    Crit. {(e as any).criticite}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {counters && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-md border p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Tickets</p>
                <p className={`text-lg font-bold ${counters.ticketsOpen > 0 ? "text-destructive" : ""}`}>{counters.ticketsOpen}</p>
              </div>
              <div className="rounded-md border p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Prév. retard</p>
                <p className={`text-lg font-bold ${counters.preventiveOverdue > 0 ? "text-amber-600" : ""}`}>{counters.preventiveOverdue}</p>
              </div>
              <div className="rounded-md border p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">PDR alert.</p>
                <p className={`text-lg font-bold ${counters.pdrRupture + counters.pdrCritical > 0 ? "text-destructive" : ""}`}>
                  {counters.pdrRupture + counters.pdrCritical}
                </p>
              </div>
            </div>
          )}
        </SheetHeader>

        <Tabs defaultValue="resume" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-4 h-9">
            <TabsTrigger value="resume" className="text-xs">Résumé</TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs">
              Tickets {relevantTickets.length > 0 && <span className="ml-1 text-destructive">({relevantTickets.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="prev" className="text-xs">Préventif</TabsTrigger>
            <TabsTrigger value="pdr" className="text-xs">PDR</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              <TabsContent value="resume" className="m-0 space-y-3">
                {kind === "machine" && (
                  <>
                    <InfoRow label="Marque" value={(e as MachineRow).marque || "—"} />
                    <InfoRow label="Modèle" value={(e as MachineRow).modele || "—"} />
                    <InfoRow label="Rôle" value={(e as MachineRow).role_fonctionnel} />
                    <InfoRow label="Impact ligne" value={(e as MachineRow).impact_ligne} />
                    <InfoRow label="Disponibilité PDR" value={(e as MachineRow).disponibilite_pdr} />
                  </>
                )}
                {kind === "equipement" && (
                  <>
                    <InfoRow label="Type" value={(e as EquipementRow).type} />
                    <InfoRow label="Rôle" value={(e as EquipementRow).role_fonctionnel} />
                  </>
                )}
                {kind === "organe" && (
                  <>
                    <InfoRow label="Type" value={(e as OrganeRow).type} />
                    {(e as OrganeRow).machine_id && <InfoRow label="Parent" value="Machine" />}
                    {(e as OrganeRow).equipement_id && <InfoRow label="Parent" value="Équipement" />}
                  </>
                )}

                {childOrganes && childOrganes.length > 0 && (
                  <div>
                    <p className="text-xs uppercase font-medium text-muted-foreground mb-1.5">Organes ({childOrganes.length})</p>
                    <div className="space-y-1">
                      {childOrganes.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => onSelectOrgane?.(o)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded border bg-muted/30 hover:bg-muted text-left text-xs"
                        >
                          <Component className="h-3 w-3 shrink-0" />
                          <span className="font-mono font-semibold">{o.code}</span>
                          <span className="text-muted-foreground truncate flex-1">{o.designation}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tickets" className="m-0 space-y-2">
                {relevantTickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun ticket ouvert.</p>
                ) : relevantTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { onOpenChange(false); nav(`/tickets/${t.id}`); }}
                    className="w-full text-left rounded-md border p-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold">{t.numero}</span>
                      <Badge
                        variant={t.priorite === "critique" || t.priorite === "haute" ? "destructive" : "secondary"}
                        className="text-[9px] h-4"
                      >
                        {t.priorite}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] h-4 ml-auto">{t.statut}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  </button>
                ))}
              </TabsContent>

              <TabsContent value="prev" className="m-0 space-y-2">
                {relevantPlans.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun plan préventif.</p>
                ) : relevantPlans.map((p) => {
                  const overdue = !!p.prochaine_echeance && new Date(p.prochaine_echeance).getTime() < now;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { onOpenChange(false); nav(`/preventif/${p.id}`); }}
                      className="w-full text-left rounded-md border p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className={`h-3.5 w-3.5 ${overdue ? "text-amber-600" : "text-muted-foreground"}`} />
                        <span className="text-xs font-medium truncate">{p.title}</span>
                        {overdue && <Badge className="ml-auto h-4 text-[9px] bg-amber-500 text-white border-0">Retard</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {p.frequence}{p.prochaine_echeance ? ` • Prochaine : ${new Date(p.prochaine_echeance).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </button>
                  );
                })}
              </TabsContent>

              <TabsContent value="pdr" className="m-0 space-y-2">
                {relevantPdr.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucune PDR liée.</p>
                ) : relevantPdr.map((l) => {
                  const rupture = l.pdr && l.pdr.stock_actuel <= 0;
                  const critical = l.pdr && !rupture && l.pdr.stock_actuel <= (l.pdr.stock_securite || l.pdr.stock_min || 0);
                  return (
                    <button
                      key={l.id}
                      onClick={() => { onOpenChange(false); nav(`/pdr/${l.pdr_id}`); }}
                      className="w-full text-left rounded-md border p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Package className={`h-3.5 w-3.5 ${rupture ? "text-destructive" : critical ? "text-amber-600" : "text-muted-foreground"}`} />
                        <span className="font-mono text-xs font-bold">{l.pdr?.reference || "—"}</span>
                        {rupture && <Badge variant="destructive" className="ml-auto h-4 text-[9px]">Rupture</Badge>}
                        {critical && <Badge className="ml-auto h-4 text-[9px] bg-amber-500 text-white border-0">Critique</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{l.pdr?.designation}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        Stock {l.pdr?.stock_actuel ?? 0} / min {l.pdr?.stock_min ?? 0}
                      </p>
                    </button>
                  );
                })}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <div className="border-t p-3 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              onOpenChange(false);
              nav(detailRoute);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-1.5" /> Fiche complète
          </Button>
          <Button
            className="h-11"
            onClick={() => {
              const parentMachine = kind === "organe" ? (e as OrganeRow).machine_id : kind === "equipement" ? (e as EquipementRow).machine_id : null;
              onCreateTicket(kind, e.id, parentMachine);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Créer ticket
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b pb-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium capitalize">{value?.toString().replace(/_/g, " ")}</span>
    </div>
  );
}
