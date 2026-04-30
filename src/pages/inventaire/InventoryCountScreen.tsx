import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { ScanButton } from "@/components/scanner/ScanButton";

type Family = { id: string; name: string };
type Target = { id: string; entity_id: string; entity_code: string | null; entity_label: string | null; family_id: string | null; qty_systeme: number; current_round: number; status: string };
type Count = { target_id: string; round: number; qty_comptee: number };

export default function InventoryCountScreen() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [families, setFamilies] = useState<Family[]>([]);
  const [allowedFamilyIds, setAllowedFamilyIds] = useState<string[]>([]);
  const [familyId, setFamilyId] = useState<string>("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [myCounts, setMyCounts] = useState<Record<string, Count>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId || !user) return;
    const { data: assn } = await supabase.from("inventory_assignments" as any)
      .select("id,role").eq("campaign_id", campaignId).eq("agent_id", user.id).eq("is_active", true).maybeSingle();
    if (!assn) { toast({ title: "Vous n'êtes pas affecté à cette campagne", variant: "destructive" }); return; }

    const { data: scopes } = await supabase.from("inventory_assignment_scopes" as any)
      .select("family_id").eq("assignment_id", (assn as any).id);
    const allowed = ((scopes as any) || []).map((s: any) => s.family_id as string);
    setAllowedFamilyIds(allowed);

    const { data: fam } = await supabase.from("pdr_families").select("id,name").in("id", allowed.length ? allowed : ["00000000-0000-0000-0000-000000000000"]);
    setFamilies(((fam as any) || []) as Family[]);

    const { data: t } = await supabase.from("inventory_targets" as any)
      .select("*").eq("campaign_id", campaignId).order("entity_code");
    setTargets(((t as any) || []) as Target[]);

    const { data: c } = await supabase.from("inventory_counts" as any)
      .select("target_id,round,qty_comptee").eq("agent_id", user.id);
    const map: Record<string, Count> = {};
    for (const row of (c || []) as any[]) map[row.target_id] = row;
    setMyCounts(map);
  }, [campaignId, user, toast]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    return targets.filter((t) => {
      if (!allowedFamilyIds.includes(t.family_id || "")) return false;
      if (familyId && t.family_id !== familyId) return false;
      return true;
    });
  }, [targets, allowedFamilyIds, familyId]);

  const active = visible.find((t) => t.id === activeId) || null;
  const isLocked = active ? !!myCounts[active.id] : false;

  function handleScanResolved(entity: any) {
    const found = targets.find((t) => t.entity_id === entity.entity_id);
    if (!found) { toast({ title: "Article hors campagne", variant: "destructive" }); return; }
    if (!allowedFamilyIds.includes(found.family_id || "")) {
      toast({ title: "Hors de votre périmètre autorisé", variant: "destructive" }); return;
    }
    setActiveId(found.id); setQty("");
  }

  async function handleValidate() {
    if (!active) return;
    const n = parseFloat(qty.replace(",", "."));
    if (!isFinite(n) || n < 0) { toast({ title: "Quantité invalide", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.rpc("inv_register_count" as any, {
      p_target_id: active.id, p_qty: n, p_notes: null,
    });
    setSaving(false);
    if (error) { toast({ title: "Refusé", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Comptage validé et verrouillé" });
    setActiveId(null); setQty(""); load();
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/inventaire/campagnes/${campaignId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Comptage</h1>
      </div>

      <Card><CardContent className="p-3 flex items-center gap-2 flex-wrap">
        <select className="border rounded h-10 px-3 bg-background" value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
          <option value="">Toutes mes familles</option>
          {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <ScanButton allowedTypes={["pdr", "organe"]} onResolved={handleScanResolved} label="Scanner" />
      </CardContent></Card>

      {active ? (
        <Card><CardContent className="p-4 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Article</div>
            <div className="font-mono">{active.entity_code}</div>
            <div className="text-sm">{active.entity_label}</div>
          </div>
          {isLocked ? (
            <div className="rounded-md border bg-muted/40 p-3 flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-amber-600" />
              Comptage déjà validé : <span className="font-semibold">{myCounts[active.id].qty_comptee}</span> (verrouillé)
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Quantité comptée</label>
                <Input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0,0000" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActiveId(null)}>Annuler</Button>
                <Button onClick={handleValidate} disabled={saving}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />Valider et verrouiller
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> La saisie devient définitive après validation.
              </p>
            </>
          )}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y">
            {visible.map((t) => {
              const done = !!myCounts[t.id];
              return (
                <li key={t.id} className="px-4 py-3 hover:bg-muted/30 cursor-pointer" onClick={() => setActiveId(t.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs">{t.entity_code}</div>
                      <div className="text-sm truncate">{t.entity_label}</div>
                    </div>
                    {done ? <Badge className="bg-green-500/15 text-green-700 border-0"><Lock className="h-3 w-3 mr-1" />Verrouillé</Badge>
                          : <Badge variant="outline">À compter</Badge>}
                  </div>
                </li>
              );
            })}
            {visible.length === 0 && <li className="p-8 text-center text-muted-foreground">Aucun article dans votre périmètre.</li>}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
