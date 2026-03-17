import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderTree, AlertTriangle, Wrench, ShieldCheck, Clock, Factory } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sections = [
  { title: "Utilisateurs", description: "Gérer les comptes et rôles", icon: Users, url: "/parametres/users" },
  { title: "Matrice des rôles", description: "Permissions détaillées par rôle", icon: ShieldCheck, url: "/parametres/roles" },
  { title: "Familles machines", description: "Catégories et sous-familles", icon: FolderTree, url: "/parametres/familles" },
  { title: "Types de panne", description: "Référentiel des types de panne", icon: AlertTriangle, url: "/parametres/pannes" },
  { title: "Shifts & Rotation", description: "Équipes, créneaux, planning et règles", icon: Clock, url: "/parametres/shifts" },
  { title: "Général", description: "Paramètres de l'application", icon: Wrench, url: "/parametres/general" },
];

export default function Parametres() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Administration et référentiels</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => (
          <Card
            key={s.title}
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate(s.url)}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
