import { vi } from "vitest";

// Mock data
export const mockProducts = [
  { id: "prod-1", code: "PRD-001", designation: "Harissa classique", unite: "kg", is_active: true, description: "Produit phare" },
  { id: "prod-2", code: "PRD-002", designation: "Sauce tomate", unite: "kg", is_active: true, description: "" },
];

export const mockArticles = [
  { id: "art-1", code: "ART-001", designation: "Piment rouge", unite: "kg", stock_actuel: 500, stock_min: 100, is_active: true, prix_unitaire: 5, fournisseur: "Fournisseur A", description: "" },
  { id: "art-2", code: "ART-002", designation: "Sel", unite: "kg", stock_actuel: 50, stock_min: 200, is_active: true, prix_unitaire: 1.5, fournisseur: "Fournisseur B", description: "" },
  { id: "art-3", code: "ART-003", designation: "Huile olive", unite: "l", stock_actuel: 300, stock_min: 50, is_active: true, prix_unitaire: 8, fournisseur: "", description: "" },
];

export const mockLines = [
  { id: "line-1", code: "L01", designation: "Ligne Harissa", is_active: true, machine_id: null, atelier: "Atelier 1" },
  { id: "line-2", code: "L02", designation: "Ligne Sauce", is_active: true, machine_id: null, atelier: "Atelier 2" },
];

export const mockShiftModes = [
  { id: "mode-1", code: "3x8", label: "3 Shifts (3×8)", nb_shifts: 3, is_active: true, is_default: true },
  { id: "mode-2", code: "2x8", label: "2 Shifts (2×8)", nb_shifts: 2, is_active: true, is_default: false },
];

export const mockRecipes = [
  { id: "rec-1", name: "Harissa v1", product_id: "prod-1", version: 1, is_active: true, products: mockProducts[0] },
  { id: "rec-2", name: "Harissa v2", product_id: "prod-1", version: 2, is_active: true, products: mockProducts[0] },
];

export const mockRecipeLines = [
  { id: "rl-1", recipe_id: "rec-1", article_id: "art-1", quantite: 0.6, unite: "kg", articles: mockArticles[0] },
  { id: "rl-2", recipe_id: "rec-1", article_id: "art-2", quantite: 0.05, unite: "kg", articles: mockArticles[1] },
  { id: "rl-3", recipe_id: "rec-1", article_id: "art-3", quantite: 0.2, unite: "l", articles: mockArticles[2] },
];

export const mockOfs = [
  {
    id: "of-1", numero: "OF-00001", product_id: "prod-1", recipe_id: "rec-1", line_id: "line-1",
    quantite_prevue: 1000, quantite_produite: 450, quantite_rebut: 10, unite: "kg",
    statut: "en_cours", date_debut_prevue: "2026-03-15", date_fin_prevue: "2026-03-20",
    date_debut_reelle: "2026-03-15T06:00:00Z", date_fin_reelle: null,
    shift_mode_id: "mode-1", created_by: "user-1", is_active: true,
    products: mockProducts[0], production_lines: mockLines[0], recipes: mockRecipes[0],
    shift_modes: mockShiftModes[0],
    created_at: "2026-03-15T00:00:00Z",
  },
  {
    id: "of-2", numero: "OF-00002", product_id: "prod-2", recipe_id: null, line_id: "line-2",
    quantite_prevue: 500, quantite_produite: 0, quantite_rebut: 0, unite: "kg",
    statut: "planifie", date_debut_prevue: "2026-03-18", date_fin_prevue: "2026-03-22",
    date_debut_reelle: null, date_fin_reelle: null,
    shift_mode_id: "mode-1", created_by: "user-1", is_active: true,
    products: mockProducts[1], production_lines: mockLines[1], recipes: null,
    shift_modes: mockShiftModes[0],
    created_at: "2026-03-16T00:00:00Z",
  },
  {
    id: "of-3", numero: "OF-00003", product_id: "prod-1", recipe_id: "rec-2", line_id: "line-1",
    quantite_prevue: 2000, quantite_produite: 2000, quantite_rebut: 30, unite: "kg",
    statut: "termine", date_debut_prevue: "2026-03-10", date_fin_prevue: "2026-03-14",
    date_debut_reelle: "2026-03-10T06:00:00Z", date_fin_reelle: "2026-03-14T18:00:00Z",
    shift_mode_id: "mode-1", created_by: "user-1", is_active: true,
    products: mockProducts[0], production_lines: mockLines[0], recipes: mockRecipes[1],
    shift_modes: mockShiftModes[0],
    created_at: "2026-03-10T00:00:00Z",
  },
];

