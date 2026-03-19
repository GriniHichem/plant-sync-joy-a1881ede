import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  X, ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw,
  ChevronLeft, ChevronRight, Download, Pen, Highlighter, Eraser,
  Move,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
  /** All viewable documents for navigation */
  documents?: { file_url: string; file_name: string; file_type: string }[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

type AnnotationTool = "none" | "pen" | "highlighter" | "eraser";

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const isImage = (ft: string) => ft?.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(ft);
const isPdf = (ft: string) => ft?.includes("pdf") || /\.pdf$/i.test(ft);

export function DocumentViewer({
  open, onOpenChange, fileUrl, fileName, fileType,
  documents, currentIndex = 0, onIndexChange,
}: DocumentViewerProps) {
  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Annotation state
  const [activeTool, setActiveTool] = useState<AnnotationTool>("none");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotations, setAnnotations] = useState<ImageData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset on file change
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setActiveTool("none");
    setAnnotations([]);
  }, [fileUrl]);

  const zoomIn = () => setZoom((z) => Math.min(z * 1.3, 5));
  const zoomOut = () => setZoom((z) => Math.max(z / 1.3, 0.2));
  const fitToWindow = () => { setZoom(1); setPan({ x: 0, y: 0 }); setRotation(0); };
  const rotate = () => setRotation((r) => (r + 90) % 360);

  const canNav = documents && documents.length > 1;
  const goPrev = useCallback(() => {
    if (onIndexChange && currentIndex > 0) onIndexChange(currentIndex - 1);
  }, [onIndexChange, currentIndex]);
  const goNext = useCallback(() => {
    if (onIndexChange && documents && currentIndex < documents.length - 1) onIndexChange(currentIndex + 1);
  }, [onIndexChange, currentIndex, documents]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-") zoomOut();
      else if (e.key === "0") fitToWindow();
      else if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goPrev, goNext, onOpenChange]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }, []);

  // Pan handlers (only when no annotation tool)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== "none") return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool !== "none") return;
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  // Canvas annotation handlers
  const getCanvasCtx = () => canvasRef.current?.getContext("2d") || null;

  const startDraw = (e: React.MouseEvent) => {
    if (activeTool === "none") return;
    const ctx = getCanvasCtx();
    if (!ctx || !canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / canvasRef.current.width);
    const y = (e.clientY - rect.top) / (rect.height / canvasRef.current.height);
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (activeTool === "pen") {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    } else if (activeTool === "highlighter") {
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 20;
      ctx.globalAlpha = 0.35;
      ctx.globalCompositeOperation = "source-over";
    } else if (activeTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 24;
      ctx.globalAlpha = 1;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || activeTool === "none") return;
    const ctx = getCanvasCtx();
    if (!ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / canvasRef.current.width);
    const y = (e.clientY - rect.top) / (rect.height / canvasRef.current.height);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const ctx = getCanvasCtx();
    if (ctx) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  };

  const clearAnnotations = () => {
    const ctx = getCanvasCtx();
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const imageContent = isImage(fileType);
  const pdfContent = isPdf(fileType);

  // Toolbar button helper
  const ToolBtn = ({ icon: Icon, label, active, onClick, variant }: any) => (
    <Button
      variant={active ? "default" : "secondary"}
      size="sm"
      className={cn("h-8 w-8 p-0", variant)}
      onClick={onClick}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 border-none bg-background/98 backdrop-blur-sm overflow-hidden [&>button]:hidden flex flex-col gap-0",
          expanded
            ? "max-w-[100vw] max-h-[100vh] w-screen h-screen rounded-none"
            : "max-w-[92vw] max-h-[92vh] w-[92vw] h-[88vh] rounded-xl"
        )}
      >
        {/* Top toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {canNav && (
              <>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={goPrev} disabled={currentIndex <= 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {currentIndex + 1}/{documents!.length}
                </span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={goNext} disabled={currentIndex >= documents!.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <span className="text-sm font-medium truncate max-w-[250px]">{fileName}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Zoom */}
            <ToolBtn icon={ZoomOut} label="Zoom arrière" onClick={zoomOut} />
            <span className="text-xs tabular-nums w-12 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <ToolBtn icon={ZoomIn} label="Zoom avant" onClick={zoomIn} />
            <ToolBtn icon={Move} label="Ajuster" onClick={fitToWindow} />
            {imageContent && <ToolBtn icon={RotateCcw} label="Rotation" onClick={rotate} />}

            <div className="w-px h-6 bg-border mx-1" />

            {/* Annotations (images only) */}
            {imageContent && (
              <>
                <ToolBtn icon={Pen} label="Marqueur" active={activeTool === "pen"} onClick={() => setActiveTool(activeTool === "pen" ? "none" : "pen")} />
                <ToolBtn icon={Highlighter} label="Surligneur" active={activeTool === "highlighter"} onClick={() => setActiveTool(activeTool === "highlighter" ? "none" : "highlighter")} />
                <ToolBtn icon={Eraser} label="Gomme" active={activeTool === "eraser"} onClick={() => setActiveTool(activeTool === "eraser" ? "none" : "eraser")} />
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearAnnotations}>Effacer</Button>
                <div className="w-px h-6 bg-border mx-1" />
              </>
            )}

            {/* Expand / Download / Close */}
            <ToolBtn icon={expanded ? Minimize2 : Maximize2} label={expanded ? "Réduire" : "Plein écran"} onClick={() => setExpanded(!expanded)} />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
              <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer" title="Télécharger">
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-muted/30 relative select-none"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => { handleMouseMove(e); draw(e); }}
          onMouseUp={() => { handleMouseUp(); endDraw(); }}
          onMouseLeave={() => { handleMouseUp(); endDraw(); }}
          style={{ cursor: activeTool !== "none" ? "crosshair" : isDragging ? "grabbing" : "grab" }}
        >
          {imageContent && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.15s ease-out",
                }}
                className="relative"
              >
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-[85vw] max-h-[78vh] object-contain rounded select-none pointer-events-none"
                  draggable={false}
                  onLoad={(e) => {
                    // Size canvas to match image
                    const img = e.currentTarget;
                    if (canvasRef.current) {
                      canvasRef.current.width = img.naturalWidth;
                      canvasRef.current.height = img.naturalHeight;
                      canvasRef.current.style.width = `${img.offsetWidth}px`;
                      canvasRef.current.style.height = `${img.offsetHeight}px`;
                    }
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ pointerEvents: activeTool !== "none" ? "auto" : "none" }}
                  onMouseDown={startDraw}
                />
              </div>
            </div>
          )}

          {pdfContent && (
            <div className="absolute inset-0 flex items-center justify-center">
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=${Math.round(zoom * 100)}`}
                className={cn(
                  "bg-white rounded shadow-lg border",
                  expanded ? "w-full h-full" : "w-[90%] h-full"
                )}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px)`,
                  transition: isDragging ? "none" : "transform 0.15s ease-out",
                }}
                title={fileName}
              />
            </div>
          )}

          {!imageContent && !pdfContent && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <p>Aperçu non disponible pour ce type de fichier</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
