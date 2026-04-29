import { QualityRefAdmin } from "@/components/qualite/QualityRefAdmin";
import { Badge } from "@/components/ui/badge";

export default function QualiteDecisionReasonsAdmin() {
  return (
    <QualityRefAdmin
      table="quality_decision_reasons"
      title="Motifs de décision NC"
      subtitle="Justifications utilisables pour les décisions sur les non-conformités"
      fields={[
        { key: "code", label: "Code", required: true },
        { key: "label", label: "Libellé", required: true },
        { key: "decision_type", label: "Type de décision", placeholder: "scrap / rework / derogation / downgrade / accept" },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      extraColumns={[{
        key: "decision_type",
        label: "Décision",
        render: (v) => v ? <Badge variant="outline">{v}</Badge> : "—",
      }]}
    />
  );
}
