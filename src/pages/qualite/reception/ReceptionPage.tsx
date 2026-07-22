import { useEffect } from "react";
import { useSearchParams, useBlocker } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Truck } from "lucide-react";
import ReceptionSettings from "./ReceptionSettings";
import ReceptionQualitative from "./ReceptionQualitative";
import ReceptionQuantitative from "./ReceptionQuantitative";
import ReceptionGlobal from "./ReceptionGlobal";
import { useHasActiveReceptionTicket } from "./receptionDraftStore";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ReceptionPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "qualitative";
  const hasActive = useHasActiveReceptionTicket();

  const setTab = (v: string) => {
    if (hasActive && tab === "qualitative" && v !== "qualitative") {
      const ok = window.confirm(
        "Un ticket de réception qualitative est en cours. Le brouillon est conservé mais vous risquez de manquer la clôture. Quitter cet onglet ?",
      );
      if (!ok) return;
    }
    setParams({ tab: v }, { replace: true });
  };

  // Bloque toute navigation React Router hors de la page tant qu'un ticket est ouvert.
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    hasActive && currentLocation.pathname !== nextLocation.pathname,
  );

  // Avertissement natif du navigateur à la fermeture / rechargement.
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
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-bold leading-tight truncate">Réception Fruits &amp; Légumes</h1>
          <p className="hidden md:block text-sm text-muted-foreground">Réception qualitative, pesée pont-bascule et consultation globale</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="sticky top-0 z-20 -mx-3 md:-mx-5 lg:-mx-6 px-3 md:px-5 lg:px-6 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
          <TabsList className="w-full md:w-auto flex md:grid md:grid-cols-4 overflow-x-auto no-scrollbar">
            <TabsTrigger value="qualitative" className="whitespace-nowrap flex-1 md:flex-none">Qualitative</TabsTrigger>
            <TabsTrigger value="quantitative" className="whitespace-nowrap flex-1 md:flex-none">Pont-bascule</TabsTrigger>
            <TabsTrigger value="global" className="whitespace-nowrap flex-1 md:flex-none">Consultation</TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap flex-1 md:flex-none">Paramétrage</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="qualitative" className="mt-4"><ReceptionQualitative /></TabsContent>
        <TabsContent value="quantitative" className="mt-4"><ReceptionQuantitative /></TabsContent>
        <TabsContent value="global" className="mt-4"><ReceptionGlobal /></TabsContent>
        <TabsContent value="settings" className="mt-4"><ReceptionSettings /></TabsContent>
      </Tabs>

      <AlertDialog open={blocker.state === "blocked"} onOpenChange={(o) => { if (!o) blocker.reset?.(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ticket de réception en cours</AlertDialogTitle>
            <AlertDialogDescription>
              Un ticket qualitative est ouvert et non clôturé. Votre saisie est sauvegardée localement,
              mais quitter la page peut retarder la clôture. Continuer&nbsp;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Rester sur la page</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>Quitter quand même</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
