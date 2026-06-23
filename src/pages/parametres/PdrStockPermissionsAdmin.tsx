import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Save, RotateCcw, Package, Eye, Plus, Pencil, Trash2,
  ArrowDownToLine, ArrowUpFromLine, RotateCw, ClipboardList, XCircle, Ban,
} from "lucide-react";

const ROLES = [
  { key: "admin", label: "Admin", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { key: "resp_maintenance", label: "Resp. Maintenance", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { key: "maintenancier", label: "Maintenancier", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300" },
  { key: "resp_production", label: "Resp. Production", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { key: "chef_ligne", label: "Chef de ligne", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
  { key: "operateur", label: "Opérateur", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  { key: "gestionnaire_magasin", label: "Gest. Magasin", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { key: "responsable_magasin", label: "Resp. Magasin", color: "bg-purple-200 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200" },
  { key: "bureau_methode", label: "Bureau Méthode", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
];

const SUPPLIER_ACTIONS = [
  { key: "can_view_suppliers", label: "Consulter", icon: Eye, activeClass: "bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300 dark:border-blue-700" },
  { key: "can_create_supplier", label: "Créer", icon: Plus, activeClass: "bg-green-500/15 text-green-700 border-green-300 dark:text-green-300 dark:border-green-700" },
  { key: "can_edit_supplier", label: "Modifier", icon: Pencil, activeClass: "bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700" },
  { key: "can_delete_supplier", label: "Supprimer", icon: Trash2, activeClass: "bg-red-500/15 text-red-700 border-red-300 dark:text-red-300 dark:border-red-700" },
];

const STOCK_ACTIONS = [
  { key: "can_create_entry", label: "Bon d'entrée", icon: ArrowDownToLine, activeClass: "bg-green-500/15 text-green-700 border-green-300 dark:text-green-300 dark:border-green-700" },
  { key: "can_create_exit", label: "Bon de sortie", icon: ArrowUpFromLine, activeClass: "bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700" },
  { key: "can_correct_stock", label: "Correction", icon: RotateCw, activeClass: "bg-purple-500/15 text-purple-700 border-purple-300 dark:text-purple-300 dark:border-purple-700" },
  { key: "can_inventory", label: "Inventaire", icon: ClipboardList, activeClass: "bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300 dark:border-blue-700" },
  { key: "can_cancel_movement", label: "Annuler mvt", icon: Ban, activeClass: "bg-red-500/15 text-red-700 border-red-300 dark:text-red-300 dark:border-red-700" },
];

type PermRow = Record<string, any>;

export default function PdrStockPermissionsAdmin() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [original, setOriginal] = useState<PermRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("pdr_stock_permissions")
      .select("*")
      .order("role");

    if (data) {
      // Ensure all roles exist
      const existing = new Map(data.map((d: any) => [d.role, d]));
      const allPerms = ROLES.map((r) => {
        if (existing.has(r.key)) return existing.get(r.key);
        return {
          role: r.key,
          can_view_suppliers: false, can_create_supplier: false, can_edit_supplier: false, can_delete_supplier: false,
          can_create_entry: false, can_create_exit: false, can_correct_stock: false, can_inventory: false, can_cancel_movement: false,
        };
      });
      setPerms(allPerms);
      setOriginal(JSON.parse(JSON.stringify(allPerms)));
    }
    setLoading(false);
  }

  const hasChanges = JSON.stringify(perms) !== JSON.stringify(original);

  function toggle(roleKey: string, actionKey: string) {
    setPerms((prev) =>
      prev.map((p) =>
        p.role === roleKey ? { ...p, [actionKey]: !p[actionKey] } : p
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    // Upsert each role
    for (const p of perms) {
      const { id, created_at, updated_at, ...rest } = p;
      if (id) {
        await supabase.from("pdr_stock_permissions").update(rest as any).eq("id", id);
      } else {
        await supabase.from("pdr_stock_permissions").insert(rest as any);
      }
    }
    toast({ title: "✅ Sauvegardé", description: "Permissions PDR/Stock mises à jour." });
    await load();
    setSaving(false);
  }

  function handleReset() {
    setPerms(JSON.parse(JSON.stringify(original)));
  }

  if (!hasRole("admin")) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Accès réservé aux administrateurs.
        <Button variant="outline" className="mt-4 block mx-auto" onClick={() => navigate("/parametres")}>Retour</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderSection = (title: string, actions: typeof SUPPLIER_ACTIONS) => (
    <Card>
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            {/* Header */}
            <div className="flex items-center border-b bg-muted/10 px-4 py-2">
              <div className="min-w-[180px] text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rôle</div>
              <div className="flex items-center gap-2">
                {actions.map((a) => (
                  <div key={a.key} className="w-24 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${a.activeClass}`}>
                      <a.icon className="h-3 w-3" /> {a.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Rows */}
            {ROLES.map((role) => {
              const perm = perms.find((p) => p.role === role.key);
              if (!perm) return null;
              return (
                <div key={role.key} className="flex items-center px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                  <div className="min-w-[180px]">
                    <Badge className={`${role.color} border-0 font-semibold text-xs`}>{role.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {actions.map((a) => {
                      const isActive = !!perm[a.key];
                      return (
                        <div key={a.key} className="w-24 flex justify-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => toggle(role.key, a.key)}
                                className={`
                                  inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium
                                  border transition-all duration-150 select-none
                                  ${isActive
                                    ? a.activeClass
                                    : "border-transparent bg-muted/40 text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground"
                                  }
                                `}
                              >
                                <a.icon className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {isActive ? "Désactiver" : "Activer"} « {a.label} » pour {role.label}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Permissions PDR & Stock
            </h1>
            <p className="text-sm text-muted-foreground">
              Matrice des droits fournisseurs et mouvements de stock par rôle
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="border-amber-400 text-amber-600 animate-pulse">
              Modifications non sauvegardées
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-1" /> Annuler
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Enregistrement..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      {/* Fournisseurs */}
      {renderSection("Gestion des fournisseurs", SUPPLIER_ACTIONS)}

      {/* Mouvements stock */}
      {renderSection("Mouvements de stock", STOCK_ACTIONS)}

      {/* Légende traçabilité */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2">Traçabilité</h3>
          <p className="text-xs text-muted-foreground">
            Toutes les actions sensibles (mouvements de stock, modifications fournisseurs) sont automatiquement tracées avec :
            <span className="font-medium text-foreground"> créé par</span>,
            <span className="font-medium text-foreground"> créé le</span>,
            <span className="font-medium text-foreground"> modifié par</span>,
            <span className="font-medium text-foreground"> modifié le</span>,
            et le <span className="font-medium text-foreground">motif</span> si applicable.
            L'historique complet est visible dans les fiches PDR (onglet Mouvements).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
