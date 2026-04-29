import { useEffect, useState } from "react";
import { QualityRefAdmin } from "@/components/qualite/QualityRefAdmin";
import { supabase } from "@/integrations/supabase/client";

export default function QualiteControlPointsAdmin() {
  const [lines, setLines] = useState<{ id: string; nom: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("production_lines").select("id, nom").order("nom");
      setLines((data ?? []) as any);
    })();
  }, []);

  return (
    <QualityRefAdmin
      table="quality_control_points"
      title="Points de contrôle"
      subtitle="Postes ou stations où des contrôles qualité sont effectués"
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "PC-01" },
        { key: "label", label: "Libellé", required: true, placeholder: "Sortie ligne" },
        { key: "production_line_id", label: "ID ligne (optionnel)", placeholder: "UUID de ligne" },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      extraColumns={[{
        key: "production_line_id",
        label: "Ligne",
        render: (v) => v ? (lines.find((l) => l.id === v)?.nom ?? <span className="font-mono text-xs">{v.slice(0,8)}…</span>) : "—",
      }]}
    />
  );
}
