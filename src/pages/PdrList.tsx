import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertCircle, Download, ShieldAlert, TrendingDown, DollarSign } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { exportToCsv } from "@/lib/exportCsv";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { useNavigate } from "react-router-dom";

function KpiMini({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md ${color || "bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function PdrList() {
  const navigate = useNavigate();
  const { canCreate } = usePermissions();
  const [pdrList, setPdrList] = useState<any[]>([]);
  const [entityImages, setEntityImages] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterFamily, setFilterFamily] = useState("__all__");
  const [filterStatut, setFilterStatut] = useState("__all__");
  const [filterStock, setFilterStock] = useState("__all__");

  useEffect(() => {
    const load = async () => {
      const [pRes, imgRes, fRes] = await Promise.all([
        supabase.from("pdr").select("*, pdr_families(name)").eq("is_active", true).order("reference"),
        supabase.from("entity_images").select("*").eq("entity_type", "pdr").eq("is_primary", true),
        supabase.from("pdr_families").select("*").eq("is_active", true).order("name"),
      ]);
      setPdrList(pRes.data || []);
      setEntityImages(imgRes.data || []);
      setFamilies(fRes.data || []);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return pdrList.filter((p) => {
      if (search && !p.reference.toLowerCase().includes(search.toLowerCase()) && !p.designation.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterFamily !== "__all__" && (p as any).family_id !== filterFamily) return false;
      if (filterStatut !== "__all__" && (p as any).statut_pdr !== filterStatut) return false;
      if (filterStock === "critique" && p.stock_actuel > p.stock_min) return false;
      if (filterStock === "rupture" && p.stock_actuel > 0) return false;
      if (filterStock === "a_commander" && p.stock_actuel > (p as any).point_commande) return false;
      return true;
    });
  }, [pdrList, search, filterFamily, filterStatut, filterStock]);

  const lowStock = pdrList.filter((p) => p.stock_actuel <= p.stock_min).length;
  const rupture = pdrList.filter((p) => p.stock_actuel === 0).length;
  const valeurStock = pdrList.reduce((s, p) => s + (p.stock_actuel * ((p as any).pmp || (p as any).prix_unitaire || 0)), 0);

  const stockBadge = (p: any) => {
    if (p.stock_actuel === 0) return <Badge variant="destructive" className="text-xs animate-pulse">Rupture</Badge>;
    if (p.stock_actuel <= p.stock_min) return <Badge variant="destructive" className="text-xs">Critique</Badge>;
    if (p.stock_actuel <= (p.stock_securite || 0)) return <Badge className="text-xs bg-warning text-warning-foreground">Sécurité</Badge>;
    if ((p.point_commande || 0) > 0 && p.stock_actuel <= p.point_commande) return <Badge className="text-xs bg-info text-info-foreground">À commander</Badge>;
    return <Badge variant="secondary" className="text-xs">OK</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pièces de Rechange</h1>
          <p className="text-muted-foreground">{pdrList.length} références</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(filtered, [
            { key: "reference", label: "Référence" }, { key: "designation", label: "Désignation" },
            { key: "statut_pdr", label: "Statut" }, { key: "approvisionnement", label: "Appro." },
            { key: "stock_actuel", label: "Stock" }, { key: "stock_min", label: "Min" },
            { key: "stock_max", label: "Max" }, { key: "pmp", label: "PMP (DA)" },
            { key: "fournisseur", label: "Fournisseur" }, { key: "emplacement", label: "Emplacement" },
          ], "pieces_rechange")}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          {canCreate("pdr") && (
            <Button className="h-12 px-6" onClick={() => navigate("/pdr/new")}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini icon={Package} label="Total références" value={pdrList.length} />
        <KpiMini icon={AlertCircle} label="Stock critique" value={lowStock} color="bg-destructive/10 text-destructive" />
        <KpiMini icon={ShieldAlert} label="Rupture" value={rupture} color="bg-destructive/10 text-destructive" />
        <KpiMini icon={DollarSign} label="Valeur stock (DA)" value={Math.round(valeurStock).toLocaleString("fr-FR")} color="bg-success/10 text-success" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" />
            </div>
            <Select value={filterFamily} onValueChange={setFilterFamily}>
              <SelectTrigger className="h-11 w-[160px]"><SelectValue placeholder="Famille" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes familles</SelectItem>
                {families.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="h-11 w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous statuts</SelectItem>
                <SelectItem value="strategique">Stratégique</SelectItem>
                <SelectItem value="commune">Commune</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStock} onValueChange={setFilterStock}>
              <SelectTrigger className="h-11 w-[150px]"><SelectValue placeholder="Stock" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous niveaux</SelectItem>
                <SelectItem value="critique">Stock critique</SelectItem>
                <SelectItem value="rupture">Rupture</SelectItem>
                <SelectItem value="a_commander">À commander</SelectItem>
              </SelectContent>
            </Select>
            {(search.trim() || filterFamily !== "__all__" || filterStatut !== "__all__" || filterStock !== "__all__") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-11 px-3 text-muted-foreground"
                onClick={() => {
                  setSearch("");
                  setFilterFamily("__all__");
                  setFilterStatut("__all__");
                  setFilterStock("__all__");
                }}
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead className="hidden md:table-cell">Famille</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead className="hidden md:table-cell">PMP (DA)</TableHead>
                <TableHead className="hidden lg:table-cell">Appro.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Aucune pièce trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const img = entityImages.find((i: any) => i.entity_id === p.id);
                  return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pdr/${p.id}`)}>
                      <TableCell className="w-10 pr-0">
                        <EntityThumbnail imageUrl={img?.image_url} alt={p.designation} size="sm" rounded="md" />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{p.reference}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{p.designation}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {(p as any).pdr_families?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={(p as any).statut_pdr === "strategique" ? "destructive" : "secondary"} className="text-xs">
                          {(p as any).statut_pdr === "strategique" ? "Stratégique" : "Commune"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">{p.stock_actuel}</TableCell>
                      <TableCell>{stockBadge(p)}</TableCell>
                      <TableCell className="hidden md:table-cell tabular-nums">
                        {(p as any).pmp ? `${Number((p as any).pmp).toLocaleString("fr-FR")}` : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {(p as any).approvisionnement === "importation" ? "Import" : (p as any).approvisionnement === "mixte" ? "Mixte" : "Local"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
