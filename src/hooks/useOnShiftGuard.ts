import { useActiveShift } from "@/contexts/ActiveShiftContext";

/**
 * Reads on-shift state from the team-based rotation context.
 * - allowed: true if the user is currently on shift OR has free authorization.
 * - needsOverride: true when not allowed (a section manager override is required).
 *
 * UI enforcement (warnings / manager override workflow) is wired in phase 2.
 */
export function useOnShiftGuard(_scope?: "production" | "maintenance" | "quality") {
  const { shiftContext } = useActiveShift();
  const allowed = shiftContext.isOnShift || shiftContext.autorisationLibre;
  return {
    allowed,
    needsOverride: !allowed,
    isOnShift: shiftContext.isOnShift,
    autorisationLibre: shiftContext.autorisationLibre,
    team: shiftContext.teamName,
    template: shiftContext.templateCode,
  };
}
