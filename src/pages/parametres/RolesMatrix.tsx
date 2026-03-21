import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft, Save, RotateCcw, ShieldCheck, Eye, Plus, Pencil, Trash2,
  Cog, Factory, Wrench, BarChart3, CheckCheck, XCircle, ChevronDown, ChevronRight, Users,
} from "lucide-react";

// ── Module groups ──────────────────────────────────────────────
const MODULE_GROUPS = [
  {
    label: "Maintenance (GMAO)",
    icon: Wrench,
    modules: [
      { key: "machines", label: "Machines" },
      { key: "tickets", label: "Tickets" },
      { key: "pdr", label: "Pièces détachées" },
      { key: "preventif", label: "Préventif" },
    ],
  },
  {
    label: "Production (GPAO)",
    icon: Factory,
    modules: [
      { key: "of", label: "Ordres de fab." },
      { key: "produits", label: "Produits" },
      { key: "articles", label: "Articles" },
      { key: "recettes", label: "Recettes" },
      { key: "arrets", label: "Arrêts" },
      { key: "consommations", label: "Consommations" },
    ],
  },
  {
    label: "Système",
    icon: Cog,
    modules: [
      { key: "analytiques", label: "Analytiques & KPI" },
      { key: "utilisateurs", label: "Utilisateurs" },
      { key: "parametres", label: "Paramètres" },
    ],
  },
];

const ALL_MODULES = MODULE_GROUPS.flatMap((g) => g.modules);

