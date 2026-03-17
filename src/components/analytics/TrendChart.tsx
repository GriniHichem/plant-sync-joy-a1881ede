import { useMemo } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type DateRange, type Granularity,
  getTimeBuckets, formatBucketLabel, filterByDateRange,
} from "@/hooks/useDateFilter";
import { isWithinInterval, startOfHour, startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { fr } from "date-fns/locale";

function bucketKey(date: Date, granularity: Granularity): string {
  switch (granularity) {
    case "hour": return startOfHour(date).toISOString();
    case "day": return startOfDay(date).toISOString();
    case "week": return startOfWeek(date, { locale: fr }).toISOString();
    case "month": return startOfMonth(date).toISOString();
    case "quarter": return startOfQuarter(date).toISOString();
    case "year": return startOfYear(date).toISOString();
  }
}

interface TrendChartProps<T> {
  title: string;
  items: T[];
  dateAccessor: (item: T) => string | Date;
  valueAccessor: (item: T) => number;
  range: DateRange;
  granularity: Granularity;
  compareItems?: T[];
  compareRange?: DateRange | null;
  chartType?: "line" | "bar";
  color?: string;
  compareColor?: string;
  valueLabel?: string;
  compareLabel?: string;
  className?: string;
}

export function TrendChart<T>({
  title, items, dateAccessor, valueAccessor, range, granularity,
  compareItems, compareRange,
  chartType = "line", color = "hsl(var(--primary))", compareColor = "hsl(var(--muted-foreground))",
  valueLabel = "Valeur", compareLabel = "Période préc.", className,
}: TrendChartProps<T>) {
  const data = useMemo(() => {
    const buckets = getTimeBuckets(range, granularity);
    const filtered = filterByDateRange(items, range, dateAccessor);

    // Aggregate per bucket
    const bucketMap: Record<string, number> = {};
    buckets.forEach((b) => { bucketMap[b.toISOString()] = 0; });
    filtered.forEach((item) => {
      const key = bucketKey(new Date(dateAccessor(item)), granularity);
      if (bucketMap[key] !== undefined) bucketMap[key] += valueAccessor(item);
    });

    // Compare period
    let compareBucketMap: Record<number, number> | null = null;
    if (compareRange && compareItems) {
      const compareBuckets = getTimeBuckets(compareRange, granularity);
      const compareFiltered = filterByDateRange(compareItems, compareRange, dateAccessor);
      compareBucketMap = {};
      compareBuckets.forEach((b, i) => { compareBucketMap![i] = 0; });
      compareFiltered.forEach((item) => {
        const key = bucketKey(new Date(dateAccessor(item)), granularity);
        const idx = compareBuckets.findIndex((b) => b.toISOString() === key);
        if (idx >= 0 && compareBucketMap) compareBucketMap[idx] += valueAccessor(item);
      });
    }

    return buckets.map((b, i) => ({
      label: formatBucketLabel(b, granularity),
      value: Math.round((bucketMap[b.toISOString()] || 0) * 100) / 100,
      ...(compareBucketMap ? { compare: Math.round((compareBucketMap[i] || 0) * 100) / 100 } : {}),
    }));
  }, [items, compareItems, range, compareRange, granularity, dateAccessor, valueAccessor]);

  const chartConfig = {
    value: { label: valueLabel, color },
    compare: { label: compareLabel, color: compareColor },
  };

  const hasCompare = data.some((d) => (d as any).compare !== undefined);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            {chartType === "bar" ? (
              <BarChart data={data} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                {hasCompare && <Bar dataKey="compare" fill={compareColor} radius={[4, 4, 0, 0]} opacity={0.4} />}
                <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
                {hasCompare && <Legend />}
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                {hasCompare && (
                  <Line type="monotone" dataKey="compare" stroke={compareColor} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                )}
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
                {hasCompare && <Legend />}
              </LineChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
