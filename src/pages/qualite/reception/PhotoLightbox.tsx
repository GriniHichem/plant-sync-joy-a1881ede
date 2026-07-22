import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera } from "lucide-react";


export function PhotoLightbox({ ticketId }: { ticketId: string }) {
  const [items, setItems] = useState<Array<{ url: string; slot: number }>>([]);
  const [open, setOpen] = useState<{ url: string; slot: number } | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: rows } = await supabase
        .from("reception_ticket_photos" as any)
        .select("storage_path, slot")
        .eq("ticket_id", ticketId)
        .order("slot");
      const list = (rows ?? []) as any[];
      if (list.length === 0) return setItems([]);
      const { data } = await supabase.storage
        .from("reception-photos")
        .createSignedUrls(list.map((r) => r.storage_path), 3600);
      if (!cancel) {
        setItems(
          (data ?? [])
            .map((s, i) => ({ url: s.signedUrl as string, slot: list[i].slot as number }))
            .filter((it) => !!it.url),
        );
      }
    })();
    return () => {
      cancel = true;
    };
  }, [ticketId]);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Camera className="h-3 w-3" /> Aucune photo disponible
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it, i) => (
          <button key={i} type="button" onClick={() => setOpen(it)} className="block">
            <img src={it.url} alt={`Photo ${it.slot}`} className="w-full h-24 object-cover rounded border" />
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95">
          {open && (
            <img src={open.url} alt={`Photo ${open.slot}`} className="w-full h-auto max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
