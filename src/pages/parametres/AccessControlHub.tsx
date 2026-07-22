import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Users, FileText, Package, ClipboardCheck, CheckSquare, Activity, ToggleLeft, Download, LayoutGrid, Truck } from "lucide-react";
import RolesTab from "./access-control/RolesTab";
import QualityPermissionsTab from "./access-control/QualityPermissionsTab";
import ReceptionPermissionsTab from "./access-control/ReceptionPermissionsTab";
import AuditControlTab from "./access-control/AuditControlTab";
import ControlSwitchesTab from "./access-control/ControlSwitchesTab";
import PortabilityTab from "./access-control/PortabilityTab";
import OverviewTab from "./access-control/OverviewTab";
import RolesMatrix from "./RolesMatrix";
import DocumentPermissionsAdmin from "./DocumentPermissionsAdmin";
import PdrStockPermissionsAdmin from "./PdrStockPermissionsAdmin";

const TABS = [
  { value: "overview", label: "Vue d'ensemble", icon: LayoutGrid },
  { value: "roles", label: "Rôles", icon: Users },
  { value: "matrix", label: "Matrice modules", icon: ShieldCheck },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "pdr", label: "PDR & Stock", icon: Package },
  { value: "quality", label: "Qualité", icon: ClipboardCheck },
  { value: "reception", label: "Réception", icon: Truck },
  { value: "validations", label: "Workflows", icon: CheckSquare },
  { value: "audit", label: "Audit & Contrôle", icon: Activity },
  { value: "control", label: "Système", icon: ToggleLeft },
  { value: "portability", label: "Portabilité", icon: Download },
];

export default function AccessControlHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get("tab") ?? "overview";
  const [tab, setTab] = useState(TABS.some((t) => t.value === initial) ? initial : "overview");

  useEffect(() => {
    const current = searchParams.get("tab");
    if (current !== tab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Sécurité, Rôles & Accès</h1>
          <p className="text-muted-foreground">Hub centralisé : permissions, rôles, audit et contrôles globaux</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="flex flex-col md:flex-row gap-4">
        <Card className="md:w-56 shrink-0">
          <CardContent className="p-2">
            <TabsList className="flex md:flex-col md:items-stretch md:h-auto gap-1 bg-transparent overflow-x-auto md:overflow-visible w-full">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  title={t.label}
                  className="justify-start gap-2 px-3 h-9 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground w-full"
                >
                  <t.icon className="h-4 w-4 shrink-0" />
                  <span>{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </CardContent>
        </Card>

        <div className="flex-1 min-w-0">
          <TabsContent value="overview" className="mt-0"><OverviewTab onJump={setTab} /></TabsContent>
          <TabsContent value="roles" className="mt-0"><RolesTab /></TabsContent>
          <TabsContent value="matrix" className="mt-0"><RolesMatrix /></TabsContent>
          <TabsContent value="documents" className="mt-0"><DocumentPermissionsAdmin /></TabsContent>
          <TabsContent value="pdr" className="mt-0"><PdrStockPermissionsAdmin /></TabsContent>
          <TabsContent value="quality" className="mt-0"><QualityPermissionsTab /></TabsContent>
          <TabsContent value="reception" className="mt-0"><ReceptionPermissionsTab /></TabsContent>
          <TabsContent value="validations" className="mt-0">
            <Card>
              <CardHeader><CardTitle>Workflows & Validations</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Configuration des règles de validation et droits d'approbation.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => navigate("/parametres/validations")}>Règles de validation</Button>
                  <Button variant="outline" onClick={() => navigate("/parametres/notifications")}>Règles de notification</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="audit" className="mt-0"><AuditControlTab /></TabsContent>
          <TabsContent value="control" className="mt-0"><ControlSwitchesTab /></TabsContent>
          <TabsContent value="portability" className="mt-0"><PortabilityTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
