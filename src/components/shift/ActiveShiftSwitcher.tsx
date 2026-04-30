import { useActiveShift } from "@/contexts/ActiveShiftContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Factory, ClipboardList } from "lucide-react";

const SHIFT_LABEL: Record<string, string> = {
  matin: "Matin",
  apres_midi: "Après-midi",
  nuit: "Nuit",
};

/**
 * Sélecteur d'OF / shift actif quand le user pilote plusieurs lignes en parallèle.
 * Visible uniquement s'il y a >1 shift actif (ou rien à afficher sinon).
 */
export function ActiveShiftSwitcher() {
  const {
    kind,
    productionShift,
    productionShifts,
    setProductionShiftId,
    qualityShift,
    qualityShifts,
    setQualityShiftId,
  } = useActiveShift();

  if (kind === "maintenance") return null;

  const list = kind === "production" ? productionShifts : qualityShifts;
  const current = kind === "production" ? productionShift : qualityShift;

  if (!current || list.length <= 1) return null;

  const labelFor = (s: typeof list[number]) => {
    if (kind === "production") {
      const ofNum = (s as any).of?.numero ?? "—";
      const line = (s as any).line?.code ?? "—";
      return `OF ${ofNum} · ${line}`;
    }
    const lines = (s as any).lines?.map((l: any) => l.code).join(", ") || "—";
    return `Lignes ${lines}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2">
          {kind === "production" ? <Factory className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
          <span className="font-medium">{labelFor(current)}</span>
          <span className="text-muted-foreground">({list.length})</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs">
          OFs ouverts — {list.length} session{list.length > 1 ? "s" : ""} active{list.length > 1 ? "s" : ""}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list.map((s) => {
          const isCurrent = s.id === current.id;
          return (
            <DropdownMenuItem
              key={s.id}
              onSelect={() => {
                if (kind === "production") setProductionShiftId(s.id);
                else setQualityShiftId(s.id);
              }}
              className={isCurrent ? "bg-accent" : ""}
            >
              <div className="flex flex-col gap-0.5 w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{labelFor(s)}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {SHIFT_LABEL[s.shift_type] ?? s.shift_type}
                  </span>
                </div>
                {s.team?.code && (
                  <span className="text-xs text-muted-foreground">Équipe {s.team.code}</span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
