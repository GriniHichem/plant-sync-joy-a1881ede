import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import {
  IconDashboard, IconMachine, IconEquipment, IconFactory, IconSpare,
  IconTicket, IconPreventive, IconShift, IconAnalytics, IconChart,
  IconOrder, IconProduct, IconArticle, IconRecipe, IconTimer,
  IconConsumption, IconStop, IconSettings, IconMaintenance, IconProduction,
  IconOrganes, IconJournal, IconHistory, IconKpi, IconControl,
  IconNc, IconAction, IconTrace, IconReport, IconInventory,
  IconCampaign, IconSecurity, IconValidation, IconAudit, IconBell, IconSearch,
} from "@/components/icons/IndustrialIcons";
import { usePermissions } from "@/hooks/usePermissions";


type AppModule = {
  title: string;
  description: string;
  url: string;
  icon: React.FC<{ size?: number; className?: string }>;
  category: "Maintenance" | "Production" | "Qualité" | "Inventaire" | "Configuration";
  permissionModule?: string;
  badge?: string;
  accent: string; // tailwind gradient classes
};

const MODULES: AppModule[] = [
  // ===== Maintenance =====
  { title: "Tableau de bord", description: "Vue synthétique de l'activité maintenance", url: "/", icon: IconDashboard, category: "Maintenance", permissionModule: "dashboard", accent: "from-sky-500/15 to-sky-500/5 text-sky-500" },
  { title: "Machines", description: "Parc machines, criticité et historique", url: "/machines", icon: IconMachine, category: "Maintenance", permissionModule: "machines", accent: "from-blue-500/15 to-blue-500/5 text-blue-500" },
  { title: "Équipements", description: "Équipements autonomes rattachés aux lignes", url: "/equipements", icon: IconEquipment, category: "Maintenance", permissionModule: "equipements", accent: "from-cyan-500/15 to-cyan-500/5 text-cyan-500" },
  { title: "Organes", description: "Sous-ensembles techniques des machines/équipements", url: "/organes", icon: IconOrganes, category: "Maintenance", permissionModule: "organes", accent: "from-teal-500/15 to-teal-500/5 text-teal-500" },
  { title: "Lignes de production", description: "Synoptique interactif des lignes", url: "/lignes", icon: IconFactory, category: "Maintenance", permissionModule: "lignes", accent: "from-indigo-500/15 to-indigo-500/5 text-indigo-500" },
  { title: "Pièces de rechange", description: "Catalogue PDR, stock et liens machines", url: "/pdr", icon: IconSpare, category: "Maintenance", permissionModule: "pdr", accent: "from-amber-500/15 to-amber-500/5 text-amber-500" },
  { title: "Tickets", description: "Demandes d'intervention et suivi en temps réel", url: "/tickets", icon: IconTicket, category: "Maintenance", permissionModule: "tickets", accent: "from-rose-500/15 to-rose-500/5 text-rose-500" },
  { title: "Maintenance préventive", description: "Plans, gammes et déclenchements automatiques", url: "/preventif", icon: IconPreventive, category: "Maintenance", permissionModule: "preventif", accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-500" },
  { title: "Shift Maintenance", description: "Vue opérationnelle du maintenancier", url: "/maintenance/shift", icon: IconShift, category: "Maintenance", permissionModule: "shift_maintenance", badge: "Live", accent: "from-violet-500/15 to-violet-500/5 text-violet-500" },
  { title: "Journal d'interventions", description: "Historique consolidé des interventions", url: "/maintenance/journal", icon: IconJournal, category: "Maintenance", permissionModule: "journal", accent: "from-slate-500/15 to-slate-500/5 text-slate-400" },
  { title: "Historique interventions", description: "Recherche et filtres avancés sur les interventions passées", url: "/maintenance/historique", icon: IconHistory, category: "Maintenance", permissionModule: "historique", accent: "from-stone-500/15 to-stone-500/5 text-stone-400" },
  { title: "Analyse & KPI", description: "Indicateurs MTTR, MTBF, disponibilité", url: "/analytics", icon: IconAnalytics, category: "Maintenance", permissionModule: "analytiques", accent: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-500" },

  // ===== Production =====
  { title: "Dashboard Production", description: "Vue d'ensemble GPAO", url: "/gpao", icon: IconChart, category: "Production", permissionModule: "gpao_dashboard", accent: "from-sky-500/15 to-sky-500/5 text-sky-500" },
  { title: "Ordres de fabrication", description: "OF, statuts et planification", url: "/gpao/of", icon: IconOrder, category: "Production", permissionModule: "of", accent: "from-blue-500/15 to-blue-500/5 text-blue-500" },
  { title: "Produits", description: "Catalogue produits finis", url: "/gpao/produits", icon: IconProduct, category: "Production", permissionModule: "produits", accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-500" },
  { title: "Articles", description: "Matières premières et composants", url: "/gpao/articles", icon: IconArticle, category: "Production", permissionModule: "articles", accent: "from-teal-500/15 to-teal-500/5 text-teal-500" },
  { title: "Recettes / BOM", description: "Nomenclatures versionnées", url: "/gpao/recettes", icon: IconRecipe, category: "Production", permissionModule: "recettes", accent: "from-amber-500/15 to-amber-500/5 text-amber-500" },
  { title: "Shift Production", description: "Saisie temps réel par équipe", url: "/gpao/shift", icon: IconTimer, category: "Production", permissionModule: "shift_production", badge: "Live", accent: "from-rose-500/15 to-rose-500/5 text-rose-500" },
  { title: "Consommations", description: "Suivi et corrections de matières", url: "/gpao/consommations", icon: IconConsumption, category: "Production", permissionModule: "consommations", accent: "from-violet-500/15 to-violet-500/5 text-violet-500" },
  { title: "Arrêts", description: "Pannes et arrêts production", url: "/gpao/arrets", icon: IconStop, category: "Production", permissionModule: "arrets", accent: "from-orange-500/15 to-orange-500/5 text-orange-500" },

  // ===== Qualité =====
  { title: "Dashboard Qualité", description: "Indicateurs et synthèse qualité", url: "/qualite", icon: IconKpi, category: "Qualité", permissionModule: "qualite_dashboard", accent: "from-sky-500/15 to-sky-500/5 text-sky-500" },
  { title: "OF Qualité", description: "Suivi qualité par ordre de fabrication", url: "/qualite/of", icon: IconControl, category: "Qualité", permissionModule: "qualite_of", accent: "from-blue-500/15 to-blue-500/5 text-blue-500" },
  { title: "Indicateurs qualité", description: "Catalogue des indicateurs et tolérances", url: "/qualite/indicateurs", icon: IconAnalytics, category: "Qualité", permissionModule: "qualite_indicateurs", accent: "from-cyan-500/15 to-cyan-500/5 text-cyan-500" },
  { title: "Contrôles", description: "Saisie et historique des contrôles qualité", url: "/qualite/controles", icon: IconPreventive, category: "Qualité", permissionModule: "qualite_controles", accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-500" },
  { title: "Non-conformités", description: "Déclaration, décisions et lots bloqués", url: "/qualite/non-conformites", icon: IconNc, category: "Qualité", permissionModule: "qualite_nc", accent: "from-rose-500/15 to-rose-500/5 text-rose-500" },
  { title: "Actions qualité", description: "Plans d'actions correctives et préventives", url: "/qualite/actions", icon: IconAction, category: "Qualité", permissionModule: "qualite_actions", accent: "from-amber-500/15 to-amber-500/5 text-amber-500" },
  { title: "Recettes & Nomenclatures", description: "Versions recettes et BOM côté qualité", url: "/qualite/recettes-nomenclatures", icon: IconRecipe, category: "Qualité", permissionModule: "qualite_recettes", accent: "from-violet-500/15 to-violet-500/5 text-violet-500" },
  { title: "Traçabilité", description: "Fiche traçabilité complète par OF", url: "/qualite/tracabilite", icon: IconTrace, category: "Qualité", permissionModule: "qualite_tracabilite", accent: "from-teal-500/15 to-teal-500/5 text-teal-500" },
  { title: "Shift contrôle", description: "Saisie temps réel par contrôleur qualité", url: "/qualite/shift", icon: IconTimer, category: "Qualité", permissionModule: "qualite_shift", badge: "Live", accent: "from-rose-500/15 to-rose-500/5 text-rose-500" },
  { title: "Rapports qualité", description: "Conformité, NC, actions, théorique vs réel", url: "/qualite/rapports", icon: IconReport, category: "Qualité", permissionModule: "qualite_rapports", accent: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-500" },

  // ===== Inventaire =====
  { title: "Dashboard Inventaire", description: "Vue d'ensemble des campagnes d'inventaire", url: "/inventaire", icon: IconInventory, category: "Inventaire", permissionModule: "inventaire", accent: "from-sky-500/15 to-sky-500/5 text-sky-500" },
  { title: "Campagnes d'inventaire", description: "Double comptage A/B avec arbitrage C", url: "/inventaire/campagnes", icon: IconCampaign, category: "Inventaire", permissionModule: "inventaire_campagnes", accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-500" },

  // ===== Configuration =====
  { title: "Sécurité & Accès", description: "Hub centralisé : utilisateurs, rôles, permissions, audit, self-hosting", url: "/securite", icon: IconSecurity, category: "Configuration", permissionModule: "securite", accent: "from-indigo-500/15 to-indigo-500/5 text-indigo-500" },
  { title: "Validations", description: "Demandes d'approbation et règles", url: "/validations", icon: IconValidation, category: "Configuration", permissionModule: "validations", accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-500" },
  { title: "Paramètres", description: "Référentiels, utilisateurs et configuration", url: "/parametres", icon: IconSettings, category: "Configuration", permissionModule: "parametres", accent: "from-slate-500/15 to-slate-500/5 text-slate-400" },
  { title: "Audit & Traçabilité", description: "Journal complet des actions, sécurité et corrections", url: "/audit", icon: IconAudit, category: "Configuration", permissionModule: "audit", accent: "from-red-500/15 to-red-500/5 text-red-500" },
  { title: "Notifications", description: "Centre d'alertes, règles par rôle et événements", url: "/notifications", icon: IconBell, category: "Configuration", permissionModule: "notifications", accent: "from-amber-500/15 to-amber-500/5 text-amber-500" },
  { title: "Recherche globale", description: "Recherche transverse sur tous les modules", url: "/recherche", icon: IconSearch, category: "Configuration", permissionModule: "recherche", accent: "from-cyan-500/15 to-cyan-500/5 text-cyan-500" },
];

const CATEGORIES: Array<AppModule["category"] | "Tous"> = ["Tous", "Maintenance", "Production", "Qualité", "Inventaire", "Configuration"];

const CATEGORY_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Maintenance: IconMaintenance,
  Production: IconProduction,
  Qualité: IconControl,
  Inventaire: IconInventory,
  Configuration: IconSettings,
};

export default function Apps() {
  const navigate = useNavigate();
  const { canView, loading } = usePermissions();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<(typeof CATEGORIES)[number]>("Tous");

  const visible = useMemo(() => {
    if (loading) return [] as AppModule[];
    return MODULES.filter((m) => {
      if (m.permissionModule && !canView(m.permissionModule)) return false;
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

        <div className="-mx-1 px-1 overflow-x-auto">
          <div className="flex gap-1.5 flex-nowrap md:flex-wrap min-w-max md:min-w-0">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={activeCat === cat ? "default" : "outline"}
                onClick={() => setActiveCat(cat)}
                className="h-8 text-xs font-semibold whitespace-nowrap"
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
               {items.map((m) => {
                 const isShift = m.badge === "Live";
                 const isDashboard =
                   m.title.toLowerCase().includes("dashboard") ||
                   m.title === "Tableau de bord";
                 const shiftColor = m.title.includes("Maintenance")
                   ? "border-l-blue-500"
                   : m.title.includes("Production")
                   ? "border-l-amber-500"
                   : m.title.includes("contrôle")
                   ? "border-l-emerald-500"
                   : "";
                 // Petite distinction subtile entre dashboards (bordure top colorée par catégorie)
                 const dashTopColor = isDashboard
                   ? m.category === "Maintenance"
                     ? "border-t-sky-500"
                     : m.category === "Production"
                     ? "border-t-amber-500"
                     : m.category === "Qualité"
                     ? "border-t-emerald-500"
                     : m.category === "Inventaire"
                     ? "border-t-violet-500"
                     : ""
                   : "";

                 return (
                 <button
                   key={m.url}
                   onClick={() => navigate(m.url)}
                   aria-label={`${m.title} — ${m.description}`}
                   className={cn(
                     "group relative flex flex-col items-center text-center gap-3 p-4 rounded-xl border overflow-hidden",
                     "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                     "transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg",
                     isShift
                       ? `bg-card border-l-[3px] ${shiftColor} hover:border-primary/40`
                       : isDashboard
                       ? `bg-card border-t-[3px] ${dashTopColor} hover:border-primary/40`
                       : "bg-card hover:border-primary/40"
                   )}
                 >
                   {/* halo au survol */}
                   <span
                     className={cn(
                       "pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full blur-2xl opacity-0",
                       "bg-gradient-to-br group-hover:opacity-40 transition-opacity duration-300",
                       m.accent
                     )}
                     aria-hidden
                   />
                   {m.badge && (
                     <Badge
                       variant="secondary"
                       className={cn(
                         "absolute top-2 right-2 h-5 px-1.5 text-[9px] font-bold tracking-wider uppercase border-0",
                         isShift ? "bg-primary/15 text-primary" : "bg-primary/15 text-primary"
                       )}
                     >
                       <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full animate-pulse bg-primary" />
                       {m.badge}
                     </Badge>
                   )}
                   <div
                     className={cn(
                       "relative h-14 w-14 rounded-2xl flex items-center justify-center border shadow-sm",
                       "group-hover:scale-110 group-hover:shadow-md transition-all duration-200",
                       "bg-gradient-to-br border-border/40", m.accent
                     )}
                   >
                     <m.icon size={26} />
                   </div>
                   <div className="relative space-y-1 min-h-[3.5rem]">
                     <p className="text-[13px] font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                       {m.title}
                     </p>
                     <p className="text-[10.5px] leading-snug line-clamp-2 text-muted-foreground">
                       {m.description}
                     </p>
                   </div>
                 </button>
                 );
               })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
