import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/gmao/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import MachinesList from "@/pages/MachinesList";
import MachineDetail from "@/pages/MachineDetail";
import MachineForm from "@/pages/MachineForm";
import PdrList from "@/pages/PdrList";
import TicketsList from "@/pages/TicketsList";
import TicketDetail from "@/pages/TicketDetail";
import PreventifList from "@/pages/PreventifList";
import Parametres from "@/pages/Parametres";
import UsersAdmin from "@/pages/parametres/UsersAdmin";
import FamillesAdmin from "@/pages/parametres/FamillesAdmin";
import PannesAdmin from "@/pages/parametres/PannesAdmin";
import GpaoDashboard from "@/pages/gpao/GpaoDashboard";
import OfList from "@/pages/gpao/OfList";
import OfDetail from "@/pages/gpao/OfDetail";
import ProductsList from "@/pages/gpao/ProductsList";
import ArticlesList from "@/pages/gpao/ArticlesList";
import ShiftScreen from "@/pages/gpao/ShiftScreen";
import ConsumptionPage from "@/pages/gpao/ConsumptionPage";
import StopsPage from "@/pages/gpao/StopsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return <AppLayout />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoutes />}>
              {/* GMAO */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/machines" element={<MachinesList />} />
              <Route path="/machines/new" element={<MachineForm />} />
              <Route path="/machines/:id" element={<MachineDetail />} />
              <Route path="/machines/:id/edit" element={<MachineForm />} />
              <Route path="/pdr" element={<PdrList />} />
              <Route path="/tickets" element={<TicketsList />} />
              <Route path="/tickets/:id" element={<TicketDetail />} />
              <Route path="/preventif" element={<PreventifList />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              {/* GPAO */}
              <Route path="/gpao" element={<GpaoDashboard />} />
              <Route path="/gpao/of" element={<OfList />} />
              <Route path="/gpao/of/:id" element={<OfDetail />} />
              <Route path="/gpao/produits" element={<ProductsList />} />
              <Route path="/gpao/articles" element={<ArticlesList />} />
              <Route path="/gpao/shift" element={<ShiftScreen />} />
              <Route path="/gpao/consommations" element={<ConsumptionPage />} />
              <Route path="/gpao/arrets" element={<StopsPage />} />
              {/* Admin */}
              <Route path="/parametres" element={<Parametres />} />
              <Route path="/parametres/users" element={<UsersAdmin />} />
              <Route path="/parametres/familles" element={<FamillesAdmin />} />
              <Route path="/parametres/pannes" element={<PannesAdmin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
