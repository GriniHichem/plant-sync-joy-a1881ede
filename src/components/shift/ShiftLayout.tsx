import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Maximize2, Minimize2, Wifi, WifiOff } from "lucide-react";
import { useActiveShift, ShiftKind } from "@/contexts/ActiveShiftContext";
import logoEntreprise from "@/assets/logo-entreprise.jpg";

const TITLES: Record<ShiftKind, string> = {
  production: "Shift Production",
  maintenance: "Shift Maintenance",
  quality: "Shift Qualité",
};

const ACCENTS: Record<ShiftKind, string> = {
  production: "border-rose-500/40",
  maintenance: "border-violet-500/40",
  quality: "border-primary/40",
};

export function ShiftLayout({ children }: { children: ReactNode }) {
  const { kind, productionShift, qualityShift } = useActiveShift();
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  const startedAt =
    kind === "production" ? productionShift?.heure_debut :
    kind === "quality" ? qualityShift?.heure_debut : null;

  const elapsedLabel = (() => {
    if (!startedAt) return null;
    const ms = now - new Date(startedAt).getTime();
    if (ms < 0) return null;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h${String(m).padStart(2, "0")}`;
  })();

  const teamLabel =
    kind === "production" ? productionShift?.team?.code :
    kind === "quality" ? qualityShift?.team?.code : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Topbar compacte */}
      <header className={`sticky top-0 z-40 bg-card/95 backdrop-blur border-b-2 ${ACCENTS[kind]}`}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Link to="/apps" className="flex items-center gap-2 shrink-0">
            <img src={logoEntreprise} alt="Logo" className="h-8 w-8 rounded object-cover" />
            <span className="font-bold text-sm tracking-wide hidden sm:inline">{TITLES[kind]}</span>
          </Link>

          <div className="flex items-center gap-2 ml-2 flex-wrap">
            <Badge variant="default" className="text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse mr-1.5 inline-block" />
              LIVE
            </Badge>
            {teamLabel && (
              <Badge variant="secondary" className="text-xs">Équipe {teamLabel}</Badge>
            )}
            {elapsedLabel && (
              <Badge variant="outline" className="text-xs tabular-nums">{elapsedLabel}</Badge>
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            {online ? (
              <Wifi className="h-4 w-4 text-success" aria-label="En ligne" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" aria-label="Hors ligne" />
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleFullscreen} title="Plein écran">
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/apps")}
              className="h-9"
            >
              <LogOut className="h-4 w-4 mr-1.5" /> Quitter
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 md:px-6 py-4 md:py-6 pb-20 max-w-7xl w-full mx-auto">
        {children}
      </main>

      <ShiftDock />
    </div>
  );
}
