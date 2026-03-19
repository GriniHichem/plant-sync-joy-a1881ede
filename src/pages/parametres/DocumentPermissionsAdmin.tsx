import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Save, RotateCcw, ShieldCheck, Eye, Upload, Download, Trash2, Pencil,
  CheckCheck, XCircle, Cog, Wrench, Factory, Package, Component, FileText, Clock,
} from "lucide-react";

const ENTITIES = [
  { key: "machine", label: "Machines", icon: Cog },
  { key: "equipement", label: "Équipements", icon: Component },
  { key: "pdr", label: "PDR", icon: Wrench },
  { key: "produit", label: "Produits", icon: Package },
  { key: "article", label: "Articles", icon: Factory },
];

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
  { key: "can_view" as const, label: "Visualiser", short: "V", icon: Eye, activeClass: "bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300 dark:border-blue-700" },
  { key: "can_upload" as const, label: "Uploader", short: "U", icon: Upload, activeClass: "bg-green-500/15 text-green-700 border-green-300 dark:text-green-300 dark:border-green-700" },
  { key: "can_download" as const, label: "Télécharger", short: "T", icon: Download, activeClass: "bg-cyan-500/15 text-cyan-700 border-cyan-300 dark:text-cyan-300 dark:border-cyan-700" },
  { key: "can_delete" as const, label: "Supprimer", short: "S", icon: Trash2, activeClass: "bg-red-500/15 text-red-700 border-red-300 dark:text-red-300 dark:border-red-700" },
  { key: "can_edit_metadata" as const, label: "Modifier méta", short: "M", icon: Pencil, activeClass: "bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700" },
];

type ActionKey = (typeof ACTIONS)[number]["key"];

interface PermRow {
  id?: string;
  role: string;
  entity_type: string;
  can_view: boolean;
  can_upload: boolean;
  can_download: boolean;
  can_delete: boolean;
  can_edit_metadata: boolean;
}

