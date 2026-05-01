/**
 * Bouton "Scanner" prêt à l'emploi pour les listes (PDR, Organes, Machines, Tickets…).
 * - Au scan, navigue vers la fiche correspondante si l'entité résolue est dans `allowedTypes`.
 * - Sinon, affiche un toast d'erreur.
 *
 * Utilisation :
 *   <ListScanButton allowedTypes={["pdr"]} routeFor={(e) => `/pdr/${e.entity_id}`} />
 */
import { useNavigate } from "react-router-dom";
import { ScanButton } from "./ScanButton";
import { useToast } from "@/hooks/use-toast";
import type { ResolvedScan, ScannableEntityType } from "@/lib/scanResolver";

interface Props {
  allowedTypes: ScannableEntityType[];
  routeFor: (e: ResolvedScan) => string;
  label?: string;
  className?: string;
}

export function ListScanButton({ allowedTypes, routeFor, label = "Scanner", className }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  return (
    <ScanButton
      allowedTypes={allowedTypes}
      label={label}
      className={className}
      onResolved={(e) => {
        try {
          const url = routeFor(e);
          if (!url) throw new Error("Entité non gérée");
          navigate(url);
        } catch (err: any) {
          toast({ title: "Scan non reconnu", description: err?.message ?? "—", variant: "destructive" });
        }
      }}
    />
  );
}
