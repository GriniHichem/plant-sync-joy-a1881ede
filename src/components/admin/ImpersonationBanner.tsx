import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { usePermissions } from "@/hooks/usePermissions";

export function ImpersonationBanner() {
  const { impersonation, stopImpersonation } = useImpersonation();
  const { permissions, loading } = usePermissions();
  if (!impersonation) return null;

  const name = `${impersonation.targetProfile?.first_name ?? ""} ${impersonation.targetProfile?.last_name ?? ""}`.trim() || "Utilisateur";
  const roles = impersonation.targetRoles.length > 0
    ? impersonation.targetRoles.map((r) => r.replace(/_/g, " ")).join(", ")
    : "aucun rôle";
  const visibleCount = permissions.filter((p) => p.can_view).length;

  return (
    <div
      className="sticky top-0 z-50 w-full border-b bg-orange-500/15 text-orange-900 dark:text-orange-100 backdrop-blur-md"
      style={{ borderColor: "hsl(25 95% 53% / 0.4)" }}
      role="status"
    >
      <div className="flex items-center gap-2 sm:gap-3 px-3 md:px-5 py-2 text-[12px] sm:text-[13px]">
        <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] bg-orange-500 text-white rounded px-2 py-0.5 shrink-0">
          <Eye className="h-3 w-3" /> <span className="hidden xs:inline">Aperçu</span>
        </span>
        <span className="flex-1 min-w-0 leading-tight">
          <span className="block truncate"><strong>{name}</strong> <span className="opacity-70">— {roles}</span></span>
          <span className="hidden md:inline opacity-70"> · {loading ? "calcul…" : `${visibleCount} module${visibleCount > 1 ? "s" : ""} visible${visibleCount > 1 ? "s" : ""}`}</span>
          <span className="hidden lg:inline opacity-70"> · Aucune modification ne sera enregistrée.</span>
        </span>
        <Button size="sm" variant="outline" className="h-7 gap-1 bg-background/60 shrink-0 px-2" onClick={stopImpersonation}>
          <X className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Quitter</span>
        </Button>
      </div>
    </div>
  );
}
