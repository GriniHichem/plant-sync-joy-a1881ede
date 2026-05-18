/**
 * Dialog scanner caméra (QR + code-barres). Jamais bloquant :
 * - Auto-sélection uniquement quand le match est fort (URL/UUID/exact unique).
 * - Liste de désambiguïsation groupée par type pour les matches multiples ou approchés.
 * - Historique des derniers scans réussis (session) pour ré-utilisation rapide.
 * - Saisie manuelle toujours disponible.
 * - Bip + vibration légère sur match.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScanLine, Camera, Keyboard, AlertTriangle, History, Loader2 } from "lucide-react";
import { useScanner } from "@/hooks/useScanner";
import {
  resolveScannedCode,
  isAutoSelectable,
  type MatchQuality,
  type ResolvedScan,
  type ScannableEntityType,
} from "@/lib/scanResolver";
import { useToast } from "@/hooks/use-toast";

export interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  allowedTypes?: ScannableEntityType[];
  /** Si fourni, on tente de résoudre le code via le RPC. Sinon mode enrôlement. */
  onResolved?: (entity: ResolvedScan) => void;
  onRawValue?: (raw: string) => void;
  title?: string;
  description?: string;
  /** Force le mode enrôlement: pas d'appel RPC, on renvoie la valeur brute. */
  enrollMode?: boolean;
}

const TYPE_LABEL: Record<ScannableEntityType, string> = {
  pdr: "Pièce de rechange",
  machine: "Machine",
  organe: "Organe",
  equipement: "Équipement",
};

const QUALITY_LABEL: Record<MatchQuality, { label: string; tone: "default" | "secondary" | "outline" }> = {
  url: { label: "URL", tone: "default" },
  uuid: { label: "ID", tone: "default" },
  exact: { label: "Exact", tone: "default" },
  prefix: { label: "Approchant", tone: "outline" },
};

const HISTORY_KEY = "scanner:recent";
const HISTORY_MAX = 6;

function readHistory(): ResolvedScan[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r: any) =>
        r &&
        typeof r.entity_id === "string" &&
        typeof r.entity_type === "string",
    ) as ResolvedScan[];
  } catch {
    return [];
  }
}
function pushHistory(r: ResolvedScan) {
  try {
    const list = readHistory().filter(
      (x) => !(x.entity_type === r.entity_type && x.entity_id === r.entity_id),
    );
    list.unshift(r);
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {}
}

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    o.start();
    o.stop(ctx.currentTime + 0.16);
    setTimeout(() => ctx.close().catch(() => {}), 250);
  } catch {}
}

