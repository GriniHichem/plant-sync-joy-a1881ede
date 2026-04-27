import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";

const MODULES = [
  "machines","equipements","organes","lignes","pdr","pdr_stock","tickets","interventions",
  "preventif","gpao","of","produits","articles","recettes","consommations","arrets",
  "documents","images","auth","users","roles","permissions","audit","system",
];

const SEVERITIES = ["info","low","medium","high","critical"] as const;
const FREQUENCIES = ["immediate","grouped_hourly","grouped_daily"] as const;
const CHANNELS: Array<"in_app"|"email"|"push"> = ["in_app","email","push"];
const ROLES = ["admin","responsable_si","resp_maintenance","maintenancier","resp_production","chef_ligne","operateur","gestionnaire_magasin","bureau_methode","auditeur"];

interface RuleForm {
  id?: string;
  name: string;
  description: string;
  is_active: boolean;
  module: string;
  event_type: string;
  severity: typeof SEVERITIES[number];
  target_roles: string[];
  channels: Array<"in_app"|"email"|"push">;
  frequency: typeof FREQUENCIES[number];
  conditions: string;
  is_critical: boolean;
}

const EMPTY: RuleForm = {
  name: "", description: "", is_active: true, module: "tickets", event_type: "",
  severity: "medium", target_roles: [], channels: ["in_app"], frequency: "immediate",
  conditions: "", is_critical: false,
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rule: Partial<RuleForm> & { id?: string } | null;
  onSaved: () => void;
}

export function RuleEditorDialog({ open, onOpenChange, rule, onSaved }: Props) {
  const [form, setForm] = useState<RuleForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rule) {
      setForm({
        ...EMPTY,
        ...rule,
        target_roles: (rule.target_roles as string[]) ?? [],
        channels: (rule.channels as Array<"in_app"|"email"|"push">) ?? ["in_app"],
        conditions: typeof rule.conditions === "string" ? rule.conditions : rule.conditions ? JSON.stringify(rule.conditions, null, 2) : "",
      } as RuleForm);
    } else {
      setForm(EMPTY);
    }
  }, [rule, open]);

  const toggleArr = <T,>(arr: T[], v: T): T[] => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const save = async () => {
    if (!form.name.trim() || !form.event_type.trim()) {
      toast({ title: "Champs requis", description: "Nom et type d'événement obligatoires", variant: "destructive" });
      return;
    }
    let conditionsJson: unknown = null;
    if (form.conditions.trim()) {
      try { conditionsJson = JSON.parse(form.conditions); }
      catch { toast({ title: "JSON invalide", description: "Vérifie la syntaxe des conditions", variant: "destructive" }); return; }
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      name: form.name,
      description: form.description,
      is_active: form.is_active,
      module: form.module,
      event_type: form.event_type,
      severity: form.severity,
      target_roles: form.target_roles,
      channels: form.channels,
      frequency: form.frequency,
      conditions: conditionsJson as never,
      is_critical: form.is_critical,
      updated_by: user?.id ?? null,
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from("notification_rules").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("notification_rules").insert({ ...payload, created_by: user?.id ?? null }));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit({
      action_type: form.id ? "update" : "create",
      module: "notifications",
      entity_type: "notification_rule",
      entity_id: form.id ?? null,
      entity_label: form.name,
      severity: "medium",
      new_values: payload as Record<string, unknown>,
    });
    toast({ title: form.id ? "Règle mise à jour" : "Règle créée" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Modifier la règle" : "Nouvelle règle de notification"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_critical} onCheckedChange={(v) => setForm({ ...form, is_critical: v })} />
                <Label>Critique (non masquable)</Label>
              </div>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Module *</Label>
              <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type d'événement *</Label>
              <Input placeholder="ex: ticket_created" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
            </div>
            <div>
              <Label>Sévérité</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as RuleForm["severity"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Rôles destinataires</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {ROLES.map((r) => (
                <Badge
                  key={r}
                  variant={form.target_roles.includes(r) ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setForm({ ...form, target_roles: toggleArr(form.target_roles, r) })}
                >
                  {r.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Canaux</Label>
              <div className="flex gap-3 mt-2">
                {CHANNELS.map((c) => (
                  <label key={c} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={form.channels.includes(c)}
                      onCheckedChange={() => setForm({ ...form, channels: toggleArr(form.channels, c) })}
                    />
                    {c}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Email & push : à venir</p>
            </div>
            <div>
              <Label>Fréquence</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as RuleForm["frequency"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immédiate (anti-doublon 5 min)</SelectItem>
                  <SelectItem value="grouped_hourly">Groupée / heure</SelectItem>
                  <SelectItem value="grouped_daily">Groupée / jour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Conditions (JSON)</Label>
            <Textarea
              rows={4}
              className="font-mono text-xs"
              placeholder='{"all":[{"field":"duration_minutes","op":"gte","value":30}]}'
              value={form.conditions}
              onChange={(e) => setForm({ ...form, conditions: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Opérateurs : eq, neq, gt, gte, lt, lte, in, nin, contains. Groupes all/any.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "..." : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
