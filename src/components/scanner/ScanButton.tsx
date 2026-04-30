/**
 * Bouton "Scanner" qui ouvre le ScannerDialog et propage le résultat.
 */
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { ScannerDialog } from "./ScannerDialog";
import type { ResolvedScan, ScannableEntityType } from "@/lib/scanResolver";

interface ScanButtonProps extends Omit<ButtonProps, "onClick"> {
  allowedTypes?: ScannableEntityType[];
  onResolved: (entity: ResolvedScan) => void;
  onRawValue?: (raw: string) => void;
  label?: string;
  iconOnly?: boolean;
  title?: string;
  description?: string;
}

export function ScanButton({
  allowedTypes,
  onResolved,
  onRawValue,
  label = "Scanner",
  iconOnly = false,
  title,
  description,
  variant = "outline",
  size,
  className,
  ...rest
}: ScanButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? "icon" : size}
        className={className}
        onClick={() => setOpen(true)}
        aria-label={label}
        {...rest}
      >
        <ScanLine className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-1.5"} />
        {!iconOnly && label}
      </Button>
      <ScannerDialog
        open={open}
        onOpenChange={setOpen}
        allowedTypes={allowedTypes}
        onResolved={onResolved}
        onRawValue={onRawValue}
        title={title}
        description={description}
      />
    </>
  );
}