export function ScannerDialog({
  open,
  onOpenChange,
  allowedTypes,
  onResolved,
  onRawValue,
  title = "Scanner un code",
  description = "Pointez la caméra vers un QR code ou un code-barres.",
  enrollMode,
}: ScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState("");
  const [matches, setMatches] = useState<ResolvedScan[] | null>(null);
  const [lastRaw, setLastRaw] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ResolvedScan[]>([]);
  const { toast } = useToast();

  // Mode enrôlement = pas de résolution RPC. Implicite si onResolved absent.
  const isEnroll = enrollMode || !onResolved;

  useEffect(() => {
    if (open) setHistory(readHistory().filter((r) => !allowedTypes?.length || allowedTypes.includes(r.entity_type)));
  }, [open, allowedTypes]);

  const { error, devices, deviceId, setDeviceId } = useScanner(videoRef, {
    enabled: open,
    onDetected: (text) => handleResolve(text),
  });

  useEffect(() => {
    if (!open) {
      setMatches(null);
      setManual("");
      setLastRaw("");
      setBusy(false);
    }
  }, [open]);

  async function handleResolve(raw: string) {
    if (busy) return;
    const trimmed = (raw ?? "").trim();
    if (!trimmed) return;

    // Mode enrôlement : on renvoie la valeur brute, jamais le RPC.
    if (isEnroll) {
      beep();
      try { (navigator as any).vibrate?.(60); } catch {}
      onRawValue?.(trimmed);
      onOpenChange(false);
      return;
    }

    setBusy(true);
    setLastRaw(trimmed);
    try {
      const rows = await resolveScannedCode(trimmed, allowedTypes);
      if (isAutoSelectable(rows)) {
        beep();
        try { (navigator as any).vibrate?.(60); } catch {}
        pushHistory(rows[0]);
        onResolved!(rows[0]);
        onOpenChange(false);
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
    pushHistory(r);
    onResolved?.(r);
    onOpenChange(false);
  }

  /** Vrai si le payload scanné ressemble à une URL/route de l'app. */
  const looksLikeAppUrl = /^\/?(pdr|machines|equipements|organes)\/[0-9a-f-]{8,}/i.test(lastRaw);

  function useRawAsFallback() {
    const v = (lastRaw || manual).trim();
    if (!v) return;
    onRawValue?.(v);
    onOpenChange(false);
  }

  // Group matches by type for nicer display.
  const groupedMatches = useMemo(() => {
    if (!matches) return null;
    const g = new Map<ScannableEntityType, ResolvedScan[]>();
    for (const m of matches) {
      const arr = g.get(m.entity_type) ?? [];
      arr.push(m);
      g.set(m.entity_type, arr);
    }
    return Array.from(g.entries());
  }, [matches]);

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
              <div className="text-xs opacity-60 mt-1">Utilisez la saisie manuelle ci-dessous.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative aspect-square bg-black rounded-md overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-8 border-2 border-primary/70 rounded-lg pointer-events-none" />
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
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
              placeholder="Référence, code ERP, code-barres, UUID, URL…"
              onKeyDown={(e) => { if (e.key === "Enter" && manual.trim()) handleResolve(manual.trim()); }}
            />
            <Button onClick={() => handleResolve(manual.trim())} disabled={!manual.trim() || busy}>
              OK
            </Button>
          </div>
        </div>

        {groupedMatches !== null && (
          <div className="space-y-2 border-t pt-3">
            {groupedMatches.length === 0 ? (
              <div className="text-sm space-y-2">
                <div className="text-muted-foreground">
                  {looksLikeAppUrl ? (
                    <>QR reconnu mais l'entité est introuvable (supprimée ?) pour <code className="px-1 bg-muted rounded">{lastRaw}</code>.</>
                  ) : (
                    <>Aucune entité trouvée pour <code className="px-1 bg-muted rounded">{lastRaw || manual}</code>.</>
                  )}
                </div>
                {onRawValue && (
                  <Button size="sm" variant="outline" onClick={useRawAsFallback} className="w-full">
                    Utiliser cette valeur quand même
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="text-xs text-muted-foreground">
                  {matches!.length} correspondance{matches!.length > 1 ? "s" : ""} pour{" "}
                  <code className="px-1 bg-muted rounded">{lastRaw || manual}</code> — choisissez :
                </div>
                <div className="space-y-2 max-h-56 overflow-auto">
                  {groupedMatches.map(([type, rows]) => (
                    <div key={type} className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">
                        {TYPE_LABEL[type]}
                      </div>
                      {rows.map((m) => {
                        const q = QUALITY_LABEL[(m.match_quality ?? "prefix") as MatchQuality];
                        return (
                          <button
                            key={`${m.entity_type}-${m.entity_id}`}
                            onClick={() => pickResult(m)}
                            className="w-full text-left p-2 rounded-md border hover:bg-accent text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant={q.tone} className="text-[10px]">{q.label}</Badge>
                              <span className="font-mono text-xs">{m.code ?? "—"}</span>
                              {m.matched_field && m.matched_field !== "code" && (
                                <span className="text-[10px] text-muted-foreground">via {m.matched_field}</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{m.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {matches === null && history.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <Label className="flex items-center gap-1.5 text-xs">
              <History className="h-3.5 w-3.5" /> Récents
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {history.map((r) => (
                <button
                  key={`${r.entity_type}-${r.entity_id}`}
                  onClick={() => pickResult(r)}
                  className="px-2 py-1 rounded-md border text-xs hover:bg-accent flex items-center gap-1.5"
                  title={r.label ?? ""}
                >
                  <Badge variant="outline" className="text-[9px]">{TYPE_LABEL[r.entity_type]}</Badge>
                  <span className="font-mono">{r.code ?? r.entity_id.slice(0, 6)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
