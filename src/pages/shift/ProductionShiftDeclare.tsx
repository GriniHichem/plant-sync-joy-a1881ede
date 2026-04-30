import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useActiveShift } from "@/contexts/ActiveShiftContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Activity, Save, ArrowLeft } from "lucide-react";
import { logAudit } from "@/lib/audit";
import { parseNumericInput } from "@/lib/formValidation";
import { useShiftRealtime } from "@/hooks/useShiftRealtime";

/**
 * Quick hourly production declaration — context-aware (auto OF + shift_id).
 * Strict "Hour -1" rule is enforced server-side; this view filters editable slots only.
 */
export default function ProductionShiftDeclare() {
  const { productionShift, refresh } = useActiveShift();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [declarations, setDeclarations] = useState<any[]>([]);
  const [qte, setQte] = useState("");
  const [rebut, setRebut] = useState("0");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDeclarations = () => {
    if (!productionShift) return;
    supabase
      .from("production_declarations")
      .select("*")
      .eq("shift_id", productionShift.id)
      .order("heure_production", { ascending: true })
      .then(({ data }) => setDeclarations(data ?? []));
  };

  useEffect(() => {
    loadDeclarations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productionShift?.id]);

  useShiftRealtime(
    `prod-decl-${productionShift?.id ?? "none"}`,
    "production_declarations",
    loadDeclarations,
    !!productionShift?.id,
    productionShift?.id ? `shift_id=eq.${productionShift.id}` : undefined,
  );

  const previousHourSlot = useMemo(() => {
    if (!productionShift) return null;
    const now = new Date();
    const start = new Date(productionShift.heure_debut);
    // previous full hour boundary that lies inside the shift window
    const prev = new Date(now);
    prev.setMinutes(0, 0, 0);
    prev.setHours(prev.getHours() - 1);
    if (prev < start) return null;
    return prev;
  }, [productionShift]);

  const alreadyDeclared = useMemo(() => {
    if (!previousHourSlot) return false;
    return declarations.some((d) => {
      const h = new Date(d.heure_production);
      return (
        h.getFullYear() === previousHourSlot.getFullYear() &&
        h.getMonth() === previousHourSlot.getMonth() &&
        h.getDate() === previousHourSlot.getDate() &&
        h.getHours() === previousHourSlot.getHours()
      );
    });
  }, [declarations, previousHourSlot]);

  if (!productionShift) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6 text-center text-muted-foreground">
          Aucun shift production actif.
        </CardContent>
      </Card>
    );
  }

  if (!productionShift.of_id) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Aucun OF n'est lié à ce shift. Démarrez le shift sur un OF en cours.
          </p>
          <Button asChild variant="outline"><Link to="/gpao/shift">Retour</Link></Button>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit() {
    if (!previousHourSlot || alreadyDeclared || !productionShift) return;
    const q = parseNumericInput(qte);
    if (q === null || q < 0) {
      toast({ title: "Quantité invalide", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("production_declarations")
        .insert({
          of_id: productionShift.of_id,
          shift_id: productionShift.id,
          heure_production: previousHourSlot.toISOString(),
          quantite_produite: q,
          quantite_rebut: parseNumericInput(rebut) || 0,
          declared_by: user?.id,
          notes: notes || null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      await logAudit({
        action_type: "create",
        module: "gpao" as any,
        entity_type: "production_declaration",
        entity_id: (data as any).id,
        action_label: "Déclaration production (kiosque shift)",
        new_values: {
          shift_id: productionShift.id,
          of_id: productionShift.of_id,
          heure: previousHourSlot.toISOString(),
          qte: q,
          rebut: parseNumericInput(rebut) || 0,
        },
      });

      toast({ title: "Déclaration enregistrée" });
      setQte(""); setRebut("0"); setNotes("");
      await refresh();
      const { data: refreshed } = await supabase
        .from("production_declarations")
        .select("*")
        .eq("shift_id", productionShift.id)
        .order("heure_production", { ascending: true });
      setDeclarations(refreshed ?? []);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const slotLabel = previousHourSlot
    ? `${previousHourSlot.getHours().toString().padStart(2, "0")}h – ${(previousHourSlot.getHours() + 1).toString().padStart(2, "0")}h`
    : null;

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/gpao/shift")}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour shift
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Déclarer la production
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ligne {productionShift.line?.code ?? "—"} • OF {productionShift.of?.numero ?? "—"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!previousHourSlot && (
            <div className="text-sm text-muted-foreground p-3 rounded bg-muted/30">
              Aucune heure complétée à déclarer pour le moment.
            </div>
          )}

          {previousHourSlot && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-sm">Créneau {slotLabel}</Badge>
                {alreadyDeclared && <Badge variant="secondary">Déjà saisi</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantité produite *</Label>
                  <Input
                    inputMode="decimal"
                    value={qte}
                    onChange={(e) => setQte(e.target.value)}
                    disabled={alreadyDeclared || submitting}
                    className="min-h-[48px] text-lg tabular-nums"
                  />
                </div>
                <div>
                  <Label>Rebut</Label>
                  <Input
                    inputMode="decimal"
                    value={rebut}
                    onChange={(e) => setRebut(e.target.value)}
                    disabled={alreadyDeclared || submitting}
                    className="min-h-[48px] text-lg tabular-nums"
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  disabled={alreadyDeclared || submitting}
                />
              </div>

              <Button
                size="lg"
                className="w-full min-h-[52px]"
                onClick={handleSubmit}
                disabled={alreadyDeclared || submitting || !qte}
              >
                <Save className="h-5 w-5 mr-2" />
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Déclarations du shift ({declarations.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {declarations.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune déclaration pour le moment.</p>
          )}
          {declarations.map((d) => {
            const h = new Date(d.heure_production);
            return (
              <div key={d.id} className="flex justify-between text-sm border-b border-border/40 py-1.5">
                <span className="font-mono">
                  {h.getHours().toString().padStart(2, "0")}h–{(h.getHours() + 1).toString().padStart(2, "0")}h
                </span>
                <span className="tabular-nums">
                  {d.quantite_produite} <span className="text-muted-foreground">({d.quantite_rebut ?? 0} rebut)</span>
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