export const mockStops = [
  {
    id: "stop-1", of_id: "of-1", shift_id: "shift-1", type: "panne", description: "Fuite pompe",
    heure_debut: "2026-03-15T08:30:00Z", heure_fin: "2026-03-15T09:00:00Z", duree_minutes: 30,
    line_id: "line-1", machine_id: null, ticket_id: null, declared_by: "user-1",
    production_lines: mockLines[0],
  },
  {
    id: "stop-2", of_id: "of-1", shift_id: "shift-1", type: "nettoyage", description: "Nettoyage standard",
    heure_debut: "2026-03-15T12:00:00Z", heure_fin: "2026-03-15T12:15:00Z", duree_minutes: 15,
    line_id: "line-1", machine_id: null, ticket_id: null, declared_by: "user-1",
    production_lines: mockLines[0],
  },
];

export const mockShiftTeams = [
  { id: "team-1", code: "A", name: "Équipe A", color: "#3b82f6", is_active: true },
  { id: "team-2", code: "B", name: "Équipe B", color: "#10b981", is_active: true },
  { id: "team-3", code: "C", name: "Équipe C", color: "#f59e0b", is_active: true },
];

export const mockShifts = [
  {
    id: "shift-1", date_shift: "2026-03-17", heure_debut: "2026-03-17T06:00:00Z", heure_fin: "2026-03-17T14:00:00Z",
    heure_debut_reelle: "2026-03-17T05:55:00Z", heure_fin_reelle: null, shift_type: "matin",
    shift_team_id: "team-1", chef_ligne_id: "user-1", of_id: "of-1", line_id: "line-1",
    statut: "en_cours", observations: "",
    shift_teams: mockShiftTeams[0], production_lines: mockLines[0],
  },
];

export const mockDeclarations = [
  { id: "decl-1", of_id: "of-1", shift_id: "shift-1", heure_production: "2026-03-17T06:00:00Z", quantite_produite: 60, quantite_rebut: 2, declared_by: "user-1", notes: "" },
  { id: "decl-2", of_id: "of-1", shift_id: "shift-1", heure_production: "2026-03-17T07:00:00Z", quantite_produite: 55, quantite_rebut: 0, declared_by: "user-1", notes: "RAS" },
];

export const mockConsumptions = [
  { id: "cons-1", of_id: "of-1", shift_id: "shift-1", article_id: "art-1", quantite: 35, unite: "kg", declared_by: "user-1", notes: "", articles: mockArticles[0], ordres_fabrication: mockOfs[0], shifts: mockShifts[0] },
];

export const mockModeHistory = [
  {
    id: "mh-1", of_id: "of-1", old_mode_id: null, new_mode_id: "mode-1", changed_by: "user-1",
    reason: "Démarrage initial", created_at: "2026-03-15T06:00:00Z",
    old_mode: null, new_mode: { label: "3 Shifts (3×8)", code: "3x8" },
  },
];

// =============================================
// Notifications & Validations mock data
// =============================================
export const mockNotificationRules = [
  {
    id: "nr-1", name: "Tickets critiques", is_active: true,
    module: "tickets", event_type: "ticket_created",
    severity: "critical", is_critical: true,
    target_roles: ["resp_maintenance", "admin"], target_users: [], excluded_users: [],
    conditions: { any: [{ field: "priority", op: "in", value: ["high","critical"] }, { field: "machine_criticality", op: "eq", value: "A" }] },
    channels: ["in_app","email"], frequency: "immediate",
  },
  {
    id: "nr-2", name: "PDR rupture", is_active: true,
    module: "pdr_stock", event_type: "pdr_stock_out",
    severity: "critical", is_critical: true,
    target_roles: ["resp_maintenance","gestionnaire_magasin"], target_users: [], excluded_users: [],
    conditions: null, channels: ["in_app","email"], frequency: "immediate",
  },
  {
    id: "nr-3", name: "Audit critique", is_active: true,
    module: "audit", event_type: "audit_critical_event",
    severity: "critical", is_critical: true,
    target_roles: ["admin","responsable_si"], target_users: [], excluded_users: [],
    conditions: null, channels: ["in_app","email"], frequency: "immediate",
  },
];

