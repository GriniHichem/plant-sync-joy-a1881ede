import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Auto-warn the user after `hours` of inactivity inside a shift app.
 * Default 8h matches a single industrial shift. We DO NOT auto-close the shift —
 * that decision must stay with the operator. We just show a confirmation toast.
 */
export function useShiftSessionTimeout(hours = 8, onConfirmClose?: () => void) {
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const ms = hours * 3_600_000;
    const t = setTimeout(() => {
      toast("Votre shift est ouvert depuis " + hours + "h", {
        description: "Pensez à clôturer votre quart.",
        action: onConfirmClose
          ? { label: "Clôturer", onClick: () => onConfirmClose() }
          : undefined,
        duration: 60_000,
      });
    }, ms - (Date.now() - startRef.current));
    return () => clearTimeout(t);
  }, [hours, onConfirmClose]);
}
