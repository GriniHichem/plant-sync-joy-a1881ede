import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveDialog } from "@/components/responsive/ResponsiveDialog";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lightbulb, User, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaignId?: string | null;
  productId?: string | null;
}

export function OrientationsAdvisorDialog({ open, onOpenChange, campaignId, productId }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["orientations-advisor", campaignId ?? null, productId ?? null],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from("v_reception_orientations" as any)
        .select("id, ticket_id, ticket_numero, ticket_date, produit_nom, campagne_nom, taux_recommande, explication, created_at, author_name, product_id, campaign_id")
        .order("created_at", { ascending: false })
        .limit(30);
      if (campaignId) q = q.eq("campaign_id", campaignId);
      if (productId) q = q.eq("product_id", productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const fmtDT = (v: string) =>
    new Date(v).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

  const avg = rows.length
    ? (rows.reduce((s, r) => s + Number(r.taux_recommande), 0) / rows.length).toFixed(2)
    : null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Orientations récentes
        </span>
      }
      description="30 dernières recommandations pour ce contexte (informatif — vous gardez la décision finale)."
      className="max-w-2xl"
    >
      <div className="space-y-3">
        {avg && (
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Moyenne des {rows.length} avis</span>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">{avg} %</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground italic">
            Aucune orientation trouvée pour ce contexte.
          </div>
        ) : (
          <Accordion type="multiple" className="border rounded-lg divide-y">
            {rows.map((o) => (
              <AccordionItem key={o.id} value={o.id} className="border-0">
                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                  <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <Badge variant="secondary" className="tabular-nums shrink-0">
                      {Number(o.taux_recommande).toFixed(2)} %
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {o.produit_nom ?? "—"}
                        <span className="text-muted-foreground font-normal ml-2 font-mono text-xs">
                          #{o.ticket_numero}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{o.author_name}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDT(o.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 text-sm">
                  {o.explication ? (
                    <div className="whitespace-pre-wrap bg-muted/40 rounded p-2 text-xs">{o.explication}</div>
                  ) : (
                    <div className="text-xs italic text-muted-foreground">Aucune explication fournie.</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </ResponsiveDialog>
  );
}
