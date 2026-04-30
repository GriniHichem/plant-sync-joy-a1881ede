/**
 * Dialog scanner caméra (QR + code-barres). Jamais bloquant :
 * fallback saisie manuelle toujours disponible.
 */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScanLine, Camera, Keyboard, AlertTriangle } from "lucide-react";
import { useScanner } from "@/hooks/useScanner";
import { resolveScannedCode, type ResolvedScan, type ScannableEntityType } from "@/lib/scanResolver";
import { useToast } from "@/hooks/use-toast";

export interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Restreindre les types acceptés. */
  allowedTypes?: ScannableEntityType[];
  /** Appelé avec l'entité résolue. */
  onResolved: (entity: ResolvedScan) => void;
  /**
   * Appelé si le code n'a résolu aucune entité.
   * Permet par exemple d'écrire la valeur brute dans un champ texte
   * (mode "enrôlement" QR sur les formulaires).
   */
  onRawValue?: (raw: string) => void;
  title?: string;
  description?: string;
}

const TYPE_LABEL: Record<ScannableEntityType, string> = {
  pdr: "Pièce de rechange",
  machine: "Machine",
  organe: "Organe",
  equipement: "Équipement",
};

export function ScannerDialog({
  open,
  onOpenChange,
  allowedTypes,
  onResolved,
  onRawValue,
  title = "Scanner un code",
  description = "Pointez la caméra vers un QR code ou un code-barres.",
}: ScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState("");
  const [matches, setMatches] = useState<ResolvedScan[] | null>(null);
  const [lastRaw, setLastRaw] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const { error, devices, deviceId, setDeviceId } = useScanner(videoRef, {
    enabled: open,
    onDetected: (text) => handleResolve(text),
  });

  useEffect(() => {
    if (!open) {
      setMatches(null);
      setManual("");
      setLastRaw("");
    }
  }, [open]);

  async function handleResolve(raw: string) {
    if (busy) return;
    setBusy(true);
    setLastRaw(raw);
    try {
      const rows = await resolveScannedCode(raw, allowedTypes);
      if (rows.length === 1) {
        try { (navigator as any).vibrate?.(60); } catch {}
        onResolved(rows[0]);
        onOpenChange(false);
        return;
      }
      if (rows.length === 0) {
        setMatches([]);
        return;
      }
      setMatches(rows);
    } catch (e: any) {
      toast({ title: "Erreur scan", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function pickResult(r: ResolvedScan) {
    onResolved(r);
    onOpenChange(false);
  }

  function useRawAsFallback() {
    if (!lastRaw && !manual.trim()) return;
    onRawValue?.(lastRaw || manual.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>
              <div className="font-medium">Caméra indisponible</div>
              <div className="text-xs opacity-80">{error}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative aspect-square bg-black rounded-md overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-8 border-2 border-primary/70 rounded-lg pointer-events-none" />
            </div>
            {devices.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <Camera className="h-3.5 w-3.5" />
                <Select value={deviceId ?? undefined} onValueChange={setDeviceId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {devices.map((d) => (
                      <SelectItem key={d.deviceId} value={d.deviceId}>
                        {d.label || `Caméra ${d.deviceId.slice(0, 4)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 border-t pt-3">
          <Label className="flex items-center gap-1.5 text-xs">
            <Keyboard className="h-3.5 w-3.5" /> Saisie manuelle
          </Label>
          <div className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Référence, code ERP, code-barres…"
              onKeyDown={(e) => { if (e.key === "Enter" && manual.trim()) handleResolve(manual.trim()); }}
            />
            <Button onClick={() => handleResolve(manual.trim())} disabled={!manual.trim() || busy}>
              OK
            </Button>
          </div>
        </div>

        {matches !== null && (
          <div className="space-y-2 border-t pt-3">
            {matches.length === 0 ? (
              <div className="text-sm space-y-2">
                <div className="text-muted-foreground">
                  Aucune entité trouvée pour <code className="px-1 bg-muted rounded">{lastRaw || manual}</code>.
                </div>
                {onRawValue && (
                  <Button size="sm" variant="outline" onClick={useRawAsFallback} className="w-full">
                    Utiliser cette valeur quand même
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="text-xs text-muted-foreground">{matches.length} correspondances :</div>
                <div className="space-y-1 max-h-48 overflow-auto">
                  {matches.map((m) => (
                    <button
                      key={`${m.entity_type}-${m.entity_id}`}
                      onClick={() => pickResult(m)}
                      className="w-full text-left p-2 rounded-md border hover:bg-accent text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[m.entity_type]}</Badge>
                        <span className="font-mono text-xs">{m.code}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{m.label}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
