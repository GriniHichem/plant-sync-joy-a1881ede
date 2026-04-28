import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ValidationRule } from "@/lib/validation";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: ValidationRule | null;
  onSaved: () => void;
}

const ALL_ROLES = [
  "admin", "responsable_si", "resp_maintenance", "resp_production",
  "gestionnaire_magasin", "maintenancier", "chef_ligne", "operateur",
  "bureau_methode", "auditeur",
];

export function RuleEditorDialog({ open, onOpenChange, rule, onSaved }: Props) {
  const [form, setForm] = useState<Partial<ValidationRule>>({
    name: "", description: "", module: "pdr_stock", action_type: "correction",
    enforcement: "post_hoc", priority: "medium", is_active: true, is_required: true,
    validator_roles: [], auto_approve_if_low_risk: false,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (rule) setForm(rule);
    else setForm({
      name: "", description: "", module: "pdr_stock", action_type: "correction",
      enforcement: "post_hoc", priority: "medium", is_active: true, is_required: true,
      validator_roles: [], auto_approve_if_low_risk: false,
    });
  }, [rule, open]);

  const toggleRole = (r: string) => {
    const cur = form.validator_roles ?? [];
    setForm({ ...form, validator_roles: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r] });
  };

  const save = async () => {
    if (!form.name || !form.module || !form.action_type) {
      toast({ title: "Champs obligatoires manquants", variant: "destructive" });
      return;
    }
    setBusy(true);
    const payload = {
      name: form.name,
      description: form.description ?? "",
      module: form.module,
      entity_type: form.entity_type ?? null,
      action_type: form.action_type,
      enforcement: form.enforcement,
      priority: form.priority,
      is_active: form.is_active,
      is_required: form.is_required,
      validator_roles: form.validator_roles ?? [],
      auto_approve_if_low_risk: form.auto_approve_if_low_risk ?? false,
      conditions: form.conditions ?? null,
    };
    const { error } = rule
      ? await supabase.from("validation_rules").update(payload as never).eq("id", rule.id)
      : await supabase.from("validation_rules").insert(payload as never);
    setBusy(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: rule ? "Règle modifiée" : "Règle créée" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Modifier" : "Créer"} une règle de validation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nom *</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Module *</Label>
              <Input value={form.module ?? ""} onChange={(e) => setForm({ ...form, module: e.target.value })} />
            </div>
            <div>
              <Label>Type d'entité</Label>
              <Input value={form.entity_type ?? ""} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} />
            </div>
            <div>
              <Label>Action *</Label>
              <Input value={form.action_type ?? ""} onChange={(e) => setForm({ ...form, action_type: e.target.value })} />
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={form.priority ?? "medium"} onValueChange={(v) => setForm({ ...form, priority: v as ValidationRule["priority"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Mode d'application</Label>
              <Select value={form.enforcement ?? "post_hoc"} onValueChange={(v) => setForm({ ...form, enforcement: v as ValidationRule["enforcement"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="post_hoc">A posteriori (n'arrête pas le terrain)</SelectItem>
                  <SelectItem value="blocking">Bloquante (action en attente)</SelectItem>
                </SelectContent>
              </Select>
              {form.enforcement === "blocking" && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Cette règle bloquera l'opération terrain en attendant validation. Réservé aux actions administratives.
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Rôles validateurs</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ALL_ROLES.map((r) => {
                const sel = (form.validator_roles ?? []).includes(r);
                return (
                  <Badge
                    key={r}
                    variant={sel ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleRole(r)}
                  >
                    {r.replace(/_/g, " ")}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Validation obligatoire</Label>
            <Switch checked={form.is_required ?? true} onCheckedChange={(v) => setForm({ ...form, is_required: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={busy}>{rule ? "Enregistrer" : "Créer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
