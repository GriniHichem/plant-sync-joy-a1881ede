import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Users, FileText, Package, ClipboardCheck, CheckSquare, Activity, ToggleLeft, Download, LayoutGrid } from "lucide-react";
import RolesTab from "./access-control/RolesTab";
import QualityPermissionsTab from "./access-control/QualityPermissionsTab";
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
  { value: "validations", label: "Workflows", icon: CheckSquare },
  { value: "audit", label: "Audit & Contrôle", icon: Activity },
  { value: "control", label: "Système", icon: ToggleLeft },
  { value: "portability", label: "Portabilité", icon: Download },
];

export default function AccessControlHub() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

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

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <Card>
          <CardContent className="p-2 overflow-x-auto">
            <TabsList className="flex flex-wrap gap-1 h-auto bg-transparent">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  title={t.label}
                  className="gap-1.5 px-2 sm:px-3 h-9 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <t.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="overview"><OverviewTab onJump={setTab} /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="matrix"><RolesMatrix /></TabsContent>
        <TabsContent value="documents"><DocumentPermissionsAdmin /></TabsContent>
        <TabsContent value="pdr"><PdrStockPermissionsAdmin /></TabsContent>
        <TabsContent value="quality"><QualityPermissionsTab /></TabsContent>
        <TabsContent value="validations">
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
        <TabsContent value="audit"><AuditControlTab /></TabsContent>
        <TabsContent value="control"><ControlSwitchesTab /></TabsContent>
        <TabsContent value="portability"><PortabilityTab /></TabsContent>
      </Tabs>
    </div>
  );
}
