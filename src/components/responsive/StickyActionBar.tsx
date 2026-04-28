import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky bottom action bar for mobile screens. Respects safe-area insets.
 * On md+ it becomes static and inherits container width.
 */
interface Props {
  children: React.ReactNode;
  className?: string;
  /** Always sticky (even on desktop). Default false. */
  alwaysSticky?: boolean;
}

export function StickyActionBar({ children, className, alwaysSticky = false }: Props) {
  return (
    <div
      className={cn(
        "z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t",
        "px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "flex items-center gap-2",
        alwaysSticky
          ? "sticky bottom-0"
          : "sticky bottom-0 md:static md:border-t-0 md:bg-transparent md:backdrop-blur-0 md:px-0 md:py-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
