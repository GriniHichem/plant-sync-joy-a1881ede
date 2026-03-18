import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ENTITY_KEYS = [
  { key: "image_max_size_machine", label: "Machine", defaultVal: "5" },
  { key: "image_max_size_pdr", label: "Pièce de rechange (PDR)", defaultVal: "2" },
  { key: "image_max_size_equipement", label: "Équipement", defaultVal: "3" },
  { key: "image_max_size_produit", label: "Produit", defaultVal: "3" },
  { key: "image_max_size_article", label: "Article", defaultVal: "3" },
  { key: "image_max_size_user", label: "Utilisateur", defaultVal: "1" },
];

export default function ImageSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("key, value")
      .like("key", "image_max_size_%")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        ENTITY_KEYS.forEach((e) => {
          const found = data?.find((d) => d.key === e.key);
          map[e.key] = found?.value ?? e.defaultVal;
        });
        setValues(map);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    for (const entity of ENTITY_KEYS) {
      const val = values[entity.key] || entity.defaultVal;
      await supabase
        .from("app_settings")
        .update({ value: val } as any)
        .eq("key", entity.key);
    }
    setSaving(false);
    toast({ title: "Paramètres photos enregistrés" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Photos & Images</h1>
          <p className="text-muted-foreground">Taille maximale autorisée par type d'entité</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Taille maximale des photos (Mo)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ENTITY_KEYS.map((entity) => (
                  <div key={entity.key} className="space-y-1.5">
                    <Label className="text-sm">{entity.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0.5"
                        max="20"
                        step="0.5"
                        value={values[entity.key] || ""}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [entity.key]: e.target.value }))
                        }
                        className="h-10 w-24"
                      />
                      <span className="text-sm text-muted-foreground">Mo</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleSave} disabled={saving} className="h-11 mt-2">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
