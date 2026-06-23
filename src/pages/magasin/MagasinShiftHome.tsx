import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MagasinDashboard } from "@/pages/magasin/MagasinDashboard";

/**
 * /magasin/shift home (inside AppLayout):
 * - Pure warehouse keeper → redirected to the full-screen kiosk.
 * - Warehouse manager / admin → supervision dashboard.
 */
export default function MagasinShiftHome() {
  const { hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isManager = hasRole("admin") || hasRole("responsable_magasin");
  const isKeeper = hasRole("gestionnaire_magasin");

  if (isKeeper && !isManager) {
    return <Navigate to="/magasin/shift/live" replace />;
  }

  return <MagasinDashboard />;
}
