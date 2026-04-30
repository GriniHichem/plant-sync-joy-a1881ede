import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useActiveShift } from "@/contexts/ActiveShiftContext";

interface ShiftGuardProps {
  children: ReactNode;
  /** When true, child is allowed even without an active shift (e.g. start screen). */
  allowWithoutShift?: boolean;
}

/**
 * Blocks rendering of inner shift sub-pages when the user has no active shift.
 * The "home" page of each shift app handles starting a shift and should set
 * allowWithoutShift={true}.
 */
export function ShiftGuard({ children, allowWithoutShift = false }: ShiftGuardProps) {
  const { kind, productionShift, qualityShift, loading } = useActiveShift();

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Chargement du shift...
      </div>
    );
  }

  // Maintenance never has a DB shift — always allowed.
  if (kind === "maintenance") return <>{children}</>;

  const hasActive =
    (kind === "production" && !!productionShift) ||
    (kind === "quality" && !!qualityShift);

  if (hasActive || allowWithoutShift) return <>{children}</>;

  const homeUrl =
    kind === "production" ? "/gpao/shift" :
    kind === "quality" ? "/qualite/shift" : "/apps";

  return (
    <Card className="max-w-lg mx-auto mt-8">
      <CardContent className="p-8 text-center space-y-4">
        <ClipboardCheck className="h-12 w-12 text-muted-foreground/40 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold">Aucun shift actif</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vous devez démarrer votre shift avant d'accéder à cette page.
          </p>
        </div>
        <Button asChild>
          <Link to={homeUrl}>Démarrer mon shift</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
