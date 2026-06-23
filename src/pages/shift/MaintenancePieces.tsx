import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, PackagePlus, ListChecks, HandHelping, Boxes, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PdrRequestComposer } from "@/components/pdr/PdrRequestComposer";
import { ConfirmTakeDialog } from "@/components/pdr/ConfirmTakeDialog";
import { usePdrRequestQueue, useMyPdrRequests, confirmItemTaken, cancelPdrRequest, type PdrRequest, type PdrRequestItem } from "@/hooks/usePdrRequests";
import { useMaintenanceHoldings } from "@/hooks/useMaintenanceHoldings";

const ITEM_BADGE: Record<string, { label: string; cls: string }> = {
  demandee: { label: "Demandée", cls: "text-amber-600 border-amber-600/40" },
  prete: { label: "Prête", cls: "text-emerald-600 border-emerald-600/40" },
  prise: { label: "Prise", cls: "text-primary border-primary/40" },
  refusee: { label: "Refusée", cls: "text-destructive border-destructive/40" },
  annulee: { label: "Annulée", cls: "text-muted-foreground" },
};

export default function MaintenancePieces() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const ticketId = params.get("ticket");
  const planId = params.get("plan");
  const machineId = params.get("machine");
  const type = planId ? "preventive" : "curative";

  const { requests: queue } = usePdrRequestQueue();
  const { requests: mine } = useMyPdrRequests();
  const { holdings } = useMaintenanceHoldings();
  const [busy, setBusy] = useState(false);

  const toTake = useMemo(
    () => queue.flatMap((r) => (r.items ?? []).filter((it) => it.statut === "prete").map((it) => ({ req: r, it }))),
    [queue],
  );

  const handleTake = async (itemId: string, qte: number) => {
    setBusy(true);
    try { await confirmItemTaken(itemId, qte); toast({ title: "Prise confirmée — pièce transférée à la maintenance" }); }
    catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleCancel = async (requestId: string) => {
    setBusy(true);
    try { await cancelPdrRequest(requestId); toast({ title: "Demande annulée" }); }
    catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour
      </Button>
      <h1 className="text-xl font-bold">Pièces (PDR)</h1>

      <Tabs defaultValue="demander">
        <TabsList className="grid grid-cols-4 h-11 w-full">
          <TabsTrigger value="demander" className="gap-1 text-xs"><PackagePlus className="h-4 w-4" />Demander</TabsTrigger>
          <TabsTrigger value="prendre" className="gap-1 text-xs">
            <HandHelping className="h-4 w-4" />À prendre
            {toTake.length > 0 && <Badge variant="secondary" className="ml-0.5 text-[10px] px-1 h-4">{toTake.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-1 text-xs">
            <Boxes className="h-4 w-4" />Mon stock
            {holdings.length > 0 && <Badge variant="secondary" className="ml-0.5 text-[10px] px-1 h-4">{holdings.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="mes" className="gap-1 text-xs"><ListChecks className="h-4 w-4" />Mes demandes</TabsTrigger>
        </TabsList>

        <TabsContent value="demander" className="mt-3">
          <Card><CardContent className="p-4">
            <PdrRequestComposer
              type={type as any}
              ticketId={ticketId}
              preventivePlanId={planId}
              machineId={machineId}
            />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="prendre" className="mt-3 space-y-2">
          {toTake.length === 0 && <EmptyState text="Aucune pièce prête à prendre" />}
          {toTake.map(({ req, it }) => (
            <Card key={it.id}><CardContent className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold truncate">{it.pdr?.reference}</p>
                <p className="text-xs text-muted-foreground truncate">{it.pdr?.designation}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{req.numero} · préparé : {it.quantite_preparee ?? it.quantite_demandee}</p>
              </div>
              <Button size="sm" className="h-10" disabled={busy} onClick={() => handleTake(it.id, it.quantite_preparee ?? it.quantite_demandee)}>
                Confirmer la prise
              </Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="stock" className="mt-3 space-y-2">
          {holdings.length === 0 && <EmptyState text="Aucune pièce détenue en stock maintenance" />}
          {holdings.map((h) => (
            <Card key={h.id}><CardContent className="flex items-center gap-3 p-3">
              <Boxes className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold truncate">{h.pdr?.reference}</p>
                <p className="text-xs text-muted-foreground truncate">{h.pdr?.designation}</p>
              </div>
              <Badge variant="outline" className="tabular-nums">x{h.quantite}</Badge>
            </CardContent></Card>
          ))}
          {holdings.length > 0 && (
            <p className="text-xs text-muted-foreground px-1">
              Les pièces détenues sont consommées (ou retournées) automatiquement à la clôture de l'intervention.
            </p>
          )}
        </TabsContent>

        <TabsContent value="mes" className="mt-3 space-y-2">
          {mine.length === 0 && <EmptyState text="Aucune demande" />}
          {mine.map((req) => (
            <Card key={req.id}><CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold">{req.numero}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{req.statut}</Badge>
                <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />{new Date(req.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="space-y-1">
                {(req.items ?? []).map((it) => {
                  const b = ITEM_BADGE[it.statut];
                  return (
                    <div key={it.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono flex-1 truncate">{it.pdr?.reference}</span>
                      <span className="text-muted-foreground tabular-nums">x{it.quantite_demandee}</span>
                      <Badge variant="outline" className={`text-[10px] ${b?.cls ?? ""}`}>{b?.label ?? it.statut}</Badge>
                    </div>
                  );
                })}
              </div>
              {["demandee", "prete", "partielle"].includes(req.statut) && (
                <Button size="sm" variant="ghost" className="h-8 text-destructive" disabled={busy} onClick={() => handleCancel(req.id)}>
                  Annuler la demande
                </Button>
              )}
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground text-sm">{text}</CardContent></Card>
  );
}
