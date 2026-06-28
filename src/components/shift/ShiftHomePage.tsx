import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RespShiftConsole } from "@/components/shift/RespShiftConsole";
import { MaintenanceRespDashboard } from "@/components/shift/MaintenanceRespDashboard";
import type { ShiftKind } from "@/contexts/ActiveShiftContext";

interface Props {
  kind: ShiftKind;
  /** Where the operator is sent for the kiosk experience. */
  operatorRedirect: string;
  /** Roles that should see the responsable console. */
  managerRoles: string[];
  /** Roles that should be redirected to the operator kiosk. */
  operatorRoles: string[];
}

/**
 * Page rendered inside the standard AppLayout.
 * - Managers see the responsable console (open / supervise / force-close sessions).
 * - Operators are redirected to the kiosk app (no sidebar).
 */
export function ShiftHomePage({ kind, operatorRedirect, managerRoles, operatorRoles }: Props) {
  const { hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isManager = managerRoles.some((r) => hasRole(r as any));
  const isOperator = operatorRoles.some((r) => hasRole(r as any));

  // Pure operator → kiosk
  if (isOperator && !isManager) {
    return <Navigate to={operatorRedirect} replace />;
  }

  // Manager (or admin) → responsable console
  if (kind === "maintenance") {
    return <MaintenanceRespDashboard />;
  }
  return <RespShiftConsole kind={kind} />;
}
