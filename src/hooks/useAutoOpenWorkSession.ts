import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Tries to auto-open the connected employee's work session based on their
 * configured rotation pattern + anchor date. The backend RPC only opens a
 * session when "Autorisation Libre" is enabled AND the employee connects
 * during their currently expected slot. Silent no-op otherwise.
 *
 * Calls onOpened (e.g. context refresh) when a session was opened.
 */
export function useAutoOpenWorkSession(onOpened?: () => void) {
  const { user } = useAuth();
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (attempted.current === user.id) return;
    attempted.current = user.id;

    (async () => {
      const { data, error } = await supabase.rpc("open_my_work_session" as any);
      if (!error && data) {
        onOpened?.();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
}
