import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

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

export default function ReceptionAccessMatrixDialog({ open, onOpenChange }: Props) {
  const [role, setRole] = useState<string>("controleur_qualite");
  const [matrix, setMatrix] = useState<Matrix>(EMPTY_MATRIX);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
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
  }, [open, role]);

  function toggle(module: string, action: ActionKey) {
    setMatrix((m) => ({
      ...m,
      [module]: { ...m[module], [action]: !m[module][action] },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const rows = SUBMODULES.map((s) => ({
        role: role as any,
        module: s.key,
        can_view: matrix[s.key].can_view,
        can_create: matrix[s.key].can_create,
        can_edit: matrix[s.key].can_edit,
        can_delete: matrix[s.key].can_delete,
      }));
      const { error } = await supabase
        .from("role_permissions")
        .upsert(rows, { onConflict: "role,module" });
      if (error) throw error;
      toast.success("Matrice enregistrée");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Matrice des accès — Module Réception
          </DialogTitle>
          <DialogDescription>
            Définissez, par rôle, les actions autorisées sur chaque sous-module. Les changements agissent uniquement sur l'affichage (masquage / désactivation des boutons et onglets).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <label className="text-sm font-medium min-w-[100px]">Rôle</label>
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

          <div className="rounded-md border">
            <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,72px)] items-center bg-muted/50 text-xs font-semibold px-3 py-2">
              <div>Sous-module</div>
              {ACTIONS.map((a) => (
                <div key={a.key} className="text-center">{a.label}</div>
              ))}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Chargement…
              </div>
            ) : (
              SUBMODULES.map((s) => (
                <div key={s.key} className="grid grid-cols-[minmax(0,1fr)_repeat(4,72px)] items-center px-3 py-2 border-t">
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
              Convention métier : la Réception qualitative n'expose ni Modifier ni Supprimer (aucun retour sur ticket clôturé) ; le Pont-bascule n'ouvre pas de nouveau ticket ; les corrections a posteriori se font uniquement depuis la Consultation par un profil administrateur.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
