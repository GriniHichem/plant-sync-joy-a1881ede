import { NavLink as RRNavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import logoEntreprise from "@/assets/logo-entreprise.jpg";
import {
  IconDashboard, IconMachine, IconEquipment, IconFactory, IconSpare,
  IconTicket, IconPreventive, IconShift, IconAnalytics, IconChart,
  IconOrder, IconProduct, IconArticle, IconRecipe, IconTimer,
  IconConsumption, IconStop, IconSettings, IconLogout,
  IconMaintenance, IconProduction, IconBell, IconSearch,
} from "@/components/icons/IndustrialIcons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu, ChevronDown } from "lucide-react";

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

type NavItem = { title: string; url: string; icon: React.FC<{ size?: number; className?: string }> };

function isActive(currentPath: string, path: string) {
  return path === "/" ? currentPath === "/" : currentPath.startsWith(path);
}

function MegaMenu({
  label,
  GroupIcon,
  items,
  active,
}: {
  label: string;
  GroupIcon: React.FC<{ size?: number; className?: string }>;
  items: NavItem[];
  active: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-9 px-3 gap-2 text-[13px] font-semibold rounded-md transition-all",
            "text-foreground/70 hover:text-foreground hover:bg-accent/60",
            active && "text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary"
          )}
        >
          <GroupIcon size={16} className="shrink-0" />
          <span className="hidden lg:inline">{label}</span>
          <ChevronDown size={13} className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[520px] p-3 grid grid-cols-2 gap-1 bg-popover/95 backdrop-blur-xl border-border/60 shadow-xl"
      >
        <DropdownMenuLabel className="col-span-2 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/70 px-2 pb-2 flex items-center gap-2">
          <GroupIcon size={12} />
          {label}
        </DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuItem key={item.url} asChild className="p-0 focus:bg-transparent">
            <RRNavLink
              to={item.url}
              end={item.url === "/"}
              className={({ isActive: a }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium w-full transition-all",
                  "text-foreground/75 hover:bg-accent hover:text-foreground",
                  a && "bg-primary/10 text-primary font-semibold"
                )
              }
            >
              <span className="h-8 w-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                <item.icon size={16} />
              </span>
              <span className="truncate">{item.title}</span>
            </RRNavLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const renderItems = (label: string, items: NavItem[]) => (
    <div className="space-y-1">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/60 px-2 pt-2 pb-1">
        {label}
      </p>
      {items.map((item) => (
        <RRNavLink
          key={item.url}
          to={item.url}
          end={item.url === "/"}
          className={({ isActive: a }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium",
              "text-foreground/75 hover:bg-accent hover:text-foreground",
              a && "bg-primary/10 text-primary font-semibold"
            )
          }
        >
          <item.icon size={18} />
          {item.title}
        </RRNavLink>
      ))}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
          <Menu size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-4 overflow-y-auto">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border/60">
          <img src={logoEntreprise} alt="" className="h-9 w-9 rounded-md object-cover" />
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-extrabold tracking-[0.1em] uppercase">PROD IN TIME</span>
            <span className="text-[9px] font-semibold tracking-[0.2em] text-muted-foreground/60 uppercase mt-1">GMAO · GPAO</span>
          </div>
        </div>
        {renderItems("Maintenance", gmaoItems)}
        <div className="my-3 h-px bg-border/60" />
        {renderItems("Production", gpaoItems)}
        <div className="my-3 h-px bg-border/60" />
        <RRNavLink
          to="/parametres"
          className={({ isActive: a }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium",
              "text-foreground/75 hover:bg-accent hover:text-foreground",
              a && "bg-primary/10 text-primary font-semibold"
            )
          }
        >
          <IconSettings size={18} />
          Paramètres
        </RRNavLink>
      </SheetContent>
    </Sheet>
  );
}

export function AppTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut } = useAuth();

  const isGmaoActive = gmaoItems.some((i) => isActive(location.pathname, i.url));
  const isGpaoActive = gpaoItems.some((i) => isActive(location.pathname, i.url));
  const isSettingsActive = isActive(location.pathname, "/parametres");

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || "Utilisateur"
    : "Utilisateur";
  const initials = profile
    ? `${(profile.first_name || "")[0] || ""}${(profile.last_name || "")[0] || ""}`.toUpperCase()
    : "U";
  const roleLabel = roles.length > 0 ? (roles[0] as string).split("_").join(" ") : "";

  return (
    <header
      className="h-14 sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{
        backgroundColor: "hsl(var(--header-background) / 0.85)",
        borderColor: "hsl(var(--header-border))",
        color: "hsl(var(--header-foreground))",
      }}
    >
      <div className="h-full flex items-center gap-2 px-3 md:px-5">
        {/* Mobile menu */}
        <MobileNav />

        {/* Brand */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <div className="h-9 w-9 rounded-md overflow-hidden border border-border/60 shadow-sm transition-transform group-hover:scale-105">
            <img src={logoEntreprise} alt="Entreprise" className="h-full w-full object-cover" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[13px] font-extrabold tracking-[0.12em] uppercase text-foreground">
              PROD IN TIME
            </span>
            <span className="text-[9px] font-semibold tracking-[0.22em] text-muted-foreground/60 uppercase mt-1">
              GMAO · GPAO
            </span>
          </div>
        </button>

        <div className="hidden md:block h-7 w-px bg-border/60 mx-2" />

        {/* Primary nav */}
        <nav className="hidden md:flex items-center gap-1">
          <MegaMenu label="Maintenance" GroupIcon={IconMaintenance} items={gmaoItems} active={isGmaoActive} />
          <MegaMenu label="Production" GroupIcon={IconProduction} items={gpaoItems} active={isGpaoActive} />
          <Button
            asChild
            variant="ghost"
            className={cn(
              "h-9 px-3 gap-2 text-[13px] font-semibold rounded-md",
              "text-foreground/70 hover:text-foreground hover:bg-accent/60",
              isSettingsActive && "text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary"
            )}
          >
            <RRNavLink to="/parametres">
              <IconSettings size={16} />
              <span className="hidden lg:inline">Paramètres</span>
            </RRNavLink>
          </Button>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right zone */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground">
            <IconSearch size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground relative">
            <IconBell size={18} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse-dot" />
          </Button>

          <div className="h-7 w-px bg-border/60 mx-1.5" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 gap-2.5 rounded-md hover:bg-accent/60">
                <div className="hidden md:flex flex-col items-end leading-tight">
                  <span className="text-[13px] font-semibold text-foreground truncate max-w-[140px]">{displayName}</span>
                  {roleLabel && (
                    <span className="text-[10px] text-muted-foreground capitalize font-medium tracking-wide">
                      {roleLabel}
                    </span>
                  )}
                </div>
                <Avatar className="h-8 w-8 border border-border/60">
                  <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold">{displayName}</span>
                  {roleLabel && (
                    <Badge variant="outline" className="mt-1 w-fit text-[10px] capitalize font-medium">
                      {roleLabel}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/parametres")} className="gap-2">
                <IconSettings size={15} />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive focus:text-destructive">
                <IconLogout size={15} />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
