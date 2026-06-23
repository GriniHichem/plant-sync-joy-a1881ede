import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShiftRealtime } from "@/hooks/useShiftRealtime";

export type MouvementType = "entree" | "sortie" | "correction" | "inventaire";

export interface MagasinMovement {
  id: string;
  type: MouvementType;
  quantite: number;
  stock_avant: number | null;
  stock_apres: number | null;
  prix_unitaire: number | null;
  motif: string | null;
  reference_source: string | null;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  user_id: string | null;
  pdr?: { reference: string; designation: string; unite_stock: string | null } | null;
  agent_name?: string | null;
  ticket_numero?: string | null;
}

/**
 * Read-only supervision feed for the warehouse manager: all stock movements
 * enriched with the executing agent (magasinier), the linked ticket, the part,
 * timing and reason. Real-time.
 */
export function useMagasinActivity(limit = 200) {
  const [movements, setMovements] = useState<MagasinMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("pdr_stock_movements")
      .select("id, type, quantite, stock_avant, stock_apres, prix_unitaire, motif, reference_source, source_type, source_id, created_at, user_id, pdr(reference, designation, unite_stock)")
      .order("created_at", { ascending: false })
      .limit(limit);

    const rows = (data as any[]) || [];

    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    const ticketIds = [...new Set(rows.filter((r) => r.source_type === "ticket").map((r) => r.source_id).filter(Boolean))];

    const [profilesRes, ticketsRes] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      ticketIds.length
        ? supabase.from("tickets").select("id, numero").in("id", ticketIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const nameById = new Map<string, string>();
    for (const p of (profilesRes.data as any[]) || []) {
      nameById.set(p.user_id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—");
    }
    const ticketById = new Map<string, string>();
    for (const t of (ticketsRes.data as any[]) || []) ticketById.set(t.id, t.numero);

    setMovements(
      rows.map((r) => ({
        ...r,
        agent_name: r.user_id ? nameById.get(r.user_id) ?? null : null,
        ticket_numero: r.source_type === "ticket" && r.source_id ? ticketById.get(r.source_id) ?? null : null,
      })),
    );
    setLoading(false);
  }, [limit]);

  useEffect(() => { reload(); }, [reload]);
  useShiftRealtime("magasin-movements", "pdr_stock_movements", reload, true);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    let sortiesJour = 0, entreesJour = 0;
    for (const m of movements) {
      const isToday = new Date(m.created_at).toDateString() === today;
      if (!isToday) continue;
      if (m.type === "sortie") sortiesJour++;
      if (m.type === "entree") entreesJour++;
    }
    return { sortiesJour, entreesJour };
  }, [movements]);

  return { movements, loading, reload, stats };
}
