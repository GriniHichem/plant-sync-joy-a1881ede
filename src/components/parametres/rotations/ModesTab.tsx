import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

/**
 * Modes de production (3x8, etc.) — shift_modes / shift_mode_slots.
 * Consommés par les OF du GPAO. Lecture + édition des créneaux et activation.
 */
export function ModesTab() {
  const [shiftModes, setShiftModes] = useState<any[]>([]);
  const [modeSlots, setModeSlots] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const [modesRes, slotsRes] = await Promise.all([
      supabase.from("shift_modes").select("*").order("code"),
      supabase.from("shift_mode_slots").select("*, shift_modes(label, code)").order("sort_order"),
    ]);
    setShiftModes(modesRes.data || []);
    setModeSlots(slotsRes.data || []);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Modes de production</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {shiftModes.map((mode) => {
          const slots = modeSlots.filter((s: any) => s.shift_mode_id === mode.id);
          return (
            <div key={mode.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{mode.label}</p>
                    <p className="text-xs text-muted-foreground">{mode.description}</p>
                  </div>
                  {mode.is_default && <Badge variant="outline" className="text-xs">Par défaut</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={mode.is_active ? "default" : "secondary"}>{mode.is_active ? "Actif" : "Inactif"}</Badge>
                  <Switch checked={mode.is_active} onCheckedChange={async () => {
                    await supabase.from("shift_modes").update({ is_active: !mode.is_active } as any).eq("id", mode.id);
                    load();
                  }} />
                </div>
              </div>
              <div className="pl-4 border-l-2 border-muted space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Créneaux horaires ({slots.length})</p>
                {slots.map((slot: any) => (
                  <div key={slot.id} className="flex items-center gap-3 text-sm">
                    <span className="font-medium min-w-[100px]">{slot.label}</span>
                    <Input type="time" value={slot.heure_debut} className="w-28 h-8"
                      onChange={async (e) => {
                        await supabase.from("shift_mode_slots").update({ heure_debut: e.target.value } as any).eq("id", slot.id);
                        load();
                      }} />
                    <span className="text-muted-foreground">→</span>
                    <Input type="time" value={slot.heure_fin} className="w-28 h-8"
                      onChange={async (e) => {
                        await supabase.from("shift_mode_slots").update({ heure_fin: e.target.value } as any).eq("id", slot.id);
                        load();
                      }} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {shiftModes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun mode de production configuré.</p>
        )}
      </CardContent>
    </Card>
  );
}
