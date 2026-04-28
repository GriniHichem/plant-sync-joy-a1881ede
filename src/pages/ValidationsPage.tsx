import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useValidations, useValidationKpis, type ValidationFiltersState } from "@/hooks/useValidations";
import { ValidationKpiCards } from "@/components/validations/ValidationKpiCards";
import { ValidationFilters } from "@/components/validations/ValidationFilters";
import { ValidationTable } from "@/components/validations/ValidationTable";
import { ValidationDetailSheet } from "@/components/validations/ValidationDetailSheet";
import type { ValidationRequest } from "@/lib/validation";

export default function ValidationsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ValidationFiltersState>({});
  const { items, loading, reload } = useValidations(filters);
  const { kpis } = useValidationKpis(user?.id ?? null);
  const [selected, setSelected] = useState<ValidationRequest | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Validations & Approbations</h1>
        <p className="text-muted-foreground">
          Contrôle des actions sensibles. La validation a posteriori ne bloque pas le terrain.
        </p>
      </div>

      <ValidationKpiCards kpis={kpis} />
      <ValidationFilters value={filters} onChange={setFilters} />

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Chargement…</div>
      ) : (
        <ValidationTable
          items={items}
          onOpen={(r) => { setSelected(r); setOpen(true); }}
        />
      )}

      <ValidationDetailSheet
        request={selected}
        open={open}
        onOpenChange={setOpen}
        onUpdated={reload}
      />
    </div>
  );
}
