import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Plus, Search, Cog, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import { exportToCsv } from "@/lib/exportCsv";

export default function MachinesList() {
  const [machines, setMachines] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const [mRes, fRes] = await Promise.all([
        supabase.from("machines").select("*, machine_families(name)").eq("is_active", true).order("code"),
        supabase.from("machine_families").select("*").eq("is_active", true).order("name"),
      ]);
      setMachines(mRes.data || []);
      setFamilies(fRes.data || []);
    };
    load();
  }, []);

  const filtered = machines.filter((m) => {
    const matchSearch = search === "" || m.code.toLowerCase().includes(search.toLowerCase()) || m.designation.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.statut === statusFilter;
    const matchFamily = familyFilter === "all" || m.family_id === familyFilter;
    return matchSearch && matchStatus && matchFamily;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Machines</h1>
          <p className="text-muted-foreground">Parc machine — {machines.length} équipements</p>
        </div>
        <Button onClick={() => navigate("/machines/new")} className="h-12 px-6">
          <Plus className="h-4 w-4 mr-2" /> Ajouter
        </Button>
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead className="hidden md:table-cell">Famille</TableHead>
                <TableHead>Criticité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Localisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Cog className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Aucune machine trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/machines/${m.id}`)}
                  >
                    <TableCell className="font-mono font-medium">{m.code}</TableCell>
                    <TableCell>{m.designation}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {m.machine_families?.name || "—"}
                    </TableCell>
                    <TableCell><StatusBadge type="criticite" value={m.criticite} /></TableCell>
                    <TableCell><StatusBadge type="machine" value={m.statut} /></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{m.localisation || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
