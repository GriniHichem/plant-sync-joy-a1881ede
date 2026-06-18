import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInventoryCampaigns } from "@/hooks/useInventoryCampaigns";
import { useInventoryPermissions } from "@/hooks/useInventoryPermissions";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", cls: "bg-primary/15 text-primary" },
  arbitrage: { label: "Arbitrage", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  cloturee: { label: "Clôturée", cls: "bg-green-500/15 text-green-700 dark:text-green-300" },
  annulee: { label: "Annulée", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

export default function InventoryCampaignsList() {
  const { campaigns, loading } = useInventoryCampaigns();
  const { canManage } = useInventoryPermissions();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/inventaire")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Campagnes d'inventaire</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            data={campaigns as any[]}
            columns={[
              { key: "code", label: "Code" },
              { key: "label", label: "Libellé" },
              { key: "status", label: "Statut", format: (v) => STATUS[v]?.label || v || "" },
              { key: "date_debut", label: "Début" },
              { key: "date_fin_prevue", label: "Fin prévue" },
            ]}
            filename="campagnes_inventaire"
          />
          {canManage && (
            <Button asChild><Link to="/inventaire/campagnes/nouvelle"><Plus className="h-4 w-4 mr-1" />Nouvelle</Link></Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement…</div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucune campagne.</div>
          ) : (
            <ul className="divide-y">
              {campaigns.map((c) => {
                const s = STATUS[c.status];
                return (
                  <li key={c.id} className="px-4 py-3 hover:bg-muted/30">
                    <Link to={`/inventaire/campagnes/${c.id}`} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {c.label}
                          <Badge variant="outline" className="text-[10px] shrink-0">{c.campaign_type === "investissement" ? "Investissement" : "PDR"}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-mono">{c.code ?? "—"}</span>
                          {c.date_debut && <> · Début {c.date_debut}</>}
                          {c.date_fin_prevue && <> · Fin prévue {c.date_fin_prevue}</>}
                        </div>
                      </div>
                      <Badge className={s?.cls + " border-0"}>{s?.label ?? c.status}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
