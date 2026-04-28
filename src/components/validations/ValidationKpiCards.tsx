import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle, CheckCircle2, XCircle, User, Package, Wrench, Factory, Eye, Lock } from "lucide-react";
import type { ValidationKpis } from "@/hooks/useValidations";

interface Props { kpis: ValidationKpis; }

const TILES = [
  { key: "pending" as const, label: "En attente", icon: Clock, color: "text-orange-600 bg-orange-500/10" },
  { key: "critical" as const, label: "Critiques", icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
  { key: "approved_today" as const, label: "Validées aujourd'hui", icon: CheckCircle2, color: "text-success bg-success/10" },
  { key: "rejected" as const, label: "Rejetées", icon: XCircle, color: "text-destructive bg-destructive/10" },
  { key: "mine" as const, label: "Mes demandes", icon: User, color: "text-primary bg-primary/10" },
  { key: "stock" as const, label: "Stock", icon: Package, color: "text-primary bg-primary/10" },
  { key: "maintenance" as const, label: "Maintenance", icon: Wrench, color: "text-primary bg-primary/10" },
  { key: "production" as const, label: "Production", icon: Factory, color: "text-primary bg-primary/10" },
  { key: "pending_post_hoc" as const, label: "Post-hoc en attente", icon: Eye, color: "text-primary bg-primary/10" },
  { key: "pending_blocking" as const, label: "Bloquantes", icon: Lock, color: "text-orange-600 bg-orange-500/10" },
];

export function ValidationKpiCards({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {TILES.map(({ key, label, icon: Icon, color }) => (
        <Card key={key}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className="text-xl font-bold">{kpis[key]}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
