import { QualityRefAdmin } from "@/components/qualite/QualityRefAdmin";

export default function QualiteUnitsAdmin() {
  return (
    <QualityRefAdmin
      table="quality_units"
      title="Unités de mesure"
      subtitle="Unités utilisables dans les indicateurs et contrôles qualité"
      fields={[
        { key: "symbol", label: "Symbole", required: true, placeholder: "g, kg, mm…" },
        { key: "label", label: "Libellé", required: true, placeholder: "Gramme" },
        { key: "category", label: "Catégorie", placeholder: "Masse, Longueur, Température…" },
      ]}
      extraColumns={[{ key: "category", label: "Catégorie" }]}
    />
  );
}
