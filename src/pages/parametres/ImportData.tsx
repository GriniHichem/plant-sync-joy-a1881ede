import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Shield } from "lucide-react";
import { EntityImporter } from "@/components/parametres/EntityImporter";
import { IMPORT_TEMPLATES, ImportEntity } from "@/lib/importTemplates";

const ENTITIES: ImportEntity[] = ["machines", "equipements", "organes", "pdr", "products", "articles"];

export default function ImportData() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  if (!hasRole("admin")) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/parametres")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3" />
            <p className="font-medium">Accès réservé aux administrateurs</p>
            <p className="text-sm">Vous n'avez pas les droits pour utiliser le module d'importation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/parametres")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6" /> Importation de données
          </h1>
          <p className="text-muted-foreground">Importez machines, équipements, organes et PDR depuis un fichier CSV</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sélectionnez le type de données à importer</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="machines">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-4">
              {ENTITIES.map((e) => (
                <TabsTrigger key={e} value={e}>{IMPORT_TEMPLATES[e].label}</TabsTrigger>
              ))}
            </TabsList>
            {ENTITIES.map((e) => (
              <TabsContent key={e} value={e}>
                <EntityImporter template={IMPORT_TEMPLATES[e]} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