const ROLES = [
  { key: "admin", label: "Admin", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { key: "resp_maintenance", label: "Resp. Maintenance", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { key: "maintenancier", label: "Maintenancier", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300" },
  { key: "resp_production", label: "Resp. Production", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { key: "chef_ligne", label: "Chef de ligne", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
  { key: "operateur", label: "Opérateur", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  { key: "gestionnaire_magasin", label: "Gest. Magasin", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { key: "bureau_methode", label: "Bureau Méthode", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
];

const ACTIONS = [
  { key: "can_view" as const, label: "Voir", short: "V", icon: Eye, activeClass: "bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300 dark:border-blue-700" },
  { key: "can_create" as const, label: "Créer", short: "C", icon: Plus, activeClass: "bg-green-500/15 text-green-700 border-green-300 dark:text-green-300 dark:border-green-700" },
  { key: "can_edit" as const, label: "Modifier", short: "M", icon: Pencil, activeClass: "bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700" },
  { key: "can_delete" as const, label: "Supprimer", short: "S", icon: Trash2, activeClass: "bg-red-500/15 text-red-700 border-red-300 dark:text-red-300 dark:border-red-700" },
];

type ActionKey = (typeof ACTIONS)[number]["key"];
type AppRoleType = "admin" | "chef_ligne" | "gestionnaire_magasin" | "maintenancier" | "operateur" | "resp_maintenance" | "resp_production" | "bureau_methode";

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
  const [original, setOriginal] = useState<PermRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("role_permissions")
      .select("*")
      .order("role")
      .order("module");
    if (data) {
      setPerms(data as PermRow[]);
      setOriginal(JSON.parse(JSON.stringify(data)));
    }
    setLoading(false);
  }

  const hasChanges = useMemo(() => {
    return JSON.stringify(perms) !== JSON.stringify(original);
  }, [perms, original]);

  const getPerm = useCallback((role: string, module: string): PermRow => {
    return (
      perms.find((p) => p.role === role && p.module === module) || {
        role, module, can_view: false, can_create: false, can_edit: false, can_delete: false,
      }
    );
  }, [perms]);

  function toggleRole(roleKey: string) {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleKey)) {
        next.delete(roleKey);
      } else {
        next.add(roleKey);
      }
      return next;
    });
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

  function toggleAllForRole(role: string, action: ActionKey) {
    const allSet = ALL_MODULES.every((m) => getPerm(role, m.key)[action]);
    setPerms((prev) => {
      const next = [...prev];
      for (const m of ALL_MODULES) {
        const idx = next.findIndex((p) => p.role === role && p.module === m.key);
        if (idx >= 0) {
          next[idx] = { ...next[idx], [action]: !allSet };
        } else {
          next.push({ role, module: m.key, can_view: false, can_create: false, can_edit: false, can_delete: false, [action]: !allSet });
        }
      }
      return next;
    });
  }

  function toggleFullAccess(role: string) {
    const allSet = ALL_MODULES.every((m) => {
      const p = getPerm(role, m.key);
      return p.can_view && p.can_create && p.can_edit && p.can_delete;
    });
    setPerms((prev) => {
      const next = [...prev];
      for (const m of ALL_MODULES) {
        const idx = next.findIndex((p) => p.role === role && p.module === m.key);
        const val = !allSet;
        if (idx >= 0) {
          next[idx] = { ...next[idx], can_view: val, can_create: val, can_edit: val, can_delete: val };
        } else {
          next.push({ role, module: m.key, can_view: val, can_create: val, can_edit: val, can_delete: val });
        }
      }
      return next;
    });
  }

  function getRoleStats(role: string) {
    let total = 0, active = 0;
    for (const m of ALL_MODULES) {
      const p = getPerm(role, m.key);
      total += 4;
      if (p.can_view) active++;
      if (p.can_create) active++;
      if (p.can_edit) active++;
      if (p.can_delete) active++;
    }
    return { total, active, pct: Math.round((active / total) * 100) };
  }

  // Summary for collapsed view
  function getRoleSummaryActions(role: string) {
    let v = 0, c = 0, e = 0, d = 0;
    for (const m of ALL_MODULES) {
      const p = getPerm(role, m.key);
      if (p.can_view) v++;
      if (p.can_create) c++;
      if (p.can_edit) e++;
      if (p.can_delete) d++;
    }
    return { view: v, create: c, edit: e, delete: d, totalModules: ALL_MODULES.length };
  }

  async function handleSave() {
    setSaving(true);
    const rows = perms.map(({ id, ...rest }) => ({
      ...rest,
      role: rest.role as AppRoleType,
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
      toast({ title: "✅ Sauvegardé", description: "Matrice des permissions mise à jour." });
      await load();
    }
    setSaving(false);
  }

  async function handleReset() {
    if (!confirm("Annuler toutes les modifications non sauvegardées ?")) return;
    setPerms(JSON.parse(JSON.stringify(original)));
    toast({ title: "Réinitialisé", description: "Modifications annulées." });
  }

  function expandAll() {
    setExpandedRoles(new Set(ROLES.map((r) => r.key)));
  }

  function collapseAll() {
    setExpandedRoles(new Set());
  }

  if (!hasRole("admin")) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/parametres")}>Retour</Button>
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
              <ShieldCheck className="h-6 w-6 text-primary" />
              Matrice des rôles
            </h1>
            <p className="text-sm text-muted-foreground">
              Cliquez un rôle pour afficher/masquer sa matrice de permissions
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

      {/* Legend + expand/collapse */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {ACTIONS.map((a) => (
            <span key={a.key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${a.activeClass}`}>
              <a.icon className="h-3 w-3" /> {a.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-muted-foreground">
            <XCircle className="h-3 w-3" /> Inactif
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs h-7">
            Tout déplier
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-7">
            Tout replier
          </Button>
        </div>
      </div>

      {/* Roles list with collapsible matrix */}
      <div className="space-y-2">
        {ROLES.map((role) => {
          const stats = getRoleStats(role.key);
          const summary = getRoleSummaryActions(role.key);
          const isExpanded = expandedRoles.has(role.key);

          return (
            <Card key={role.key} className="overflow-hidden">
              {/* Role header — always visible */}
              <button
                onClick={() => toggleRole(role.key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <Badge className={`${role.color} border-0 font-semibold text-xs`}>
                    {role.label}
                  </Badge>
                  <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{stats.active}/{stats.total} permissions</span>
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${stats.pct}%` }}
                      />
                    </div>
                    <span className="font-medium">{stats.pct}%</span>
                  </div>
                </div>
                {/* Compact summary badges when collapsed */}
                {!isExpanded && (
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
                      <Eye className="h-2.5 w-2.5" /> {summary.view}/{summary.totalModules}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-300">
                      <Plus className="h-2.5 w-2.5" /> {summary.create}/{summary.totalModules}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      <Pencil className="h-2.5 w-2.5" /> {summary.edit}/{summary.totalModules}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-300">
                      <Trash2 className="h-2.5 w-2.5" /> {summary.delete}/{summary.totalModules}
                    </span>
                  </div>
                )}
              </button>

              {/* Expanded matrix */}
              {isExpanded && (
                <div className="border-t">
                  {/* Quick actions row */}
                  <div className="flex items-center justify-end gap-1 px-4 py-2 bg-muted/20 border-b">
                    <span className="text-[10px] text-muted-foreground mr-2 uppercase tracking-wider">Actions rapides :</span>
                    {ACTIONS.map((a) => {
                      const allSet = ALL_MODULES.every((m) => getPerm(role.key, m.key)[a.key]);
                      return (
                        <Tooltip key={a.key}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleAllForRole(role.key, a.key); }}
                              className={`p-1 rounded transition-colors ${allSet ? a.activeClass : "text-muted-foreground hover:bg-muted"}`}
                            >
                              <a.icon className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {allSet ? "Retirer" : "Activer"} « {a.label} » sur tous les modules
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFullAccess(role.key); }}
                          className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors ml-1"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Tout activer / désactiver</TooltipContent>
                    </Tooltip>
                  </div>

                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <div className="min-w-[700px]">
                        {MODULE_GROUPS.map((group) => (
                          <div key={group.label}>
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/15 border-b border-dashed">
                              <group.icon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {group.label}
                              </span>
                            </div>
                            {group.modules.map((m) => {
                              const perm = getPerm(role.key, m.key);
                              return (
                                <div
                                  key={m.key}
                                  className="flex items-center justify-between px-4 py-2 border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                                >
                                  <span className="text-sm font-medium min-w-[140px]">{m.label}</span>
                                  <div className="flex items-center gap-1.5">
                                    {ACTIONS.map((a) => {
                                      const isActive = perm[a.key];
                                      return (
                                        <Tooltip key={a.key}>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={() => toggle(role.key, m.key, a.key)}
                                              className={`
                                                inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                                                border transition-all duration-150 select-none
                                                ${isActive
                                                  ? a.activeClass
                                                  : "border-transparent bg-muted/40 text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground"
                                                }
                                              `}
                                            >
                                              <a.icon className="h-3 w-3" />
                                              <span className="hidden sm:inline">{a.short}</span>
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            {a.label} — {m.label}
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </CardContent>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
