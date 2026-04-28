import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface Props {
  /** filter form fields */
  children: React.ReactNode;
  /** Active chips displayed inline (mobile) and acting as quick-removes */
  activeChips?: Chip[];
  /** count for the trigger button badge */
  activeCount?: number;
  /** Reset everything */
  onReset?: () => void;
  /** Visible only on mobile when true. Defaults to true. */
  mobileOnly?: boolean;
  className?: string;
}

/**
 * Mobile-friendly filter container.
 * - Mobile: trigger button "Filtres" + side Sheet + inline removable chips.
 * - Tablet/desktop (mobileOnly=true, default): renders nothing (parent keeps its inline filter row).
 */
export function FilterSheet({
  children, activeChips = [], activeCount, onReset, mobileOnly = true, className,
}: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  if (mobileOnly && !isMobile) return null;

  const count = activeCount ?? activeChips.length;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 gap-1.5 flex-1 sm:flex-none">
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                  {count}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-xl">
            <SheetHeader className="p-4 pb-3 border-b text-left">
              <SheetTitle className="text-base">Filtres</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {children}
            </div>
            <div className="border-t p-3 grid grid-cols-2 gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {onReset && (
                <Button
                  variant="ghost"
                  className="h-11"
                  onClick={() => { onReset(); }}
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" /> Réinitialiser
                </Button>
              )}
              <Button className={cn("h-11", !onReset && "col-span-2")} onClick={() => setOpen(false)}>
                Voir les résultats
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {onReset && count > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-10 px-2 text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((c) => (
            <Badge
              key={c.key}
              variant="secondary"
              className="gap-1 pl-2 pr-1 py-0.5 text-[11px] font-medium"
            >
              {c.label}
              <button
                aria-label={`Retirer ${c.label}`}
                onClick={c.onRemove}
                className="rounded-full p-0.5 hover:bg-background/80"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
