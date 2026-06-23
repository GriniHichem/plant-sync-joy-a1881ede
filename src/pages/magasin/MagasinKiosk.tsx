import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Warehouse, LogOut, Boxes, ListChecks } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PdrQueuePanel } from "@/components/pdr/PdrQueuePanel";
import logoEntreprise from "@/assets/logo-entreprise.jpg";

/**
 * Full-screen warehouse-keeper kiosk (no global sidebar).
 * Focused on the controlled parts-request cycle: prepare / refuse only.
 * Entries & exits go through the PDR catalogue (audited movement flow).
 */
export default function MagasinKiosk() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Magasinier";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border flex items-center gap-3 px-4 shrink-0 bg-card">
        <div className="h-9 w-9 rounded-lg overflow-hidden border border-border/50">
          <img src={logoEntreprise} alt="Entreprise" className="h-full w-full object-cover" />
        </div>
        <div className="flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-base font-bold leading-none">Espace Magasin</h1>
            <p className="text-[11px] text-muted-foreground">{name}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" className="h-11" onClick={() => navigate("/pdr")}>
            <Boxes className="h-4 w-4 mr-1.5" /> Catalogue & mouvements
          </Button>
          <Button variant="ghost" className="h-11" onClick={() => navigate("/apps")}>
            <LogOut className="h-4 w-4 mr-1.5" /> Quitter
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ListChecks className="h-4 w-4" /> Demandes de pièces à préparer
          </div>
          <PdrQueuePanel />
        </div>
      </main>
    </div>
  );
}
