import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/**
 * Renders a Dialog on desktop/tablet and a bottom Drawer on mobile.
 * Same API on both: title/description optional, children = body.
 */
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** max-width on desktop */
  className?: string;
  /** drawer body padding override */
  bodyClassName?: string;
}

export function ResponsiveDialog({
  open, onOpenChange, title, description, children, className, bodyClassName,
}: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] flex flex-col">
          {(title || description) && (
            <DrawerHeader className="text-left pb-2 border-b">
              {title && <DrawerTitle className="text-base">{title}</DrawerTitle>}
              {description && <DrawerDescription className="text-xs">{description}</DrawerDescription>}
            </DrawerHeader>
          )}
          <div className={cn("flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]", bodyClassName)}>
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md", className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className={bodyClassName}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
