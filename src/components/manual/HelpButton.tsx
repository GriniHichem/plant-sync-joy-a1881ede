import { lazy, Suspense } from "react";
import { HelpCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useManual } from "@/contexts/ManualContext";
import { getManualSectionForRoute } from "@/manual/manualRouteMap";

const ManualSheet = lazy(() => import("./ManualSheet"));

export function HelpButton({ className }: { className?: string }) {
  const { open, openManual } = useManual();
  const location = useLocation();
  const targetId = getManualSectionForRoute(location.pathname);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openManual(targetId ?? undefined)}
        className={cn(
          "h-9 px-2.5 gap-1.5 text-[12px] font-semibold text-foreground/70 hover:text-foreground hover:bg-accent/60",
          className,
        )}
        title="Aide & manuel (touche ?)"
      >
        <HelpCircle size={16} />
        <span className="hidden lg:inline">Aide</span>
      </Button>
      {open && (
        <Suspense fallback={null}>
          <ManualSheet />
        </Suspense>
      )}
    </>
  );
}
