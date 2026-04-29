import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomRole {
  id: string;
  code: string;
  label: string;
  description: string | null;
  color: string;
  inherits_from: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCustomRoles() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("custom_roles" as any)
      .select("*")
      .order("label");
    setRoles((data as unknown as CustomRole[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { roles, loading, reload };
}
