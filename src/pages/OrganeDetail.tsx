import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Trash2, Cog, Component } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { EntityDocumentManager } from "@/components/documents/EntityDocumentManager";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePdrLinksByEntity } from "@/hooks/usePdrLinks";

const TYPE_LABELS: Record<string, string> = {
  mecanique: "Mécanique", electrique: "Électrique", pneumatique: "Pneumatique",
  hydraulique: "Hydraulique", electronique: "Électronique", automatisme: "Automatisme",
  instrumentation: "Instrumentation", autre: "Autre",
};
const STATUT_LABELS: Record<string, string> = {
  en_service: "En service", en_panne: "En panne",
  en_maintenance: "En maintenance", hors_service: "Hors service",
};
const STATUT_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  en_service: "default", en_panne: "destructive", en_maintenance: "secondary", hors_service: "outline",
};

export default function OrganeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, canDelete } = usePermissions();
  const [organe, setOrgane] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const entityImages = useEntityImages("organe", id);
  const { links: pdrLinks } = usePdrLinksByEntity("organe", id);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [oRes, tRes, pRes] = await Promise.all([
        supabase.from("organes" as any).select("*, machines(id, code, designation), equipements(id, code, designation)").eq("id", id).single(),
        supabase.from("tickets").select("id, numero, description, statut, priorite").eq("organe_id" as any, id).order("created_at", { ascending: false }),
        supabase.from("preventive_plans").select("id, title, frequence, statut_plan").eq("organe_id" as any, id),
      ]);
      setOrgane(oRes.data);
      setTickets(tRes.data || []);
      setPlans(pRes.data || []);
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    if (tickets.length > 0 || plans.length > 0 || pdrLinks.length > 0) {
      toast({ title: "Suppression bloquée", description: "Cet organe est utilisé par des tickets, plans ou PDR.", variant: "destructive" });
      return;
    }
    if (!confirm("Supprimer cet organe ?")) return;
    const { error } = await supabase.from("organes" as any).delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Organe supprimé" });
    navigate("/organes");
  };

  if (!organe) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;
  const parent = organe.machines || organe.equipements;
  const parentKind = organe.machines ? "machine" : "equipement";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/organes")}><ArrowLeft className="h-5 w-5" /></Button>
        {entityImages.primaryImage && (
          <EntityThumbnail imageUrl={entityImages.primaryImage.image_url} alt={organe.designation} size="lg" rounded="lg" enableLightbox />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Component className="h-6 w-6" /> {organe.code} — {organe.designation}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={STATUT_VARIANT[organe.statut]} className="text-xs">{STATUT_LABELS[organe.statut]}</Badge>
            <Badge variant="outline" className="text-xs">{TYPE_LABELS[organe.type]}</Badge>
            <Badge variant="outline" className="text-xs">Criticité {organe.criticite}</Badge>
            {parent && (
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => navigate(parentKind === "machine" ? `/machines/${parent.id}` : `/equipements/${parent.id}`)}
              >
                <Cog className="h-3 w-3 mr-1" />
                {parentKind === "machine" ? "Machine" : "Équipement"}: {parent.code}
              </Badge>
            )}
          </div>
        </div>
        {canEdit("organes") && (
          <Button variant="outline" onClick={() => navigate(`/organes/${id}/edit`)}><Edit className="h-4 w-4 mr-2" />Modifier</Button>
        )}
        {canDelete("organes") && (
          <Button variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Supprimer</Button>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList className="h-11 flex-wrap">
          <TabsTrigger value="info" className="h-9">Infos</TabsTrigger>
          <TabsTrigger value="pdr" className="h-9">PDR ({pdrLinks.length})</TabsTrigger>
          <TabsTrigger value="tickets" className="h-9">Tickets ({tickets.length})</TabsTrigger>
          <TabsTrigger value="preventif" className="h-9">Préventif ({plans.length})</TabsTrigger>
          <TabsTrigger value="photos" className="h-9">Photos</TabsTrigger>
          <TabsTrigger value="documents" className="h-9">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6">
              {[
                ["Code", organe.code], ["Désignation", organe.designation],
                ["Type", TYPE_LABELS[organe.type]], ["Statut", STATUT_LABELS[organe.statut]],
                ["Criticité", organe.criticite], ["Ordre", organe.sort_order],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="text-sm font-medium">{String(v)}</p>
                </div>
              ))}
              {organe.description && (
                <div className="col-span-full">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{organe.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdr">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Référence</TableHead><TableHead>Désignation</TableHead><TableHead>Stock</TableHead><TableHead>Qté reco.</TableHead></TableRow></TableHeader>
              <TableBody>
                {pdrLinks.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune PDR liée</TableCell></TableRow>
                ) : pdrLinks.map((l: any) => (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/pdr/${l.pdr?.id}`)}>
                    <TableCell className="font-mono">{l.pdr?.reference}</TableCell>
                    <TableCell>{l.pdr?.designation}</TableCell>
                    <TableCell className="tabular-nums">{l.pdr?.stock_actuel} / min {l.pdr?.stock_min}</TableCell>
                    <TableCell className="tabular-nums">{l.quantite_recommandee}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>N°</TableHead><TableHead>Description</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Aucun ticket</TableCell></TableRow>
                ) : tickets.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/tickets/${t.id}`)}>
                    <TableCell className="font-mono">{t.numero}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t.statut}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="preventif">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Fréquence</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Aucun plan</TableCell></TableRow>
                ) : plans.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/preventif/${p.id}`)}>
                    <TableCell>{p.title}</TableCell>
                    <TableCell>{p.frequence}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.statut_plan}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="photos">
          <Card><CardContent>
            <EntityImageUploader
              images={entityImages.images}
              primaryImage={entityImages.primaryImage}
              uploading={entityImages.uploading}
              onUpload={entityImages.uploadImage}
              onDelete={entityImages.deleteImage}
              onSetPrimary={entityImages.setPrimary}
              canEdit={canEdit("organes")}
              maxSizeMb={entityImages.maxSizeMb}
            />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card><CardContent className="p-6"><EntityDocumentManager entityType="organe" entityId={id!} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
