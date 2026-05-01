import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, RotateCcw, Component } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { ListScanButton } from "@/components/scanner/ListScanButton";

const TYPE_LABELS: Record<string, string> = {
  mecanique: "Mécanique", electrique: "Électrique", pneumatique: "Pneumatique",
  hydraulique: "Hydraulique", electronique: "Électronique", automatisme: "Automatisme",
  instrumentation: "Instrumentation", autre: "Autre",
};
const STATUT_LABELS: Record<string, string> = {
  en_service: "En service", en_panne: "En panne",
  en_maintenance: "En maintenance", hors_service: "Hors service",
};
const STATUT_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  en_service: "default", en_panne: "destructive",
  en_maintenance: "secondary", hors_service: "outline",
};

export default function OrganesList() {
  const navigate = useNavWithFrom();
  const { canCreate } = usePermissions();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("__all__");
  const [statut, setStatut] = useState("__all__");
  const [parentType, setParentType] = useState("__all__");

  useEffect(() => {
    supabase.from("organes" as any)
      .select("*, machines(code, designation), equipements(code, designation)")
      .order("code")
      .then(({ data }) => setRows((data as any) || []));
  }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (type !== "__all__" && r.type !== type) return false;
    if (statut !== "__all__" && r.statut !== statut) return false;
    if (parentType === "machine" && !r.machine_id) return false;
    if (parentType === "equipement" && !r.equipement_id) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = `${r.code} ${r.designation} ${r.machines?.code || ""} ${r.equipements?.code || ""}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [rows, search, type, statut, parentType]);

  const reset = () => { setSearch(""); setType("__all__"); setStatut("__all__"); setParentType("__all__"); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Component className="h-6 w-6" /> Organes
          </h1>
          <p className="text-sm text-muted-foreground">Sous-ensembles fonctionnels des machines et équipements</p>
        </div>
        {canCreate("organes") && (
          <ListScanButton allowedTypes={["organe"]} routeFor={(e) => `/organes/${e.entity_id}`} />
          <Button onClick={() => navigate("/organes/new")}>
            <Plus className="h-4 w-4 mr-2" /> Nouvel organe
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher code, désignation, parent…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={parentType} onValueChange={setParentType}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous parents</SelectItem>
              <SelectItem value="machine">Machine</SelectItem>
              <SelectItem value="equipement">Équipement</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous statuts</SelectItem>
              {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4 mr-2" />Réinitialiser</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Criticité</TableHead>
                <TableHead>Parent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun organe</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/organes/${r.id}`)}>
                  <TableCell className="font-mono">{r.code}</TableCell>
                  <TableCell>{r.designation}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[r.type]}</Badge></TableCell>
                  <TableCell><Badge variant={STATUT_VARIANT[r.statut]} className="text-xs">{STATUT_LABELS[r.statut]}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.criticite}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.machines ? `Machine: ${r.machines.code}` : r.equipements ? `Équip.: ${r.equipements.code}` : "—"}
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
