import { createContext, useContext, ReactNode } from "react";
import { useActiveProductionShift, ActiveProductionShift } from "@/hooks/useActiveProductionShift";
import { useActiveQualityShift, ActiveQualityShift } from "@/hooks/useActiveQualityShift";
import { useActiveMaintenanceShift, ActiveMaintenanceShift } from "@/hooks/useActiveMaintenanceShift";
import { useAutoOpenWorkSession } from "@/hooks/useAutoOpenWorkSession";
import { useActiveShiftContext, ActiveShiftContextData } from "@/hooks/useActiveShiftContext";



export type ShiftKind = "production" | "maintenance" | "quality";

interface ActiveShiftContextValue {
  kind: ShiftKind;
  productionShift: ActiveProductionShift | null;
  productionShifts: ActiveProductionShift[];
  setProductionShiftId: (id: string | null) => void;
  maintenanceShift: ActiveMaintenanceShift | null;
  qualityShift: ActiveQualityShift | null;
  qualityShifts: ActiveQualityShift[];
  setQualityShiftId: (id: string | null) => void;
  /** Team-based rotation context (active team + template + on-shift state). */
  shiftContext: ActiveShiftContextData;
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
  const shiftCtx = useActiveShiftContext();

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

  // Auto-open the employee's session based on their rotation pattern on connection.
  useAutoOpenWorkSession(() => { void refresh(); });


  return (
    <ActiveShiftContext.Provider
      value={{
        kind,
        productionShift: prod.shift,
        productionShifts: prod.shifts,
        setProductionShiftId: prod.setSelectedId,
        maintenanceShift: maint.shift,
        qualityShift: qual.shift,
        qualityShifts: qual.shifts,
        setQualityShiftId: qual.setSelectedId,
        shiftContext: shiftCtx,
        loading,
        refresh,
      }}
    >
      {children}
    </ActiveShiftContext.Provider>
  );
}
