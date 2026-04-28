/**
 * Catalogue de modules indexés.
 * Mapping module → libellé, route, icône et formateurs d'affichage.
 *
 * Convention : toute nouvelle table indexée (avec search_vector + trigger DB)
 * DOIT être enregistrée ici, sinon les résultats apparaîtront sans icône
 * ni route cliquable.
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
  | "ordres_fabrication"
  | "products"
  | "articles"
  | "recipes"
  | "consumptions"
  | "arrets"
  | "preventif_plans"
  | "notifications"
  | "audit_logs"
  | "validation_requests"
  | "entity_documents"
  | "pdr_stock_movements"
  | "pdr_family_suppliers";

export interface ModuleDefinition {
  key: SearchModuleKey;
  /** Libellé court affiché dans l'UI (FR) */
  label: string;
  /** Libellé pluriel pour groupes "Tickets (12)" */
  pluralLabel: string;
  /** Icône Lucide */
  icon: LucideIcon;
  /** Catégorie haute pour les facettes */
  group: "Industriel" | "Production" | "Maintenance" | "Stock" | "Système";
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
    buildUrl: (id) => `/lignes?ligne=${id}`,
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
    buildUrl: (id) => `/maintenance/journal?intervention=${id}`,
  },
  ordres_fabrication: {
    key: "ordres_fabrication",
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
  consumptions: {
    key: "consumptions",
    label: "Consommation",
    pluralLabel: "Consommations",
    icon: Activity,
    group: "Production",
    accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    buildUrl: (id) => `/gpao/consommation?id=${id}`,
  },
  arrets: {
    key: "arrets",
    label: "Arrêt",
    pluralLabel: "Arrêts",
    icon: Flame,
    group: "Production",
    accent: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    buildUrl: (id) => `/gpao/arrets?id=${id}`,
  },
  preventif_plans: {
    key: "preventif_plans",
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
    buildUrl: (id) => `/notifications?id=${id}`,
  },
  audit_logs: {
    key: "audit_logs",
    label: "Audit",
    pluralLabel: "Journal d'audit",
    icon: History,
    group: "Système",
    accent: "bg-muted text-foreground",
    buildUrl: (id) => `/audit?id=${id}`,
  },
  validation_requests: {
    key: "validation_requests",
    label: "Validation",
    pluralLabel: "Demandes de validation",
    icon: ShieldCheck,
    group: "Système",
    accent: "bg-muted text-foreground",
    buildUrl: (id) => `/validations?id=${id}`,
  },
  entity_documents: {
    key: "entity_documents",
    label: "Document",
    pluralLabel: "Documents",
    icon: FileText,
    group: "Système",
    accent: "bg-muted text-foreground",
    buildUrl: (id) => `/documents?id=${id}`,
  },
  pdr_stock_movements: {
    key: "pdr_stock_movements",
    label: "Mouvement PDR",
    pluralLabel: "Mouvements PDR",
    icon: Truck,
    group: "Stock",
    accent: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    buildUrl: (id) => `/pdr/mouvements?id=${id}`,
  },
  pdr_family_suppliers: {
    key: "pdr_family_suppliers",
    label: "Fournisseur PDR",
    pluralLabel: "Fournisseurs PDR",
    icon: Users,
    group: "Stock",
    accent: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    buildUrl: (id) => `/parametres/pdr/familles?id=${id}`,
  },
};

export function getModuleDefinition(
  module: string,
): ModuleDefinition | null {
  return (MODULES as Record<string, ModuleDefinition>)[module] ?? null;
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

/** Fallback icône / label si la DB renvoie un module inconnu */
export const FALLBACK_MODULE: ModuleDefinition = {
  key: "audit_logs",
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
