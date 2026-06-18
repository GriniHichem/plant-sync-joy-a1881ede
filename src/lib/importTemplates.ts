// Centralized definitions for the data import module (Configuration > Importation).
// Shared between template generation, CSV mapping and validation.

export type ImportEntity = "machines" | "equipements" | "organes" | "pdr";

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "number" | "date";
  /** Allowed values (enum). Validation is case-insensitive. */
  enumValues?: string[];
  /** Hint shown in the template/help. */
  hint?: string;
  /** Example value used in the downloadable template sample row. */
  example?: string;
}

export interface ImportTemplate {
  entity: ImportEntity;
  label: string;
  /** RPC function name to call. */
  rpc: string;
  /** Unique business key used to detect duplicates. */
  uniqueKey: string;
  fields: ImportField[];
}

export const IMPORT_TEMPLATES: Record<ImportEntity, ImportTemplate> = {
  machines: {
    entity: "machines",
    label: "Machines",
    rpc: "import_machines",
    uniqueKey: "code",
    fields: [
      { key: "code", label: "Code", required: true, example: "MCH-001" },
      { key: "designation", label: "Désignation", required: true, example: "Mélangeur principal" },
      { key: "famille", label: "Famille", hint: "Créée si absente", example: "Mélange" },
      { key: "sous_famille", label: "Sous-famille", hint: "Créée si absente (rattachée à la famille)", example: "Mélangeurs horizontaux" },
      { key: "criticite", label: "Criticité", enumValues: ["A", "B", "C"], example: "B" },
      { key: "statut", label: "Statut", enumValues: ["en_marche", "arret", "maintenance"], example: "en_marche" },
      { key: "localisation", label: "Localisation", example: "Atelier 1" },
      { key: "marque", label: "Marque", example: "ACME" },
      { key: "modele", label: "Modèle", example: "X200" },
      { key: "numero_serie", label: "N° de série", example: "SN-12345" },
      { key: "date_mise_en_service", label: "Date mise en service", type: "date", hint: "Format AAAA-MM-JJ", example: "2023-05-12" },
      { key: "description", label: "Description", example: "" },
      { key: "code_erp", label: "Code ERP", example: "" },
    ],
  },
  equipements: {
    entity: "equipements",
    label: "Équipements",
    rpc: "import_equipements",
    uniqueKey: "code",
    fields: [
      { key: "code", label: "Code", required: true, example: "EQP-001" },
      { key: "designation", label: "Désignation", required: true, example: "Convoyeur d'entrée" },
      { key: "famille", label: "Famille", hint: "Créée si absente", example: "Convoyage" },
      { key: "sous_famille", label: "Sous-famille", hint: "Créée si absente", example: "Convoyeurs à bande" },
      { key: "type", label: "Type", enumValues: ["capteur", "actionneur", "convoyeur", "peripherique", "utilite", "sous_ensemble", "instrument", "autre"], example: "convoyeur" },
      { key: "statut", label: "Statut", enumValues: ["en_service", "hors_service", "en_maintenance", "reforme"], example: "en_service" },
      { key: "criticite", label: "Criticité", enumValues: ["A", "B", "C"], example: "C" },
      { key: "criticite_maintenance", label: "Criticité maintenance", enumValues: ["faible", "moyenne", "elevee", "critique"], example: "moyenne" },
      { key: "role_fonctionnel", label: "Rôle fonctionnel", enumValues: ["alimentation", "transformation", "dosage", "melange", "convoyage", "conditionnement", "controle", "evacuation", "utilite", "autre"], example: "convoyage" },
      { key: "machine_parent_code", label: "Code machine parente", hint: "Doit déjà exister", example: "MCH-001" },
      { key: "ligne", label: "Ligne de production", hint: "Code ou désignation existant", example: "LIGNE-A" },
      { key: "marque", label: "Marque", example: "" },
      { key: "modele", label: "Modèle", example: "" },
      { key: "numero_serie", label: "N° de série", example: "" },
      { key: "localisation", label: "Localisation", example: "" },
      { key: "date_mise_en_service", label: "Date mise en service", type: "date", hint: "Format AAAA-MM-JJ", example: "" },
      { key: "description", label: "Description", example: "" },
      { key: "code_erp", label: "Code ERP", example: "" },
    ],
  },
  organes: {
    entity: "organes",
    label: "Organes",
    rpc: "import_organes",
    uniqueKey: "code",
    fields: [
      { key: "code", label: "Code", required: true, example: "ORG-001" },
      { key: "designation", label: "Désignation", required: true, example: "Moteur d'entraînement" },
      { key: "type", label: "Type", enumValues: ["mecanique", "electrique", "pneumatique", "hydraulique", "electronique", "automatisme", "instrumentation", "autre"], example: "electrique" },
      { key: "statut", label: "Statut", enumValues: ["en_service", "en_panne", "en_maintenance", "hors_service"], example: "en_service" },
      { key: "criticite", label: "Criticité", enumValues: ["A", "B", "C"], example: "C" },
      { key: "machine_parent_code", label: "Code machine parente", hint: "Machine OU équipement requis", example: "MCH-001" },
      { key: "equipement_parent_code", label: "Code équipement parent", hint: "Machine OU équipement requis", example: "" },
      { key: "description", label: "Description", example: "" },
    ],
  },
  pdr: {
    entity: "pdr",
    label: "Pièces de rechange (PDR)",
    rpc: "import_pdr",
    uniqueKey: "reference",
    fields: [
      { key: "reference", label: "Référence", required: true, example: "PDR-001" },
      { key: "designation", label: "Désignation", required: true, example: "Roulement 6205" },
      { key: "famille", label: "Famille", hint: "Créée si absente", example: "Roulements" },
      { key: "sous_famille", label: "Sous-famille", hint: "Créée si absente", example: "Roulements à billes" },
      { key: "statut_pdr", label: "Statut PDR", enumValues: ["strategique", "commune"], example: "commune" },
      { key: "approvisionnement", label: "Approvisionnement", enumValues: ["local", "importation", "mixte"], example: "local" },
      { key: "stock_actuel", label: "Stock actuel", type: "number", example: "10" },
      { key: "stock_min", label: "Stock min", type: "number", example: "2" },
      { key: "stock_max", label: "Stock max", type: "number", example: "20" },
      { key: "stock_securite", label: "Stock sécurité", type: "number", example: "3" },
      { key: "point_commande", label: "Point de commande", type: "number", example: "5" },
      { key: "delai_approvisionnement", label: "Délai appro (jours)", type: "number", example: "15" },
      { key: "pmp", label: "PMP (prix moyen)", type: "number", example: "1200" },
      { key: "devise", label: "Devise", example: "DA" },
    ],
  },
};

/** Build the CSV template content (BOM + header + one sample row), separator ';'. */
export function buildTemplateCsv(entity: ImportEntity): string {
  const tpl = IMPORT_TEMPLATES[entity];
  const sep = ";";
  const headerCells = tpl.fields.map((f) => `"${f.key}${f.required ? "*" : ""}"`);
  const sampleCells = tpl.fields.map((f) => `"${(f.example ?? "").replace(/"/g, '""')}"`);
  const bom = "\uFEFF";
  return bom + [headerCells.join(sep), sampleCells.join(sep)].join("\r\n") + "\r\n";
}

/** Validate a single enum cell value (case-insensitive). Returns true if empty or allowed. */
export function isValidEnumValue(field: ImportField, value: string): boolean {
  const v = (value ?? "").trim();
  if (!v) return true;
  if (!field.enumValues) return true;
  return field.enumValues.some((a) => a.toLowerCase() === v.toLowerCase());
}
