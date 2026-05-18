/**
 * Section "Identifiants externes" partagée par les formulaires
 * Machine / Équipement / Organe / PDR.
 *
 * - Tous les champs sont OPTIONNELS.
 * - Bouton "Scanner" pour enrôler depuis la caméra.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScanButton } from "@/components/scanner/ScanButton";
import { QrCode } from "lucide-react";

export interface ExternalIdsValue {
  code_erp?: string | null;
  qr_code?: string | null;
  code_barres?: string | null;
}

interface Props {
  value: ExternalIdsValue;
  onChange: (next: ExternalIdsValue) => void;
  /** Quels champs proposer. Défaut: tous. */
  fields?: ("code_erp" | "qr_code" | "code_barres")[];
}

export function ExternalIdsCard({ value, onChange, fields = ["code_erp", "qr_code", "code_barres"] }: Props) {
  const set = (k: keyof ExternalIdsValue) => (v: string) => onChange({ ...value, [k]: v });

  const scanInto = (k: "qr_code" | "code_barres") => (raw: string) =>
    onChange({ ...value, [k]: raw });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="h-4 w-4" /> Identifiants externes
          <Badge variant="outline" className="text-[10px] ml-1">Optionnel</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.includes("code_erp") && (
          <div className="space-y-1.5">
            <Label className="text-xs">Code ERP</Label>
            <Input
              value={value.code_erp ?? ""}
              onChange={(e) => set("code_erp")(e.target.value)}
              placeholder="ex : ERP-12345"
              className="h-11"
            />
          </div>
        )}
        {fields.includes("qr_code") && (
          <div className="space-y-1.5">
            <Label className="text-xs">QR code</Label>
            <div className="flex gap-2">
              <Input
                value={value.qr_code ?? ""}
                onChange={(e) => set("qr_code")(e.target.value)}
                placeholder="Valeur encodée dans le QR"
                className="h-11"
              />
              <ScanButton
                iconOnly
                enrollMode
                onRawValue={scanInto("qr_code")}
                title="Scanner un QR à enregistrer"
                description="La valeur lue sera copiée dans le champ QR code."
              />
            </div>
          </div>
        )}
        {fields.includes("code_barres") && (
          <div className="space-y-1.5">
            <Label className="text-xs">Code-barres</Label>
            <div className="flex gap-2">
              <Input
                value={value.code_barres ?? ""}
                onChange={(e) => set("code_barres")(e.target.value)}
                placeholder="EAN, Code128…"
                className="h-11"
              />
              <ScanButton
                iconOnly
                onResolved={(r) => onChange({ ...value, code_barres: r.code ?? "" })}
                onRawValue={scanInto("code_barres")}
                title="Scanner un code-barres"
                description="La valeur lue sera copiée dans le champ code-barres."
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
