import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CharacteristicEntry {
  key: string;
  value: string;
  unit: string;
}

interface Props {
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  disabled?: boolean;
}

/**
 * Editor for the JSONB caracteristiques_techniques field on machines/organes/pdr.
 * Stores as `{ [key]: { value, unit } }` so we keep both information cleanly.
 */
export function CustomCharacteristicsEditor({ value, onChange, disabled }: Props) {
  const initial = useCallback((): CharacteristicEntry[] => {
    if (!value || typeof value !== "object") return [];
    return Object.entries(value).map(([k, v]) => {
      if (v && typeof v === "object" && "value" in (v as any)) {
        return { key: k, value: String((v as any).value ?? ""), unit: String((v as any).unit ?? "") };
      }
      return { key: k, value: String(v ?? ""), unit: "" };
    });
  }, [value]);

  const [entries, setEntries] = useState<CharacteristicEntry[]>(initial);

  const commit = (next: CharacteristicEntry[]) => {
    setEntries(next);
    const obj: Record<string, any> = {};
    for (const e of next) {
      const k = e.key.trim();
      if (!k) continue;
      obj[k] = e.unit ? { value: e.value, unit: e.unit } : e.value;
    }
    onChange(obj);
  };

  const add = () => commit([...entries, { key: "", value: "", unit: "" }]);
  const update = (i: number, patch: Partial<CharacteristicEntry>) =>
    commit(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => commit(entries.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune caractéristique personnalisée.</p>
      )}
      {entries.map((e, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            {i === 0 && <Label className="text-xs">Nom</Label>}
            <Input
              value={e.key}
              disabled={disabled}
              onChange={(ev) => update(i, { key: ev.target.value })}
              placeholder="ex. course_mm"
              className="h-10"
            />
          </div>
          <div className="col-span-5">
            {i === 0 && <Label className="text-xs">Valeur</Label>}
            <Input
              value={e.value}
              disabled={disabled}
              onChange={(ev) => update(i, { value: ev.target.value })}
              placeholder="ex. 200"
              className="h-10"
            />
          </div>
          <div className="col-span-2">
            {i === 0 && <Label className="text-xs">Unité</Label>}
            <Input
              value={e.unit}
              disabled={disabled}
              onChange={(ev) => update(i, { unit: ev.target.value })}
              placeholder="mm, kg…"
              className="h-10"
            />
          </div>
          <div className="col-span-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => remove(i)}
              className="h-10 w-full"
              aria-label="Supprimer"
            >
              ✕
            </Button>
          </div>
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          + Ajouter caractéristique personnalisée
        </Button>
      )}
    </div>
  );
}
