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
import PdrDetail from "@/pages/PdrDetail";
import PdrForm from "@/pages/PdrForm";
import TicketsList from "@/pages/TicketsList";
import TicketDetail from "@/pages/TicketDetail";
import PreventifList from "@/pages/PreventifList";
import PreventifForm from "@/pages/PreventifForm";
import PreventifDetail from "@/pages/PreventifDetail";
import MaintenancierShiftView from "@/pages/MaintenancierShiftView";
import InterventionJournal from "@/pages/InterventionJournal";
import Parametres from "@/pages/Parametres";
import UsersAdmin from "@/pages/parametres/UsersAdmin";
import FamillesAdmin from "@/pages/parametres/FamillesAdmin";
import PannesAdmin from "@/pages/parametres/PannesAdmin";
import RolesMatrix from "@/pages/parametres/RolesMatrix";
import ShiftsAdmin from "@/pages/parametres/ShiftsAdmin";
import LignesAdmin from "@/pages/parametres/LignesAdmin";
import GeneralSettings from "@/pages/parametres/GeneralSettings";
import ImageSettings from "@/pages/parametres/ImageSettings";
import ProductFamiliesAdmin from "@/pages/parametres/ProductFamiliesAdmin";
import DocumentCategoriesAdmin from "@/pages/parametres/DocumentCategoriesAdmin";
import DocumentPermissionsAdmin from "@/pages/parametres/DocumentPermissionsAdmin";
import PdrFamiliesAdmin from "@/pages/parametres/PdrFamiliesAdmin";
import PdrStockPermissionsAdmin from "@/pages/parametres/PdrStockPermissionsAdmin";

