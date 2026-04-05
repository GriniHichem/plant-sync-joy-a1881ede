import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Plus, Search, Cog, Download, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import { exportToCsv } from "@/lib/exportCsv";
import { Badge } from "@/components/ui/badge";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";

export default function MachinesList() {
  const [machines, setMachines] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [lineAssignments, setLineAssignments] = useState<any[]>([]);
  const [entityImages, setEntityImages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [lineFilter, setLineFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { canCreate } = usePermissions();

  useEffect(() => {
    const load = async () => {
      const [mRes, fRes, lRes, laRes, imgRes] = await Promise.all([
        supabase.from("machines").select("*, machine_families(name)").eq("is_active", true).order("code"),
        supabase.from("machine_families").select("*").eq("is_active", true).order("name"),
        supabase.from("production_lines").select("*").eq("is_active", true).order("code"),
        supabase.from("machine_line_assignments").select("*").order("priority"),
        supabase.from("entity_images").select("*").eq("entity_type", "machine").eq("is_primary", true),
      ]);
      setMachines(mRes.data || []);
      setFamilies(fRes.data || []);
      setLines(lRes.data || []);
      setLineAssignments(laRes.data || []);
      setEntityImages(imgRes.data || []);
    };
    load();
  }, []);

  const getMachineLines = (machineId: string) => {
    return lineAssignments
      .filter((a) => a.machine_id === machineId)
      .sort((a, b) => a.priority - b.priority)
      .map((a) => {
        const line = lines.find((l) => l.id === a.line_id);
        return { ...a, line };
      });
  };

  const filtered = machines.filter((m) => {
    const matchSearch = search === "" || m.code.toLowerCase().includes(search.toLowerCase()) || m.designation.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.statut === statusFilter;
    const matchFamily = familyFilter === "all" || m.family_id === familyFilter;
    const matchLine = lineFilter === "all" || lineAssignments.some((a) => a.machine_id === m.id && a.line_id === lineFilter);
    return matchSearch && matchStatus && matchFamily && matchLine;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Machines</h1>
          <p className="text-muted-foreground">Parc machine — {machines.length} équipements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(filtered, [
            { key: "code", label: "Code" },
            { key: "designation", label: "Désignation" },
            { key: "machine_families.name", label: "Famille" },
            { key: "criticite", label: "Criticité" },
            { key: "statut", label: "Statut" },
            { key: "localisation", label: "Localisation" },
            { key: "marque", label: "Marque" },
            { key: "modele", label: "Modèle" },
          ], "machines")}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          {canCreate("machines") && (
            <Button onClick={() => navigate("/machines/new")} className="h-12 px-6">
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par code ou désignation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-11">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="en_marche">En marche</SelectItem>
                <SelectItem value="arret">Arrêt</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger className="w-[180px] h-11">
                <SelectValue placeholder="Famille" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes familles</SelectItem>
                {families.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lineFilter} onValueChange={setLineFilter}>
              <SelectTrigger className="w-[180px] h-11">
                <SelectValue placeholder="Ligne" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes lignes</SelectItem>
                {lines.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.code} — {l.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search.trim() || statusFilter !== "all" || familyFilter !== "all" || lineFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-11 px-3 text-muted-foreground"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setFamilyFilter("all");
                  setLineFilter("all");
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
                <TableHead>Code</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead className="hidden md:table-cell">Famille</TableHead>
                <TableHead className="hidden lg:table-cell">Ligne(s)</TableHead>
                <TableHead>Criticité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Localisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Cog className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Aucune machine trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => {
                  const mLines = getMachineLines(m.id);
                  const img = entityImages.find((i: any) => i.entity_id === m.id);
                  return (
                    <TableRow
                      key={m.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/machines/${m.id}`)}
                    >
                      <TableCell className="w-10 pr-0">
                        <EntityThumbnail imageUrl={img?.image_url} alt={m.designation} size="sm" rounded="md" />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{m.code}</TableCell>
                      <TableCell>{m.designation}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {m.machine_families?.name || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {mLines.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : mLines.map((ml) => (
                            <Badge key={ml.line_id} variant={ml.priority === 1 ? "default" : "outline"} className="text-xs">
                              {ml.line?.code || "?"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge type="criticite" value={m.criticite} /></TableCell>
                      <TableCell><StatusBadge type="machine" value={m.statut} /></TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{m.localisation || "—"}</TableCell>
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
