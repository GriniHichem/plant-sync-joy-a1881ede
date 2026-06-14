import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CalendarClock, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Foundation placeholder for the unified "Équipes & Rotations" module.
 *
 * The per-employee rotation engine (work_shift_systems / employee_shift_assignments)
 * has been replaced by a team-based engine:
 *   - shift_templates  : réutilisable shift slots (Matin/Soir/Nuit)
 *   - shift_team_members : user ↔ équipe (+ autorisation libre)
 *   - shift_schedules  : équipe ↔ modèle pour une période
 *
 * The full management UI is delivered in phase 2.
 */
export default function RotationsAdmin() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const canManage =
    hasRole("admin") ||
    hasRole("resp_maintenance") ||
    hasRole("resp_production") ||
    hasRole("responsable_controle_qualite") ||
    hasRole("directeur_qualite");

  if (!canManage) {
    return <div className="p-8 text-muted-foreground">Accès réservé aux responsables.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <CalendarClock className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Équipes &amp; Rotations</h1>
          <p className="text-sm text-muted-foreground">
            Modèles de shift, équipes &amp; plannings de rotation par équipe
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" /> Nouveau moteur par équipe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            La fondation du moteur de rotation par équipe est en place : modèles de
            shift réutilisables, appartenance des employés aux équipes (avec
            autorisation libre), et plannings associant une équipe à un modèle sur
            une période.
          </p>
          <p>
            Le contexte « Shift Actif » déduit désormais en temps réel l'équipe et le
            modèle en cours, et l'ouverture automatique de session s'appuie sur cette
            logique.
          </p>
          <p className="font-medium text-foreground">
            L'interface unifiée de gestion (équipes, membres, modèles, plannings)
            sera disponible dans la prochaine étape.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
