import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PhotoSlot } from "./PhotoSlot";
import { format } from "date-fns";

export default function ReceptionQualitative() {
  const qc = useQueryClient();

  const [ticketId, setTicketId] = useState<string | undefined>();
  const [form, setForm] = useState({
    numero: "",
    campaign_id: "",
    supplier_id: "",
    heure_debut: "",
    heure_fin: "",
    taux_abattement: "",
    commentaire: "",
  });

  // Campagne par défaut
  const { data: defaultCampaign } = useQuery({
    queryKey: ["reception_campaigns", "default"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reception_campaigns" as any)
        .select("*, reception_products(designation, code)")
        .eq("is_default", true).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["reception_campaigns", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reception_campaigns" as any)
        .select("*, reception_products(designation, code)")
        .eq("actif", true).order("date_debut", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["reception_suppliers", "agree"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reception_suppliers" as any)
        .select("id, nom, code").eq("agree", true).eq("actif", true).order("nom");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (!form.campaign_id && defaultCampaign?.id) {
      setForm((f) => ({ ...f, campaign_id: defaultCampaign.id }));
    }
  }, [defaultCampaign?.id]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c: any) => c.id === form.campaign_id) ?? defaultCampaign,
    [campaigns, form.campaign_id, defaultCampaign],
  );

  // Photos du ticket
  const { data: photos = [] } = useQuery({
    queryKey: ["reception_photos", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase.from("reception_ticket_photos" as any)
        .select("*").eq("ticket_id", ticketId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!form.numero.trim()) throw new Error("Numéro de ticket requis");
      if (!form.campaign_id || !form.supplier_id) throw new Error("Campagne et fournisseur requis");
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("reception_tickets" as any).insert({
        numero: form.numero.trim(),
        campaign_id: form.campaign_id,
        product_id: selectedCampaign?.product_id,
        supplier_id: form.supplier_id,
        heure_debut: form.heure_debut || null,
        taux_abattement: form.taux_abattement ? Number(form.taux_abattement) : 0,
        commentaire: form.commentaire || null,
        created_by: auth.user?.id ?? null,
      }).select("*").single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: (t: any) => {
      setTicketId(t.id);
      toast.success(`Ticket ${t.numero} ouvert — ajoutez les 3 photos`);
    },
    onError: (e: any) => toast.error(e.message?.includes("duplicate") ? "Ce numéro de ticket existe déjà" : e.message),
  });

  const updateTicket = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("reception_tickets" as any).update(payload).eq("id", ticketId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reception_tickets_recent"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const addPhoto = useMutation({
    mutationFn: async ({ slot, path }: { slot: number; path: string }) => {
      const { error } = await supabase.from("reception_ticket_photos" as any).insert({
        ticket_id: ticketId!, slot, storage_path: path,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reception_photos", ticketId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removePhoto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reception_ticket_photos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reception_photos", ticketId] }),
  });

  const closeTicket = useMutation({
    mutationFn: async () => {
      // Persist la valeur d'abattement + heure_fin en direct avant clôture
      await supabase.from("reception_tickets" as any).update({
        heure_debut: form.heure_debut || null,
        heure_fin: form.heure_fin || null,
        taux_abattement: form.taux_abattement ? Number(form.taux_abattement) : 0,
        commentaire: form.commentaire || null,
        supplier_id: form.supplier_id,
      }).eq("id", ticketId!);
      const { data, error } = await supabase.rpc("close_reception_ticket" as any, { _ticket_id: ticketId! });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ticket clôturé");
      setTicketId(undefined);
      setForm({ numero: "", campaign_id: defaultCampaign?.id ?? "", supplier_id: "", heure_debut: "", heure_fin: "", taux_abattement: "", commentaire: "" });
      qc.invalidateQueries({ queryKey: ["reception_tickets_recent"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["reception_tickets_recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reception_tickets" as any)
        .select("id, numero, date_ticket, statut, taux_abattement, reception_suppliers(nom), reception_products(designation)")
        .eq("statut", "cloture").order("cloture_at", { ascending: false }).limit(10);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const photoBySlot = (slot: number) => photos.find((p) => p.slot === slot);
  const nPhotos = photos.length;
  const canClose = !!ticketId && !!form.supplier_id && !!form.heure_debut && !!form.heure_fin && nPhotos === 3;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="xl:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Réception qualitative</CardTitle>
            {ticketId && <Badge variant="outline">Ticket en cours</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>N° ticket externe *</Label>
              <Input
                value={form.numero}
                disabled={!!ticketId}
                maxLength={50}
                placeholder="Ex: BL-2026-000123"
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
              />
            </div>
            <div>
              <Label>Campagne</Label>
              <Select value={form.campaign_id} disabled={!!ticketId}
                onValueChange={(v) => setForm({ ...form, campaign_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.libelle} — {c.reception_products?.designation} {c.is_default ? "★" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Produit (auto)</Label>
              <Input readOnly value={selectedCampaign?.reception_products?.designation ?? ""} />
            </div>
            <div>
              <Label>Date</Label>
              <Input readOnly value={format(new Date(), "yyyy-MM-dd")} />
            </div>
            <div>
              <Label>Fournisseur agréé *</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Heure début *</Label>
              <div className="flex gap-2">
                <Input type="time" value={form.heure_debut} onChange={(e) => setForm({ ...form, heure_debut: e.target.value })} />
                <Button type="button" variant="outline" onClick={() => setForm({ ...form, heure_debut: new Date().toTimeString().slice(0, 5) })}>
                  <Clock className="h-4 w-4 mr-1" />Maintenant
                </Button>
              </div>
            </div>
            <div>
              <Label>Heure fin *</Label>
              <div className="flex gap-2">
                <Input type="time" value={form.heure_fin} onChange={(e) => setForm({ ...form, heure_fin: e.target.value })} />
                <Button type="button" variant="outline" onClick={() => setForm({ ...form, heure_fin: new Date().toTimeString().slice(0, 5) })}>
                  <Clock className="h-4 w-4 mr-1" />Maintenant
                </Button>
              </div>
            </div>
            <div>
              <Label>Taux d'abattement (%) *</Label>
              <Input type="number" step="0.01" min="0" max="100"
                value={form.taux_abattement}
                onChange={(e) => setForm({ ...form, taux_abattement: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Commentaire</Label>
              <Textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} />
            </div>
          </div>

          {!ticketId && (
            <Button className="w-full h-12" disabled={createTicket.isPending || !form.numero.trim() || !form.campaign_id || !form.supplier_id}
              onClick={() => createTicket.mutate()}>
              Ouvrir le ticket
            </Button>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Photos obligatoires (3)</Label>
              <Badge variant={nPhotos === 3 ? "default" : "outline"}>{nPhotos}/3</Badge>
            </div>
            {!ticketId && (
              <p className="text-xs text-muted-foreground">
                Renseignez le n° de ticket puis cliquez sur <b>Ouvrir le ticket</b> pour activer la prise de photos.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3].map((s) => {
                const p = photoBySlot(s);
                return (
                  <PhotoSlot key={s} ticketId={ticketId} ticketNumero={form.numero} slot={s as 1 | 2 | 3}
                    disabled={!ticketId}
                    storagePath={p?.storage_path}
                    onUploaded={(path) => addPhoto.mutate({ slot: s, path })}
                    onDeleted={() => p && removePhoto.mutate(p.id)} />
                );
              })}
            </div>
          </div>

          {ticketId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full h-12" disabled={!canClose || closeTicket.isPending}>
                  <Lock className="h-4 w-4 mr-2" />Enregistrer et clôturer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clôturer le ticket ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Après clôture, aucune modification ne sera possible. Le ticket pourra être pesé par le pont-bascule.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => closeTicket.mutate()}>Confirmer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>10 derniers tickets clôturés</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>N°</TableHead><TableHead>Fournisseur</TableHead><TableHead>Abat.</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {recent.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.numero}</TableCell>
                  <TableCell>{t.reception_suppliers?.nom}</TableCell>
                  <TableCell>{Number(t.taux_abattement).toFixed(2)} %</TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">—</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
