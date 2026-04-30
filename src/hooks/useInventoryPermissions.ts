import { useAuth } from "@/contexts/AuthContext";

export function useInventoryPermissions() {
  const { hasRole } = useAuth();
  const isResponsable = hasRole("admin") || hasRole("responsable_inventaire" as any);
  const isAgent = hasRole("agent_inventaire" as any) || isResponsable;
  return { isResponsable, isAgent, canManage: isResponsable, canCount: isAgent };
}
