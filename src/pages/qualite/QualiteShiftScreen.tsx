import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveDialog } from "@/components/responsive/ResponsiveDialog";
import { ClipboardCheck, Play, Square, AlertTriangle, RefreshCw, Factory, ListChecks } from "lucide-react";
import { useActiveQualityShift, deriveShiftTypeFromHour } from "@/hooks/useActiveQualityShift";
import { logAudit } from "@/lib/audit";

export default function QualiteShiftScreen() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { shift, loading, refresh } = useActiveQualityShift();

  const [teams, setTeams] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [openStart, setOpenStart] = useState(false);
  const [openClose, setOpenClose] = useState(false);
  const [startTeamId, setStartTeamId] = useState<string>("");
  const [startLineIds, setStartLineIds] = useState<string[]>([]);
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Stats du shift
  const [stats, setStats] = useState({ checks: 0, conforms: 0, ncs: 0, ofs: 0 });

  const canStart =
    hasRole("admin") ||
    hasRole("controleur_qualite") ||
    hasRole("responsable_controle_qualite") ||
    hasRole("directeur_qualite");

  useEffect(() => {
    (async () => {
      const [t, l] = await Promise.all([
        supabase.from("shift_teams").select("*").eq("is_active", true).order("code"),
        supabase.from("production_lines").select("id, code, designation").eq("is_active", true).order("code"),
      ]);
      setTeams(t.data ?? []);
      setLines(l.data ?? []);
    })();
  }, []);

  // Charger stats du shift courant
  useEffect(() => {
    if (!shift) {
      setStats({ checks: 0, conforms: 0, ncs: 0, ofs: 0 });
      return;
    }
    (async () => {
      const [checksRes, ncRes] = await Promise.all([
        supabase
          .from("quality_checks" as any)
          .select("id, is_conform, of_id")
          .eq("quality_shift_id", shift.id),
        supabase
          .from("quality_non_conformities" as any)
          .select("id")
          .eq("quality_shift_id", shift.id),
      ]);
      const checks = (checksRes.data as any[]) ?? [];
      const ofs = new Set(checks.map((c) => c.of_id).filter(Boolean));
      setStats({
        checks: checks.length,
        conforms: checks.filter((c) => c.is_conform === true).length,
        ncs: ((ncRes.data as any[]) ?? []).length,
        ofs: ofs.size,
      });
    })();
  }, [shift]);

  function openStartDialog() {
    const h = new Date().getHours();
    const guessed = deriveShiftTypeFromHour(h);
    void guessed;
    setStartTeamId("");
    setStartLineIds([]);
    setOpenStart(true);
  }

  async function handleStart() {
    if (!user) return;
    if (startLineIds.length === 0) {
      toast({ title: "Sélectionnez au moins une ligne", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const shiftType = deriveShiftTypeFromHour(new Date().getHours());
      const { data: qsData, error } = await supabase
        .from("quality_shifts" as any)
        .insert({
          date_shift: today,
          shift_type: shiftType,
          shift_team_id: startTeamId || null,
          controller_id: user.id,
          heure_debut: new Date().toISOString(),
          is_active: true,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      const newId = (qsData as any).id;
      const { error: linesErr } = await supabase
        .from("quality_shift_lines" as any)
        .insert(startLineIds.map((lid) => ({ quality_shift_id: newId, production_line_id: lid })) as any);
      if (linesErr) throw linesErr;

      await logAudit({
        action_type: "create",
        module: "parametres" as any,
        entity_type: "quality_shift",
        entity_id: newId,
        action_label: "Ouverture shift qualité",
        new_values: { lines: startLineIds, team_id: startTeamId || null },
      });
      toast({ title: "Shift qualité démarré" });
      setOpenStart(false);
      await refresh();
    } catch (e: any) {
      toast({ title: "Erreur au démarrage", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    if (!shift) return;
    if (!observations.trim()) {
      toast({ title: "Observations obligatoires", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("quality_shifts" as any)
        .update({
          is_active: false,
          heure_fin: new Date().toISOString(),
          observations,
        } as any)
        .eq("id", shift.id);
      if (error) throw error;

      await logAudit({
        action_type: "update",
        module: "parametres" as any,
        entity_type: "quality_shift",
        entity_id: shift.id,
        action_label: "Clôture shift qualité",
        new_values: { observations },
      });
      toast({ title: "Shift qualité clôturé" });
      setOpenClose(false);
      setObservations("");
      await refresh();
    } catch (e: any) {
      toast({ title: "Erreur à la clôture", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefreshLinks() {
    if (!shift) return;
    const { data, error } = await supabase.rpc("quality_shift_refresh_links" as any, {
      p_quality_shift_id: shift.id,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Liens rafraîchis (${data ?? 0} ajout(s))` });
    await refresh();
  }

  const shiftTypeLabel = useMemo(() => {
    if (!shift) return "";
    return shift.shift_type === "matin" ? "Matin" : shift.shift_type === "apres_midi" ? "Après-midi" : "Nuit";
  }, [shift]);

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Chargement...</div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Shift Contrôle Qualité</h1>
            <p className="text-sm text-muted-foreground">Démarrez un shift pour saisir contrôles et NC liés à votre quart.</p>
          </div>
        </div>
        {!shift && canStart && (
          <Button size="lg" onClick={openStartDialog} className="min-h-[48px]">
            <Play className="h-5 w-5 mr-2" /> Démarrer un shift
          </Button>
        )}
      </div>

      {!shift && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucun shift qualité actif. {canStart ? "Cliquez sur \"Démarrer un shift\" pour commencer votre quart." : "Vous n'avez pas le rôle nécessaire pour ouvrir un shift contrôle."}
          </CardContent>
        </Card>
      )}

      {shift && (
        <>
          {/* Header shift actif */}
          <Card className="border-primary/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="default" className="text-sm py-1 px-3">
                    {shift.team ? `Équipe ${shift.team.code}` : "Équipe non assignée"}
                  </Badge>
                  <Badge variant="secondary">{shiftTypeLabel}</Badge>
                  <span className="text-sm text-muted-foreground">
                    Démarré à {new Date(shift.heure_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefreshLinks}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir liens production
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setOpenClose(true)}>
                    <Square className="h-4 w-4 mr-2" /> Clôturer
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiBox label="Contrôles" value={stats.checks} />
              <KpiBox label="Conformes" value={stats.conforms} variant="success" />
              <KpiBox label="NC ouvertes" value={stats.ncs} variant={stats.ncs > 0 ? "warning" : "default"} />
              <KpiBox label="OF couverts" value={stats.ofs} />
            </CardContent>
          </Card>

          {/* Lignes couvertes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="h-5 w-5" /> Lignes couvertes ({shift.lines.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {shift.lines.map((l) => (
                  <Badge key={l.id} variant="outline" className="py-1.5 px-3">
                    <Link to={`/lignes/${l.id}`} className="hover:underline">
                      {l.code} — {l.designation}
                    </Link>
                  </Badge>
                ))}
                {shift.lines.length === 0 && (
                  <span className="text-sm text-muted-foreground">Aucune ligne assignée.</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {shift.production_shift_ids.length} shift(s) production rattaché(s).
              </p>
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <ListChecks className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Saisir un contrôle</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Les contrôles seront automatiquement liés à ce shift.
                    </p>
                    <Button asChild>
                      <Link to="/qualite/controles">Aller aux contrôles</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-warning/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-warning/10">
                    <AlertTriangle className="h-6 w-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Déclarer une non-conformité</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Pré-remplie avec votre équipe, shift et contrôleur.
                    </p>
                    <Button asChild variant="outline">
                      <Link to="/qualite/non-conformites">Déclarer une NC</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Dialog démarrage */}
      <ResponsiveDialog
        open={openStart}
        onOpenChange={setOpenStart}
        title="Démarrer un shift contrôle"
        description="Sélectionnez votre équipe et les lignes que vous couvrez pendant ce quart."
      >
        <div className="space-y-4">
          <div>
            <Label>Équipe</Label>
            <Select value={startTeamId} onValueChange={setStartTeamId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir une équipe" /></SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>Équipe {t.code} — {t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lignes couvertes *</Label>
            <div className="mt-2 max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
              {lines.map((l) => (
                <label key={l.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={startLineIds.includes(l.id)}
                    onCheckedChange={(c) =>
                      setStartLineIds((prev) =>
                        c ? [...prev, l.id] : prev.filter((x) => x !== l.id)
                      )
                    }
                  />
                  <span className="text-sm">{l.code} — {l.designation}</span>
                </label>
              ))}
              {lines.length === 0 && <p className="text-sm text-muted-foreground">Aucune ligne active.</p>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Les shifts production en cours sur ces lignes seront automatiquement liés.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenStart(false)} disabled={submitting}>Annuler</Button>
            <Button onClick={handleStart} disabled={submitting}>
              <Play className="h-4 w-4 mr-2" /> {submitting ? "Démarrage..." : "Démarrer"}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Dialog clôture */}
      <ResponsiveDialog
        open={openClose}
        onOpenChange={setOpenClose}
        title="Clôturer le shift contrôle"
        description="Décrivez les observations marquantes du quart (obligatoire)."
      >
        <div className="space-y-4">
          <div>
            <Label>Observations de fin de shift *</Label>
            <Textarea
              className="mt-1"
              rows={5}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Synthèse du quart, points d'attention, NC à suivre..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenClose(false)} disabled={submitting}>Annuler</Button>
            <Button onClick={handleClose} disabled={submitting || !observations.trim()} variant="destructive">
              <Square className="h-4 w-4 mr-2" /> {submitting ? "Clôture..." : "Clôturer"}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

function KpiBox({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "success" | "warning" }) {
  const colorClass =
    variant === "success" ? "text-success" : variant === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="border rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${colorClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
