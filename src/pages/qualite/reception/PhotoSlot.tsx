import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2, Trash2, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { compressImage } from "@/lib/reception";
import { cn } from "@/lib/utils";

interface Props {
  ticketId?: string; // undefined tant que le ticket n'existe pas
  slot: 1 | 2 | 3;
  disabled?: boolean;
  storagePath?: string | null;
  onUploaded: (path: string) => void;
  onDeleted: () => void;
}

export function PhotoSlot({ ticketId, slot, disabled, storagePath, onUploaded, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!storagePath) return setPreview(null);
      const { data } = await supabase.storage.from("reception-photos").createSignedUrl(storagePath, 3600);
      if (!cancel) setPreview(data?.signedUrl ?? null);
    })();
    return () => {
      cancel = true;
    };
  }, [storagePath]);

  async function handleFile(file: File) {
    if (!ticketId) {
      toast.error("Enregistrez le ticket avant d'ajouter des photos");
      return;
    }
    setBusy(true);
    try {
      const blob = await compressImage(file);
      const path = `tickets/${ticketId}/slot-${slot}-${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("reception-photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      onUploaded(path);
      toast.success(`Photo ${slot} enregistrée`);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur d'envoi");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!storagePath) return;
    setBusy(true);
    try {
      await supabase.storage.from("reception-photos").remove([storagePath]);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed p-3 flex flex-col items-center justify-center min-h-[180px] bg-muted/20",
        storagePath && "border-solid border-primary/40",
      )}
    >
      <div className="absolute top-2 left-2 text-xs font-semibold bg-background/80 rounded px-1.5 py-0.5">
        Photo {slot}
      </div>
      {preview ? (
        <>
          <a href={preview} target="_blank" rel="noreferrer" className="block group">
            <img src={preview} alt={`Photo ${slot}`} className="max-h-40 rounded object-contain" />
            <ZoomIn className="absolute top-2 right-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
          </a>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 text-destructive"
              onClick={handleDelete}
              disabled={busy}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Reprendre
            </Button>
          )}
        </>
      ) : (
        <label className={cn("flex flex-col items-center gap-2 cursor-pointer", disabled && "opacity-50 pointer-events-none")}>
          {busy ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">Prendre la photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={disabled || busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) handleFile(f);
            }}
          />
        </label>
      )}
    </div>
  );
}
