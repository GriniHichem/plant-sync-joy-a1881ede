import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { ArrowLeft, Edit, Cog, Factory } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";

const TYPE_LABELS: Record<string, string> = {
  capteur: "Capteur", actionneur: "Actionneur", convoyeur: "Convoyeur",
  peripherique: "Périphérique", utilite: "Utilité", sous_ensemble: "Sous-ensemble",
  instrument: "Instrument", autre: "Autre",
};
const STATUT_LABELS: Record<string, string> = {
  en_service: "En service", hors_service: "Hors service",
  en_maintenance: "En maintenance", reforme: "Réformé",
};
const STATUT_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  en_service: "default", hors_service: "destructive",
  en_maintenance: "secondary", reforme: "outline",
};
const ROLE_LABELS: Record<string, string> = {
  alimentation: "Alimentation", transformation: "Transformation", dosage: "Dosage",
  melange: "Mélange", convoyage: "Convoyage", conditionnement: "Conditionnement",
  controle: "Contrôle", evacuation: "Évacuation", utilite: "Utilité", autre: "Autre",
};
const CRIT_MAINT_LABELS: Record<string, string> = {
  faible: "Faible", moyenne: "Moyenne", elevee: "Élevée", critique: "Critique",
};

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const [equip, setEquip] = useState<any>(null);
  const entityImages = useEntityImages("equipement", id);
  useEffect(() => {
    if (!id) return;
    supabase
      .from("equipements")
      .select("*, machine_families(name), machines(code, designation), production_lines(code, designation)")
      .eq("id", id)
      .single()
      .then(({ data }) => setEquip(data));
  }, [id]);

  if (!equip) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/equipements")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{equip.code} — {equip.designation}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={STATUT_VARIANT[equip.statut] || "secondary"} className="text-xs">
              {STATUT_LABELS[equip.statut]}
            </Badge>
            <StatusBadge type="criticite" value={equip.criticite} />
            <Badge variant="outline" className="text-xs">{TYPE_LABELS[equip.type]}</Badge>
            {equip.machines && (
              <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => navigate(`/machines/${equip.machine_id}`)}>
                <Cog className="h-3 w-3 mr-1" /> {equip.machines.code}
              </Badge>
            )}
            {equip.production_lines && (
              <Badge variant="secondary" className="text-xs">
                <Factory className="h-3 w-3 mr-1" /> {equip.production_lines.code}
              </Badge>
            )}
          </div>
        </div>
        {canEdit("machines") && (
          <Button variant="outline" onClick={() => navigate(`/equipements/${id}/edit`)} className="h-12 px-6">
            <Edit className="h-4 w-4 mr-2" /> Modifier
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Photo</CardTitle></CardHeader>
          <CardContent>
            <EntityImageUploader
              images={entityImages.images}
              primaryImage={entityImages.primaryImage}
              uploading={entityImages.uploading}
              onUpload={entityImages.uploadImage}
              onDelete={entityImages.deleteImage}
              onSetPrimary={entityImages.setPrimary}
              canEdit={canEdit("machines")}
              maxSizeMb={entityImages.maxSizeMb}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              ["Code", equip.code],
              ["Désignation", equip.designation],
              ["Marque", equip.marque],
              ["Modèle", equip.modele],
              ["N° Série", equip.numero_serie],
              ["Localisation", equip.localisation],
              ["Mise en service", equip.date_mise_en_service ? new Date(equip.date_mise_en_service).toLocaleDateString("fr-FR") : "—"],
              ["Famille", equip.machine_families?.name || "—"],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{(value as string) || "—"}</p>
              </div>
            ))}
            {equip.description && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">{equip.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Classification & Process</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <Badge variant="outline" className="text-xs mt-0.5">{TYPE_LABELS[equip.type]}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rôle fonctionnel</p>
              <p className="text-sm font-medium">{ROLE_LABELS[equip.role_fonctionnel] || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Criticité maintenance</p>
              <Badge variant={
                equip.criticite_maintenance === "critique" ? "destructive" :
                equip.criticite_maintenance === "elevee" ? "default" : "secondary"
              } className="text-xs mt-0.5">
                {CRIT_MAINT_LABELS[equip.criticite_maintenance] || "—"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Machine parente</p>
              {equip.machines ? (
                <Badge variant="secondary" className="text-xs cursor-pointer mt-0.5" onClick={() => navigate(`/machines/${equip.machine_id}`)}>
                  {equip.machines.code} — {equip.machines.designation}
                </Badge>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Ligne de production</p>
              {equip.production_lines ? (
                <Badge variant="secondary" className="text-xs mt-0.5">
                  {equip.production_lines.code} — {equip.production_lines.designation}
                </Badge>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