export default function DocumentPermissionsAdmin() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [original, setOriginal] = useState<PermRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("matrix");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("document_permissions")
      .select("*")
      .order("role")
      .order("entity_type");
    if (data) {
      setPerms(data as PermRow[]);
      setOriginal(JSON.parse(JSON.stringify(data)));
    }
    setLoading(false);
  }

  async function loadAudit() {
    const { data } = await supabase
      .from("document_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setAuditLogs(data || []);
  }

  useEffect(() => {
    if (activeTab === "audit") loadAudit();
  }, [activeTab]);

  const hasChanges = useMemo(() =>
    JSON.stringify(perms) !== JSON.stringify(original)
  , [perms, original]);

  function getPerm(role: string, entity: string): PermRow {
    return perms.find((p) => p.role === role && p.entity_type === entity) || {
      role, entity_type: entity,
      can_view: false, can_upload: false, can_download: false, can_delete: false, can_edit_metadata: false,
    };
  }

  function toggle(role: string, entity: string, action: ActionKey) {
    setPerms((prev) => {
      const idx = prev.findIndex((p) => p.role === role && p.entity_type === entity);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [action]: !updated[idx][action] };
        return updated;
      }
      return [...prev, {
        role, entity_type: entity,
        can_view: false, can_upload: false, can_download: false, can_delete: false, can_edit_metadata: false,
        [action]: true,
      }];
    });
  }

  function toggleAllForRole(role: string, action: ActionKey) {
    const allSet = ENTITIES.every((e) => getPerm(role, e.key)[action]);
    setPerms((prev) => {
      const next = [...prev];
      for (const e of ENTITIES) {
        const idx = next.findIndex((p) => p.role === role && p.entity_type === e.key);
        if (idx >= 0) {
          next[idx] = { ...next[idx], [action]: !allSet };
        } else {
          next.push({
            role, entity_type: e.key,
            can_view: false, can_upload: false, can_download: false, can_delete: false, can_edit_metadata: false,
            [action]: !allSet,
          });
        }
      }
      return next;
    });
  }

  function toggleFullAccess(role: string) {
    const allSet = ENTITIES.every((e) => {
      const p = getPerm(role, e.key);
      return p.can_view && p.can_upload && p.can_download && p.can_delete && p.can_edit_metadata;
    });
    setPerms((prev) => {
      const next = [...prev];
      for (const e of ENTITIES) {
        const val = !allSet;
        const idx = next.findIndex((p) => p.role === role && p.entity_type === e.key);
        if (idx >= 0) {
          next[idx] = { ...next[idx], can_view: val, can_upload: val, can_download: val, can_delete: val, can_edit_metadata: val };
        } else {
          next.push({ role, entity_type: e.key, can_view: val, can_upload: val, can_download: val, can_delete: val, can_edit_metadata: val });
        }
      }
      return next;
    });
  }

  function getRoleStats(role: string) {
    let total = 0, active = 0;
    for (const e of ENTITIES) {
      const p = getPerm(role, e.key);
      total += 5;
      if (p.can_view) active++;
      if (p.can_upload) active++;
      if (p.can_download) active++;
      if (p.can_delete) active++;
      if (p.can_edit_metadata) active++;
    }
    return { total, active, pct: Math.round((active / total) * 100) };
  }

  async function handleSave() {
    setSaving(true);
    const rows = perms.map(({ id, ...rest }) => rest);

    const { error: delErr } = await supabase.from("document_permissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) {
      toast({ title: "Erreur", description: delErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("document_permissions").insert(rows as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Sauvegardé", description: "Permissions documentaires mises à jour." });
      await load();
    }
    setSaving(false);
  }

  function handleReset() {
    if (!confirm("Annuler toutes les modifications ?")) return;
    setPerms(JSON.parse(JSON.stringify(original)));
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

  const ACTION_LABELS: Record<string, string> = {
    view: "Visualisation", upload: "Upload", download: "Téléchargement", delete: "Suppression", edit_metadata: "Modif. méta",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Permissions documentaires
            </h1>
            <p className="text-sm text-muted-foreground">
              Droits d'accès aux documents par rôle et entité
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-11">
          <TabsTrigger value="matrix" className="h-9">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Matrice des droits
          </TabsTrigger>
          <TabsTrigger value="audit" className="h-9">
            <Clock className="h-3.5 w-3.5 mr-1" /> Journal d'audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
            {ACTIONS.map((a) => (
              <span key={a.key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${a.activeClass}`}>
                <a.icon className="h-3 w-3" /> {a.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-muted-foreground">
              <XCircle className="h-3 w-3" /> Inactif
            </span>
          </div>

          <div className="space-y-3">
            {ROLES.map((role) => {
              const stats = getRoleStats(role.key);
              return (
                <Card key={role.key} className="overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Badge className={`${role.color} border-0 font-semibold text-xs`}>
                        {role.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {stats.active}/{stats.total} ({stats.pct}%)
                      </span>
                      <div className="hidden sm:block w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${stats.pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {ACTIONS.map((a) => {
                        const allSet = ENTITIES.every((e) => getPerm(role.key, e.key)[a.key]);
                        return (
                          <Tooltip key={a.key}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => toggleAllForRole(role.key, a.key)}
                                className={`p-1 rounded transition-colors ${allSet ? a.activeClass : "text-muted-foreground hover:bg-muted"}`}
                              >
                                <a.icon className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {allSet ? "Retirer" : "Activer"} « {a.label} » partout
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button onClick={() => toggleFullAccess(role.key)} className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors ml-1">
                            <CheckCheck className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Tout activer / désactiver</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <div className="min-w-[600px]">
                        {ENTITIES.map((ent) => {
                          const perm = getPerm(role.key, ent.key);
                          return (
                            <div key={ent.key} className="flex items-center justify-between px-4 py-2 border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                              <span className="text-sm font-medium min-w-[140px] flex items-center gap-2">
                                <ent.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                {ent.label}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {ACTIONS.map((a) => {
                                  const isActive = perm[a.key];
                                  return (
                                    <Tooltip key={a.key}>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => toggle(role.key, ent.key, a.key)}
                                          className={`
                                            inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                                            border transition-all duration-150 select-none
                                            ${isActive ? a.activeClass : "border-transparent bg-muted/40 text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground"}
                                          `}
                                        >
                                          <a.icon className="h-3 w-3" />
                                          <span className="hidden sm:inline">{a.short}</span>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        {a.label} — {ent.label}
                                      </TooltipContent>
                                    </Tooltip>
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
            })}
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entité</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Utilisateur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          Aucune action enregistrée
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs tabular-nums whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {ACTION_LABELS[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.entity_type}</TableCell>
                          <TableCell className="text-sm truncate max-w-[200px]">{log.document_name}</TableCell>
                          <TableCell className="text-xs font-mono truncate max-w-[120px]">{log.user_id?.slice(0, 8)}…</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
