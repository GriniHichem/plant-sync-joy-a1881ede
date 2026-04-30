import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Lock, Users } from "lucide-react";
import { useInventoryCampaigns } from "@/hooks/useInventoryCampaigns";
import { useInventoryPermissions } from "@/hooks/useInventoryPermissions";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Brouillon",  cls: "bg-muted text-muted-foreground" },
  en_cours:  { label: "En cours",   cls: "bg-primary/15 text-primary" },
  arbitrage: { label: "Arbitrage",  cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  cloturee:  { label: "Clôturée",   cls: "bg-green-500/15 text-green-700 dark:text-green-300" },
  annulee:   { label: "Annulée",    cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

export default function InventoryDashboard() {
  const { campaigns, loading } = useInventoryCampaigns();
  const { canManage } = useInventoryPermissions();

  const en_cours = campaigns.filter((c) => c.status === "en_cours" || c.status === "arbitrage");
  const cloturees = campaigns.filter((c) => c.status === "cloturee");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Inventaire
          </h1>
          <p className="text-sm text-muted-foreground">
            Campagnes de comptage double (A/B) avec arbitrage (C)
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link to="/inventaire/campagnes/nouvelle"><Plus className="h-4 w-4 mr-1" /> Nouvelle campagne</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Actives</div>
          <div className="text-3xl font-bold">{en_cours.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Clôturées</div>
          <div className="text-3xl font-bold">{cloturees.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
          <div className="text-3xl font-bold">{campaigns.length}</div>
        </CardContent></Card>
      </div>

      <Card>
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Campagnes</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/inventaire/campagnes">Voir tout →</Link>
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement…</div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucune campagne. Créez-en une pour démarrer.</div>
          ) : (
            <ul className="divide-y">
              {campaigns.slice(0, 8).map((c) => {
                const s = STATUS_LABELS[c.status];
                return (
                  <li key={c.id} className="px-4 py-3 hover:bg-muted/30">
                    <Link to={`/inventaire/campagnes/${c.id}`} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.label}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-mono">{c.code ?? "—"}</span>
                          {c.scope_pdr && <span>· PDR</span>}
                          {c.scope_organes && <span>· Organes</span>}
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

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
          <div className="flex items-start gap-2"><Users className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>Les agents A et B comptent indépendamment chaque article de leur périmètre autorisé.</span></div>
          <div className="flex items-start gap-2"><Lock className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>Une fois validée, la quantité saisie est verrouillée. Si A ≠ B, l'arbitre C est sollicité.</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
