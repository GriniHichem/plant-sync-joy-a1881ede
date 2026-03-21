import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import logoAmour from "@/assets/logo-amour.jpg";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { IconBell, IconSearch } from "@/components/icons/IndustrialIcons";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const { profile, roles } = useAuth();

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || "Utilisateur"
    : "";

  const initials = profile
    ? `${(profile.first_name || "")[0] || ""}${(profile.last_name || "")[0] || ""}`.toUpperCase()
    : "U";

  const roleLabel = roles.length > 0 ? roles[0].replace(/_/g, " ") : "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Premium industrial header */}
          <header className="h-14 flex items-center gap-3 border-b px-4 shrink-0 sticky top-0 z-30"
            style={{
              backgroundColor: 'hsl(var(--header-background))',
              borderColor: 'hsl(var(--header-border))',
              color: 'hsl(var(--header-foreground))',
            }}
          >
            {/* Left: trigger + logo */}
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            
            <div className="h-6 w-px bg-border/60" />
            
            <div className="flex items-center gap-2.5">
              <img src={logoAmour} alt="Amour" className="h-8 object-contain rounded" />
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-foreground/70">
                  PROD IN TIME
                </span>
              </div>
            </div>

            {/* Center spacer */}
            <div className="flex-1" />

            {/* Right: actions + user */}
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg">
                <IconSearch size={18} />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg relative">
                <IconBell size={18} />
                {/* Notification dot */}
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse-dot" />
              </Button>
              
              <div className="h-6 w-px bg-border/60 mx-1" />

              <div className="flex items-center gap-2.5">
                {roleLabel && (
                  <Badge variant="outline" className="hidden md:inline-flex text-[10px] capitalize font-medium border-border/60 text-muted-foreground">
                    {roleLabel}
                  </Badge>
                )}
                <div className="hidden md:flex flex-col items-end leading-tight">
                  <span className="text-[13px] font-semibold text-foreground">{displayName}</span>
                </div>
                <Avatar className="h-8 w-8 border border-border/60">
                  <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
