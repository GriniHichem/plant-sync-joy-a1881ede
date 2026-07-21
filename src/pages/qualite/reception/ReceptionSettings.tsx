import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Star, StarOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Product = { id: string; code: string; designation: string; description: string | null; normes: string[]; calibres: string[]; varietes: string[]; actif: boolean };
type Supplier = { id: string; code: string; nom: string; region: string | null; wilaya: string | null; contact: string | null; telephone: string | null; adresse: string | null; agree: boolean; actif: boolean };
type Campaign = { id: string; code: string; libelle: string; product_id: string; date_debut: string; date_fin: string; objectif_kg: number | null; actif: boolean; is_default: boolean };

function toArray(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function ReceptionSettings() {
  return (
    <Tabs defaultValue="products" className="space-y-4">
      <TabsList>
        <TabsTrigger value="products">Produits</TabsTrigger>
        <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
        <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
      </TabsList>
      <TabsContent value="products"><ProductsTab /></TabsContent>
      <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
      <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
    </Tabs>
  );
}

/* ------------------- Products ------------------- */
function ProductsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["reception_products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reception_products" as any).select("*").order("designation");
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from("reception_products" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reception_products" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reception_products"] });
      toast.success("Produit enregistré");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Produits frais</CardTitle>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Nouveau produit</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Désignation</TableHead>
            <TableHead>Variétés</TableHead><TableHead>Calibres</TableHead>
            <TableHead>Actif</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono">{p.code}</TableCell>
                <TableCell className="font-medium">{p.designation}</TableCell>
                <TableCell>{p.varietes?.join(", ")}</TableCell>
                <TableCell>{p.calibres?.join(", ")}</TableCell>
                <TableCell>{p.actif ? <Badge>Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun produit configuré</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <ProductDialog open={open} onOpenChange={setOpen} editing={editing} onSave={save.mutate} saving={save.isPending} />
    </Card>
  );
}

