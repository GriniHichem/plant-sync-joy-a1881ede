import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight, Plus, Trash2, Download, AlertTriangle, RotateCcw, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import {
  BOM_ITEM_TYPES, BOM_ITEM_TYPE_LABELS, BOM_STATUS_LABELS, BomItemType,
  buildBomCsv, parseDecimal,
} from "./BomHelpers";

type BOM = {
  id: string;
  product_id: string;
  version: number;
  status: string;
  description: string | null;
  valid_from: string | null;
  valid_to: string | null;
  approved_at: string | null;
  products?: { code: string; designation: string };
};
type Item = {
  id: string;
  bom_id: string;
  article_id: string;
  item_type: BomItemType;
  quantity_per_unit: number;
  unit: string;
  waste_percent: number | null;
  is_mandatory: boolean;
  is_quality_sensitive: boolean;
  articles?: { code: string; designation: string; unite?: string };
};

export default function BomTab() {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ product_id: "", description: "" });
  const [addItemForBom, setAddItemForBom] = useState<BOM | null>(null);
  const [itemForm, setItemForm] = useState({
    article_id: "",
    item_type: "raw_material" as BomItemType,
    quantity_per_unit: "1",
    unit: "g",
    waste_percent: "",
    is_mandatory: true,
    is_quality_sensitive: false,
  });

  async function refresh() {
    const [b, i, p, a] = await Promise.all([
      (supabase as any).from("bill_of_materials").select("*, products(code, designation)").order("created_at", { ascending: false }),
      (supabase as any).from("bom_items").select("*, articles(code, designation, unite)"),
      supabase.from("products").select("id, code, designation").eq("is_active", true).order("code"),
      supabase.from("articles").select("id, code, designation, unite").eq("is_active", true).order("code"),
    ]);
    setBoms((b.data as BOM[]) || []);
    setItems((i.data as Item[]) || []);
    setProducts(p.data || []);
    setArticles(a.data || []);
  }
  useEffect(() => { refresh(); }, []);

  const grouped = useMemo(() => {
    const map: Record<string, { product: any; versions: BOM[] }> = {};
    for (const b of boms) {
      if (statusFilter !== "all" && b.status !== statusFilter) continue;
      if (search && !`${b.products?.code} ${b.products?.designation} ${b.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) continue;
      if (!map[b.product_id]) map[b.product_id] = { product: b.products, versions: [] };
      map[b.product_id].versions.push(b);
    }
    Object.values(map).forEach((g) => g.versions.sort((a, b) => b.version - a.version));
    return map;
  }, [boms, search, statusFilter]);

  async function createBom() {
    if (!createForm.product_id) { toast({ title: "Produit requis", variant: "destructive" }); return; }
    const existing = boms.filter((b) => b.product_id === createForm.product_id);
    const nextVersion = existing.length === 0 ? 1 : Math.max(...existing.map((e) => e.version)) + 1;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).from("bill_of_materials").insert({
      product_id: createForm.product_id,
      version: nextVersion,
      status: "draft",
      description: createForm.description,
      created_by: user?.id ?? null,
    }).select().single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    const product = products.find((p) => p.id === createForm.product_id);
    await logAudit({
      action_type: "create", module: "gpao", entity_type: "bom", entity_id: data.id,
      table_name: "bill_of_materials", record_id: data.id,
      entity_code: `${product?.code}/v${nextVersion}`, entity_label: product?.designation,
      action_label: "Création nomenclature",
      new_values: { product_id: createForm.product_id, version: nextVersion, status: "draft" },
    });
    setCreateOpen(false);
    setCreateForm({ product_id: "", description: "" });
    toast({ title: "Nomenclature créée" });
    refresh();
  }

  async function setStatus(bom: BOM, status: "active" | "archived" | "draft") {
    const reason = status === "archived" ? prompt("Motif (optionnel) :") ?? "" : "";
    const { error } = await (supabase as any).rpc("set_bom_status", { p_bom_id: bom.id, p_status: status, p_reason: reason });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Nomenclature ${BOM_STATUS_LABELS[status]}` });
    try {
      const { notifyBomChanged } = await import("@/lib/qualityNotifications");
      await notifyBomChanged({ entity_id: bom.id, entity_label: `${bom.products?.code ?? ""} v${bom.version}`, version: bom.version, new_status: status });
    } catch { /* best-effort */ }
    refresh();
  }

  async function deleteBom(bom: BOM) {
    if (!confirm(`Supprimer la nomenclature v${bom.version} ?`)) return;
    const { error } = await (supabase as any).from("bill_of_materials").delete().eq("id", bom.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAudit({
      action_type: "delete", module: "gpao", entity_type: "bom", entity_id: bom.id,
      table_name: "bill_of_materials", record_id: bom.id,
      entity_code: `${bom.products?.code}/v${bom.version}`, action_label: "Suppression nomenclature",
      old_values: bom as any,
    });
    toast({ title: "Supprimée" });
    refresh();
  }

  async function addItem() {
    if (!addItemForBom || !itemForm.article_id) { toast({ title: "Article requis", variant: "destructive" }); return; }
    const payload = {
      bom_id: addItemForBom.id,
      article_id: itemForm.article_id,
      item_type: itemForm.item_type,
      quantity_per_unit: parseDecimal(itemForm.quantity_per_unit),
      unit: itemForm.unit || "g",
      waste_percent: itemForm.waste_percent === "" ? null : parseDecimal(itemForm.waste_percent),
      is_mandatory: itemForm.is_mandatory,
      is_quality_sensitive: itemForm.is_quality_sensitive,
    };
    const { data, error } = await (supabase as any).from("bom_items").insert(payload).select().single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAudit({
      action_type: "create", module: "gpao", entity_type: "bom_item", entity_id: data.id,
      table_name: "bom_items", record_id: data.id,
      action_label: "Ajout article nomenclature", new_values: payload as any,
    });
    setAddItemForBom(null);
    setItemForm({ article_id: "", item_type: "raw_material", quantity_per_unit: "1", unit: "g", waste_percent: "", is_mandatory: true, is_quality_sensitive: false });
    toast({ title: "Article ajouté" });
    refresh();
  }

  async function deleteItem(it: Item) {
    if (!confirm(`Supprimer ${it.articles?.code} ?`)) return;
    const { error } = await (supabase as any).from("bom_items").delete().eq("id", it.id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await logAudit({
      action_type: "delete", module: "gpao", entity_type: "bom_item", entity_id: it.id,
      table_name: "bom_items", record_id: it.id, action_label: "Suppression article nomenclature",
      old_values: it as any,
    });
    refresh();
  }

  function exportCsv(bom: BOM) {
    const rows = items.filter((i) => i.bom_id === bom.id).map((i) => ({
      article_code: i.articles?.code ?? "",
      article_designation: i.articles?.designation ?? "",
      item_type: i.item_type,
      quantity_per_unit: i.quantity_per_unit,
      unit: i.unit,
      waste_percent: i.waste_percent,
      is_mandatory: i.is_mandatory,
      is_quality_sensitive: i.is_quality_sensitive,
    }));
    const csv = buildBomCsv(`${bom.products?.code} - ${bom.products?.designation}`, bom.version, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nomenclature_${bom.products?.code}_v${bom.version}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const filtersActive = !!search || statusFilter !== "all";
  const groups = Object.entries(grouped);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <Input placeholder="Recherche produit / description…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 max-w-xs" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archivée</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
              <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
            </Button>
          )}
          <div className="ml-auto">
            <Button onClick={() => setCreateOpen(true)} className="h-12"><Plus className="h-4 w-4 mr-1" /> Nouvelle nomenclature</Button>
          </div>
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune nomenclature</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {groups.map(([prodId, g]) => {
            const open = !!expanded[prodId];
            return (
              <Card key={prodId}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30" onClick={() => setExpanded((e) => ({ ...e, [prodId]: !open }))}>
                    {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <div className="flex-1">
                      <p className="font-semibold">{g.product?.code} — {g.product?.designation}</p>
                      <p className="text-sm text-muted-foreground">{g.versions.length} version(s)</p>
                    </div>
                  </div>
                  {open && (
                    <div className="border-t divide-y">
                      {g.versions.map((b) => {
                        const bItems = items.filter((i) => i.bom_id === b.id);
                        const variant = b.status === "active" ? "default" : b.status === "draft" ? "outline" : "secondary";
                        return (
                          <div key={b.id} className="p-4 pl-12 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">v{b.version}</Badge>
                              <Badge variant={variant} className="text-[10px]">{BOM_STATUS_LABELS[b.status as keyof typeof BOM_STATUS_LABELS]}</Badge>
                              {b.description && <span className="text-xs text-muted-foreground">{b.description}</span>}
                              <div className="ml-auto flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => exportCsv(b)}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
                                <Button size="sm" variant="ghost" onClick={() => setAddItemForBom(b)}><Plus className="h-3.5 w-3.5 mr-1" />Article</Button>
                                {b.status !== "active" && <Button size="sm" variant="outline" onClick={() => setStatus(b, "active")}>Activer</Button>}
                                {b.status !== "archived" && <Button size="sm" variant="outline" onClick={() => setStatus(b, "archived")}>Archiver</Button>}
                                <Button size="sm" variant="ghost" onClick={() => deleteBom(b)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </div>
                            </div>
                            {bItems.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Aucun article</p>
                            ) : (
                              <div className="rounded border divide-y">
                                {bItems.map((it) => (
                                  <div key={it.id} className="px-3 py-2 text-xs flex items-center gap-3 flex-wrap">
                                    <span className="font-medium">{it.articles?.code}</span>
                                    <span className="text-muted-foreground">{it.articles?.designation}</span>
                                    <Badge variant="outline" className="text-[9px]">{BOM_ITEM_TYPE_LABELS[it.item_type]}</Badge>
                                    <span className="tabular-nums">{it.quantity_per_unit} {it.unit}</span>
                                    {it.waste_percent != null && <span className="text-muted-foreground">perte {it.waste_percent}%</span>}
                                    {!it.is_mandatory && <Badge variant="secondary" className="text-[9px]">optionnel</Badge>}
                                    {it.is_quality_sensitive && <Badge variant="destructive" className="text-[9px] gap-1"><AlertTriangle className="h-3 w-3" />Qualité sensible</Badge>}
                                    <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => deleteItem(it)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create BOM dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle nomenclature</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Produit</Label>
              <Select value={createForm.product_id} onValueChange={(v) => setCreateForm((f) => ({ ...f, product_id: v }))}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.designation}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={createBom}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add item dialog */}
      <Dialog open={!!addItemForBom} onOpenChange={(o) => !o && setAddItemForBom(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un article</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Article</Label>
              <Select value={itemForm.article_id} onValueChange={(v) => {
                const a = articles.find((x) => x.id === v);
                setItemForm((f) => ({ ...f, article_id: v, unit: a?.unite || f.unit }));
              }}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner un article" /></SelectTrigger>
                <SelectContent>
                  {articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.designation}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={itemForm.item_type} onValueChange={(v) => setItemForm((f) => ({ ...f, item_type: v as BomItemType }))}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BOM_ITEM_TYPES.map((t) => <SelectItem key={t} value={t}>{BOM_ITEM_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantité par unité</Label>
                <Input value={itemForm.quantity_per_unit} onChange={(e) => setItemForm((f) => ({ ...f, quantity_per_unit: e.target.value }))} className="h-12" />
              </div>
              <div>
                <Label>Unité</Label>
                <Input value={itemForm.unit} onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))} className="h-12" />
              </div>
              <div>
                <Label>Perte théorique (%)</Label>
                <Input value={itemForm.waste_percent} onChange={(e) => setItemForm((f) => ({ ...f, waste_percent: e.target.value }))} className="h-12" placeholder="optionnel" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={itemForm.is_mandatory} onCheckedChange={(v) => setItemForm((f) => ({ ...f, is_mandatory: v }))} />
                Obligatoire
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={itemForm.is_quality_sensitive} onCheckedChange={(v) => setItemForm((f) => ({ ...f, is_quality_sensitive: v }))} />
                Qualité sensible
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemForBom(null)}>Annuler</Button>
            <Button onClick={addItem}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
