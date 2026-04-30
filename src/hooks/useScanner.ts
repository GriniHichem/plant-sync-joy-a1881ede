/**
 * Hook ZXing : démarre la lecture caméra et appelle onDetected.
 * Bascule de caméra (avant/arrière) + arrêt propre.
 */
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

export interface UseScannerOptions {
  enabled: boolean;
  onDetected: (text: string) => void;
  preferEnvironment?: boolean;
}

export function useScanner(videoRef: React.RefObject<HTMLVideoElement>, opts: UseScannerOptions) {
  const { enabled, onDetected, preferEnvironment = true } = opts;
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const lastTextRef = useRef<{ text: string; ts: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    (async () => {
      try {
        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!mounted) return;
        setDevices(list);
        let chosen = deviceId;
        if (!chosen) {
          const back = preferEnvironment
            ? list.find((d) => /back|rear|environment/i.test(d.label))
            : null;
          chosen = back?.deviceId ?? list[0]?.deviceId ?? null;
          setDeviceId(chosen);
        }
        if (!chosen || !videoRef.current) {
          setError("Aucune caméra disponible");
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
            if (lastTextRef.current && lastTextRef.current.text === text && now - lastTextRef.current.ts < 1500) {
              return;
            }
            lastTextRef.current = { text, ts: now };
            onDetected(text);
          },
        );
        controlsRef.current = controls;
      } catch (e: any) {
        setError(e?.message || "Erreur caméra");
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