function ProductDialog({ open, onOpenChange, editing, onSave, saving }: any) {
  const [form, setForm] = useState<any>({ code: "", designation: "", description: "", normes: "", calibres: "", varietes: "", actif: true });
  const key = editing?.id ?? "new";
  const initialized = (useState<string>(""))[0];
  // reset when opened
  useState(() => setForm({ code: "", designation: "", description: "", normes: "", calibres: "", varietes: "", actif: true }));
  // simple sync
  useKey(open + key, () => {
    setForm({
      code: editing?.code ?? "",
      designation: editing?.designation ?? "",
      description: editing?.description ?? "",
      normes: (editing?.normes ?? []).join(", "),
      calibres: (editing?.calibres ?? []).join(", "),
      varietes: (editing?.varietes ?? []).join(", "),
      actif: editing?.actif ?? true,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Modifier produit" : "Nouveau produit"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>Désignation *</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Normes (séparées par virgule)</Label><Input value={form.normes} onChange={(e) => setForm({ ...form, normes: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Variétés</Label><Input value={form.varietes} onChange={(e) => setForm({ ...form, varietes: e.target.value })} /></div>
            <div><Label>Calibres</Label><Input value={form.calibres} onChange={(e) => setForm({ ...form, calibres: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={form.actif} onCheckedChange={(v) => setForm({ ...form, actif: v })} /><Label>Actif</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button disabled={saving || !form.code || !form.designation} onClick={() => onSave({ id: editing?.id, code: form.code, designation: form.designation, description: form.description || null, normes: toArray(form.normes), calibres: toArray(form.calibres), varietes: toArray(form.varietes), actif: form.actif })}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// helper: run effect on dependency change
function useKey(dep: any, fn: () => void) {
  const [prev, setPrev] = useState<any>();
  if (prev !== dep) { setPrev(dep); fn(); }
}

/* ------------------- Suppliers ------------------- */
function SuppliersTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<any>({ code: "", nom: "", region: "", wilaya: "", contact: "", telephone: "", adresse: "", notes: "", agree: true, actif: true });

  const { data = [] } = useQuery({
    queryKey: ["reception_suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reception_suppliers" as any).select("*").order("nom");
      if (error) throw error;
      return (data ?? []) as unknown as Supplier[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from("reception_suppliers" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reception_suppliers" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reception_suppliers"] });
      toast.success("Fournisseur enregistré");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openNew() {
    setEditing(null);
    setForm({ code: "", nom: "", region: "", wilaya: "", contact: "", telephone: "", adresse: "", notes: "", agree: true, actif: true });
    setOpen(true);
  }
  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ ...s, region: s.region ?? "", wilaya: s.wilaya ?? "", contact: s.contact ?? "", telephone: s.telephone ?? "", adresse: s.adresse ?? "", notes: (s as any).notes ?? "" });
    setOpen(true);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Fournisseurs</CardTitle>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nouveau fournisseur</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Nom</TableHead><TableHead>Wilaya</TableHead>
            <TableHead>Contact</TableHead><TableHead>Agréé</TableHead><TableHead>Actif</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono">{s.code}</TableCell>
                <TableCell className="font-medium">{s.nom}</TableCell>
                <TableCell>{s.wilaya ?? "—"}</TableCell>
                <TableCell>{s.contact ?? "—"} {s.telephone ? `· ${s.telephone}` : ""}</TableCell>
                <TableCell>{s.agree ? <Badge>Agréé</Badge> : <Badge variant="secondary">Non</Badge>}</TableCell>
                <TableCell>{s.actif ? <Badge>Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {data.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun fournisseur</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier fournisseur" : "Nouveau fournisseur"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
              <div><Label>Région</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
              <div><Label>Wilaya</Label><Input value={form.wilaya} onChange={(e) => setForm({ ...form, wilaya: e.target.value })} /></div>
              <div><Label>Contact</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
            </div>
            <div><Label>Adresse</Label><Textarea value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.agree} onCheckedChange={(v) => setForm({ ...form, agree: v })} /><Label>Agréé</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.actif} onCheckedChange={(v) => setForm({ ...form, actif: v })} /><Label>Actif</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={save.isPending || !form.code || !form.nom} onClick={() => save.mutate({
              id: editing?.id, code: form.code, nom: form.nom,
              region: form.region || null, wilaya: form.wilaya || null,
              contact: form.contact || null, telephone: form.telephone || null,
              adresse: form.adresse || null, notes: form.notes || null,
              agree: form.agree, actif: form.actif,
            })}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ------------------- Campaigns ------------------- */
function CampaignsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<any>({ code: "", libelle: "", product_id: "", date_debut: format(new Date(), "yyyy-MM-dd"), date_fin: format(new Date(), "yyyy-MM-dd"), objectif_kg: "", actif: true, is_default: false });

  const { data: products = [] } = useQuery({
    queryKey: ["reception_products", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reception_products" as any).select("id, designation, code").eq("actif", true).order("designation");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data = [] } = useQuery({
    queryKey: ["reception_campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reception_campaigns" as any)
        .select("*, reception_products(designation, code)")
        .order("date_debut", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from("reception_campaigns" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reception_campaigns" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reception_campaigns"] });
      qc.invalidateQueries({ queryKey: ["reception_campaigns", "default"] });
      toast.success("Campagne enregistrée");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reception_campaigns" as any).update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reception_campaigns"] });
      qc.invalidateQueries({ queryKey: ["reception_campaigns", "default"] });
      toast.success("Campagne définie par défaut");
    },
  });

  function openNew() {
    setEditing(null);
    setForm({ code: "", libelle: "", product_id: products[0]?.id ?? "", date_debut: format(new Date(), "yyyy-MM-dd"), date_fin: format(new Date(), "yyyy-MM-dd"), objectif_kg: "", actif: true, is_default: false });
    setOpen(true);
  }
  function openEdit(c: any) {
    setEditing(c);
    setForm({ code: c.code, libelle: c.libelle, product_id: c.product_id, date_debut: c.date_debut, date_fin: c.date_fin, objectif_kg: c.objectif_kg ?? "", actif: c.actif, is_default: c.is_default });
    setOpen(true);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Campagnes</CardTitle>
        <Button onClick={openNew} disabled={products.length === 0}><Plus className="h-4 w-4 mr-2" />Nouvelle campagne</Button>
      </CardHeader>
      <CardContent>
        {products.length === 0 && <p className="text-sm text-muted-foreground mb-3">Créez d'abord un produit pour lancer une campagne.</p>}
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Libellé</TableHead><TableHead>Produit</TableHead>
            <TableHead>Période</TableHead><TableHead>Objectif</TableHead>
            <TableHead>Défaut</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono">{c.code}</TableCell>
                <TableCell className="font-medium">{c.libelle}</TableCell>
                <TableCell>{c.reception_products?.designation ?? "—"}</TableCell>
                <TableCell className="text-xs">{c.date_debut} → {c.date_fin}</TableCell>
                <TableCell>{c.objectif_kg ? `${Number(c.objectif_kg).toLocaleString("fr-FR")} kg` : "—"}</TableCell>
                <TableCell>
                  {c.is_default
                    ? <Badge className="gap-1"><Star className="h-3 w-3" />Défaut</Badge>
                    : <Button size="sm" variant="ghost" onClick={() => setDefault.mutate(c.id)}><StarOff className="h-4 w-4 mr-1" />Définir</Button>}
                </TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {data.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucune campagne</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier campagne" : "Nouvelle campagne"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>Libellé *</Label><Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} /></div>
            </div>
            <div><Label>Produit *</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.designation}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Début *</Label><Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} /></div>
              <div><Label>Fin *</Label><Input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} /></div>
            </div>
            <div><Label>Objectif (kg)</Label><Input type="number" step="0.01" value={form.objectif_kg} onChange={(e) => setForm({ ...form, objectif_kg: e.target.value })} /></div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.actif} onCheckedChange={(v) => setForm({ ...form, actif: v })} /><Label>Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} /><Label>Par défaut</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={save.isPending || !form.code || !form.libelle || !form.product_id || form.date_fin < form.date_debut}
              onClick={() => save.mutate({
                id: editing?.id, code: form.code, libelle: form.libelle,
                product_id: form.product_id, date_debut: form.date_debut, date_fin: form.date_fin,
                objectif_kg: form.objectif_kg ? Number(form.objectif_kg) : null,
                actif: form.actif, is_default: form.is_default,
              })}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
