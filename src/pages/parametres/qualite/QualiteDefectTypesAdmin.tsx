import { QualityRefAdmin } from "@/components/qualite/QualityRefAdmin";
import { Badge } from "@/components/ui/badge";

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  minor: "secondary", major: "default", critical: "destructive",
};

export default function QualiteDefectTypesAdmin() {
  return (
    <QualityRefAdmin
      table="quality_defect_types"
      title="Types de défauts"
      subtitle="Catalogue des défauts détectables avec leur gravité par défaut"
      fields={[
        { key: "code", label: "Code", required: true },
        { key: "label", label: "Libellé", required: true },
        { key: "default_severity", label: "Gravité par défaut", placeholder: "minor / major / critical" },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      extraColumns={[{
        key: "default_severity",
        label: "Gravité",
        render: (v) => v ? <Badge variant={SEVERITY_VARIANT[v] ?? "outline"}>{v}</Badge> : "—",
      }]}
    />
  );
}