import GpaoDashboard from "@/pages/gpao/GpaoDashboard";
import OfList from "@/pages/gpao/OfList";
import OfDetail from "@/pages/gpao/OfDetail";
import ProductsList from "@/pages/gpao/ProductsList";
import ArticlesList from "@/pages/gpao/ArticlesList";
import ProductDetail from "@/pages/gpao/ProductDetail";
import ArticleDetail from "@/pages/gpao/ArticleDetail";
import ShiftScreen from "@/pages/gpao/ShiftScreen";
import ConsumptionPage from "@/pages/gpao/ConsumptionPage";
import StopsPage from "@/pages/gpao/StopsPage";
import RecipesPage from "@/pages/gpao/RecipesPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import EquipmentsList from "@/pages/EquipmentsList";
import EquipmentDetail from "@/pages/EquipmentDetail";
import EquipmentForm from "@/pages/EquipmentForm";
import LinesList from "@/pages/LinesList";
import LineSynoptic from "@/pages/LineSynoptic";
import LineConfig from "@/pages/LineConfig";
import NotFound from "@/pages/NotFound";
import ResetPassword from "@/pages/ResetPassword";
import OrganesList from "@/pages/OrganesList";
import Apps from "@/pages/Apps";
import { ShiftLayout } from "@/components/shift/ShiftLayout";
import { ShiftGuard } from "@/components/shift/ShiftGuard";
import { ActiveShiftProvider } from "@/contexts/ActiveShiftContext";
import SecurityHub from "@/pages/SecurityHub";
import OrganeForm from "@/pages/OrganeForm";
import OrganeDetail from "@/pages/OrganeDetail";
import AuditPage from "@/pages/AuditPage";
import NotificationsPage from "@/pages/NotificationsPage";
import NotificationRulesAdmin from "@/pages/parametres/NotificationRulesAdmin";
import SmtpConfigAdmin from "@/pages/parametres/SmtpConfigAdmin";
import ValidationsPage from "@/pages/ValidationsPage";
import ValidationRulesAdmin from "@/pages/parametres/ValidationRulesAdmin";
import QualiteParametresHub from "@/pages/parametres/qualite/QualiteParametresHub";
import QualiteNcCategoriesAdmin from "@/pages/parametres/qualite/QualiteNcCategoriesAdmin";
import QualiteActionCategoriesAdmin from "@/pages/parametres/qualite/QualiteActionCategoriesAdmin";
import QualiteUnitsAdmin from "@/pages/parametres/qualite/QualiteUnitsAdmin";
import QualiteControlPointsAdmin from "@/pages/parametres/qualite/QualiteControlPointsAdmin";
import QualiteDefectTypesAdmin from "@/pages/parametres/qualite/QualiteDefectTypesAdmin";
import QualiteDecisionReasonsAdmin from "@/pages/parametres/qualite/QualiteDecisionReasonsAdmin";
import SearchPage from "@/pages/SearchPage";
import { GlobalSearchProvider } from "@/components/search/GlobalSearchProvider";
import QualiteDashboard from "@/pages/qualite/QualiteDashboard";
import QualiteOf from "@/pages/qualite/QualiteOf";
import QualiteIndicateurs from "@/pages/qualite/QualiteIndicateurs";
import QualiteControles from "@/pages/qualite/QualiteControles";
import QualiteNonConformites from "@/pages/qualite/QualiteNonConformites";
import QualiteActions from "@/pages/qualite/QualiteActions";
import QualiteRecettesNomenclatures from "@/pages/qualite/QualiteRecettesNomenclatures";
import QualiteTracabilite from "@/pages/qualite/QualiteTracabilite";
import QualiteRapports from "@/pages/qualite/QualiteRapports";
import QualiteShiftScreen from "@/pages/qualite/QualiteShiftScreen";

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

  return (
    <GlobalSearchProvider>
      <AppLayout />
    </GlobalSearchProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoutes />}>
              {/* GMAO */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/apps" element={<Apps />} />
              <Route path="/securite" element={<SecurityHub />} />
              <Route path="/parametres/access-control" element={<Navigate to="/securite" replace />} />
              <Route path="/machines" element={<MachinesList />} />
              <Route path="/machines/new" element={<MachineForm />} />
              <Route path="/machines/:id" element={<MachineDetail />} />
              <Route path="/machines/:id/edit" element={<MachineForm />} />
              <Route path="/pdr" element={<PdrList />} />
              <Route path="/pdr/new" element={<PdrForm />} />
              <Route path="/pdr/:id" element={<PdrDetail />} />
              <Route path="/pdr/:id/edit" element={<PdrForm />} />
              <Route path="/tickets" element={<TicketsList />} />
              <Route path="/tickets/:id" element={<TicketDetail />} />
              <Route path="/preventif" element={<PreventifList />} />
              <Route path="/preventif/new" element={<PreventifForm />} />
              <Route path="/preventif/:id" element={<PreventifDetail />} />
              <Route path="/preventif/:id/edit" element={<PreventifForm />} />
              <Route path="/maintenance/shift" element={<MaintenancierShiftView />} />
              <Route path="/maintenance/journal" element={<InterventionJournal />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/equipements" element={<EquipmentsList />} />
              <Route path="/equipements/new" element={<EquipmentForm />} />
              <Route path="/equipements/:id" element={<EquipmentDetail />} />
              <Route path="/equipements/:id/edit" element={<EquipmentForm />} />
              <Route path="/organes" element={<OrganesList />} />
              <Route path="/organes/new" element={<OrganeForm />} />
              <Route path="/organes/:id" element={<OrganeDetail />} />
              <Route path="/organes/:id/edit" element={<OrganeForm />} />
              {/* Lignes synoptique */}
              <Route path="/lignes" element={<LinesList />} />
              <Route path="/lignes/:id" element={<LineSynoptic />} />
              <Route path="/lignes/:id/config" element={<LineConfig />} />
              {/* GPAO */}
              <Route path="/gpao" element={<GpaoDashboard />} />
              <Route path="/gpao/of" element={<OfList />} />
              <Route path="/gpao/of/:id" element={<OfDetail />} />
              <Route path="/gpao/produits" element={<ProductsList />} />
              <Route path="/gpao/produits/:id" element={<ProductDetail />} />
              <Route path="/gpao/articles" element={<ArticlesList />} />
              <Route path="/gpao/articles/:id" element={<ArticleDetail />} />
              <Route path="/gpao/shift" element={<ShiftScreen />} />
              <Route path="/gpao/consommations" element={<ConsumptionPage />} />
              <Route path="/gpao/arrets" element={<StopsPage />} />
              <Route path="/gpao/recettes" element={<RecipesPage />} />
              {/* Admin */}
              <Route path="/parametres" element={<Parametres />} />
              <Route path="/parametres/users" element={<UsersAdmin />} />
              
              <Route path="/parametres/familles" element={<FamillesAdmin />} />
              <Route path="/parametres/pannes" element={<PannesAdmin />} />
              <Route path="/parametres/roles" element={<RolesMatrix />} />
              <Route path="/parametres/shifts" element={<ShiftsAdmin />} />
              <Route path="/parametres/lignes" element={<LignesAdmin />} />
              <Route path="/parametres/familles-produits" element={<ProductFamiliesAdmin />} />
              <Route path="/parametres/images" element={<ImageSettings />} />
              <Route path="/parametres/document-categories" element={<DocumentCategoriesAdmin />} />
              <Route path="/parametres/document-permissions" element={<DocumentPermissionsAdmin />} />
              <Route path="/parametres/familles-pdr" element={<PdrFamiliesAdmin />} />
              <Route path="/parametres/general" element={<GeneralSettings />} />
              <Route path="/parametres/pdr-stock-permissions" element={<PdrStockPermissionsAdmin />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/parametres/notifications" element={<NotificationRulesAdmin />} />
              <Route path="/parametres/smtp" element={<SmtpConfigAdmin />} />
              <Route path="/validations" element={<ValidationsPage />} />
              <Route path="/parametres/validations" element={<ValidationRulesAdmin />} />
              <Route path="/parametres/qualite" element={<QualiteParametresHub />} />
              <Route path="/parametres/qualite/nc-categories" element={<QualiteNcCategoriesAdmin />} />
              <Route path="/parametres/qualite/action-categories" element={<QualiteActionCategoriesAdmin />} />
              <Route path="/parametres/qualite/units" element={<QualiteUnitsAdmin />} />
              <Route path="/parametres/qualite/control-points" element={<QualiteControlPointsAdmin />} />
              <Route path="/parametres/qualite/defect-types" element={<QualiteDefectTypesAdmin />} />
              <Route path="/parametres/qualite/decision-reasons" element={<QualiteDecisionReasonsAdmin />} />
              <Route path="/recherche" element={<SearchPage />} />
              {/* Qualité & Traçabilité */}
              <Route path="/qualite" element={<QualiteDashboard />} />
              <Route path="/qualite/of" element={<QualiteOf />} />
              <Route path="/qualite/shift" element={<QualiteShiftScreen />} />
              <Route path="/qualite/indicateurs" element={<QualiteIndicateurs />} />
              <Route path="/qualite/controles" element={<QualiteControles />} />
              <Route path="/qualite/non-conformites" element={<QualiteNonConformites />} />
              <Route path="/qualite/actions" element={<QualiteActions />} />
              <Route path="/qualite/recettes-nomenclatures" element={<QualiteRecettesNomenclatures />} />
              <Route path="/qualite/tracabilite" element={<QualiteTracabilite />} />
              <Route path="/qualite/rapports" element={<QualiteRapports />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
