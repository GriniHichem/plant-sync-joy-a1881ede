import { Warehouse } from "lucide-react";
import { PdrQueuePanel } from "@/components/pdr/PdrQueuePanel";

export default function PdrRequestsQueue() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Warehouse className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Demandes de pièces</h1>
          <p className="text-xs text-muted-foreground">File temps réel — préparez ou refusez les pièces demandées</p>
        </div>
      </div>
      <PdrQueuePanel />
    </div>
  );
}
