import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { parseCsv, autoMap, applyMapping, type FieldDef, type CsvRow, type ImportReport } from "@/lib/receptionImport";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  options?: React.ReactNode;
  onImport: (rows: CsvRow[]) => Promise<ImportReport>;
  onSuccess?: () => void;
}

const NONE = "__none__";

export function CsvImportDialog({ open, onOpenChange, title, description, fields, options, onImport, onSuccess }: Props) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  function reset() {
    setHeaders([]); setRows([]); setMapping({}); setReport(null); setBusy(false);
  }

  async function handleFile(file: File) {
    const buf = await file.arrayBuffer();
    // Décodage tolérant : UTF-8 strict d'abord ; si caractère de remplacement détecté,
    // repli sur Windows-1252 (encodage Excel FR par défaut).
    let text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    if (text.includes("\uFFFD")) {
      try { text = new TextDecoder("windows-1252").decode(buf); } catch { /* keep utf-8 */ }
    }
    const { headers: h, rows: r } = parseCsv(text);
    if (!h.length) { toast.error("Fichier CSV vide ou illisible"); return; }
    setHeaders(h); setRows(r); setReport(null);
    setMapping(autoMap(fields, h));
  }

  const missing = useMemo(
    () => fields.filter((f) => f.required && !mapping[f.key]).map((f) => f.label),
    [fields, mapping],
  );
  const preview = rows.slice(0, 5);

  async function run() {
    if (missing.length) { toast.error(`Champs obligatoires non mappés : ${missing.join(", ")}`); return; }
    setBusy(true);
    try {
      const payload = applyMapping(rows, mapping);
      const rep = await onImport(payload);
      setReport(rep);
      if (rep.failed === 0) toast.success(`${rep.success}/${rep.total} ligne(s) importée(s)`);
      else toast.warning(`${rep.success} réussies, ${rep.failed} échec(s)`);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur d'import");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>

        {!rows.length && (
          <div className="space-y-2">
            <Label>Fichier CSV</Label>
            <Input type="file" accept=".csv,text/csv" onChange={(e) => {
              const f = e.target.files?.[0]; if (f) handleFile(f);
            }} />
            <p className="text-xs text-muted-foreground">Séparateur ; ou , — encodage UTF-8. Les en-têtes sont mappés automatiquement.</p>
          </div>
        )}

        {rows.length > 0 && !report && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge>{rows.length} ligne(s) détectée(s)</Badge>
              <Badge variant="outline">{headers.length} colonne(s)</Badge>
              <Button variant="ghost" size="sm" onClick={reset}>Changer de fichier</Button>
            </div>

            {options}

            <div>
              <Label className="mb-2 block">Correspondance des colonnes</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {fields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">
                      {f.label} {f.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={mapping[f.key] ?? NONE}
                      onValueChange={(v) => setMapping({ ...mapping, [f.key]: v === NONE ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Non mappé" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— Non mappé —</SelectItem>
                        {headers.map((h) => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Aperçu (5 premières lignes)</Label>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={i}>{headers.map((h) => <TableCell key={h} className="text-xs">{r[h]}</TableCell>)}</TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {report && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border p-3 text-center">
                <div className="text-2xl font-bold">{report.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="rounded-md border p-3 text-center bg-success/10">
                <div className="text-2xl font-bold text-success flex items-center justify-center gap-1"><CheckCircle2 className="h-5 w-5" />{report.success}</div>
                <div className="text-xs text-muted-foreground">Réussis</div>
              </div>
              <div className="rounded-md border p-3 text-center bg-destructive/10">
                <div className="text-2xl font-bold text-destructive flex items-center justify-center gap-1"><XCircle className="h-5 w-5" />{report.failed}</div>
                <div className="text-xs text-muted-foreground">Échecs</div>
              </div>
            </div>
            {report.extra && Object.keys(report.extra).length > 0 && (
              <div className="flex gap-2 flex-wrap text-xs">
                {Object.entries(report.extra).map(([k, v]) => (
                  <Badge key={k} variant="outline">{k} : {v}</Badge>
                ))}
              </div>
            )}
            {report.errors.length > 0 && (
              <div className="border rounded-md max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-16">Ligne</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Motif</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {report.errors.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>{e.row}</TableCell>
                        <TableCell className="font-mono text-xs">{e.numero ?? e.code ?? "—"}</TableCell>
                        <TableCell className="text-xs">{e.motif}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!report ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button onClick={run} disabled={!rows.length || busy || missing.length > 0}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Lancer l'import
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={reset}>Nouvel import</Button>
              <Button onClick={() => onOpenChange(false)}>Fermer</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
