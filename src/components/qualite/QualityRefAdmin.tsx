import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface RefField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "color";
  placeholder?: string;
  required?: boolean;
  width?: string;
}

interface Props {
  table: string;
  title: string;
  subtitle?: string;
  fields: RefField[];
  /** Extra columns to show in the list besides code/label */
  extraColumns?: { key: string; label: string; render?: (v: any) => React.ReactNode }[];
}

type Row = Record<string, any> & { id: string; code: string; label: string; is_active: boolean; sort_order: number };

export function QualityRefAdmin({ table, title, subtitle, fields, extraColumns = [] }: Props) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase.from(table as any) as any)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [table]);

  function openNew() {
    setEditing(null);
    const init: Record<string, any> = { is_active: true, sort_order: (rows.length + 1) * 10 };
    fields.forEach((f) => { if (init[f.key] === undefined) init[f.key] = ""; });
    setForm(init);
    setOpen(true);
  }
  function openEdit(r: Row) {
    setEditing(r);
    setForm({ ...r });
    setOpen(true);
  }

  async function save() {
    const payload: Record<string, any> = { ...form };
    for (const f of fields) {
      if (f.required && !String(payload[f.key] ?? "").trim()) {
        toast.error(`Le champ "${f.label}" est obligatoire`);
        return;
      }
      if (f.type === "number" && payload[f.key] !== "" && payload[f.key] !== null) {
        payload[f.key] = Number(payload[f.key]);
      }
    }
    payload.sort_order = Number(payload.sort_order ?? 0) || 0;

    const { error } = editing
      ? await (supabase.from(table as any) as any).update(payload).eq("id", editing.id)
      : await (supabase.from(table as any) as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Mise à jour effectuée" : "Entrée créée");
    setOpen(false);
    load();
  }

  async function toggleActive(r: Row, value: boolean) {
    const { error } = await (supabase.from(table as any) as any).update({ is_active: value }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, is_active: value } : x));
  }

  async function remove(r: Row) {
    if (!confirm(`Supprimer "${r.label}" ?`)) return;
    const { error } = await (supabase.from(table as any) as any).delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé");
    load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.code + " " + r.label).toLowerCase().includes(q));
  }, [rows, search]);

  const codeFieldKey = fields.find((f) => f.key === "code" || f.key === "symbol")?.key ?? "code";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres/qualite")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nouveau</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier l'entrée" : "Nouvelle entrée"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}{f.required && <span className="text-destructive ml-1">*</span>}</Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                    />
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : f.type === "color" ? "color" : "text"}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <Label>Actif</Label>
                  <p className="text-xs text-muted-foreground">Désactivé = caché des sélecteurs</p>
                </div>
                <Switch checked={Boolean(form.is_active)} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
              <div className="space-y-1">
                <Label>Ordre d'affichage</Label>
                <Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={save}>{editing ? "Enregistrer" : "Créer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{rows.length} entrée(s)</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-muted-foreground py-6 text-center">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">Aucune entrée. Cliquez sur « Nouveau » pour commencer.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2 w-16">Ordre</th>
                  <th className="p-2">Code</th>
                  <th className="p-2">Libellé</th>
                  {extraColumns.map((c) => <th key={c.key} className="p-2">{c.label}</th>)}
                  <th className="p-2 w-20 text-center">Actif</th>
                  <th className="p-2 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-muted-foreground">{r.sort_order}</td>
                    <td className="p-2"><Badge variant="outline" className="font-mono text-xs">{r[codeFieldKey]}</Badge></td>
                    <td className="p-2 font-medium">{r.label}</td>
                    {extraColumns.map((c) => (
                      <td key={c.key} className="p-2">{c.render ? c.render(r[c.key]) : r[c.key] ?? "—"}</td>
                    ))}
                    <td className="p-2 text-center">
                      <Switch checked={r.is_active} onCheckedChange={(v) => toggleActive(r, v)} />
                    </td>
                    <td className="p-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
