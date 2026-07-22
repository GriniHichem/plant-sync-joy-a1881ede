import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Info, Save, Truck } from "lucide-react";
import { toast } from "sonner";

const SUBMODULES: { key: string; label: string; hint?: string }[] = [
  { key: "reception_qualitative", label: "Réception qualitative", hint: "Saisie du ticket, photos et clôture" },
  { key: "reception_quantitative", label: "Pont-bascule (Quantitative)", hint: "Saisie du poids brut sur les tickets ouverts" },
  { key: "reception_global", label: "Consultation (État global)", hint: "Vue consolidée — corrections admin" },
  { key: "reception_settings", label: "Paramétrage", hint: "Produits, fournisseurs, campagnes" },
];

const ACTIONS = [
  { key: "can_view", label: "Voir" },
  { key: "can_create", label: "Créer" },
  { key: "can_edit", label: "Modifier" },
  { key: "can_delete", label: "Supprimer" },
] as const;

type ActionKey = typeof ACTIONS[number]["key"];

const ROLES: { code: string; label: string }[] = [
  { code: "admin", label: "Administrateur" },
  { code: "controleur_qualite", label: "Contrôleur qualité" },
  { code: "responsable_controle_qualite", label: "Responsable contrôle qualité" },
  { code: "directeur_qualite", label: "Directeur qualité" },
  { code: "agreeur", label: "Agréeur" },
  { code: "agent_pont_bascule", label: "Agent pont-bascule" },
  { code: "responsable_magasin", label: "Responsable magasin" },
  { code: "resp_production", label: "Responsable production" },
  { code: "chef_ligne", label: "Chef de ligne" },
  { code: "operateur", label: "Opérateur" },
  { code: "resp_maintenance", label: "Responsable maintenance" },
  { code: "maintenancier", label: "Maintenancier" },
  { code: "bureau_methode", label: "Bureau des méthodes" },
  { code: "responsable_si", label: "Responsable SI" },
  { code: "auditeur", label: "Auditeur" },
  { code: "gestionnaire_magasin", label: "Gestionnaire magasin" },
  { code: "responsable_inventaire", label: "Responsable inventaire" },
  { code: "agent_inventaire", label: "Agent inventaire" },
];

type Matrix = Record<string, Record<ActionKey, boolean>>;

const EMPTY_MATRIX: Matrix = Object.fromEntries(
  SUBMODULES.map((s) => [s.key, { can_view: false, can_create: false, can_edit: false, can_delete: false }]),
) as Matrix;

export default function ReceptionPermissionsTab() {
  const [role, setRole] = useState<string>("controleur_qualite");
  const [matrix, setMatrix] = useState<Matrix>(EMPTY_MATRIX);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("role_permissions")
        .select("module, can_view, can_create, can_edit, can_delete")
        .eq("role", role as any)
        .in("module", SUBMODULES.map((s) => s.key));
      if (cancel) return;
      const next: Matrix = JSON.parse(JSON.stringify(EMPTY_MATRIX));
      for (const row of data ?? []) {
        if (next[row.module]) {
          next[row.module] = {
            can_view: !!row.can_view,
            can_create: !!row.can_create,
            can_edit: !!row.can_edit,
            can_delete: !!row.can_delete,
          };
        }
      }
      setMatrix(next);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [role]);

  function toggle(module: string, action: ActionKey) {
    setMatrix((m) => ({
      ...m,
      [module]: { ...m[module], [action]: !m[module][action] },
    }));
  }

  function toggleColumn(action: ActionKey) {
    const allSet = SUBMODULES.every((s) => matrix[s.key][action]);
    const v = !allSet;
    setMatrix((m) => {
      const next = { ...m };
      for (const s of SUBMODULES) next[s.key] = { ...next[s.key], [action]: v };
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      // 1) Upsert the 4 submodule rows.
      const rows = SUBMODULES.map((s) => ({
        role: role as any,
        module: s.key,
        can_view: matrix[s.key].can_view,
        can_create: matrix[s.key].can_create,
        can_edit: matrix[s.key].can_edit,
        can_delete: matrix[s.key].can_delete,
      }));

      // 2) Umbrella row `reception` = AND of all submodules for each action.
      const umbrella = {
        role: role as any,
        module: "reception",
        can_view: SUBMODULES.every((s) => matrix[s.key].can_view),
        can_create: SUBMODULES.every((s) => matrix[s.key].can_create),
        can_edit: SUBMODULES.every((s) => matrix[s.key].can_edit),
        can_delete: SUBMODULES.every((s) => matrix[s.key].can_delete),
      };

      const { error } = await supabase
        .from("role_permissions")
        .upsert([...rows, umbrella], { onConflict: "role,module" });
      if (error) throw error;
      toast.success("Matrice Réception enregistrée");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Matrice des accès — Module Réception
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <label className="text-sm font-medium min-w-[80px]">Rôle</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="md:max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <div className="grid grid-cols-[minmax(240px,1fr)_repeat(4,84px)] items-center bg-muted/50 text-xs font-semibold px-3 py-2">
            <div>Sous-module</div>
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                onClick={() => toggleColumn(a.key)}
                className="text-center hover:text-primary transition-colors"
                title={`Basculer « ${a.label} » sur les 4 sous-modules`}
              >
                {a.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Chargement…
            </div>
          ) : (
            SUBMODULES.map((s) => (
              <div key={s.key} className="grid grid-cols-[minmax(240px,1fr)_repeat(4,84px)] items-center px-3 py-2 border-t">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.label}</div>
                  {s.hint && <div className="text-[11px] text-muted-foreground truncate">{s.hint}</div>}
                </div>
                {ACTIONS.map((a) => (
                  <div key={a.key} className="flex justify-center">
                    <Checkbox
                      checked={matrix[s.key][a.key]}
                      onCheckedChange={() => toggle(s.key, a.key)}
                    />
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            La case correspondante dans <strong>Matrice modules → Réception</strong> ne sera cochée que si les <strong>4 sous-modules</strong> partagent la même action. Décocher un seul sous-module ici décoche automatiquement l'accès global correspondant.
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
