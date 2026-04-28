import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a `<Table>` with horizontal scroll and adds a subtle shadow on the
 * sticky first column. Use the `first-col-sticky` modifier on Table cells you
 * want sticky (helper class declared in index.css).
 */
interface Props {
  children: React.ReactNode;
  className?: string;
}

export function ScrollTable({ children, className }: Props) {
  return (
    <div className={cn("relative w-full overflow-x-auto", className)}>
      {children}
    </div>
  );
}
