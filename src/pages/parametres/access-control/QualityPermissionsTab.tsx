import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAllRoles } from "@/hooks/useAllRoles";
import { toast } from "sonner";
import { Save } from "lucide-react";

const ACTIONS = [
  { key: "can_create_check", label: "Créer contrôle" },
  { key: "can_validate_check", label: "Valider contrôle" },
  { key: "can_reject_check", label: "Rejeter contrôle" },
  { key: "can_create_nc", label: "Créer NC" },
  { key: "can_close_nc", label: "Clôturer NC" },
  { key: "can_decide_nc", label: "Décider NC" },
  { key: "can_create_action", label: "Créer action" },
  { key: "can_verify_action", label: "Vérifier action" },
  { key: "can_close_action", label: "Clôturer action" },
  { key: "can_manage_indicators", label: "Gérer indicateurs" },
  { key: "can_manage_assignments", label: "Gérer affectations" },
  { key: "can_publish_recipe", label: "Publier recette" },
  { key: "can_publish_bom", label: "Publier nomenclature" },
  { key: "can_export_tracability", label: "Export traçabilité" },
  { key: "can_view_reports", label: "Voir rapports" },
] as const;

type Row = Record<string, unknown> & { role: string };

export default function QualityPermissionsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("quality_permissions" as any).select("*");
    const map = new Map<string, Row>((((data ?? []) as unknown) as Row[]).map((r) => [r.role, r]));
    const all: Row[] = ROLES.map((r) => map.get(r) ?? Object.assign({ role: r }, ...ACTIONS.map((a) => ({ [a.key]: false }))));
    setRows(all);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggle(role: string, key: string, value: boolean) {
    setRows((rs) => rs.map((r) => r.role === role ? { ...r, [key]: value } : r));
    setDirty((d) => ({ ...d, [role]: { ...(rows.find((r) => r.role === role) ?? { role }), ...d[role], [key]: value } }));
  }

  async function save() {
    const payload = Object.values(dirty).map((r) => {
      const base: Record<string, unknown> = { role: r.role };
      for (const a of ACTIONS) base[a.key] = Boolean(r[a.key]);
      return base;
    });
    if (!payload.length) { toast.info("Aucun changement"); return; }
    const { error } = await (supabase.from("quality_permissions" as any) as any).upsert(payload, { onConflict: "role" });
    if (error) { toast.error(error.message); return; }
    toast.success(`${payload.length} rôle(s) mis à jour`);
    setDirty({});
    load();
  }

  if (loading) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Permissions Qualité granulaires</CardTitle>
        <Button onClick={save} disabled={!Object.keys(dirty).length}><Save className="h-4 w-4 mr-1" />Enregistrer</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 sticky left-0 bg-background">Rôle</th>
              {ACTIONS.map((a) => <th key={a.key} className="p-2 text-center min-w-[80px]">{a.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.role} className="border-b hover:bg-muted/30">
                <td className="p-2 sticky left-0 bg-background font-medium">{r.role.replace(/_/g, " ")}</td>
                {ACTIONS.map((a) => (
                  <td key={a.key} className="p-2 text-center">
                    <Checkbox checked={Boolean(r[a.key])} onCheckedChange={(v) => toggle(r.role, a.key, Boolean(v))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
