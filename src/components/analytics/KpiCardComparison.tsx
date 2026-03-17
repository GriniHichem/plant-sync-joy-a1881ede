import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { calcVariation } from "@/hooks/useDateFilter";

interface KpiCardComparisonProps {
  title: string;
  value: string | number;
  previousValue?: number;
  currentNumeric?: number;
  subtitle?: string;
  icon: LucideIcon;
  unit?: string;
  invertTrend?: boolean; // true = lower is better (e.g. MTTR, downtime)
  className?: string;
}

export function KpiCardComparison({
  title, value, previousValue, currentNumeric, subtitle, icon: Icon,
  unit, invertTrend = false, className,
}: KpiCardComparisonProps) {
  const hasComparison = previousValue !== undefined && currentNumeric !== undefined;
  const variation = hasComparison ? calcVariation(currentNumeric!, previousValue!) : null;

  const isPositive = variation
    ? invertTrend ? variation.delta < 0 : variation.delta > 0
    : null;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold tabular-nums">{value}</p>
            {hasComparison && variation ? (
              <div className="flex items-center gap-1">
                {variation.delta === 0 ? (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                ) : isPositive ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={cn(
                  "text-[10px] font-medium tabular-nums",
                  variation.delta === 0 ? "text-muted-foreground" :
                  isPositive ? "text-success" : "text-destructive"
                )}>
                  {variation.pct > 0 ? "+" : ""}{variation.pct}%
                  {unit ? ` (${variation.delta > 0 ? "+" : ""}${variation.delta}${unit})` : ""}
                </span>
              </div>
            ) : subtitle ? (
              <p className="text-[10px] text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
