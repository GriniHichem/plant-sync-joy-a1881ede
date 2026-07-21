import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Scale, Search, ChevronRight } from "lucide-react";
import { computeAbattementKg, computeNetKg, formatKg, kgToTonnes } from "@/lib/reception";
import { PhotoLightbox } from "./PhotoLightbox";

export default function ReceptionQuantitative() {
  const qc = useQueryClient();
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [poidsBrut, setPoidsBrut] = useState("");

  const { data: tickets = [], isFetching } = useQuery({
    queryKey: ["reception_pesee_list", limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_reception_global")
        .select("*").eq("statut", "cloture")
        .order("etat_pesee", { ascending: true }) // a_peser d'abord
        .order("cloture_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("reception-pesee")
      .on("postgres_changes", { event: "*", schema: "public", table: "reception_weighings" },
        () => qc.invalidateQueries({ queryKey: ["reception_pesee_list"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "reception_tickets" },
        () => qc.invalidateQueries({ queryKey: ["reception_pesee_list"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t: any) =>
      [t.numero, t.fournisseur, t.produit, t.wilaya].some((x) => (x ?? "").toString().toLowerCase().includes(q)),
    );
  }, [tickets, search]);

  const savePesee = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const brut = Number(poidsBrut);
      if (!brut || brut <= 0) throw new Error("Poids brut invalide");
      const { error } = await supabase.from("reception_weighings" as any).insert({
        ticket_id: selected.id,
        poids_brut_kg: brut,
        taux_abattement_snapshot: Number(selected.taux_abattement),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pesée enregistrée");
      setSelected(null); setPoidsBrut("");
      qc.invalidateQueries({ queryKey: ["reception_pesee_list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const brut = Number(poidsBrut || 0);
  const taux = selected ? Number(selected.taux_abattement) : 0;
  const abat = computeAbattementKg(brut, taux);
  const net = computeNetKg(brut, taux);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Tickets à peser</CardTitle>
            <div className="relative ml-auto w-64">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="N°, fournisseur, produit…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>N°</TableHead><TableHead>Produit</TableHead>
              <TableHead>Fournisseur</TableHead><TableHead>Abat.</TableHead>
              <TableHead>État</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((t: any) => (
                <TableRow key={t.id} className={selected?.id === t.id ? "bg-muted" : ""}>
                  <TableCell className="font-mono text-xs">{t.numero}</TableCell>
                  <TableCell>{t.produit}</TableCell>
                  <TableCell>{t.fournisseur}</TableCell>
                  <TableCell>{Number(t.taux_abattement).toFixed(2)} %</TableCell>
                  <TableCell>
                    {t.etat_pesee === "pese"
                      ? <Badge variant="secondary">{formatKg(t.poids_net_kg)} net</Badge>
                      : <Badge>À peser</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setSelected(t); setPoidsBrut(""); }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {isFetching ? "Chargement…" : "Aucun ticket"}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-center pt-3">
            <Button variant="outline" onClick={() => setLimit((l) => l + 20)}>Charger 20 de plus</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Détail & pesée</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Sélectionnez un ticket pour saisir la pesée.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">N° </span><span className="font-mono">{selected.numero}</span></div>
                <div><span className="text-muted-foreground">Date </span>{selected.date_ticket}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Produit </span>{selected.produit}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Fournisseur </span>{selected.fournisseur}</div>
                <div><span className="text-muted-foreground">Début </span>{selected.heure_debut ?? "—"}</div>
                <div><span className="text-muted-foreground">Fin </span>{selected.heure_fin ?? "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Abattement </span>{Number(selected.taux_abattement).toFixed(2)} %</div>
              </div>

              <PhotoLightbox ticketId={selected.id} />

              {selected.etat_pesee === "pese" ? (
                <div className="rounded-md border p-3 space-y-1 text-sm">
                  <div className="font-semibold">{selected.code_pesee}</div>
                  <div>Brut : {formatKg(selected.poids_brut_kg)}</div>
                  <div>Abattement : {formatKg(selected.poids_abattement_kg)}</div>
                  <div className="font-semibold">Net : {formatKg(selected.poids_net_kg)} ({kgToTonnes(selected.poids_net_kg)} t)</div>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Poids brut (kg) *</Label>
                    <Input type="number" step="0.01" min="0" value={poidsBrut}
                      onChange={(e) => setPoidsBrut(e.target.value)}
                      className="h-12 text-lg" />
                  </div>
                  <div className="rounded-md border p-3 space-y-1 text-sm bg-muted/30">
                    <div>Abattement : <span className="font-semibold">{formatKg(abat)}</span></div>
                    <div>Poids net : <span className="font-semibold">{formatKg(net)}</span> ({kgToTonnes(net)} t)</div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full h-12" disabled={!brut || savePesee.isPending}>
                        <Scale className="h-4 w-4 mr-2" />Valider la pesée
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la pesée ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Brut {formatKg(brut)} — abattement {formatKg(abat)} — <b>net {formatKg(net)}</b>. Après validation, la pesée est verrouillée.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => savePesee.mutate()}>Confirmer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
