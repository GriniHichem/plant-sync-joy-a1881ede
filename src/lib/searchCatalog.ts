/**
 * Catalogue de modules indexés.
 * Mapping module → libellé, route, icône et formateurs d'affichage.
 *
 * IMPORTANT : les clés DOIVENT correspondre EXACTEMENT aux noms de module
 * renvoyés par le RPC `global_search` côté base (ex: `of`, `preventif`,
 * `audit`, `quality_nc`…). Sinon les résultats tombent sur FALLBACK_MODULE
 * (icône générique + route cassée).
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Box,
  ClipboardCheck,
  ClipboardList,
  Cog,
  FactoryIcon,
  FileText,
  Flame,
  GitBranch,
  History,
  Image as ImageIcon,
  Layers,
  Package,
  Pill,
  Settings,
  ShieldAlert,
  ShieldCheck,
  TicketCheck,
  Truck,
  Users,
  Workflow,
  Wrench,
} from "lucide-react";

export type SearchModuleKey =
  | "machines"
  | "equipements"
  | "organes"
  | "lignes"
  | "pdr"
  | "tickets"
  | "interventions"
  | "of"
  | "products"
  | "articles"
  | "recipes"
  | "consommations"
  | "arrets"
  | "preventif"
  | "notifications"
  | "audit"
  | "validations"
  | "documents"
  | "pdr_movements"
  | "fournisseurs"
  | "quality_nc"
  | "quality_actions";

export interface ModuleDefinition {
  key: SearchModuleKey;
  /** Libellé court affiché dans l'UI (FR) */
  label: string;
  /** Libellé pluriel pour groupes "Tickets (12)" */
  pluralLabel: string;
  /** Icône Lucide */
  icon: LucideIcon;
  /** Catégorie haute pour les facettes */
  group:
    | "Industriel"
    | "Production"
    | "Maintenance"
    | "Qualité"
    | "Stock"
    | "Système";
  /**
   * Construit l'URL de la fiche entité.
   * Reçoit `entityId` brut renvoyé par `global_search`.
   */
  buildUrl: (entityId: string) => string;
  /** Couleur de badge (token sémantique tailwind) */
  accent: string;
}

const MODULES: Record<SearchModuleKey, ModuleDefinition> = {
  machines: {
    key: "machines",
    label: "Machine",
    pluralLabel: "Machines",
    icon: Cog,
    group: "Industriel",
    accent: "bg-primary/10 text-primary",
    buildUrl: (id) => `/machines/${id}`,
  },
  equipements: {
    key: "equipements",
    label: "Équipement",
    pluralLabel: "Équipements",
    icon: Wrench,
    group: "Industriel",
    accent: "bg-primary/10 text-primary",
    buildUrl: (id) => `/equipements/${id}`,
  },
  organes: {
    key: "organes",
    label: "Organe",
    pluralLabel: "Organes",
    icon: GitBranch,
    group: "Industriel",
    accent: "bg-primary/10 text-primary",
    buildUrl: (id) => `/organes/${id}`,
  },
  lignes: {
    key: "lignes",
    label: "Ligne",
    pluralLabel: "Lignes",
    icon: Workflow,
    group: "Industriel",
    accent: "bg-primary/10 text-primary",
    buildUrl: (id) => `/lignes/${id}`,
  },
  pdr: {
    key: "pdr",
    label: "PDR",
    pluralLabel: "Pièces de rechange",
    icon: Package,
    group: "Stock",
    accent: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    buildUrl: (id) => `/pdr/${id}`,
  },
  tickets: {
    key: "tickets",
    label: "Ticket",
    pluralLabel: "Tickets",
    icon: TicketCheck,
    group: "Maintenance",
    accent: "bg-destructive/10 text-destructive",
    buildUrl: (id) => `/tickets/${id}`,
  },
  interventions: {
    key: "interventions",
    label: "Intervention",
    pluralLabel: "Interventions",
    icon: Wrench,
    group: "Maintenance",
    accent: "bg-destructive/10 text-destructive",
    buildUrl: (id) => `/tickets/${id}`,
  },
  of: {
    key: "of",
    label: "OF",
    pluralLabel: "Ordres de fabrication",
    icon: FactoryIcon,
    group: "Production",
    accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    buildUrl: (id) => `/gpao/of/${id}`,
  },
  products: {
    key: "products",
    label: "Produit",
    pluralLabel: "Produits",
    icon: Box,
    group: "Production",
    accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    buildUrl: (id) => `/gpao/produits/${id}`,
  },
  articles: {
    key: "articles",
    label: "Article",
    pluralLabel: "Articles",
    icon: Pill,
    group: "Production",
    accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    buildUrl: (id) => `/gpao/articles/${id}`,
  },
  recipes: {
    key: "recipes",
    label: "Recette",
    pluralLabel: "Recettes",
    icon: Layers,
    group: "Production",
    accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    buildUrl: (id) => `/gpao/recettes?recipe=${id}`,
  },
  consommations: {
    key: "consommations",
    label: "Consommation",
    pluralLabel: "Consommations",
    icon: Activity,
    group: "Production",
    accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    buildUrl: () => `/gpao/consommations`,
  },
  arrets: {
    key: "arrets",
    label: "Arrêt",
    pluralLabel: "Arrêts",
    icon: Flame,
    group: "Production",
    accent: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    buildUrl: () => `/gpao/arrets`,
  },
  preventif: {
    key: "preventif",
    label: "Préventif",
    pluralLabel: "Plans préventifs",
    icon: ClipboardCheck,
    group: "Maintenance",
    accent: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    buildUrl: (id) => `/preventif/${id}`,
  },
  notifications: {
    key: "notifications",
    label: "Notification",
    pluralLabel: "Notifications",
    icon: Bell,
    group: "Système",
    accent: "bg-muted text-foreground",
    buildUrl: () => `/notifications`,
  },
  audit: {
    key: "audit",
    label: "Audit",
    pluralLabel: "Journal d'audit",
    icon: History,
    group: "Système",
    accent: "bg-muted text-foreground",
    buildUrl: () => `/audit`,
  },
  validations: {
    key: "validations",
    label: "Validation",
    pluralLabel: "Demandes de validation",
    icon: ShieldCheck,
    group: "Système",
    accent: "bg-muted text-foreground",
    buildUrl: () => `/validations`,
  },
  documents: {
    key: "documents",
    label: "Document",
    pluralLabel: "Documents",
    icon: FileText,
    group: "Système",
    accent: "bg-muted text-foreground",
    buildUrl: () => `/documents`,
  },
  pdr_movements: {
    key: "pdr_movements",
    label: "Mouvement PDR",
    pluralLabel: "Mouvements PDR",
    icon: Truck,
    group: "Stock",
    accent: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    buildUrl: (id) => `/pdr/${id}`,
  },
  fournisseurs: {
    key: "fournisseurs",
    label: "Fournisseur PDR",
    pluralLabel: "Fournisseurs PDR",
    icon: Users,
    group: "Stock",
    accent: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    buildUrl: () => `/parametres`,
  },
  quality_nc: {
    key: "quality_nc",
    label: "Non-conformité",
    pluralLabel: "Non-conformités",
    icon: ShieldAlert,
    group: "Qualité",
    accent: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    buildUrl: (id) => `/qualite/non-conformites?id=${id}`,
  },
  quality_actions: {
    key: "quality_actions",
    label: "Action qualité",
    pluralLabel: "Actions qualité",
    icon: ClipboardCheck,
    group: "Qualité",
    accent: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
    buildUrl: (id) => `/qualite/actions?id=${id}`,
  },
};

