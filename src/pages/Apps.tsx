import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X, ShieldCheck, Bell } from "lucide-react";
import {
  IconDashboard, IconMachine, IconEquipment, IconFactory, IconSpare,
  IconTicket, IconPreventive, IconShift, IconAnalytics, IconChart,
  IconOrder, IconProduct, IconArticle, IconRecipe, IconTimer,
  IconConsumption, IconStop, IconSettings, IconMaintenance, IconProduction,
} from "@/components/icons/IndustrialIcons";
import { usePermissions } from "@/hooks/usePermissions";

type AppModule = {
  title: string;
  description: string;
  url: string;
  icon: React.FC<{ size?: number; className?: string }>;
  category: "Maintenance" | "Production" | "Configuration";
  permissionModule?: string;
  badge?: string;
  accent: string; // tailwind gradient classes
};

const MODULES: AppModule[] = [
  // ===== Maintenance =====
  { title: "Tableau de bord", description: "Vue synthétique de l'activité maintenance", url: "/", icon: IconDashboard, category: "Maintenance", accent: "from-sky-500/15 to-sky-500/5 text-sky-500" },
  { title: "Machines", description: "Parc machines, criticité et historique", url: "/machines", icon: IconMachine, category: "Maintenance", permissionModule: "machines", accent: "from-blue-500/15 to-blue-500/5 text-blue-500" },
  { title: "Équipements", description: "Équipements autonomes rattachés aux lignes", url: "/equipements", icon: IconEquipment, category: "Maintenance", permissionModule: "equipements", accent: "from-cyan-500/15 to-cyan-500/5 text-cyan-500" },
  { title: "Organes", description: "Sous-ensembles techniques des machines/équipements", url: "/organes", icon: IconEquipment, category: "Maintenance", permissionModule: "organes", accent: "from-teal-500/15 to-teal-500/5 text-teal-500" },
  { title: "Lignes de production", description: "Synoptique interactif des lignes", url: "/lignes", icon: IconFactory, category: "Maintenance", accent: "from-indigo-500/15 to-indigo-500/5 text-indigo-500" },
  { title: "Pièces de rechange", description: "Catalogue PDR, stock et liens machines", url: "/pdr", icon: IconSpare, category: "Maintenance", permissionModule: "pdr", accent: "from-amber-500/15 to-amber-500/5 text-amber-500" },
  { title: "Tickets", description: "Demandes d'intervention et suivi en temps réel", url: "/tickets", icon: IconTicket, category: "Maintenance", permissionModule: "tickets", badge: "Live", accent: "from-rose-500/15 to-rose-500/5 text-rose-500" },
  { title: "Maintenance préventive", description: "Plans, gammes et déclenchements automatiques", url: "/preventif", icon: IconPreventive, category: "Maintenance", permissionModule: "preventif", accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-500" },
  { title: "Shift Maintenance", description: "Vue opérationnelle du maintenancier", url: "/maintenance/shift", icon: IconShift, category: "Maintenance", accent: "from-violet-500/15 to-violet-500/5 text-violet-500" },
  { title: "Journal d'interventions", description: "Historique consolidé des interventions", url: "/maintenance/journal", icon: IconMaintenance, category: "Maintenance", accent: "from-slate-500/15 to-slate-500/5 text-slate-400" },
  { title: "Analyse & KPI", description: "Indicateurs MTTR, MTBF, disponibilité", url: "/analytics", icon: IconAnalytics, category: "Maintenance", accent: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-500" },

  // ===== Production =====
  { title: "Dashboard Production", description: "Vue d'ensemble GPAO", url: "/gpao", icon: IconChart, category: "Production", accent: "from-sky-500/15 to-sky-500/5 text-sky-500" },
  { title: "Ordres de fabrication", description: "OF, statuts et planification", url: "/gpao/of", icon: IconOrder, category: "Production", permissionModule: "of", accent: "from-blue-500/15 to-blue-500/5 text-blue-500" },
  { title: "Produits", description: "Catalogue produits finis", url: "/gpao/produits", icon: IconProduct, category: "Production", permissionModule: "produits", accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-500" },
  { title: "Articles", description: "Matières premières et composants", url: "/gpao/articles", icon: IconArticle, category: "Production", permissionModule: "articles", accent: "from-teal-500/15 to-teal-500/5 text-teal-500" },
  { title: "Recettes / BOM", description: "Nomenclatures versionnées", url: "/gpao/recettes", icon: IconRecipe, category: "Production", accent: "from-amber-500/15 to-amber-500/5 text-amber-500" },
  { title: "Shift Production", description: "Saisie temps réel par équipe", url: "/gpao/shift", icon: IconTimer, category: "Production", badge: "Live", accent: "from-rose-500/15 to-rose-500/5 text-rose-500" },
  { title: "Consommations", description: "Suivi et corrections de matières", url: "/gpao/consommations", icon: IconConsumption, category: "Production", accent: "from-violet-500/15 to-violet-500/5 text-violet-500" },
  { title: "Arrêts", description: "Pannes et arrêts production", url: "/gpao/arrets", icon: IconStop, category: "Production", accent: "from-orange-500/15 to-orange-500/5 text-orange-500" },

  // ===== Configuration =====
  { title: "Paramètres", description: "Référentiels, utilisateurs et configuration", url: "/parametres", icon: IconSettings, category: "Configuration", accent: "from-slate-500/15 to-slate-500/5 text-slate-400" },
  { title: "Audit & Traçabilité", description: "Journal complet des actions, sécurité et corrections", url: "/audit", icon: ShieldCheck as unknown as React.FC<{ size?: number; className?: string }>, category: "Configuration", permissionModule: "audit", accent: "from-red-500/15 to-red-500/5 text-red-500" },
  { title: "Notifications", description: "Centre d'alertes, règles par rôle et événements", url: "/notifications", icon: Bell as unknown as React.FC<{ size?: number; className?: string }>, category: "Configuration", accent: "from-amber-500/15 to-amber-500/5 text-amber-500" },
];

const CATEGORIES: Array<AppModule["category"] | "Tous"> = ["Tous", "Maintenance", "Production", "Configuration"];

const CATEGORY_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Maintenance: IconMaintenance,
  Production: IconProduction,
  Configuration: IconSettings,
};

export default function Apps() {
  const navigate = useNavigate();
  const { canView, loading } = usePermissions();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<(typeof CATEGORIES)[number]>("Tous");

  const visible = useMemo(() => {
    return MODULES.filter((m) => {
      if (m.permissionModule && !loading && !canView(m.permissionModule)) return false;
      if (activeCat !== "Tous" && m.category !== activeCat) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, activeCat, canView, loading]);

  const grouped = useMemo(() => {
    const map = new Map<string, AppModule[]>();
    for (const m of visible) {
      if (!map.has(m.category)) map.set(m.category, []);
      map.get(m.category)!.push(m);
    }
    return Array.from(map.entries());
  }, [visible]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="text-sm text-muted-foreground">
          Tous les modules de la plateforme PROD IN TIME — explorez, recherchez et accédez à un module en un clic.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un module..."
            className="pl-9 pr-9 h-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent"
              aria-label="Effacer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={activeCat === cat ? "default" : "outline"}
              onClick={() => setActiveCat(cat)}
              className="h-8 text-xs font-semibold"
            >
              {cat}
              {cat !== "Tous" && (
                <span className="ml-1.5 opacity-70">
                  {MODULES.filter((m) => m.category === cat).length}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">Aucun module ne correspond à votre recherche.</p>
        </Card>
      )}

      {/* Grouped modules */}
      {grouped.map(([cat, items]) => {
        const CatIcon = CATEGORY_ICONS[cat] ?? IconDashboard;
        return (
          <section key={cat} className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
              <CatIcon size={14} />
              {cat}
              <span className="h-px flex-1 bg-border/60 ml-2" />
              <span className="text-muted-foreground/50 normal-case tracking-normal font-medium">
                {items.length} module{items.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {items.map((m) => (
                <button
                  key={m.url}
                  onClick={() => navigate(m.url)}
                  className={cn(
                    "group relative flex flex-col items-center text-center gap-3 p-4 rounded-xl border bg-card",
                    "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
                    "transition-all duration-200 ease-out"
                  )}
                >
                  {m.badge && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 h-5 px-1.5 text-[9px] font-bold tracking-wider uppercase bg-primary/15 text-primary border-0"
                    >
                      {m.badge}
                    </Badge>
                  )}
                  <div
                    className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br border border-border/40",
                      "group-hover:scale-110 transition-transform duration-200",
                      m.accent
                    )}
                  >
                    <m.icon size={26} />
                  </div>
                  <div className="space-y-1 min-h-[3.5rem]">
                    <p className="text-[13px] font-semibold leading-tight text-foreground line-clamp-2">
                      {m.title}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground leading-snug line-clamp-2">
                      {m.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
