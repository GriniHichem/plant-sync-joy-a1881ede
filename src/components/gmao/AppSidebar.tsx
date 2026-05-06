import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import logoEntreprise from "@/assets/logo-entreprise.jpg";
import {
  IconDashboard, IconMachine, IconEquipment, IconFactory, IconSpare,
  IconTicket, IconPreventive, IconShift, IconAnalytics, IconChart,
  IconOrder, IconProduct, IconArticle, IconRecipe, IconTimer,
  IconConsumption, IconStop, IconSettings, IconLogout,
  IconMaintenance, IconProduction,
} from "@/components/icons/IndustrialIcons";
import { ShieldCheck, ClipboardCheck, AlertTriangle, Wrench, FileText, Lock, CheckSquare, Cog, Timer, ClipboardList } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const gmaoItems = [
  { title: "Dashboard", url: "/", icon: IconDashboard },
  { title: "Machines", url: "/machines", icon: IconMachine },
  { title: "Équipements", url: "/equipements", icon: IconEquipment },
  { title: "Organes", url: "/organes", icon: IconEquipment },
  { title: "Lignes", url: "/lignes", icon: IconFactory },
  { title: "Pièces (PDR)", url: "/pdr", icon: IconSpare },
  { title: "Tickets", url: "/tickets", icon: IconTicket },
  { title: "Préventif", url: "/preventif", icon: IconPreventive },
  { title: "Shift", url: "/maintenance/shift", icon: IconShift },
  { title: "Journal", url: "/maintenance/journal", icon: IconMaintenance },
  { title: "Historique", url: "/maintenance/historique", icon: IconMaintenance },
  { title: "Analyse & KPI", url: "/analytics", icon: IconAnalytics },
];

const gpaoItems = [
  { title: "Dashboard", url: "/gpao", icon: IconChart },
  { title: "Ordres de fab.", url: "/gpao/of", icon: IconOrder },
  { title: "Produits", url: "/gpao/produits", icon: IconProduct },
  { title: "Articles", url: "/gpao/articles", icon: IconArticle },
  { title: "Recettes", url: "/gpao/recettes", icon: IconRecipe },
  { title: "Shift", url: "/gpao/shift", icon: IconTimer },
  { title: "Consommations", url: "/gpao/consommations", icon: IconConsumption },
  { title: "Arrêts", url: "/gpao/arrets", icon: IconStop },
];

const qualiteItems = [
  { title: "Dashboard", url: "/qualite", icon: IconChart },
  { title: "OF qualité", url: "/qualite/of", icon: IconOrder },
  { title: "Indicateurs", url: "/qualite/indicateurs", icon: IconAnalytics },
  { title: "Shift contrôle", url: "/qualite/shift", icon: Timer },
  { title: "Contrôles", url: "/qualite/controles", icon: ClipboardCheck },
  { title: "Non-conformités", url: "/qualite/non-conformites", icon: AlertTriangle },
  { title: "Actions", url: "/qualite/actions", icon: Wrench },
  { title: "Recettes & nomenclatures", url: "/qualite/recettes-nomenclatures", icon: IconRecipe },
  { title: "Traçabilité", url: "/qualite/tracabilite", icon: IconChart },
  { title: "Rapports", url: "/qualite/rapports", icon: FileText },
];

const inventaireItems = [
  { title: "Dashboard", url: "/inventaire", icon: IconDashboard },
  { title: "Campagnes", url: "/inventaire/campagnes", icon: ClipboardList },
];

const adminItems = [
  { title: "Sécurité & Accès", url: "/securite", icon: Lock },
  { title: "Validations", url: "/validations", icon: CheckSquare },
  { title: "Paramètres", url: "/parametres", icon: IconSettings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, roles, signOut } = useAuth();
  const { canView } = usePermissions();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const isGmaoActive = gmaoItems.some((i) => isActive(i.url));
  const isGpaoActive = gpaoItems.some((i) => isActive(i.url));
  const isQualiteActive = qualiteItems.some((i) => isActive(i.url));
  const isAdminActive = adminItems.some((i) => isActive(i.url));
  const isInventaireActive = inventaireItems.some((i) => isActive(i.url));
  const showQualite = canView("qualite");
  const showInventaire = canView("inventaire") || canView("inventaire_campagnes")
    || roles.includes("admin" as any)
    || roles.includes("responsable_inventaire" as any)
    || roles.includes("agent_inventaire" as any);

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || "Utilisateur"
    : "Utilisateur";

  const roleLabel = roles.length > 0 ? (roles[0] as string).split("_").join(" ") : "—";

  const renderGroup = (
    label: string,
    GroupIcon: React.ComponentType<{ size?: number | string; className?: string }>,
    items: { title: string; url: string; icon: React.ComponentType<{ size?: number | string; className?: string }> }[],
    defaultOpen: boolean,
  ) => (
    <SidebarGroup>
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="w-full group/trigger">
          <SidebarGroupLabel className="cursor-pointer flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors px-3 py-2">
            <GroupIcon size={14} />
            {!collapsed && <span>{label}</span>}
            {!collapsed && (
              <svg className="h-3 w-3 ml-auto transition-transform group-data-[state=open]/trigger:rotate-180 text-sidebar-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-0.5">
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                          "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                          active && "sidebar-active-glow text-sidebar-primary-foreground"
                        )}
                        activeClassName=""
                      >
                        <item.icon size={18} className="shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      {/* Header — Brand identity */}
      <SidebarHeader className="p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "shrink-0 rounded-lg overflow-hidden border border-sidebar-border/50",
            "shadow-[0_0_12px_hsl(var(--sidebar-glow)/0.15)]",
            collapsed ? "h-9 w-9" : "h-10 w-10"
          )}>
            <img src={logoEntreprise} alt="Entreprise" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-extrabold tracking-[0.12em] uppercase text-sidebar-primary-foreground leading-none">
                PROD IN TIME
              </span>
              <span className="text-[9px] font-semibold tracking-[0.2em] text-sidebar-foreground/35 uppercase mt-1">
                GMAO · GPAO
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Divider with glow */}
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

      <SidebarContent className="pt-3 overflow-y-auto">
        {renderGroup("Maintenance", IconMaintenance, gmaoItems, isGmaoActive || !isGpaoActive)}

        <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-sidebar-border/50 to-transparent" />

        {renderGroup("Production", IconProduction, gpaoItems, isGpaoActive)}

        {showQualite && (
          <>
            <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-sidebar-border/50 to-transparent" />
            {renderGroup("Qualité", ShieldCheck, qualiteItems, isQualiteActive)}
          </>
        )}

        {showInventaire && (
          <>
            <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-sidebar-border/50 to-transparent" />
            {renderGroup("Inventaire", ClipboardList, inventaireItems, isInventaireActive)}
          </>
        )}

        <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-sidebar-border/50 to-transparent" />

        {renderGroup("Administration", Cog, adminItems, isAdminActive)}
      </SidebarContent>

      {/* Footer — User area */}
      <SidebarFooter className="p-3 pt-0">
        <div className="mx-0 mb-2 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-[13px] font-semibold text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-sidebar-foreground/45 capitalize font-medium tracking-wide">{roleLabel}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-destructive/10 rounded-lg text-[13px] font-medium px-3"
          onClick={signOut}
        >
          <IconLogout size={18} className="shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
