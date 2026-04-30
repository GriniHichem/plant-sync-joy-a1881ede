/**
 * Hook ZXing : démarre la lecture caméra et appelle onDetected.
 * - Préfère la caméra arrière sur mobile.
 * - Anti-rebond (même valeur ignorée pendant 1.5s).
 * - Référence onDetected toujours fraîche (pas de stale closure).
 * - Détecte explicitement les permissions refusées et navigateurs sans support.
 */
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

export interface UseScannerOptions {
  enabled: boolean;
  onDetected: (text: string) => void;
  preferEnvironment?: boolean;
  /** Délai (ms) pendant lequel un même code est ignoré pour éviter les rafales. */
  debounceMs?: number;
}

function explainCameraError(e: any): string {
  const name = e?.name || "";
  const msg = e?.message || String(e ?? "Erreur caméra");
  if (name === "NotAllowedError" || /denied/i.test(msg))
    return "Permission caméra refusée. Autorisez l'accès dans le navigateur.";
  if (name === "NotFoundError") return "Aucune caméra détectée sur cet appareil.";
  if (name === "NotReadableError") return "La caméra est utilisée par une autre application.";
  if (name === "OverconstrainedError") return "Aucune caméra ne correspond aux contraintes.";
  if (name === "SecurityError" || /https/i.test(msg))
    return "L'accès à la caméra requiert une connexion sécurisée (HTTPS).";
  return msg;
}

export function useScanner(videoRef: React.RefObject<HTMLVideoElement>, opts: UseScannerOptions) {
  const { enabled, preferEnvironment = true, debounceMs = 1500 } = opts;
  const onDetectedRef = useRef(opts.onDetected);
  onDetectedRef.current = opts.onDetected;

  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const lastTextRef = useRef<{ text: string; ts: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Caméra non supportée par ce navigateur.");
      return;
    }

    let mounted = true;
    setError(null);

    (async () => {
      try {
        // Demande la permission AVANT de lister les devices, sinon les labels
        // sont vides et on ne peut pas distinguer la caméra arrière.
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: preferEnvironment ? { ideal: "environment" } : "user" },
          });
          stream.getTracks().forEach((t) => t.stop());
        } catch (permErr) {
          throw permErr;
        }

        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!mounted) return;
        setDevices(list);

        let chosen = deviceId;
        if (!chosen) {
          const back = preferEnvironment
            ? list.find((d) => /back|rear|environment|arrière|arriere/i.test(d.label))
            : null;
          chosen = back?.deviceId ?? list[0]?.deviceId ?? null;
          if (chosen !== deviceId) setDeviceId(chosen);
        }
        if (!chosen || !videoRef.current) {
          setError("Aucune caméra disponible.");
          return;
        }
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          chosen,
          videoRef.current,
          (result) => {
            if (!result) return;
            const text = result.getText();
            const now = Date.now();
            if (
              lastTextRef.current &&
              lastTextRef.current.text === text &&
              now - lastTextRef.current.ts < debounceMs
            ) {
              return;
            }
            lastTextRef.current = { text, ts: now };
            onDetectedRef.current(text);
          },
        );
        controlsRef.current = controls;
      } catch (e: any) {
        if (mounted) setError(explainCameraError(e));
      }
    })();

    return () => {
      mounted = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, deviceId]);

  return { error, devices, deviceId, setDeviceId };
}
