import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Permission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export function usePermissions() {
  const { roles } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roles.length === 0) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    async function load() {
      const { data } = await supabase
        .from("role_permissions")
        .select("module, can_view, can_create, can_edit, can_delete, role")
        .in("role", roles);

      if (data) {
        // Merge permissions across roles (OR logic)
        const merged = new Map<string, Permission>();
        for (const row of data) {
          const existing = merged.get(row.module);
          if (existing) {
            existing.can_view = existing.can_view || row.can_view;
            existing.can_create = existing.can_create || row.can_create;
            existing.can_edit = existing.can_edit || row.can_edit;
            existing.can_delete = existing.can_delete || row.can_delete;
          } else {
            merged.set(row.module, {
              module: row.module,
              can_view: row.can_view,
              can_create: row.can_create,
              can_edit: row.can_edit,
              can_delete: row.can_delete,
            });
          }
        }
        setPermissions(Array.from(merged.values()));
      }
      setLoading(false);
    }

    load();
  }, [roles]);

  const getPermission = (module: string) =>
    permissions.find((p) => p.module === module);

  const canView = (module: string) => getPermission(module)?.can_view ?? false;
  const canCreate = (module: string) => getPermission(module)?.can_create ?? false;
  const canEdit = (module: string) => getPermission(module)?.can_edit ?? false;
  const canDelete = (module: string) => getPermission(module)?.can_delete ?? false;

  return { permissions, loading, canView, canCreate, canEdit, canDelete };
}
