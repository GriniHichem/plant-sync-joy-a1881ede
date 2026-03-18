import { useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  images: { image_url: string; file_name?: string }[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}

export function ImageLightbox({ images, currentIndex, open, onOpenChange, onIndexChange }: Props) {
  const count = images.length;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < count - 1;

  const goPrev = useCallback(() => {
    if (canPrev) onIndexChange(currentIndex - 1);
  }, [canPrev, currentIndex, onIndexChange]);

  const goNext = useCallback(() => {
    if (canNext) onIndexChange(currentIndex + 1);
  }, [canNext, currentIndex, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goPrev, goNext, onOpenChange]);

  if (!open || count === 0) return null;

  const current = images[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-none bg-black/95 overflow-hidden [&>button]:hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        <div className="flex items-center justify-center min-h-[50vh] max-h-[90vh] p-4">
          <img
            src={current?.image_url}
            alt={current?.file_name || "Image"}
            className="max-w-full max-h-[85vh] object-contain rounded select-none"
            draggable={false}
          />
        </div>

        {/* Navigation arrows */}
        {count > 1 && (
          <>
            <button
              onClick={goPrev}
              disabled={!canPrev}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-colors",
                !canPrev && "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goNext}
              disabled={!canNext}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-colors",
                !canNext && "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Counter */}
        {count > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white/70 text-xs tabular-nums">
            {currentIndex + 1} / {count}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
