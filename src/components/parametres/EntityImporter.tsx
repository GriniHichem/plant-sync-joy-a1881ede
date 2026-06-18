import { useState, useCallback } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, CheckCircle, AlertCircle, ArrowRight, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImportTemplate, buildTemplateCsv, isValidEnumValue } from "@/lib/importTemplates";

interface EntityImporterProps {
  template: ImportTemplate;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

interface RowError {
  row: number;
  field: string;
  message: string;
}

interface ImportReport {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export function EntityImporter({ template }: EntityImporterProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<RowError[]>([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const fields = template.fields;

  const reset = () => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setErrors([]);
    setUpdateExisting(false);
    setReport(null);
  };

  const downloadTemplate = () => {
    const csv = buildTemplateCsv(template.entity);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `modele_import_${template.entity}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (result) => {
        const headers = (result.meta.fields || []).map((h) => h.replace(/\*$/, "").trim());
        const rawHeaders = result.meta.fields || [];
        setCsvHeaders(rawHeaders);
        setCsvRows(result.data as Record<string, string>[]);
        const autoMap: Record<string, string> = {};
        fields.forEach((f) => {
          const idx = headers.findIndex(
            (h) => h.toLowerCase() === f.key.toLowerCase() || h.toLowerCase() === f.label.toLowerCase()
          );
          if (idx >= 0) autoMap[f.key] = rawHeaders[idx];
        });
        setMapping(autoMap);
        setStep("mapping");
      },
      error: () => toast({ title: "Erreur de lecture du fichier", variant: "destructive" }),
    });
  }, [fields, toast]);

  const validate = () => {
    const errs: RowError[] = [];
    csvRows.forEach((row, i) => {
      fields.forEach((f) => {
        const csvCol = mapping[f.key];
        const val = csvCol ? row[csvCol]?.trim() : "";
        if (f.required && !val) {
          errs.push({ row: i + 1, field: f.label, message: "Requis" });
        } else if (val && f.type === "number" && isNaN(Number(val.replace(",", ".")))) {
          errs.push({ row: i + 1, field: f.label, message: "Nombre invalide" });
        } else if (val && f.enumValues && !isValidEnumValue(f, val)) {
          errs.push({ row: i + 1, field: f.label, message: `Valeur invalide (attendu: ${f.enumValues.join(", ")})` });
        }
      });
    });
    setErrors(errs);
    if (errs.length === 0) setStep("preview");
    else toast({ title: `${errs.length} erreur(s) détectée(s)`, description: "Corrigez le fichier ou le mapping", variant: "destructive" });
  };

  const getMappedRows = () => {
    return csvRows
      .map((row) => {
        const obj: Record<string, string> = {};
        fields.forEach((f) => {
          const csvCol = mapping[f.key];
          const val = csvCol ? row[csvCol]?.trim() : "";
          if (!val) return;
          obj[f.key] = f.type === "number" ? val.replace(",", ".") : val;
        });
        return obj;
      })
      .filter((r) => r[template.uniqueKey]);
  };

  const doImport = async () => {
    setStep("importing");
    const rows = getMappedRows();
    const { data, error } = await supabase.rpc(template.rpc as any, {
      _rows: rows as any,
      _update_existing: updateExisting,
    });
    if (error) {
      toast({ title: "Échec de l'import", description: error.message, variant: "destructive" });
      setStep("preview");
      return;
    }
    const res = data as unknown as ImportReport;
    setReport(res);
    setStep("done");
    if (res.errors.length === 0) {
      toast({ title: `Import terminé : ${res.created} créé(s), ${res.updated} mis à jour, ${res.skipped} ignoré(s)` });
    } else {
      toast({ title: `Import partiel : ${res.errors.length} erreur(s)`, variant: "destructive" });
    }
  };

  const previewRows = getMappedRows().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {(["upload", "mapping", "preview", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            {i > 0 && <ArrowRight className="h-3 w-3" />}
            <Badge variant={step === s ? "default" : "outline"} className="text-[10px]">
              {s === "upload" ? "Fichier" : s === "mapping" ? "Mapping" : s === "preview" ? "Aperçu" : "Terminé"}
            </Badge>
          </div>
        ))}
        {step !== "upload" && (
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Recommencer
          </Button>
        )}
      </div>

      {step === "upload" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Télécharger le modèle
            </Button>
            <span className="text-xs text-muted-foreground">CSV · UTF-8 · séparateur « ; »</span>
          </div>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">Sélectionnez votre fichier CSV à importer</p>
            <Input type="file" accept=".csv,.txt" onChange={handleFile} className="max-w-xs mx-auto" />
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Colonnes attendues :</p>
            <div className="flex flex-wrap gap-1">
              {fields.map((f) => (
                <Badge key={f.key} variant={f.required ? "default" : "outline"} className="text-[10px]" title={f.hint}>
                  {f.label} {f.required && "*"}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "mapping" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{csvRows.length} lignes détectées · {csvHeaders.length} colonnes</p>
          <div className="grid gap-3 max-h-[40vh] overflow-y-auto pr-1">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <Label className="w-44 text-sm shrink-0">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </Label>
                <Select value={mapping[f.key] || "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="— Ignorer —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Ignorer —</SelectItem>
                    {csvHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {errors.length > 0 && (
            <Card className="border-destructive/30">
              <CardContent className="p-3">
                <p className="text-sm font-medium text-destructive mb-2">{errors.length} erreur(s)</p>
                <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                  {errors.slice(0, 30).map((e, i) => (
                    <p key={i} className="text-destructive">Ligne {e.row} · {e.field}: {e.message}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>Annuler</Button>
            <Button onClick={validate}>Valider le mapping</Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Aperçu des {Math.min(10, previewRows.length)} premières lignes sur {getMappedRows().length} au total</p>
          <div className="border rounded-lg overflow-auto max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {fields.filter((f) => mapping[f.key]).map((f) => (
                    <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((r, i) => (
                  <TableRow key={i}>
                    {fields.filter((f) => mapping[f.key]).map((f) => (
                      <TableCell key={f.key} className="text-xs py-2">{r[f.key] ?? "—"}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-3">
            <Checkbox id="upd" checked={updateExisting} onCheckedChange={(c) => setUpdateExisting(!!c)} />
            <Label htmlFor="upd" className="text-sm cursor-pointer">
              Mettre à jour les enregistrements existants (même {template.uniqueKey})
              <span className="block text-xs text-muted-foreground font-normal">Sinon les doublons sont ignorés. Les familles/sous-familles manquantes sont créées automatiquement.</span>
            </Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep("mapping")}>Retour</Button>
            <Button onClick={doImport}>
              <CheckCircle className="h-4 w-4 mr-1" /> Importer {getMappedRows().length} ligne(s)
            </Button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div className="py-12 text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Import en cours...</p>
        </div>
      )}

      {step === "done" && report && (
        <div className="py-6 text-center space-y-3">
          {report.errors.length === 0 ? (
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
          ) : (
            <AlertCircle className="h-12 w-12 text-warning mx-auto" />
          )}
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="default">{report.created} créé(s)</Badge>
            <Badge variant="secondary">{report.updated} mis à jour</Badge>
            <Badge variant="outline">{report.skipped} ignoré(s)</Badge>
            {report.errors.length > 0 && <Badge variant="destructive">{report.errors.length} erreur(s)</Badge>}
          </div>
          {report.errors.length > 0 && (
            <Card className="border-destructive/30 text-left">
              <CardContent className="p-3">
                <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                  {report.errors.map((e, i) => (
                    <p key={i} className="text-destructive">Ligne {e.row}: {e.message}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <Button onClick={reset}>Nouvel import</Button>
        </div>
      )}
    </div>
  );
}
