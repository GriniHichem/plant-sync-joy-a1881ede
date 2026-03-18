import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import logoAmour from "@/assets/logo-amour.jpg";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
          <header className="h-14 flex items-center gap-3 border-b px-4 bg-card shrink-0">
            <SidebarTrigger />
            <img src={logoAmour} alt="Amour" className="h-9 object-contain" />
            <div className="flex-1" />
            <div className="flex items-center gap-2.5">
              {roleLabel && (
                <Badge variant="secondary" className="hidden md:inline-flex text-[10px] capitalize font-normal">
                  {roleLabel}
                </Badge>
              )}
              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-sm font-medium">{displayName}</span>
              </div>
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
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
