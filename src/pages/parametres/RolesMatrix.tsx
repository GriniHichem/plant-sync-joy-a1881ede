import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, RotateCcw, ShieldCheck } from "lucide-react";

const MODULES = [
  { key: "machines", label: "Machines" },
  { key: "tickets", label: "Tickets" },
  { key: "pdr", label: "Pièces de rechange" },
  { key: "preventif", label: "Préventif" },
  { key: "of", label: "Ordres de fabrication" },
  { key: "produits", label: "Produits" },
  { key: "articles", label: "Articles" },
  { key: "recettes", label: "Recettes" },
  { key: "arrets", label: "Arrêts" },
  { key: "consommations", label: "Consommations" },
  { key: "analytiques", label: "Analytiques & KPI" },
  { key: "utilisateurs", label: "Utilisateurs" },
  { key: "parametres", label: "Paramètres" },
];

const ROLES: { key: string; label: string }[] = [
  { key: "admin", label: "Admin" },
  { key: "resp_maintenance", label: "Resp. Maint." },
  { key: "maintenancier", label: "Maintenancier" },
  { key: "resp_production", label: "Resp. Prod." },
  { key: "chef_ligne", label: "Chef ligne" },
  { key: "operateur", label: "Opérateur" },
  { key: "gestionnaire_magasin", label: "Gest. Magasin" },
  { key: "bureau_methode", label: "Bureau Méthode" },
];

const ACTIONS = [
  { key: "can_view", label: "V", title: "Voir" },
  { key: "can_create", label: "C", title: "Créer" },
  { key: "can_edit", label: "M", title: "Modifier" },
  { key: "can_delete", label: "S", title: "Supprimer" },
] as const;

type ActionKey = (typeof ACTIONS)[number]["key"];

interface PermRow {
  id?: string;
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export default function RolesMatrix() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from("role_permissions")
      .select("*")
      .order("role")
      .order("module");
    if (data) setPerms(data as PermRow[]);
  }

  function getPerm(role: string, module: string): PermRow {
    return (
      perms.find((p) => p.role === role && p.module === module) || {
        role,
        module,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      }
    );
  }

  function toggle(role: string, module: string, action: ActionKey) {
    setPerms((prev) => {
      const idx = prev.findIndex((p) => p.role === role && p.module === module);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [action]: !updated[idx][action] };
        return updated;
      }
      return [
        ...prev,
        { role, module, can_view: false, can_create: false, can_edit: false, can_delete: false, [action]: true },
      ];
    });
  }

  async function handleSave() {
    setSaving(true);
    const rows = perms.map(({ id, ...rest }) => ({
      ...rest,
      role: rest.role as "admin" | "chef_ligne" | "gestionnaire_magasin" | "maintenancier" | "operateur" | "resp_maintenance" | "resp_production",
    }));
    
    const { error: delErr } = await supabase.from("role_permissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) {
      toast({ title: "Erreur", description: delErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    
    const { error } = await supabase.from("role_permissions").insert(rows);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sauvegardé", description: "Matrice des permissions mise à jour." });
      await load();
    }
    setSaving(false);
  }

  async function handleReset() {
    if (!confirm("Réinitialiser toutes les permissions aux valeurs par défaut ?")) return;
    // Re-seed by calling load after server reset — for now just reload
    await load();
    toast({ title: "Rechargé", description: "Permissions rechargées depuis la base." });
  }

  if (!hasRole("admin")) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/parametres")}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Matrice des rôles
            </h1>
            <p className="text-sm text-muted-foreground">
              Gérez les permissions détaillées par rôle et module
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Enregistrement..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Légende : <span className="font-normal text-muted-foreground">V = Voir, C = Créer, M = Modifier, S = Supprimer</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium sticky left-0 bg-muted/50 z-10 min-w-[160px]">
                      Module
                    </th>
                    {ROLES.map((r) => (
                      <th key={r.key} className="text-center p-3 font-medium min-w-[120px]">
                        <div className="text-xs leading-tight">{r.label}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m, mi) => (
                    <tr key={m.key} className={mi % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="p-3 font-medium sticky left-0 z-10" style={{ backgroundColor: "inherit" }}>
                        {m.label}
                      </td>
                      {ROLES.map((r) => {
                        const perm = getPerm(r.key, m.key);
                        return (
                          <td key={r.key} className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {ACTIONS.map((a) => (
                                <div key={a.key} className="flex flex-col items-center">
                                  <Checkbox
                                    checked={perm[a.key]}
                                    onCheckedChange={() => toggle(r.key, m.key, a.key)}
                                    title={`${a.title} - ${m.label} (${r.label})`}
                                    className="h-4 w-4"
                                  />
                                  <span className="text-[10px] text-muted-foreground mt-0.5">
                                    {a.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
