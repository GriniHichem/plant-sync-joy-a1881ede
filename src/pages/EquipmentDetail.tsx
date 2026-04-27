import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { ArrowLeft, Edit, Cog, Factory, Component } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { EntityDocumentManager } from "@/components/documents/EntityDocumentManager";

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
  const navigate = useNavWithFrom();
  const goBack = useSmartBack("/equipements");
  const { canEdit } = usePermissions();
  const [equip, setEquip] = useState<any>(null);
  const [organes, setOrganes] = useState<any[]>([]);
  const entityImages = useEntityImages("equipement", id);
  useEffect(() => {
    if (!id) return;
    supabase
      .from("equipements")
      .select("*, machine_families(name), machines(code, designation), production_lines(code, designation)")
      .eq("id", id)
      .single()
      .then(({ data }) => setEquip(data));
    (supabase.from("organes" as any) as any)
      .select("*")
      .eq("equipement_id", id)
      .order("sort_order")
      .then(({ data }: any) => setOrganes(data || []));
  }, [id]);

  if (!equip) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {entityImages.primaryImage && (
          <EntityThumbnail imageUrl={entityImages.primaryImage.image_url} alt={equip.designation} size="lg" rounded="lg" enableLightbox />
        )}
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

      <Tabs defaultValue="info">
        <TabsList className="h-11">
          <TabsTrigger value="info" className="h-9">Informations</TabsTrigger>
          <TabsTrigger value="organes" className="h-9">Organes ({organes.length})</TabsTrigger>
          <TabsTrigger value="photos" className="h-9">Photos</TabsTrigger>
          <TabsTrigger value="documents" className="h-9">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
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

            <Card>
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
        </TabsContent>

        <TabsContent value="organes">
          <Card>
            <CardContent className="p-0">
              <div className="flex justify-end p-3 border-b">
                {canEdit("organes") && (
                  <Button size="sm" onClick={() => navigate(`/organes/new?equipement_id=${id}`)}>
                    <Component className="h-4 w-4 mr-2" /> Ajouter un organe
                  </Button>
                )}
              </div>
              <div className="p-3 space-y-2">
                {organes.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-sm">Aucun organe</p>
                ) : organes.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/organes/${o.id}`)}>
                    <div>
                      <p className="font-mono text-sm font-medium">{o.code} — {o.designation}</p>
                      <p className="text-xs text-muted-foreground capitalize">{o.type} · {o.statut?.replace("_", " ")} · Criticité {o.criticite}</p>
                    </div>
                    <Badge variant={o.statut === "en_service" ? "default" : o.statut === "en_panne" ? "destructive" : "secondary"} className="text-xs">{o.statut?.replace("_", " ")}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
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
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-6">
              <EntityDocumentManager entityType="equipement" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
