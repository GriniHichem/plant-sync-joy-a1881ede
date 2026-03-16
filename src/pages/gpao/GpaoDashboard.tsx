import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/gmao/KpiCard";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Factory, Package, ClipboardList, TrendingUp, BarChart3, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const ofStatusConfig: Record<string, { label: string; className: string }> = {
  planifie: { label: "Planifié", className: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", className: "bg-info/10 text-info border-info/20" },
  termine: { label: "Terminé", className: "bg-success/10 text-success border-success/20" },
  annule: { label: "Annulé", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function OfStatusBadge({ value }: { value: string }) {
  const config = ofStatusConfig[value];
  if (!config) return <Badge variant="outline">{value}</Badge>;
  return <Badge variant="outline" className={`font-medium text-xs ${config.className}`}>{config.label}</Badge>;
}

export default function GpaoDashboard() {
  const [ofs, setOfs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const [ofRes, prodRes, artRes, stopRes] = await Promise.all([
        supabase.from("ordres_fabrication").select("*, products(designation, code), production_lines(designation, code)").order("created_at", { ascending: false }).limit(10),
        supabase.from("products").select("*").eq("is_active", true),
        supabase.from("articles").select("*").eq("is_active", true),
        supabase.from("production_stops").select("*, production_lines(designation)").order("heure_debut", { ascending: false }).limit(5),
      ]);
      setOfs(ofRes.data || []);
      setProducts(prodRes.data || []);
      setArticles(artRes.data || []);
      setStops(stopRes.data || []);
    };
    load();
  }, []);

  const ofsEnCours = ofs.filter((o) => o.statut === "en_cours").length;
  const totalProduit = ofs.reduce((s, o) => s + (o.quantite_produite || 0), 0);
  const totalRebut = ofs.reduce((s, o) => s + (o.quantite_rebut || 0), 0);
  const rendement = totalProduit > 0 ? Math.round(((totalProduit - totalRebut) / totalProduit) * 100) : 0;
  const lowStockArticles = articles.filter((a) => a.stock_actuel <= a.stock_min).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard GPAO</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la production</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="OF en cours" value={ofsEnCours} icon={Factory} subtitle={`${ofs.length} total`} />
        <KpiCard title="Production totale" value={`${totalProduit.toLocaleString("fr-FR")} kg`} icon={BarChart3} />
        <KpiCard title="Rendement" value={`${rendement}%`} icon={TrendingUp} trend={rendement >= 95 ? "up" : rendement >= 85 ? "neutral" : "down"} subtitle="Produit - rebuts" />
        <KpiCard title="Produits" value={products.length} icon={Package} subtitle={lowStockArticles > 0 ? `${lowStockArticles} matières en alerte` : "Stock OK"} trend={lowStockArticles > 0 ? "down" : "up"} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Ordres de fabrication récents
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {ofs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun OF</p>
            ) : (
              <div className="space-y-2">
                {ofs.slice(0, 5).map((of) => (
                  <div key={of.id} onClick={() => navigate(`/gpao/of/${of.id}`)} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{of.numero}</p>
                      <p className="text-xs text-muted-foreground truncate">{of.products?.designation}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs tabular-nums text-muted-foreground">{of.quantite_produite}/{of.quantite_prevue}</span>
                      <OfStatusBadge value={of.statut} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Arrêts récents
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stops.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucun arrêt</p>
            ) : (
              <div className="space-y-2">
                {stops.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium capitalize">{s.type.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground">{s.production_lines?.designation}</p>
                      </div>
                      <span className="text-xs tabular-nums font-medium">{s.duree_minutes ? `${s.duree_minutes} min` : "En cours"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
