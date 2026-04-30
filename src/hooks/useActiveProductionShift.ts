import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActiveProductionShift {
  id: string;
  date_shift: string;
  shift_type: string;
  shift_team_id: string | null;
  line_id: string | null;
  of_id: string | null;
  chef_id: string | null;
  heure_debut: string;
  heure_fin: string | null;
  is_active: boolean;
  observations: string | null;
  team?: { id: string; name: string; code: string; color: string | null } | null;
  line?: { id: string; code: string; designation: string } | null;
  of?: { id: string; numero: string; product_id: string | null } | null;
}

/**
 * Hook returning the current user's active production shift (if any).
 * A user can be a chef_ligne tied to a single shift; we pick the most recent active one for today.
 */
export function useActiveProductionShift() {
  const { user } = useAuth();
  const [shift, setShift] = useState<ActiveProductionShift | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setShift(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("shifts")
      .select(
        "*, shift_teams(id, name, code, color), production_lines(id, code, designation), ordres_fabrication(id, numero, product_id)"
      )
      .eq("chef_id", user.id)
      .eq("is_active", true)
      .eq("date_shift", today)
      .order("heure_debut", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      setShift(null);
      setLoading(false);
      return;
    }
    const d = data as any;
    setShift({
      id: d.id,
      date_shift: d.date_shift,
      shift_type: d.shift_type,
      shift_team_id: d.shift_team_id,
      line_id: d.line_id,
      of_id: d.of_id,
      chef_id: d.chef_id,
      heure_debut: d.heure_debut,
      heure_fin: d.heure_fin,
      is_active: d.is_active,
      observations: d.observations,
      team: d.shift_teams ?? null,
      line: d.production_lines ?? null,
      of: d.ordres_fabrication ?? null,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { shift, loading, refresh };
}
