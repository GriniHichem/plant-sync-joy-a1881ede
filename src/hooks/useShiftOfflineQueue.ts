import { useEffect, useState, useCallback } from "react";
import { listQueuedActions, flushShiftQueue, QueuedShiftAction } from "@/lib/shiftOfflineQueue";
import { toast } from "sonner";

/**
 * Reactive view of the shift offline queue with auto-flush on reconnect.
 */
export function useShiftOfflineQueue() {
  const [items, setItems] = useState<QueuedShiftAction[]>([]);
  const [flushing, setFlushing] = useState(false);

  const refresh = useCallback(async () => {
    setItems(await listQueuedActions());
  }, []);

  const flush = useCallback(async () => {
    if (flushing) return;
    setFlushing(true);
    try {
      const res = await flushShiftQueue();
      if (res.ok > 0) toast.success(`${res.ok} action(s) synchronisée(s)`);
      if (res.failed > 0) toast.error(`${res.failed} action(s) en échec — réessai automatique`);
      await refresh();
    } finally {
      setFlushing(false);
    }
  }, [flushing, refresh]);

  useEffect(() => {
    refresh();
    const onOnline = () => flush();
    window.addEventListener("online", onOnline);
    const t = setInterval(refresh, 15_000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(t);
    };
  }, [refresh, flush]);

  return { items, flushing, flush, refresh, count: items.length };
}
