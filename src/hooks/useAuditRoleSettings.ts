import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuditRoleSetting {
  id: string;
  role: string;
  module: string;
  audit_enabled: boolean;
  severity_threshold: "info" | "warning" | "critical";
  updated_at: string;
}

export function useAuditRoleSettings() {
  const [settings, setSettings] = useState<AuditRoleSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_role_settings" as any)
      .select("*")
      .order("role")
      .order("module");
    setSettings((data as unknown as AuditRoleSetting[]) ?? []);
    setLoading(false);
  }, []);

  const upsert = useCallback(async (role: string, module: string, audit_enabled: boolean, severity: "info"|"warning"|"critical" = "info") => {
    await (supabase.from("audit_role_settings" as any) as any)
      .upsert({ role, module, audit_enabled, severity_threshold: severity }, { onConflict: "role,module" });
    await reload();
  }, [reload]);

  useEffect(() => { reload(); }, [reload]);

  return { settings, loading, reload, upsert };
}
