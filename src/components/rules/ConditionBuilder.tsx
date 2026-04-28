import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { getConditionFields, type ConditionFieldDef } from "@/lib/ruleCatalog";

// =============================================
// Format de conditions normalisé (compatible notif & validation)
// { combinator: "all"|"any", rules: [{field, op, value}] }
// =============================================
export type CondOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains";

export interface CondLeaf { field: string; op: CondOp; value: string | number | boolean }
export interface CondTree { combinator: "all" | "any"; rules: CondLeaf[] }

const NUMERIC_OPS: CondOp[] = ["eq", "neq", "gt", "gte", "lt", "lte"];
const STRING_OPS: CondOp[] = ["eq", "neq", "contains"];
const ENUM_OPS: CondOp[] = ["eq", "neq"];
const BOOL_OPS: CondOp[] = ["eq", "neq"];

const OP_LABEL: Record<CondOp, string> = {
  eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤", contains: "contient",
};

function opsForType(t: ConditionFieldDef["type"]): CondOp[] {
  switch (t) {
    case "number": return NUMERIC_OPS;
    case "enum": return ENUM_OPS;
    case "boolean": return BOOL_OPS;
    default: return STRING_OPS;
  }
}

// =============================================
// Adaptateurs vers les formats moteur
// =============================================
/** Format Notifications: {all:[{field,op,value}]} ou {any:[…]} */
export function toNotifConditions(tree: CondTree | null): Record<string, unknown> | null {
  if (!tree || tree.rules.length === 0) return null;
  return { [tree.combinator]: tree.rules };
}

/** Format Validation: clés directes + raccourcis numériques (min_duration_minutes…) */
export function toValidationConditions(tree: CondTree | null): Record<string, unknown> | null {
  if (!tree || tree.rules.length === 0) return null;
  const buildOne = (leaf: CondLeaf): Record<string, unknown> => {
    // Raccourcis pour le matcher actuel
    if (leaf.field === "duration_minutes" && (leaf.op === "gte" || leaf.op === "gt")) {
      return { min_duration_minutes: Number(leaf.value) };
    }
    if (leaf.field === "ecart_pct" && (leaf.op === "gte" || leaf.op === "gt")) {
      return { ecart_seuil_pct: Number(leaf.value) };
    }
    if (leaf.field === "age_hours" && (leaf.op === "gte" || leaf.op === "gt")) {
      return { min_age_hours: Number(leaf.value) };
    }
    if (leaf.op === "eq") return { [leaf.field]: leaf.value };
    // Sinon : fallback sur égalité (le matcher de validation est limité)
    return { [leaf.field]: leaf.value };
  };
  if (tree.combinator === "any") {
    return { or: tree.rules.map(buildOne) };
  }
  return Object.assign({}, ...tree.rules.map(buildOne));
}

/** Tente de parser un format existant en CondTree (best effort) */
export function fromAnyConditions(raw: unknown): CondTree {
  const empty: CondTree = { combinator: "all", rules: [] };
  if (!raw || typeof raw !== "object") return empty;
  const obj = raw as Record<string, unknown>;
  // Notif format
  if (Array.isArray(obj.all)) {
    return { combinator: "all", rules: obj.all.filter((r) => typeof r === "object" && r && "field" in r) as CondLeaf[] };
  }
  if (Array.isArray(obj.any)) {
    return { combinator: "any", rules: obj.any.filter((r) => typeof r === "object" && r && "field" in r) as CondLeaf[] };
  }
  // Validation format
  if (Array.isArray(obj.or)) {
    const rules: CondLeaf[] = [];
    for (const g of obj.or) {
      if (g && typeof g === "object") {
        for (const [k, v] of Object.entries(g as Record<string, unknown>)) {
          rules.push(decodeShortcut(k, v));
        }
      }
    }
    return { combinator: "any", rules };
  }
  // Plain object → AND
  const rules: CondLeaf[] = [];
  for (const [k, v] of Object.entries(obj)) {
    rules.push(decodeShortcut(k, v));
  }
  return { combinator: "all", rules };
}

function decodeShortcut(key: string, value: unknown): CondLeaf {
  if (key === "min_duration_minutes") return { field: "duration_minutes", op: "gte", value: Number(value) };
  if (key === "ecart_seuil_pct") return { field: "ecart_pct", op: "gte", value: Number(value) };
  if (key === "min_age_hours") return { field: "age_hours", op: "gte", value: Number(value) };
  return { field: key, op: "eq", value: value as string | number | boolean };
}

// =============================================
// Composant
// =============================================
interface Props {
  module: string;
  value: CondTree;
  onChange: (next: CondTree) => void;
}

export function ConditionBuilder({ module, value, onChange }: Props) {
  const fields = useMemo(() => getConditionFields(module), [module]);
  const fieldByKey = useMemo(() => {
    const m = new Map<string, ConditionFieldDef>();
    fields.forEach((f) => m.set(f.key, f));
    return m;
  }, [fields]);

  const addRule = () => {
    const first = fields[0];
    if (!first) return;
    const op = opsForType(first.type)[0];
    const defaultValue = first.type === "number" ? 0 : first.type === "boolean" ? true : (first.values?.[0] ?? "");
    onChange({ ...value, rules: [...value.rules, { field: first.key, op, value: defaultValue }] });
  };

  const updateRule = (i: number, patch: Partial<CondLeaf>) => {
    const next = value.rules.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ ...value, rules: next });
  };

  const removeRule = (i: number) => {
    onChange({ ...value, rules: value.rules.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-2 rounded-md border p-3 bg-muted/30">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Déclencher si</span>
        <Select value={value.combinator} onValueChange={(v) => onChange({ ...value, combinator: v as "all" | "any" })}>
          <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">TOUTES vraies</SelectItem>
            <SelectItem value="any">AU MOINS UNE vraie</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">des conditions :</span>
      </div>

      {value.rules.length === 0 && (
        <p className="text-xs text-muted-foreground italic px-1">
          Aucune condition : la règle se déclenchera systématiquement.
        </p>
      )}

      {value.rules.map((r, i) => {
        const def = fieldByKey.get(r.field);
        const ops = def ? opsForType(def.type) : STRING_OPS;
        return (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <Select value={r.field} onValueChange={(v) => {
              const newDef = fieldByKey.get(v);
              const newOp = newDef ? opsForType(newDef.type)[0] : "eq";
              const newVal = newDef?.type === "number" ? 0 : newDef?.type === "boolean" ? true : (newDef?.values?.[0] ?? "");
              updateRule(i, { field: v, op: newOp, value: newVal });
            }}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}{f.unit ? ` (${f.unit})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={r.op} onValueChange={(v) => updateRule(i, { op: v as CondOp })}>
              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ops.map((o) => <SelectItem key={o} value={o}>{OP_LABEL[o]}</SelectItem>)}
              </SelectContent>
            </Select>

            {def?.type === "enum" ? (
              <Select value={String(r.value)} onValueChange={(v) => updateRule(i, { value: v })}>
                <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(def.values ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : def?.type === "boolean" ? (
              <Select value={String(r.value)} onValueChange={(v) => updateRule(i, { value: v === "true" })}>
                <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">vrai</SelectItem>
                  <SelectItem value="false">faux</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={def?.type === "number" ? "number" : "text"}
                className="h-8 w-32"
                value={String(r.value ?? "")}
                onChange={(e) => updateRule(i, { value: def?.type === "number" ? Number(e.target.value) : e.target.value })}
              />
            )}

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRule(i)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={addRule} disabled={fields.length === 0}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une condition
      </Button>
    </div>
  );
}
