/**
 * Generate a PDF "Bilan de quart" for a shift (production / maintenance / quality).
 * Pure client-side via jsPDF + autotable. No schema change.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ShiftReportInput {
  kind: "production" | "maintenance" | "quality";
  title: string;
  startedAt: string | null;
  endedAt: string | null;
  team?: string | null;
  line?: string | null;
  user?: string | null;
  observations?: string | null;
  kpis: { label: string; value: string | number }[];
  /** Optional sections of tabular data (e.g. interventions, controls, NCs). */
  sections?: { title: string; columns: string[]; rows: (string | number)[][] }[];
}

const KIND_LABEL: Record<ShiftReportInput["kind"], string> = {
  production: "Bilan de Shift Production",
  maintenance: "Bilan de Shift Maintenance",
  quality: "Bilan de Shift Qualité",
};

export function generateShiftReportPdf(input: ShiftReportInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(KIND_LABEL[input.kind], 40, 50);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(input.title, 40, 68);
  doc.text(`Édité le ${new Date().toLocaleString("fr-FR")}`, pageW - 40, 50, { align: "right" });

  // Meta
  const meta: [string, string][] = [
    ["Début", input.startedAt ? new Date(input.startedAt).toLocaleString("fr-FR") : "—"],
    ["Fin", input.endedAt ? new Date(input.endedAt).toLocaleString("fr-FR") : "—"],
    ["Équipe", input.team ?? "—"],
    ["Ligne", input.line ?? "—"],
    ["Opérateur", input.user ?? "—"],
  ];
  autoTable(doc, {
    startY: 90,
    body: meta,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80, textColor: 60 } },
  });

  // KPIs
  if (input.kpis.length) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? 90;
    autoTable(doc, {
      startY: lastY + 12,
      head: [["Indicateur", "Valeur"]],
      body: input.kpis.map((k) => [k.label, String(k.value)]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 60] },
      styles: { fontSize: 9 },
    });
  }

  // Sections
  for (const section of input.sections ?? []) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? 120;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(section.title, 40, lastY + 24);
    autoTable(doc, {
      startY: lastY + 30,
      head: [section.columns],
      body: section.rows.length ? section.rows : [["—"]],
      theme: "grid",
      headStyles: { fillColor: [60, 60, 80] },
      styles: { fontSize: 8, cellPadding: 3 },
    });
  }

  // Observations
  if (input.observations) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? 120;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Observations", 40, lastY + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(input.observations, pageW - 80);
    doc.text(lines, 40, lastY + 40);
  }

  const safeName = input.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 60);
  doc.save(`bilan_${input.kind}_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
