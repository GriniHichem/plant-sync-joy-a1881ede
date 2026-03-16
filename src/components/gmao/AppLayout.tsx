import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import logoAmour from "@/assets/logo-amour.jpg";
import logoEntreprise from "@/assets/logo-entreprise.jpg";

export function AppLayout() {
  const { profile, roles } = useAuth();

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || "Utilisateur"
    : "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b px-4 bg-card shrink-0">
            <SidebarTrigger />
            <img src={logoAmour} alt="Amour" className="h-8 object-contain" />
            <img src={logoEntreprise} alt="Conserverie du Maghreb" className="h-8 object-contain" />
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground hidden md:block">
              {displayName}
            </span>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
