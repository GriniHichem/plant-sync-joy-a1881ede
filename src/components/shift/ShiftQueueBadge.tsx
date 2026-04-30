import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CloudOff, RefreshCw } from "lucide-react";
import { useShiftOfflineQueue } from "@/hooks/useShiftOfflineQueue";

/**
 * Compact badge showing pending offline shift actions, with manual flush button.
 */
export function ShiftQueueBadge() {
  const { count, flushing, flush } = useShiftOfflineQueue();
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="destructive" className="text-xs gap-1">
        <CloudOff className="h-3 w-3" />
        {count} en attente
      </Badge>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={flush}
        disabled={flushing}
        title="Synchroniser maintenant"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${flushing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
