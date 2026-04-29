// Pure CSV builder for the per-OF traceability sheet.
// Returns lines as plain string arrays; the caller wraps them with exportToCsv
// or assembles a multi-section CSV.

export interface TracabiliteOf {
  numero: string;
  product_label?: string | null;
  line_label?: string | null;
  statut?: string | null;
  quality_status?: string | null;
  recipe_label?: string | null;
  bom_label?: string | null;
  quantite_prevue?: number | null;
  quantite_produite?: number | null;
  quantite_rebut?: number | null;
}

export interface TracabiliteShift {
  date_shift: string;
  shift_type: string;
  team_label?: string | null;
  chef_label?: string | null;
}

export interface TracabiliteConsumption {
  article_label: string;
  quantite: number | null;
  unite: string | null;
  lot_number?: string | null;
  batch_number?: string | null;
  supplier_lot?: string | null;
  expiry_date?: string | null;
}

export interface TracabiliteCheck {
  control_time: string;
  indicator_label: string;
  measured: string;
  is_conform: boolean | null;
}

export interface TracabiliteNc {
  nc_number: string;
  title: string;
  severity: string;
  status: string;
  decision?: string | null;
}

export interface TracabiliteAction {
  title: string;
  action_type: string;
  status: string;
  due_date?: string | null;
}

export interface TracabilitePayload {
  of: TracabiliteOf;
  shifts: TracabiliteShift[];
  consumptions: TracabiliteConsumption[];
  checks: TracabiliteCheck[];
  ncs: TracabiliteNc[];
  actions: TracabiliteAction[];
}

const esc = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
};

const row = (cells: unknown[]) => cells.map(esc).join(";");

export function buildTracabiliteCsv(p: TracabilitePayload): string {
  const lines: string[] = [];
  const o = p.of;
  lines.push(row(["Fiche traçabilité OF", o.numero]));
  lines.push(row(["Produit", o.product_label ?? ""]));
  lines.push(row(["Ligne", o.line_label ?? ""]));
  lines.push(row(["Statut production", o.statut ?? ""]));
  lines.push(row(["Statut qualité", o.quality_status ?? ""]));
  lines.push(row(["Recette", o.recipe_label ?? ""]));
  lines.push(row(["Nomenclature", o.bom_label ?? "non lié"]));
  lines.push(row(["Quantité prévue", o.quantite_prevue ?? ""]));
  lines.push(row(["Quantité produite", o.quantite_produite ?? ""]));
  lines.push(row(["Rebut", o.quantite_rebut ?? ""]));
  lines.push("");

  lines.push(row(["[Shifts]"]));
  lines.push(row(["Date", "Shift", "Équipe", "Chef de ligne"]));
  for (const s of p.shifts) {
    lines.push(row([s.date_shift, s.shift_type, s.team_label ?? "", s.chef_label ?? ""]));
  }
  lines.push("");

  lines.push(row(["[Consommations]"]));
  lines.push(row(["Article", "Quantité", "Unité", "Lot", "Batch", "Lot fournisseur", "Péremption"]));
  for (const c of p.consumptions) {
    lines.push(row([
      c.article_label, c.quantite ?? "", c.unite ?? "",
      c.lot_number ?? "", c.batch_number ?? "", c.supplier_lot ?? "", c.expiry_date ?? "",
    ]));
  }
  lines.push("");

  lines.push(row(["[Contrôles qualité]"]));
  lines.push(row(["Date", "Indicateur", "Mesure", "Conforme"]));
  for (const c of p.checks) {
    lines.push(row([c.control_time, c.indicator_label, c.measured, c.is_conform == null ? "" : c.is_conform ? "OUI" : "NON"]));
  }
  lines.push("");

  lines.push(row(["[Non-conformités]"]));
  lines.push(row(["N°", "Titre", "Gravité", "Statut", "Décision"]));
  for (const n of p.ncs) {
    lines.push(row([n.nc_number, n.title, n.severity, n.status, n.decision ?? ""]));
  }
  lines.push("");

  lines.push(row(["[Actions qualité]"]));
  lines.push(row(["Titre", "Type", "Statut", "Échéance"]));
  for (const a of p.actions) {
    lines.push(row([a.title, a.action_type, a.status, a.due_date ?? ""]));
  }

  return "\uFEFF" + lines.join("\n");
}

export function downloadTracabiliteCsv(p: TracabilitePayload) {
  const csv = buildTracabiliteCsv(p);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tracabilite_${p.of.numero}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
