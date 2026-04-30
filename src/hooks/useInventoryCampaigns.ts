import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InventoryCampaign = {
  id: string;
  code: string | null;
  label: string;
  description: string | null;
  status: "draft" | "en_cours" | "arbitrage" | "cloturee" | "annulee";
  scope_pdr: boolean;
  scope_organes: boolean;
  date_debut: string | null;
  date_fin_prevue: string | null;
  date_cloture: string | null;
  responsable_id: string | null;
  created_at: string;
  updated_at: string;
};

export function useInventoryCampaigns() {
  const [campaigns, setCampaigns] = useState<InventoryCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("inventory_campaigns" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns(((data as any) || []) as InventoryCampaign[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { campaigns, loading, reload: load };
}
