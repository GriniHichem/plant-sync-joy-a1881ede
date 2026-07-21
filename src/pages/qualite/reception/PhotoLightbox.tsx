import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera } from "lucide-react";

export function PhotoLightbox({ ticketId }: { ticketId: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: rows } = await supabase
        .from("reception_ticket_photos" as any)
        .select("storage_path, slot")
        .eq("ticket_id", ticketId)
        .order("slot");
      const paths = ((rows ?? []) as any[]).map((r) => r.storage_path);
      if (paths.length === 0) return setUrls([]);
      const { data } = await supabase.storage.from("reception-photos").createSignedUrls(paths, 3600);
      if (!cancel) setUrls((data ?? []).map((s) => s.signedUrl).filter(Boolean) as string[]);
    })();
    return () => {
      cancel = true;
    };
  }, [ticketId]);

  if (urls.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Camera className="h-3 w-3" /> Aucune photo disponible
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((u, i) => (
          <button key={i} type="button" onClick={() => setOpen(u)} className="block">
            <img src={u} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded border" />
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl p-2">
          {open && <img src={open} alt="Photo" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
