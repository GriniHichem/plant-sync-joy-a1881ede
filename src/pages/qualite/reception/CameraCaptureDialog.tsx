import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, SwitchCamera, X, Loader2, AlertTriangle, Info } from "lucide-react";
import { photoSlotGuidance } from "@/lib/reception";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  slot: 1 | 2 | 3;
  ticketNumero?: string;
  supplierName?: string;
}

export function CameraCaptureDialog({ open, onOpenChange, onCapture, slot, ticketNumero, supplierName }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const attach = useCallback(async (stream: MediaStream) => {
    stopStream();
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        /* autoplay guard */
      }
    }
    const track = stream.getVideoTracks()[0];
    const settings = track?.getSettings();
    if (settings?.deviceId) setActiveDeviceId(settings.deviceId);
  }, [stopStream]);

  const start = useCallback(async (deviceId?: string) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Caméra non disponible (contexte non sécurisé). Utilisez HTTPS.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      let stream: MediaStream | null = null;

      if (deviceId) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: false,
        });
      } else {
        // Tentative 1 : arrière stricte
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "environment" } },
            audio: false,
          });
        } catch {
          // Tentative 2 : arrière souple
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
              audio: false,
            });
          } catch {
            // Tentative 3 : frontale
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false,
              });
            } catch {
              // Tentative 4 : n'importe quelle caméra
              stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }
          }
        }
      }

      if (!stream) throw new Error("Aucun flux vidéo");
      await attach(stream);

      // Enumérer les caméras disponibles (nécessite un stream actif pour avoir les labels)
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter((d) => d.kind === "videoinput"));
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      const name = e?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Accès caméra refusé. Autorisez l'accès dans les réglages du navigateur.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("Aucune caméra détectée sur cet appareil.");
      } else {
        setError(e?.message ?? "Erreur d'accès à la caméra");
      }
    } finally {
      setStarting(false);
    }
  }, [attach]);

  useEffect(() => {
    if (open) {
      setPreview(null);
      setError(null);
      start();
    } else {
      stopStream();
      setPreview(null);
    }
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function snapshot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Filigrane une seule ligne : N° ticket - date heure - fournisseur (photo N)
    const fontPx = Math.max(14, Math.round(canvas.height * 0.03));
    const bandH = Math.max(40, Math.round(fontPx * 1.9));
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, canvas.height - bandH, canvas.width, bandH);
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${fontPx}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const pad = Math.round(fontPx * 0.6);
    const y = canvas.height - bandH / 2;
    const stamp = new Date().toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    const parts: string[] = [];
    if (ticketNumero) parts.push(`N° ${ticketNumero}`);
    parts.push(stamp);
    if (supplierName && supplierName.trim()) parts.push(supplierName.trim());
    let label = `${parts.join(" - ")} (photo ${slot})`;
    const maxW = canvas.width - pad * 2;
    while (ctx.measureText(label).width > maxW && label.length > 8) {
      label = label.slice(0, -2);
    }
    ctx.fillText(label, pad, y);

    const url = canvas.toDataURL("image/jpeg", 0.92);
    setPreview(url);
  }

  async function validate() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Capture impossible");
      const file = new File([blob], `photo-slot-${slot}-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  function switchCamera() {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === activeDeviceId);
    const next = devices[(idx + 1) % devices.length];
    if (next) start(next.deviceId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="relative bg-black flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 text-white bg-black/60">
            <span className="text-sm font-semibold">Photo {slot}</span>
            <div className="flex items-center gap-2">
              {devices.length > 1 && !preview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                  onClick={switchCamera}
                  disabled={starting}
                >
                  <SwitchCamera className="h-4 w-4 mr-1" /> Caméra
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
            {error ? (
              <div className="text-center text-white p-6 space-y-2">
                <AlertTriangle className="h-8 w-8 mx-auto text-amber-400" />
                <p className="text-sm">{error}</p>
                <Button type="button" size="sm" variant="secondary" onClick={() => start()}>
                  Réessayer
                </Button>
              </div>
            ) : preview ? (
              <img src={preview} alt="Aperçu" className="max-h-full max-w-full object-contain" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="max-h-full max-w-full object-contain"
                  playsInline
                  muted
                />
                {starting && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 p-3 bg-black/80">
            {preview ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setPreview(null);
                  }}
                  disabled={busy}
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> Reprendre
                </Button>
                <Button type="button" onClick={validate} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
                  Valider
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={snapshot}
                disabled={starting || !!error}
                className="rounded-full h-16 w-16 p-0"
              >
                <Camera className="h-7 w-7" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
