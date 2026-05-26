import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import RecipesQualityTab from "./components/RecipesQualityTab";
import BomCompareTab from "./components/BomCompareTab";
import QualitySensitiveItemsTab from "./components/QualitySensitiveItemsTab";

export default function QualiteRecettesNomenclatures() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Recettes (Qualité)</h1>
        <p className="text-muted-foreground">Composition, étapes et contrôles qualité — la nomenclature fait désormais partie de la recette</p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3 px-4 flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div>
            C'est ici que se gèrent les <span className="font-medium">nomenclatures (BOM)</span> et le marquage « Qualité sensible » des composants. La page <span className="font-medium">GPAO → Recettes</span> reste utilisée pour consulter les recettes et gérer les étapes de fabrication.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="recipes" className="w-full">
        <TabsList className="h-12">
          <TabsTrigger value="recipes" className="px-4">Recettes</TabsTrigger>
          <TabsTrigger value="compare" className="px-4">Comparer versions</TabsTrigger>
          <TabsTrigger value="sensitive" className="px-4">Composants qualité sensibles</TabsTrigger>
        </TabsList>
        <TabsContent value="recipes" className="mt-4"><RecipesQualityTab /></TabsContent>
        <TabsContent value="compare" className="mt-4"><BomCompareTab /></TabsContent>
        <TabsContent value="sensitive" className="mt-4"><QualitySensitiveItemsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
