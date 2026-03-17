import {
  LayoutDashboard,
  Cog,
  Wrench,
  Package,
  AlertTriangle,
  CalendarCheck,
  LogOut,
  Factory,
  ClipboardList,
  BarChart3,
  Boxes,
  Timer,
  ChevronDown,
  Activity,
  BookOpen,
  Component,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const gmaoItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Machines", url: "/machines", icon: Cog },
  { title: "Équipements", url: "/equipements", icon: Component },
  { title: "Lignes", url: "/lignes", icon: Factory },
  { title: "Pièces (PDR)", url: "/pdr", icon: Package },
  { title: "Tickets", url: "/tickets", icon: AlertTriangle },
  { title: "Préventif", url: "/preventif", icon: CalendarCheck },
  { title: "Analyse & KPI", url: "/analytics", icon: Activity },
];

const gpaoItems = [
  { title: "Dashboard", url: "/gpao", icon: BarChart3 },
  { title: "Ordres de fab.", url: "/gpao/of", icon: ClipboardList },
  { title: "Produits", url: "/gpao/produits", icon: Boxes },
  { title: "Articles", url: "/gpao/articles", icon: Package },
  { title: "Recettes", url: "/gpao/recettes", icon: BookOpen },
  { title: "Shift", url: "/gpao/shift", icon: Timer },
  { title: "Consommations", url: "/gpao/consommations", icon: Boxes },
  { title: "Arrêts", url: "/gpao/arrets", icon: AlertTriangle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, roles, signOut } = useAuth();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const isGmaoActive = gmaoItems.some((i) => isActive(i.url));
  const isGpaoActive = gpaoItems.some((i) => isActive(i.url));

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || "Utilisateur"
    : "Utilisateur";

  const roleLabel = roles.length > 0 ? roles[0].replace("_", " ") : "—";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Factory className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sidebar-foreground">GMAO / GPAO</span>
              <span className="text-[11px] text-sidebar-foreground/60">Industriel</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border mx-2 w-auto" />

      <SidebarContent className="pt-2">
        {/* GMAO */}
        <SidebarGroup>
          <Collapsible defaultOpen={isGmaoActive || !isGpaoActive}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="cursor-pointer hover:text-sidebar-foreground">
                <Wrench className="h-3.5 w-3.5 mr-1.5" />
                {!collapsed && "GMAO — Maintenance"}
                {!collapsed && <ChevronDown className="h-3 w-3 ml-auto" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {gmaoItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                        <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                          <item.icon className="h-4.5 w-4.5 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* GPAO */}
        <SidebarGroup>
          <Collapsible defaultOpen={isGpaoActive}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="cursor-pointer hover:text-sidebar-foreground">
                <Factory className="h-3.5 w-3.5 mr-1.5" />
                {!collapsed && "GPAO — Production"}
                {!collapsed && <ChevronDown className="h-3 w-3 ml-auto" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {gpaoItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                        <NavLink to={item.url} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                          <item.icon className="h-4.5 w-4.5 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Paramètres */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/parametres")} tooltip="Paramètres">
                  <NavLink to="/parametres" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <Wrench className="h-4.5 w-4.5 shrink-0" />
                    {!collapsed && <span>Paramètres</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Separator className="bg-sidebar-border mb-2" />
        {!collapsed && (
          <div className="mb-2 px-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-sidebar-foreground/60 capitalize">{roleLabel}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
