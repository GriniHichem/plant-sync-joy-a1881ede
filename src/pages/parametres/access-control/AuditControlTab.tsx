import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuditRoleSettings } from "@/hooks/useAuditRoleSettings";
import { ROLES, MODULES } from "@/lib/ruleCatalog";
import { useAllRoles } from "@/hooks/useAllRoles";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";

export default function AuditControlTab() {
  const { settings, loading, upsert } = useAuditRoleSettings();
  const { roles: ALL_ROLES } = useAllRoles();
  const [group, setGroup] = useState("Maintenance");

  function isEnabled(role: string, module: string) {
    const s = settings.find((x) => x.role === role && x.module === module);
    return s ? s.audit_enabled : true;
  }

  const groups = ["Maintenance", "Production", "Transverse", "Système"];
  const modulesByGroup = groups.reduce((acc, g) => { acc[g] = MODULES.filter((m) => m.group === g); return acc; }, {} as Record<string, typeof MODULES>);

  if (loading) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit configurable par rôle × module</CardTitle>
        <p className="text-sm text-muted-foreground">Désactiver l'audit pour un couple rôle/module évite la trace en base. À utiliser avec précaution.</p>
      </CardHeader>
      <CardContent>
        <Tabs value={group} onValueChange={setGroup}>
          <TabsList>
            {groups.map((g) => <TabsTrigger key={g} value={g}>{g}</TabsTrigger>)}
          </TabsList>
          {groups.map((g) => (
            <TabsContent key={g} value={g} className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 sticky left-0 bg-background">Rôle</th>
                    {modulesByGroup[g].map((m) => <th key={m.value} className="p-2 text-center min-w-[100px]">{m.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ALL_ROLES.map(({ code: role, label, isCustom }) => (
                    <tr key={role} className="border-b hover:bg-muted/30">
                      <td className="p-2 sticky left-0 bg-background font-medium">{label}{isCustom && <span className="ml-1 text-[10px] text-primary">•custom</span>}</td>
                      {modulesByGroup[g].map((m) => (
                        <td key={m.value} className="p-2 text-center">
                          <Switch checked={isEnabled(role, m.value)} onCheckedChange={(v) => upsert(role, m.value, v)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
