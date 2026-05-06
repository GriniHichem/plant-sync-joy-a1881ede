import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { toast } from "sonner";

type Col<T> = { key: string; label: string; format?: (v: any, r: T) => string };

interface Props<T> {
  data: T[];
  columns: Col<T>[];
  filename: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  className?: string;
}

export function ExportCsvButton<T extends Record<string, any>>({
  data,
  columns,
  filename,
  variant = "outline",
  size = "default",
  label = "Exporter CSV",
  className,
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
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
