import { NavLink } from "react-router-dom";
import { useActiveShift } from "@/contexts/ActiveShiftContext";
import {
  Home,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  Factory,
  Ban,
  ListChecks,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DockItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** When true, item only enabled if a shift is active */
  requireShift?: boolean;
}

/**
 * Bottom dock for each shift kiosk app — large touch targets,
 * shows the most useful actions for the current shift kind.
 */
export function ShiftDock() {
  const { kind, productionShift, qualityShift } = useActiveShift();

  const items: DockItem[] = (() => {
    if (kind === "production") {
      return [
        { to: "/gpao/shift", label: "Accueil", icon: Home },
        { to: "/gpao/shift/declarer", label: "Déclarer", icon: Activity, requireShift: true },
        { to: "/gpao/shift/arret", label: "Arrêt", icon: Ban, requireShift: true },
        { to: "/gpao/shift/ticket", label: "Ticket", icon: AlertTriangle, requireShift: true },
      ];
    }
    if (kind === "maintenance") {
      return [
        { to: "/maintenance/shift", label: "Mes tâches", icon: ListChecks },
        { to: "/maintenance/shift/intervention", label: "Intervenir", icon: Wrench },
      ];
    }
    // quality
    return [
      { to: "/qualite/shift", label: "Accueil", icon: Home },
      { to: "/qualite/shift/check", label: "Contrôle", icon: ClipboardCheck, requireShift: true },
      { to: "/qualite/shift/nc", label: "NC", icon: AlertTriangle, requireShift: true },
      { to: "/qualite/shift/lignes", label: "Lignes", icon: Factory, requireShift: true },
    ];
  })();

  const hasShift =
    (kind === "production" && !!productionShift) ||
    (kind === "quality" && !!qualityShift) ||
    kind === "maintenance";

  return (
    <nav
      className="sticky bottom-0 z-30 border-t-2 border-border bg-card/95 backdrop-blur shadow-lg"
      aria-label="Actions du shift"
    >
      <ul className="grid grid-cols-4 max-w-2xl mx-auto">
        {items.map((it) => {
          const Icon = it.icon;
          const disabled = it.requireShift && !hasShift;
          return (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.to.endsWith("/shift")}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-xs font-medium transition-colors",
                    disabled && "opacity-40 pointer-events-none",
                    isActive
                      ? "text-primary border-t-2 border-primary -mt-[2px] bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
