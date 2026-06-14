import { useActiveShift } from "@/contexts/ActiveShiftContext";
import { useOnShiftGuard } from "@/hooks/useOnShiftGuard";
import { AlertTriangle, ShieldCheck } from "lucide-react";

/**
 * Bannière "Guard On-Shift" affichée dans les apps shift (production /
 * maintenance / qualité). Non bloquante : informe l'opérateur quand il agit
 * en dehors de son créneau planifié (rotation par équipe). Une session active
 * reste prioritaire — la bannière n'apparaît que si l'utilisateur n'est ni sur
 * son créneau ni en autorisation libre.
 */
export function OnShiftBanner() {
  const { kind, shiftContext } = useActiveShift();
  const { allowed, isOnShift, autorisationLibre, team, template } = useOnShiftGuard(kind);

  // Rien à afficher tant que le contexte n'a pas chargé d'équipe pour l'utilisateur.
  if (!shiftContext.teamId && !shiftContext.autorisationLibre) return null;

  if (allowed) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>
          {isOnShift
            ? `Sur votre créneau planifié${team ? ` — Équipe ${team}` : ""}${template ? ` (${template})` : ""}.`
            : "Autorisation libre active : vous pouvez intervenir hors créneau."}
        </span>
        {!isOnShift && autorisationLibre && <span className="text-xs opacity-70">(hors créneau)</span>}
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Vous êtes en dehors de votre créneau de rotation planifié
        {team ? ` (Équipe ${team})` : ""}. Vos actions restent possibles mais sont
        signalées et tracées.
      </span>
    </div>
  );
}
