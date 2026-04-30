import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to a postgres_changes channel for the given table and runs
 * the provided callback whenever a relevant event fires.
 *
 * Used by shift kiosk pages so lists refresh live without manual reload.
 */
export function useShiftRealtime(
  channelName: string,
  table: string,
  onChange: () => void,
  enabled = true,
  filter?: string,
) {
  useEffect(() => {
    if (!enabled) return;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        () => onChange(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, enabled, filter]);
}
