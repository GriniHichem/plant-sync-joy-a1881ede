import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Factory, Eye, Settings, Plus, CalendarCheck } from "lucide-react";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";
import { usePermissions } from "@/hooks/usePermissions";

export default function LinesList() {
  const navigate = useNavWithFrom();
  const { canEdit } = usePermissions();
  const [lines, setLines] = useState<any[]>([]);
  const [machineCounts, setMachineCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const [lRes, mlaRes] = await Promise.all([
        supabase.from("production_lines").select("*").order("code"),
        supabase.from("machine_line_assignments").select("line_id"),
      ]);
      setLines(lRes.data || []);
      const counts: Record<string, number> = {};
      (mlaRes.data || []).forEach((r: any) => {
        counts[r.line_id] = (counts[r.line_id] || 0) + 1;
      });
      setMachineCounts(counts);
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            Lignes de production
          </h1>
          <p className="text-muted-foreground">{lines.length} ligne(s) — Vue synoptique</p>
        </div>
        <ExportCsvButton
          data={lines.map((l) => ({ ...l, machines_count: machineCounts[l.id] || 0 }))}
          columns={[
            { key: "code", label: "Code" },
            { key: "designation", label: "Désignation" },
            { key: "atelier", label: "Atelier" },
            { key: "machines_count", label: "Machines" },
            { key: "is_active", label: "Actif", format: (v) => (v ? "Oui" : "Non") },
          ]}
          filename="lignes_production"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead className="hidden md:table-cell">Atelier</TableHead>
                <TableHead>Machines</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Factory className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Aucune ligne configurée
                  </TableCell>
                </TableRow>
              ) : lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono font-medium">{l.code}</TableCell>
                  <TableCell>{l.designation}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{l.atelier || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{machineCounts[l.id] || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.is_active ? "default" : "secondary"} className="text-xs">
                      {l.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/lignes/${l.id}`)} className="h-8 px-2">
                        <Eye className="h-3.5 w-3.5 mr-1" /> Synoptique
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/preventif?line=${l.id}`)} className="h-8 w-8" title="Plans préventifs">
                        <CalendarCheck className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit("lignes") && (
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/lignes/${l.id}/config`)} className="h-8 w-8">
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
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
