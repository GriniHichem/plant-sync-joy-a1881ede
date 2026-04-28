import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RuleEditorDialog } from "@/components/notifications/RuleEditorDialog";
import { logAudit } from "@/lib/audit";
import { SEVERITY_BADGE_CLASS } from "@/lib/notifications";
import { findDuplicates } from "@/lib/ruleValidation";
import { cn } from "@/lib/utils";

interface Rule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  module: string;
  event_type: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  target_roles: string[];
  channels: string[];
  frequency: string;
  is_critical: boolean;
  conditions: unknown;
}

export default function NotificationRulesAdmin() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [open, setOpen] = useState(false);

  const canManage = hasRole("admin") || hasRole("responsable_si") || hasRole("resp_maintenance") || hasRole("resp_production");

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase.from("notification_rules").select("*").order("module").order("name");
    setRules((data as unknown as Rule[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void fetchRules(); }, []);

  const toggleActive = async (rule: Rule) => {
    const newActive = !rule.is_active;
    const { error } = await supabase.from("notification_rules").update({ is_active: newActive }).eq("id", rule.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAudit({
      action_type: "status_change",
      module: "notifications",
      entity_type: "notification_rule",
      entity_id: rule.id,
      entity_label: rule.name,
      severity: "medium",
      old_values: { is_active: rule.is_active },
      new_values: { is_active: newActive },
    });
    fetchRules();
  };

  const remove = async (rule: Rule) => {
    if (!confirm(`Supprimer la règle "${rule.name}" ?`)) return;
    const { error } = await supabase.from("notification_rules").delete().eq("id", rule.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAudit({
      action_type: "delete",
      module: "notifications",
      entity_type: "notification_rule",
      entity_id: rule.id,
      entity_label: rule.name,
      severity: "high",
      old_values: rule as unknown as Record<string, unknown>,
    });
    toast({ title: "Règle supprimée" });
    fetchRules();
  };

  if (!canManage) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Vous n'avez pas accès à cette page.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")}>
            <ChevronLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Règles de notification</h1>
            <p className="text-sm text-muted-foreground">Configurer les déclencheurs d'alertes par rôle et événement</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus size={14} />
          Nouvelle règle
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Active</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Événement</TableHead>
              <TableHead className="w-[90px]">Sévérité</TableHead>
              <TableHead>Rôles</TableHead>
              <TableHead>Fréquence</TableHead>
              <TableHead className="text-right w-[110px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : rules.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Aucune règle</TableCell></TableRow>
            ) : (
              rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{r.name}</div>
                    {r.description && <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>}
                    {r.is_critical && <Badge variant="destructive" className="text-[9px] mt-1">Critique</Badge>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.module}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.event_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", SEVERITY_BADGE_CLASS[r.severity])}>{r.severity}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(r.target_roles ?? []).slice(0, 3).map((role) => (
                        <Badge key={role} variant="secondary" className="text-[9px]">{role.replace(/_/g, " ")}</Badge>
                      ))}
                      {(r.target_roles ?? []).length > 3 && (
                        <Badge variant="secondary" className="text-[9px]">+{r.target_roles.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{r.frequency}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(r); setOpen(true); }}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(r)}>
                      <Trash2 size={13} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <RuleEditorDialog
        open={open}
        onOpenChange={setOpen}
        rule={editing as never}
        onSaved={fetchRules}
      />
    </div>
  );
}
