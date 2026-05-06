import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useValidations, useValidationKpis, type ValidationFiltersState } from "@/hooks/useValidations";
import { ValidationKpiCards } from "@/components/validations/ValidationKpiCards";
import { ValidationFilters } from "@/components/validations/ValidationFilters";
import { ValidationTable } from "@/components/validations/ValidationTable";
import { ValidationDetailSheet } from "@/components/validations/ValidationDetailSheet";
import type { ValidationRequest } from "@/lib/validation";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";

export default function ValidationsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ValidationFiltersState>({});
  const { items, loading, reload } = useValidations(filters);
  const { kpis } = useValidationKpis(user?.id ?? null);
  const [selected, setSelected] = useState<ValidationRequest | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Validations & Approbations</h1>
          <p className="text-muted-foreground">
            Contrôle des actions sensibles. La validation a posteriori ne bloque pas le terrain.
          </p>
        </div>
        <ExportCsvButton
          data={items as any[]}
          columns={[
            { key: "created_at", label: "Date" },
            { key: "module", label: "Module" },
            { key: "action_type", label: "Action" },
            { key: "entity_label", label: "Entité" },
            { key: "status", label: "Statut" },
            { key: "priority", label: "Priorité" },
            { key: "requester_name", label: "Demandeur" },
            { key: "validator_name", label: "Validateur" },
            { key: "reason", label: "Motif" },
          ]}
          filename="validations"
        />
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