/** Alias FR/EN → clé canonique (pour la syntaxe `module:…`). */
const MODULE_ALIASES: Record<string, SearchModuleKey> = {
  machine: "machines",
  equipement: "equipements",
  équipement: "equipements",
  equipements: "equipements",
  organe: "organes",
  ligne: "lignes",
  ofs: "of",
  ordres_fabrication: "of",
  produit: "products",
  produits: "products",
  article: "articles",
  recette: "recipes",
  recettes: "recipes",
  recipes: "recipes",
  consommation: "consommations",
  consumptions: "consommations",
  arret: "arrets",
  arrêt: "arrets",
  arrêts: "arrets",
  preventif_plans: "preventif",
  préventif: "preventif",
  ticket: "tickets",
  intervention: "interventions",
  notification: "notifications",
  audit_logs: "audit",
  validation: "validations",
  validation_requests: "validations",
  document: "documents",
  entity_documents: "documents",
  mouvement: "pdr_movements",
  pdr_stock_movements: "pdr_movements",
  fournisseur: "fournisseurs",
  pdr_family_suppliers: "fournisseurs",
  nc: "quality_nc",
  "non-conformite": "quality_nc",
  "non-conformité": "quality_nc",
  quality_non_conformities: "quality_nc",
  action: "quality_actions",
  actions: "quality_actions",
};

export function getModuleDefinition(
  module: string,
): ModuleDefinition | null {
  const direct = (MODULES as Record<string, ModuleDefinition>)[module];
  if (direct) return direct;
  const alias = MODULE_ALIASES[module.toLowerCase()];
  return alias ? MODULES[alias] : null;
}

export function listModules(): ModuleDefinition[] {
  return Object.values(MODULES);
}

export function listModulesByGroup(): Record<string, ModuleDefinition[]> {
  return listModules().reduce<Record<string, ModuleDefinition[]>>((acc, m) => {
    acc[m.group] ??= [];
    acc[m.group].push(m);
    return acc;
  }, {});
}

/** Module keys connus (utile pour valider une URL ?modules=…) */
export const KNOWN_MODULE_KEYS: SearchModuleKey[] = Object.keys(
  MODULES,
) as SearchModuleKey[];

/** Résout un terme libre (`module:…`) vers une clé canonique connue, ou null. */
export function resolveModuleKey(input: string): SearchModuleKey | null {
  const lower = input.toLowerCase();
  if ((MODULES as Record<string, ModuleDefinition>)[lower]) {
    return lower as SearchModuleKey;
  }
  return MODULE_ALIASES[lower] ?? null;
}

/** Fallback icône / label si la DB renvoie un module inconnu */
export const FALLBACK_MODULE: ModuleDefinition = {
  key: "audit",
  label: "Résultat",
  pluralLabel: "Autres",
  icon: Settings,
  group: "Système",
  accent: "bg-muted text-foreground",
  buildUrl: (id) => `/recherche?id=${id}`,
};

/** Pour les rendus qui veulent juste une icône même sur un module inconnu. */
export const fallbackImageIcon = ImageIcon;
export const fallbackAlertIcon = AlertTriangle;
export const fallbackListIcon = ClipboardList;
