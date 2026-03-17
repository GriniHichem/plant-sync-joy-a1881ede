import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";

const TYPE_LABELS: Record<string, string> = {
  capteur: "Capteur", actionneur: "Actionneur", convoyeur: "Convoyeur",
  peripherique: "Périphérique", utilite: "Utilité", sous_ensemble: "Sous-ensemble",
  instrument: "Instrument", autre: "Autre",
};
const STATUT_LABELS: Record<string, string> = {
  en_service: "En service", hors_service: "Hors service",
  en_maintenance: "En maintenance", reforme: "Réformé",
};
const STATUT_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  en_service: "default", hors_service: "destructive",
  en_maintenance: "secondary", reforme: "outline",
};

export default function EquipmentsList() {
  const navigate = useNavigate();
  const { canCreate } = usePermissions();
  const [equipments, setEquipments] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [entityImages, setEntityImages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("__all__");
  const [typeFilter, setTypeFilter] = useState("__all__");

  useEffect(() => {
    const load = async () => {
      const [eRes, lRes, imgRes] = await Promise.all([
        supabase.from("equipements").select("*, machine_families(name), machines(code, designation), production_lines(code, designation)").order("code"),
        supabase.from("production_lines").select("id, code, designation").eq("is_active", true).order("code"),
        supabase.from("entity_images").select("*").eq("entity_type", "equipement").eq("is_primary", true),
      ]);
      setEquipments(eRes.data || []);
      setLines(lRes.data || []);
      setEntityImages(imgRes.data || []);
    };
    load();
  }, []);

  const filtered = equipments.filter((e) => {
    const matchSearch = !search || `${e.code} ${e.designation}`.toLowerCase().includes(search.toLowerCase());
    const matchLine = lineFilter === "__all__" || e.line_id === lineFilter;
    const matchType = typeFilter === "__all__" || e.type === typeFilter;
    return matchSearch && matchLine && matchType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Équipements</h1>
          <p className="text-muted-foreground">{filtered.length} équipement(s)</p>
        </div>
        {canCreate("machines") && (
          <Button onClick={() => navigate("/equipements/new")} className="h-12 px-6">
            <Plus className="h-4 w-4 mr-2" /> Nouvel équipement
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={lineFilter} onValueChange={setLineFilter}>
          <SelectTrigger className="w-[200px] h-10">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Ligne" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes les lignes</SelectItem>
            {lines.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.code} — {l.designation}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Machine</TableHead>
                <TableHead className="hidden md:table-cell">Ligne</TableHead>
                <TableHead>Criticité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun équipement trouvé
                  </TableCell>
                </TableRow>
              ) : filtered.map((e) => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/equipements/${e.id}`)}>
                  <TableCell className="font-mono font-medium">{e.code}</TableCell>
                  <TableCell>{e.designation}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{TYPE_LABELS[e.type] || e.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUT_VARIANT[e.statut] || "secondary"} className="text-xs">
                      {STATUT_LABELS[e.statut] || e.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {e.machines ? `${e.machines.code}` : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {e.production_lines ? e.production_lines.code : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge type="criticite" value={e.criticite} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
