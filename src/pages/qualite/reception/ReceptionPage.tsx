import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Truck } from "lucide-react";
import ReceptionSettings from "./ReceptionSettings";
import ReceptionQualitative from "./ReceptionQualitative";
import ReceptionQuantitative from "./ReceptionQuantitative";
import ReceptionGlobal from "./ReceptionGlobal";
import { useHasActiveReceptionTicket } from "./receptionDraftStore";
import { usePermissions } from "@/hooks/usePermissions";

type TabKey = "qualitative" | "quantitative" | "global" | "settings";

const TAB_MODULES: Record<TabKey, string> = {
  qualitative: "reception_qualitative",
  quantitative: "reception_quantitative",
  global: "reception_global",
  settings: "reception_settings",
};

export default function ReceptionPage() {
  const [params, setParams] = useSearchParams();
  const hasActive = useHasActiveReceptionTicket();
  const { canView, loading: permsLoading } = usePermissions();

  const visibleTabs = useMemo<TabKey[]>(() => {
    const all: TabKey[] = ["qualitative", "quantitative", "global", "settings"];
    return all.filter((t) => canView(TAB_MODULES[t]));
  }, [canView, permsLoading]);

  const requestedTab = (params.get("tab") ?? "qualitative") as TabKey;
  const tab: TabKey = visibleTabs.includes(requestedTab)
    ? requestedTab
    : (visibleTabs[0] ?? "qualitative");

  useEffect(() => {
    if (!permsLoading && visibleTabs.length > 0 && tab !== requestedTab) {
      setParams({ tab }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, requestedTab, permsLoading, visibleTabs.length]);

  const setTab = (v: string) => {
    if (hasActive && tab === "qualitative" && v !== "qualitative") {
      const ok = window.confirm(
        "Un ticket de réception qualitative est en cours. Le brouillon est conservé mais vous risquez de manquer la clôture. Quitter cet onglet ?",
      );
      if (!ok) return;
    }
    setParams({ tab: v }, { replace: true });
  };

  useEffect(() => {
    if (!hasActive) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasActive]);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center gap-2 md:gap-3">
        <Truck className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-2xl font-bold leading-tight truncate">Réception Fruits &amp; Légumes</h1>
          <p className="hidden md:block text-sm text-muted-foreground">Réception qualitative, pesée pont-bascule et consultation globale</p>
        </div>
      </div>

      {visibleTabs.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground text-sm">
          Aucun sous-module accessible avec votre rôle.
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <div className="sticky top-0 z-20 -mx-3 md:-mx-5 lg:-mx-6 px-3 md:px-5 lg:px-6 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
            <TabsList
              className="w-full md:w-auto flex md:grid overflow-x-auto no-scrollbar"
              style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0,1fr))` }}
            >
              {visibleTabs.includes("qualitative") && (
                <TabsTrigger value="qualitative" className="whitespace-nowrap flex-1 md:flex-none">Qualitative</TabsTrigger>
              )}
              {visibleTabs.includes("quantitative") && (
                <TabsTrigger value="quantitative" className="whitespace-nowrap flex-1 md:flex-none">Pont-bascule</TabsTrigger>
              )}
              {visibleTabs.includes("global") && (
                <TabsTrigger value="global" className="whitespace-nowrap flex-1 md:flex-none">Consultation</TabsTrigger>
              )}
              {visibleTabs.includes("settings") && (
                <TabsTrigger value="settings" className="whitespace-nowrap flex-1 md:flex-none">Paramétrage</TabsTrigger>
              )}
            </TabsList>
          </div>
          {visibleTabs.includes("qualitative") && (
            <TabsContent value="qualitative" className="mt-4"><ReceptionQualitative /></TabsContent>
          )}
          {visibleTabs.includes("quantitative") && (
            <TabsContent value="quantitative" className="mt-4"><ReceptionQuantitative /></TabsContent>
          )}
          {visibleTabs.includes("global") && (
            <TabsContent value="global" className="mt-4"><ReceptionGlobal /></TabsContent>
          )}
          {visibleTabs.includes("settings") && (
            <TabsContent value="settings" className="mt-4"><ReceptionSettings /></TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
