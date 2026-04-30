import { createContext, useContext, ReactNode } from "react";
import { useActiveProductionShift, ActiveProductionShift } from "@/hooks/useActiveProductionShift";
import { useActiveQualityShift, ActiveQualityShift } from "@/hooks/useActiveQualityShift";
import { useActiveMaintenanceShift, ActiveMaintenanceShift } from "@/hooks/useActiveMaintenanceShift";

export type ShiftKind = "production" | "maintenance" | "quality";

interface ActiveShiftContextValue {
  kind: ShiftKind;
  productionShift: ActiveProductionShift | null;
  maintenanceShift: ActiveMaintenanceShift | null;
  qualityShift: ActiveQualityShift | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ActiveShiftContext = createContext<ActiveShiftContextValue | null>(null);

export function useActiveShift() {
  const ctx = useContext(ActiveShiftContext);
  if (!ctx) throw new Error("useActiveShift must be used inside ActiveShiftProvider");
  return ctx;
}

export function ActiveShiftProvider({ kind, children }: { kind: ShiftKind; children: ReactNode }) {
  const prod = useActiveProductionShift();
  const maint = useActiveMaintenanceShift();
  const qual = useActiveQualityShift();

  const loading =
    (kind === "production" && prod.loading) ||
    (kind === "maintenance" && maint.loading) ||
    (kind === "quality" && qual.loading) ||
    false;

  const refresh = async () => {
    if (kind === "production") await prod.refresh();
    if (kind === "maintenance") await maint.refresh();
    if (kind === "quality") await qual.refresh();
  };

  return (
    <ActiveShiftContext.Provider
      value={{
        kind,
        productionShift: prod.shift,
        maintenanceShift: maint.shift,
        qualityShift: qual.shift,
        loading,
        refresh,
      }}
    >
      {children}
    </ActiveShiftContext.Provider>
  );
}
