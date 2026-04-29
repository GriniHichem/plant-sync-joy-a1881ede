import { QualityRefAdmin } from "@/components/qualite/QualityRefAdmin";

export default function QualiteActionCategoriesAdmin() {
  return (
    <QualityRefAdmin
      table="quality_action_categories"
      title="Catégories d'actions qualité"
      subtitle="Catégorisation des actions correctives, préventives, formations…"
      fields={[
        { key: "code", label: "Code", required: true },
        { key: "label", label: "Libellé", required: true },
        { key: "color", label: "Couleur", type: "color" },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      extraColumns={[{ key: "color", label: "Couleur", render: (v) => v ? <span className="inline-block h-4 w-8 rounded border" style={{ background: v }} /> : "—" }]}
    />
  );
}
