import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useValidationPermissions } from "@/hooks/useValidationPermissions";
import { RuleEditorDialog } from "@/components/validations/RuleEditorDialog";
import { ENFORCEMENT_LABEL, PRIORITY_LABEL, PRIORITY_BADGE_CLASS, type ValidationRule } from "@/lib/validation";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { findDuplicates } from "@/lib/ruleValidation";

export default function ValidationRulesAdmin() {
  const perm = useValidationPermissions();
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ValidationRule | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("validation_rules").select("*").order("module").order("name");
    setRules((data as unknown as ValidationRule[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const duplicateIds = useMemo(() => {
    const set = new Set<string>();
    const dups = findDuplicates(
      rules.map((r) => ({ id: r.id, module: r.module, conditions: r.conditions, is_active: r.is_active })),
      (r) => (rules.find((x) => x.id === r.id)?.action_type ?? "")
    );
    dups.forEach((ids) => ids.forEach((id) => set.add(id)));
    return set;
  }, [rules]);

  const toggleActive = async (r: ValidationRule) => {
    const newVal = !r.is_active;
    const { error } = await supabase.from("validation_rules").update({ is_active: newVal } as never).eq("id", r.id);
    if (error) { toast({ title: "Erreur", variant: "destructive" }); return; }
    await logAudit({
      action_type: "status_change",
      module: "system",
      entity_type: "validation_rule",
      entity_id: r.id,
      entity_label: r.name,
      severity: "medium",
      old_values: { is_active: r.is_active },
      new_values: { is_active: newVal },
    });
    void load();
  };

  const remove = async (r: ValidationRule) => {
    if (!confirm(`Supprimer la règle "${r.name}" ?`)) return;
    const { error } = await supabase.from("validation_rules").delete().eq("id", r.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAudit({
      action_type: "delete",
      module: "system",
      entity_type: "validation_rule",
      entity_id: r.id,
      entity_label: r.name,
      severity: "high",
      old_values: r as unknown as Record<string, unknown>,
    });
    toast({ title: "Règle supprimée" });
    void load();
  };

  if (!perm.configure_rules && !perm.loading) {
    return <div className="text-center text-muted-foreground py-12">Accès refusé.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Règles de validation</h1>
          <p className="text-muted-foreground">Configuration du module Validation & Approbation</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle règle
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Chargement…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium flex items-center gap-1.5">
                      {r.name}
                      {duplicateIds.has(r.id) && (
                        <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-600">
                          Doublon
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.module} / {r.action_type}</p>
                  </div>
                  <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                </div>
                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className={r.enforcement === "blocking" ? "border-orange-500/30 text-orange-600" : ""}>
                    {ENFORCEMENT_LABEL[r.enforcement]}
                  </Badge>
                  <Badge variant="outline" className={PRIORITY_BADGE_CLASS[r.priority]}>{PRIORITY_LABEL[r.priority]}</Badge>
                  {(r.validator_roles ?? []).map((role) => (
                    <Badge key={role} variant="secondary">{role.replace(/_/g, " ")}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(r); setOpen(true); }}>
                    <Pencil className="h-4 w-4 mr-2" /> Modifier
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(r)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RuleEditorDialog open={open} onOpenChange={setOpen} rule={editing} onSaved={load} />
    </div>
  );
}
