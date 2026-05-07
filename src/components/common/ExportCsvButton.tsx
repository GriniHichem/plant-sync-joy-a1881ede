import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Col<T> = { key: string; label: string; format?: (v: any, r: T) => string };

interface Props<T> {
  data: T[];
  columns: Col<T>[];
  filename: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  className?: string;
  /** Hide label on small screens (icon-only) — default true */
  responsive?: boolean;
}

export function ExportCsvButton<T extends Record<string, any>>({
  data,
  columns,
  filename,
  variant = "outline",
  size = "default",
  label = "Exporter CSV",
  className,
  responsive = true,
}: Props<T>) {
  const handle = () => {
    if (!data.length) return;
    exportToCsv(data, columns, filename);
    toast.success(`${data.length} ligne(s) exportée(s)`);
  };
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handle}
      disabled={data.length === 0}
      aria-label={label}
      title={label}
      className={cn(responsive && "px-2.5 sm:px-4", className)}
    >
      <Download className="h-4 w-4 sm:mr-2" />
      <span className={cn(responsive ? "hidden sm:inline" : "")}>{label}</span>
    </Button>
  );
}
