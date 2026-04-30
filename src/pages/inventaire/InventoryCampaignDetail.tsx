import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Play, Lock, ScanLine, Users, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useInventoryPermissions } from "@/hooks/useInventoryPermissions";

type Campaign = { id: string; code: string | null; label: string; status: string; scope_pdr: boolean; scope_organes: boolean; date_debut: string | null; date_fin_prevue: string | null; };
type Assignment = { id: string; agent_id: string; role: "agent_a" | "agent_b" | "agent_c"; is_active: boolean };
type Target = { id: string; entity_code: string | null; entity_label: string | null; family_id: string | null; qty_systeme: number; current_round: number; status: string };
type Result = { target_id: string; round: number; qty_a: number | null; qty_b: number | null; qty_c: number | null; ecart_ab: number | null; qty_finale: number | null; decision: string };
type Profile = { user_id: string; first_name: string; last_name: string };

export default function InventoryCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canManage } = useInventoryPermissions();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: c }, { data: t }, { data: r }, { data: a }] = await Promise.all([
      supabase.from("inventory_campaigns" as any).select("*").eq("id", id).maybeSingle(),
      supabase.from("inventory_targets" as any).select("*").eq("campaign_id", id).order("entity_code"),
      supabase.from("inventory_results" as any).select("*").eq("campaign_id", id),
      supabase.from("inventory_assignments" as any).select("*").eq("campaign_id", id),
    ]);
    setCampaign((c as any) || null);
    setTargets(((t as any) || []) as Target[]);
    const map: Record<string, Result> = {};
    for (const row of (r || []) as any[]) map[row.target_id] = row;
    setResults(map);
    setAssignments(((a as any) || []) as Assignment[]);

    const ids = Array.from(new Set(((a as any) || []).map((x: any) => x.agent_id as string))) as string[];
    if (ids.length > 0) {
      const { data: p } = await supabase.from("profiles").select("user_id,first_name,last_name").in("user_id", ids);
      const pm: Record<string, Profile> = {};
      for (const row of (p || []) as Profile[]) pm[row.user_id] = row;
      setProfiles(pm);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function openCampaign() {
    const { error } = await supabase.rpc("inv_open_campaign" as any, { p_campaign_id: id });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Campagne ouverte" });
    load();
  }

  async function closeCampaign() {
    const { error } = await supabase.rpc("inv_close_campaign" as any, { p_campaign_id: id });
    if (error) { toast({ title: "Impossible de clôturer", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Campagne clôturée" });
    load();
  }

  if (loading || !campaign) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;

  const ecart = targets.filter((t) => {
    const r = results[t.id]; return r && r.qty_a != null && r.qty_b != null && r.ecart_ab && r.ecart_ab > 0 && r.decision === "en_attente";
  });
  const conformes = targets.filter((t) => t.status === "conforme" || t.status === "cloture");
  const aRecompter = targets.filter((t) => t.status === "a_recompter");

  const fmt = (v: number | null | undefined) => (v == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(v));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/inventaire/campagnes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.label}</h1>
            <p className="text-xs text-muted-foreground font-mono">{campaign.code}</p>
          </div>
          <Badge>{campaign.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/inventaire/compter/${campaign.id}`}><ScanLine className="h-4 w-4 mr-1" />Écran agent</Link>
          </Button>
          {canManage && campaign.status === "draft" && (
            <Button size="sm" onClick={openCampaign}><Play className="h-4 w-4 mr-1" />Lancer la campagne</Button>
          )}
          {canManage && (campaign.status === "en_cours" || campaign.status === "arbitrage") && (
            <Button size="sm" variant="default" onClick={closeCampaign}><Lock className="h-4 w-4 mr-1" />Clôturer</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Articles</div><div className="text-2xl font-bold">{targets.length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Conformes</div><div className="text-2xl font-bold text-green-600">{conformes.length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Écarts en attente</div><div className="text-2xl font-bold text-amber-600">{ecart.length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">À recompter</div><div className="text-2xl font-bold text-red-600">{aRecompter.length}</div></CardContent></Card>
      </div>

      <Card>
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">Agents affectés</h3>
        </div>
        <CardContent className="p-3 flex flex-wrap gap-2">
          {assignments.map((a) => (
            <Badge key={a.id} variant="outline" className="text-xs">
              {a.role === "agent_a" ? "A" : a.role === "agent_b" ? "B" : "C"} · {profiles[a.agent_id] ? `${profiles[a.agent_id].first_name} ${profiles[a.agent_id].last_name}` : a.agent_id.slice(0, 8)}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tous ({targets.length})</TabsTrigger>
          <TabsTrigger value="ecart">Écarts ({ecart.length})</TabsTrigger>
          <TabsTrigger value="recompte">À recompter ({aRecompter.length})</TabsTrigger>
          <TabsTrigger value="ok">Conformes ({conformes.length})</TabsTrigger>
        </TabsList>
        {(["all", "ecart", "recompte", "ok"] as const).map((tab) => {
          const list = tab === "all" ? targets : tab === "ecart" ? ecart : tab === "recompte" ? aRecompter : conformes;
          return (
            <TabsContent value={tab} key={tab}>
              <Card><CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left p-3">Article</th>
                        <th className="text-right p-3">Stock système</th>
                        <th className="text-right p-3">A</th>
                        <th className="text-right p-3">B</th>
                        <th className="text-right p-3">Écart</th>
                        <th className="text-right p-3">C</th>
                        <th className="text-right p-3">Final</th>
                        <th className="text-left p-3">Décision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((t) => {
                        const r = results[t.id];
                        return (
                          <tr key={t.id} className="border-t">
                            <td className="p-3"><div className="font-mono text-xs">{t.entity_code}</div><div className="text-xs text-muted-foreground truncate max-w-[280px]">{t.entity_label}</div></td>
                            <td className="p-3 text-right">{fmt(t.qty_systeme)}</td>
                            <td className="p-3 text-right">{fmt(r?.qty_a)}</td>
                            <td className="p-3 text-right">{fmt(r?.qty_b)}</td>
                            <td className="p-3 text-right">{r?.ecart_ab ? <span className="text-amber-600 font-semibold">{fmt(r.ecart_ab)}</span> : "—"}</td>
                            <td className="p-3 text-right">{fmt(r?.qty_c)}</td>
                            <td className="p-3 text-right font-semibold">{fmt(r?.qty_finale)}</td>
                            <td className="p-3 text-xs">
                              {r?.decision === "conforme_ab" && <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3 w-3" />A=B</span>}
                              {r?.decision === "conforme_c_eq_a" && <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3 w-3" />C=A</span>}
                              {r?.decision === "conforme_c_eq_b" && <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3 w-3" />C=B</span>}
                              {r?.decision === "recompte_ab" && <span className="inline-flex items-center gap-1 text-red-600"><AlertTriangle className="h-3 w-3" />Recompte A&B (round {t.current_round})</span>}
                              {r?.decision === "en_attente" && <span className="text-muted-foreground">En attente</span>}
                            </td>
                          </tr>
                        );
                      })}
                      {list.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucun article.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent></Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
