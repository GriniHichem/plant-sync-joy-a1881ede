import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, ListChecks, Ruler, MapPin, Bug, Gavel, ChevronRight, ClipboardCheck } from "lucide-react";

const ITEMS = [
  { title: "Catégories de non-conformité", description: "Familles pour classer les NC (produit, process, matière…)", icon: AlertTriangle, url: "/parametres/qualite/nc-categories" },
  { title: "Catégories d'actions", description: "Types d'actions qualité (corrective, préventive…)", icon: ListChecks, url: "/parametres/qualite/action-categories" },
  { title: "Unités de mesure", description: "Unités utilisables dans les indicateurs et contrôles", icon: Ruler, url: "/parametres/qualite/units" },
  { title: "Points de contrôle", description: "Postes / stations où sont effectués les contrôles", icon: MapPin, url: "/parametres/qualite/control-points" },
  { title: "Types de défauts", description: "Catalogue des défauts avec gravité par défaut", icon: Bug, url: "/parametres/qualite/defect-types" },
  { title: "Motifs de décision NC", description: "Justifications pour rebut, retouche, dérogation…", icon: Gavel, url: "/parametres/qualite/decision-reasons" },
];

export default function QualiteParametresHub() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Paramétrage Qualité</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Listes, types et catégories utilisés dans le module Qualité &amp; Traçabilité
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ITEMS.map((it) => (
          <Card
            key={it.url}
            className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
            onClick={() => navigate(it.url)}
          >
            <CardContent className="p-5 flex items-start gap-4">
              <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <it.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-tight group-hover:text-primary transition-colors">{it.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1.5 group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
