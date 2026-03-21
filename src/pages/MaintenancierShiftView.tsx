import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, Wrench, AlertTriangle, CalendarCheck, Factory, ShieldAlert, ClipboardCheck } from "lucide-react";

interface MachineGroup {
  machine: { id: string; code: string; designation: string };
  items: any[];
}

interface LineGroup {
  line: { id: string; code: string; designation: string } | null;
  machines: MachineGroup[];
}

function buildLineGroups(items: any[], type: "plan" | "ticket"): LineGroup[] {
  const lineMap = new Map<string, LineGroup>();
  for (const item of items) {
    const lineInfo = type === "plan" ? (item as any).production_lines : item.production_lines;
    const machineInfo = item.machines;
    if (!machineInfo) continue;
    const lineKey = lineInfo?.id || "__no_line__";
    if (!lineMap.has(lineKey)) {
      lineMap.set(lineKey, {
        line: lineInfo ? { id: lineInfo.id, code: lineInfo.code, designation: lineInfo.designation } : null,
        machines: [],
      });
    }
    const group = lineMap.get(lineKey)!;
    let mg = group.machines.find(m => m.machine.id === machineInfo.id);
    if (!mg) {
      mg = { machine: { id: machineInfo.id, code: machineInfo.code, designation: machineInfo.designation }, items: [] };
      group.machines.push(mg);
    }
    mg.items.push(item);
  }
  return Array.from(lineMap.values()).sort((a, b) => (a.line?.code || "zzz").localeCompare(b.line?.code || "zzz"));
}

export default function MaintenancierShiftView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadShiftTasks();
  }, [user]);

  const loadShiftTasks = async () => {
    if (!user) return;
    setLoading(true);

    const { data: assignedPlanIds } = await supabase
      .from("preventive_plan_assignees")
      .select("plan_id")
      .eq("user_id", user.id);

    const planIds = (assignedPlanIds || []).map((a: any) => a.plan_id);

    let loadedPlans: any[] = [];
    if (planIds.length > 0) {
      const { data } = await supabase
        .from("preventive_plans")
        .select("*, machines(id, code, designation), production_lines(id, code, designation)")
        .in("id", planIds)
        .eq("statut_plan", "valide")
        .eq("is_active", true);
      loadedPlans = data || [];
    }

    const { data: loadedTickets } = await supabase
      .from("tickets")
      .select("*, machines(id, code, designation), production_lines(id, code, designation)")
      .in("statut", ["ouvert", "pris_en_charge"])
      .or(`assignee_id.eq.${user.id},assignee_id.is.null`);

    setPlans(loadedPlans);
    setTickets(loadedTickets || []);
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const curativeGroups = buildLineGroups(tickets, "ticket");
  const preventiveGroups = buildLineGroups(plans, "plan");

  const renderLineGroups = (groups: LineGroup[], type: "plan" | "ticket") => {
    if (groups.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {type === "ticket" ? (
              <><ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-lg font-medium">Aucun ticket curatif</p></>
            ) : (
              <><CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-lg font-medium">Aucun plan préventif</p></>
            )}
          </CardContent>
        </Card>
      );
    }

    return groups.map((group) => (
      <Collapsible key={group.line?.id || "__no_line__"} defaultOpen>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center gap-3 py-3 cursor-pointer hover:bg-muted/30">
              <Factory className="h-5 w-5 text-muted-foreground shrink-0" />
              <CardTitle className="text-base flex-1 text-left">
                {group.line ? `${group.line.code} — ${group.line.designation}` : "Sans ligne"}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {group.machines.reduce((s, m) => s + m.items.length, 0)} {type === "ticket" ? "ticket(s)" : "plan(s)"}
              </Badge>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {group.machines.map((mg) => (
                <div key={mg.machine.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm font-medium">{mg.machine.code}</span>
                    <span className="text-sm text-muted-foreground">{mg.machine.designation}</span>
                  </div>
                  {mg.items.map((item: any) =>
                    type === "ticket" ? (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 bg-destructive/5"
                        onClick={() => navigate(`/tickets/${item.id}`)}
                      >
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        <span className="text-sm flex-1">{item.numero} — {item.description?.slice(0, 60)}</span>
                        <Badge variant={item.statut === "ouvert" ? "destructive" : "secondary"} className="text-xs capitalize">{item.statut.replace("_", " ")}</Badge>
                      </div>
                    ) : (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 ${item.prochaine_echeance && new Date(item.prochaine_echeance) < new Date() ? "bg-destructive/5" : "bg-muted/20"}`}
                        onClick={() => navigate(`/preventif/${item.id}`)}
                      >
                        <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm flex-1">{item.title}</span>
                        <Badge variant="outline" className="text-xs capitalize">{item.frequence}</Badge>
                        {item.prochaine_echeance && new Date(item.prochaine_echeance) < new Date() && (
                          <Badge variant="destructive" className="text-xs">Retard</Badge>
                        )}
                      </div>
                    )
                  )}
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Shift</h1>
        <p className="text-muted-foreground capitalize">{today}</p>
      </div>

      <Tabs defaultValue="curative">
        <TabsList className="h-11">
          <TabsTrigger value="curative" className="h-9 gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Curative
            {tickets.length > 0 && <Badge variant="destructive" className="ml-1 text-xs px-1.5">{tickets.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="preventive" className="h-9 gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Préventive
            {plans.length > 0 && <Badge variant="secondary" className="ml-1 text-xs px-1.5">{plans.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="curative" className="space-y-3 mt-3">
          {renderLineGroups(curativeGroups, "ticket")}
        </TabsContent>

        <TabsContent value="preventive" className="space-y-3 mt-3">
          {renderLineGroups(preventiveGroups, "plan")}
        </TabsContent>
      </Tabs>
    </div>
  );
}