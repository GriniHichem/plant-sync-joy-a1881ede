import { QualityRefAdmin } from "@/components/qualite/QualityRefAdmin";

export default function QualiteNcCategoriesAdmin() {
  return (
    <QualityRefAdmin
      table="quality_nc_categories"
      title="Catégories de non-conformité"
      subtitle="Familles utilisées pour classer les NC (produit, process, matière…)"
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "ex: produit" },
        { key: "label", label: "Libellé", required: true, placeholder: "ex: Produit" },
        { key: "color", label: "Couleur", type: "color" },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      extraColumns={[{ key: "color", label: "Couleur", render: (v) => v ? <span className="inline-block h-4 w-8 rounded border" style={{ background: v }} /> : "—" }]}
    />
  );
}