export const mockValidationRules = [
  {
    id: "vr-1", name: "Correction PDR > 5%", module: "pdr_stock", entity_type: "pdr_movement",
    action_type: "correction", enforcement: "blocking", is_active: true, is_required: true,
    priority: "high", validator_roles: ["resp_maintenance","admin"], validator_users: [],
    conditions: { ecart_seuil_pct: 5 }, auto_approve_if_low_risk: false,
  },
  {
    id: "vr-2", name: "Clôture ticket critique", module: "tickets", entity_type: "ticket",
    action_type: "close", enforcement: "post_hoc", is_active: true, is_required: false,
    priority: "medium", validator_roles: ["resp_maintenance"], validator_users: [],
    conditions: { priority: ["high","critical"] }, auto_approve_if_low_risk: false,
  },
  {
    id: "vr-3", name: "Annulation OF", module: "of", entity_type: "of",
    action_type: "cancel", enforcement: "blocking", is_active: true, is_required: true,
    priority: "high", validator_roles: ["resp_production","admin"], validator_users: [],
    conditions: null, auto_approve_if_low_risk: false,
  },
];

export const mockNotifications = [
  { id: "n-1", title: "Ticket critique", message: "TKT-00001", module: "tickets", notification_type: "ticket_created", severity: "critical", status: "unread", recipient_user_id: "user-1", recipient_role: null, created_at: "2026-04-28T10:00:00Z", rule_id: "nr-1", is_critical: true, deduplication_key: "ticket_created:tkt-1" },
  { id: "n-2", title: "PDR rupture", message: "PDR-001", module: "pdr_stock", notification_type: "pdr_stock_out", severity: "critical", status: "read", recipient_user_id: "user-1", recipient_role: null, read_at: "2026-04-28T11:00:00Z", created_at: "2026-04-28T09:00:00Z", rule_id: "nr-2", is_critical: true },
  { id: "n-3", title: "Doc ajouté", message: "", module: "documents", notification_type: "document_uploaded", severity: "info", status: "archived", recipient_user_id: "user-1", recipient_role: null, archived_at: "2026-04-28T08:00:00Z", created_at: "2026-04-28T07:00:00Z", is_critical: false },
];

export const mockValidationRequests = [
  { id: "vrq-1", rule_id: "vr-1", module: "pdr_stock", entity_type: "pdr_movement", requested_action: "correction", status: "submitted", enforcement: "blocking", priority: "high", title: "Correction stock PDR-001", is_blocking: true, submitted_by_user_id: "user-1", created_at: "2026-04-28T10:00:00Z" },
  { id: "vrq-2", rule_id: "vr-2", module: "tickets", entity_type: "ticket", requested_action: "close", status: "approved", enforcement: "post_hoc", priority: "medium", title: "Clôture TKT-00001", is_blocking: false, submitted_by_user_id: "user-1", validated_at: "2026-04-28T11:00:00Z", created_at: "2026-04-28T09:30:00Z" },
  { id: "vrq-3", rule_id: "vr-3", module: "of", entity_type: "of", requested_action: "cancel", status: "rejected", enforcement: "blocking", priority: "high", title: "Annulation OF-00010", is_blocking: true, submitted_by_user_id: "user-1", rejected_at: "2026-04-28T12:00:00Z", rejection_reason: "Pas justifié", created_at: "2026-04-28T11:30:00Z" },
];

// Helper to create chainable mock query builder
function createQueryBuilder(data: any) {
  const builder: any = {};
  const methods = ["select", "insert", "update", "delete", "eq", "neq", "not", "order", "limit", "single", "in", "is", "gt", "lt", "gte", "lte", "like", "ilike"];
  methods.forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  // Terminal: .then or await
  builder.then = (resolve: any) => resolve({ data, error: null });
  return builder;
}

export function createMockSupabase() {
  const fromMap: Record<string, any> = {
    products: mockProducts,
    articles: mockArticles,
    production_lines: mockLines,
    shift_modes: mockShiftModes,
    recipes: mockRecipes,
    recipe_lines: mockRecipeLines,
    ordres_fabrication: mockOfs,
    production_stops: mockStops,
    shifts: mockShifts,
    shift_teams: mockShiftTeams,
    production_declarations: mockDeclarations,
    consumptions: mockConsumptions,
    of_mode_history: mockModeHistory,
    machines: [],
    tickets: [],
    audit_logs: [],
    shift_settings: [],
    shift_mode_slots: [],
    notification_rules: mockNotificationRules,
    validation_rules: mockValidationRules,
    notifications: mockNotifications,
    validation_requests: mockValidationRequests,
  };

  return {
    from: vi.fn((table: string) => createQueryBuilder(fromMap[table] || [])),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
  };
}
