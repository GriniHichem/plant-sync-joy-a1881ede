import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Truck } from "lucide-react";
import ReceptionSettings from "./ReceptionSettings";
import ReceptionQualitative from "./ReceptionQualitative";
import ReceptionQuantitative from "./ReceptionQuantitative";
import ReceptionGlobal from "./ReceptionGlobal";

export default function ReceptionPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "qualitative";
  const setTab = (v: string) => setParams({ tab: v }, { replace: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Réception Fruits &amp; Légumes</h1>
          <p className="text-sm text-muted-foreground">Réception qualitative, pesée pont-bascule et consultation globale</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="qualitative">Qualitative</TabsTrigger>
          <TabsTrigger value="quantitative">Pont-bascule</TabsTrigger>
          <TabsTrigger value="global">Consultation</TabsTrigger>
          <TabsTrigger value="settings">Paramétrage</TabsTrigger>
        </TabsList>
        <TabsContent value="qualitative" className="mt-4"><ReceptionQualitative /></TabsContent>
        <TabsContent value="quantitative" className="mt-4"><ReceptionQuantitative /></TabsContent>
        <TabsContent value="global" className="mt-4"><ReceptionGlobal /></TabsContent>
        <TabsContent value="settings" className="mt-4"><ReceptionSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
