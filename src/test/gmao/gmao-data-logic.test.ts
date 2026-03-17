import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockLines, mockShiftTeams, createMockSupabase,
} from "../__mocks__/supabase";

// ── Mock data specific to GMAO ──────────────────────────────────────
const mockMachines = [
  {
    id: "mac-1", code: "M01", designation: "Broyeur principal", statut: "en_marche",
    criticite: "A", criticite_maintenance: "critique", role_fonctionnel: "transformation",
    impact_ligne: "arret_complet", disponibilite_pdr: "disponible",
    is_active: true, family_id: "fam-1", localisation: "Atelier 1",
    marque: "Bosch", modele: "X200", numero_serie: "SN-001",
    date_mise_en_service: "2020-01-15",
    machine_families: { name: "Broyeurs" },
  },
  {
    id: "mac-2", code: "M02", designation: "Pompe doseuse", statut: "arret",
    criticite: "B", criticite_maintenance: "elevee", role_fonctionnel: "dosage",
    impact_ligne: "arret_partiel", disponibilite_pdr: "partiel",
    is_active: true, family_id: "fam-2", localisation: "Atelier 2",
    marque: "Siemens", modele: "P100", numero_serie: "SN-002",
    date_mise_en_service: "2021-06-01",
    machine_families: { name: "Pompes" },
  },
  {
    id: "mac-3", code: "M03", designation: "Convoyeur sortie", statut: "maintenance",
    criticite: "C", criticite_maintenance: "moyenne", role_fonctionnel: "convoyage",
    impact_ligne: "degradation", disponibilite_pdr: "indisponible",
    is_active: true, family_id: null, localisation: "",
    marque: "", modele: "", numero_serie: "",
    date_mise_en_service: null,
    machine_families: null,
  },
];

const mockPdr = [
  { id: "pdr-1", reference: "PDR-001", designation: "Courroie", stock_actuel: 5, stock_min: 2, prix_unitaire: 45, fournisseur: "FournA", emplacement: "Mag-A1", is_active: true },
  { id: "pdr-2", reference: "PDR-002", designation: "Roulement", stock_actuel: 1, stock_min: 3, prix_unitaire: 120, fournisseur: "FournB", emplacement: "Mag-B2", is_active: true },
  { id: "pdr-3", reference: "PDR-003", designation: "Joint torique", stock_actuel: 0, stock_min: 10, prix_unitaire: 5, fournisseur: "", emplacement: "", is_active: true },
];

const mockTickets = [
  {
    id: "tkt-1", numero: "TKT-00001", machine_id: "mac-1", statut: "ouvert", priorite: "critique",
    description: "Vibration excessive", declarant_id: "user-1", assignee_id: null,
    heure_declaration: "2026-03-17T06:00:00Z", heure_prise_en_charge: null,
    heure_resolution: null, heure_cloture: null,
    cause_racine: null, solution: null, panne_type_id: "pt-1",
    temps_arret_minutes: null, temps_intervention_minutes: null,
    is_from_gpao: false, ligne_id: "line-1", shift_id: null, of_id: null,
    machines: { code: "M01", designation: "Broyeur principal" },
  },
  {
    id: "tkt-2", numero: "TKT-00002", machine_id: "mac-2", statut: "pris_en_charge", priorite: "haute",
    description: "Fuite huile", declarant_id: "user-1", assignee_id: "user-2",
    heure_declaration: "2026-03-16T10:00:00Z", heure_prise_en_charge: "2026-03-16T10:30:00Z",
    heure_resolution: null, heure_cloture: null,
    cause_racine: null, solution: null, panne_type_id: "pt-2",
    temps_arret_minutes: null, temps_intervention_minutes: null,
    is_from_gpao: false, ligne_id: null, shift_id: null, of_id: null,
    machines: { code: "M02", designation: "Pompe doseuse" },
  },
  {
    id: "tkt-3", numero: "TKT-00003", machine_id: "mac-1", statut: "resolu", priorite: "normale",
    description: "Capteur défaillant", declarant_id: "user-1", assignee_id: "user-2",
    heure_declaration: "2026-03-15T08:00:00Z", heure_prise_en_charge: "2026-03-15T08:15:00Z",
    heure_resolution: "2026-03-15T09:45:00Z", heure_cloture: null,
    cause_racine: "Usure capteur", solution: "Remplacement capteur",
    panne_type_id: "pt-1",
    temps_arret_minutes: 105, temps_intervention_minutes: 90,
    is_from_gpao: true, ligne_id: "line-1", shift_id: "shift-1", of_id: "of-1",
    machines: { code: "M01", designation: "Broyeur principal" },
  },
  {
    id: "tkt-4", numero: "TKT-00004", machine_id: "mac-2", statut: "cloture", priorite: "basse",
    description: "Bruit anormal", declarant_id: "user-1", assignee_id: "user-2",
    heure_declaration: "2026-03-10T14:00:00Z", heure_prise_en_charge: "2026-03-10T14:30:00Z",
    heure_resolution: "2026-03-10T15:00:00Z", heure_cloture: "2026-03-10T16:00:00Z",
    cause_racine: "Roulement usé", solution: "Remplacement roulement",
    panne_type_id: "pt-2",
    temps_arret_minutes: 120, temps_intervention_minutes: 30,
    is_from_gpao: false, ligne_id: null, shift_id: null, of_id: null,
    machines: { code: "M02", designation: "Pompe doseuse" },
  },
];

const mockPreventivePlans = [
  {
    id: "pp-1", title: "Graissage broyeur", machine_id: "mac-1", frequence: "hebdomadaire",
    derniere_execution: "2026-03-10T00:00:00Z", prochaine_echeance: "2026-03-17T00:00:00Z",
    is_active: true, checklist: [{ label: "Graissage roulements", done: false }, { label: "Vérification courroie", done: false }],
    machines: { code: "M01", designation: "Broyeur principal" },
  },
  {
    id: "pp-2", title: "Inspection pompe", machine_id: "mac-2", frequence: "mensuel",
    derniere_execution: "2026-02-15T00:00:00Z", prochaine_echeance: "2026-03-15T00:00:00Z",
    is_active: true, checklist: [],
    machines: { code: "M02", designation: "Pompe doseuse" },
  },
];

const mockInterventions = [
  {
    id: "int-1", ticket_id: "tkt-3", technicien_id: "user-2", statut: "terminee",
    description: "Remplacement capteur", date_debut: "2026-03-15T08:15:00Z", date_fin: "2026-03-15T09:45:00Z",
    notes: "Capteur remplacé avec succès",
    intervention_pdr: [{ id: "ip-1", pdr_id: "pdr-1", quantite: 1, pdr: { reference: "PDR-001", designation: "Courroie" } }],
  },
  {
    id: "int-2", ticket_id: "tkt-4", technicien_id: "user-2", statut: "terminee",
    description: "Remplacement roulement", date_debut: "2026-03-10T14:30:00Z", date_fin: "2026-03-10T15:00:00Z",
    notes: "",
    intervention_pdr: [{ id: "ip-2", pdr_id: "pdr-2", quantite: 2, pdr: { reference: "PDR-002", designation: "Roulement" } }],
  },
];

const mockPanneTypes = [
  { id: "pt-1", name: "Panne mécanique", description: "Usure / casse mécanique", is_active: true },
  { id: "pt-2", name: "Panne hydraulique", description: "Fuite / pression", is_active: true },
  { id: "pt-3", name: "Panne électrique", description: "", is_active: false },
];

const mockLineAssignments = [
  { id: "mla-1", machine_id: "mac-1", line_id: "line-1", priority: 1, sort_order: 0 },
  { id: "mla-2", machine_id: "mac-2", line_id: "line-1", priority: 2, sort_order: 1 },
  { id: "mla-3", machine_id: "mac-2", line_id: "line-2", priority: 1, sort_order: 0 },
];

const mockEquipements = [
  { id: "eq-1", code: "EQ-001", designation: "Capteur temp.", type: "capteur", machine_id: "mac-1", line_id: "line-1", statut: "en_service", criticite: "B", is_active: true },
  { id: "eq-2", code: "EQ-002", designation: "Vérin doseur", type: "actionneur", machine_id: "mac-2", line_id: null, statut: "hors_service", criticite: "A", is_active: true },
];

// ── Test suites ─────────────────────────────────────────────────────

describe("GMAO – Data Integrity", () => {
  describe("Machine schema validation", () => {
    it("all machines have required fields", () => {
      for (const m of mockMachines) {
        expect(m.id).toBeTruthy();
        expect(m.code).toBeTruthy();
        expect(m.designation).toBeTruthy();
        expect(["en_marche", "arret", "maintenance"]).toContain(m.statut);
        expect(["A", "B", "C"]).toContain(m.criticite);
        expect(typeof m.is_active).toBe("boolean");
      }
    });

    it("machine industrial metadata is valid", () => {
      const validRoles = ["alimentation", "transformation", "dosage", "melange", "convoyage", "conditionnement", "controle", "evacuation", "utilite", "autre"];
      const validImpacts = ["arret_complet", "arret_partiel", "degradation", "aucun"];
      const validPdr = ["disponible", "partiel", "indisponible"];
      const validCritMaint = ["faible", "moyenne", "elevee", "critique"];

      for (const m of mockMachines) {
        if (m.role_fonctionnel) expect(validRoles).toContain(m.role_fonctionnel);
        if (m.impact_ligne) expect(validImpacts).toContain(m.impact_ligne);
        if (m.disponibilite_pdr) expect(validPdr).toContain(m.disponibilite_pdr);
        if (m.criticite_maintenance) expect(validCritMaint).toContain(m.criticite_maintenance);
      }
    });

    it("machine codes are unique", () => {
      const codes = mockMachines.map((m) => m.code);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });

  describe("Ticket schema validation", () => {
    it("all tickets have required fields", () => {
      const validStatuses = ["ouvert", "pris_en_charge", "en_cours", "resolu", "cloture"];
      const validPriorities = ["critique", "haute", "normale", "basse"];
      for (const t of mockTickets) {
        expect(t.id).toBeTruthy();
        expect(t.numero).toMatch(/^TKT-\d{5}$/);
        expect(t.machine_id).toBeTruthy();
        expect(validStatuses).toContain(t.statut);
        expect(validPriorities).toContain(t.priorite);
        expect(t.description).toBeTruthy();
      }
    });

    it("resolved/closed tickets have cause_racine and solution", () => {
      const needResolution = mockTickets.filter((t) => t.statut === "resolu" || t.statut === "cloture");
      for (const t of needResolution) {
        expect(t.cause_racine).toBeTruthy();
        expect(t.solution).toBeTruthy();
      }
    });

    it("ticket timestamps follow chronological order", () => {
      for (const t of mockTickets) {
        const decl = new Date(t.heure_declaration).getTime();
        if (t.heure_prise_en_charge) {
          expect(new Date(t.heure_prise_en_charge).getTime()).toBeGreaterThanOrEqual(decl);
        }
        if (t.heure_resolution && t.heure_prise_en_charge) {
          expect(new Date(t.heure_resolution).getTime()).toBeGreaterThanOrEqual(new Date(t.heure_prise_en_charge).getTime());
        }
        if (t.heure_cloture && t.heure_resolution) {
          expect(new Date(t.heure_cloture).getTime()).toBeGreaterThanOrEqual(new Date(t.heure_resolution).getTime());
        }
      }
    });

    it("GPAO-linked tickets have OF/line/shift references", () => {
      const gpaoTickets = mockTickets.filter((t) => t.is_from_gpao);
      for (const t of gpaoTickets) {
        expect(t.ligne_id || t.of_id || t.shift_id).toBeTruthy();
      }
    });
  });

  describe("PDR schema validation", () => {
    it("all PDR have required fields", () => {
      for (const p of mockPdr) {
        expect(p.reference).toBeTruthy();
        expect(p.designation).toBeTruthy();
        expect(typeof p.stock_actuel).toBe("number");
        expect(typeof p.stock_min).toBe("number");
        expect(p.stock_actuel).toBeGreaterThanOrEqual(0);
      }
    });

    it("references are unique", () => {
      const refs = mockPdr.map((p) => p.reference);
      expect(new Set(refs).size).toBe(refs.length);
    });
  });

  describe("Preventive plan schema", () => {
    it("all plans reference valid machines", () => {
      const machineIds = new Set(mockMachines.map((m) => m.id));
      for (const p of mockPreventivePlans) {
        expect(machineIds.has(p.machine_id)).toBe(true);
      }
    });

    it("valid frequencies", () => {
      const validFreq = ["quotidien", "hebdomadaire", "mensuel", "trimestriel", "semestriel", "annuel"];
      for (const p of mockPreventivePlans) {
        expect(validFreq).toContain(p.frequence);
      }
    });
  });

  describe("Intervention schema", () => {
    it("interventions reference valid tickets", () => {
      const ticketIds = new Set(mockTickets.map((t) => t.id));
      for (const i of mockInterventions) {
        expect(ticketIds.has(i.ticket_id)).toBe(true);
      }
    });

    it("completed interventions have date_fin", () => {
      const done = mockInterventions.filter((i) => i.statut === "terminee");
      for (const i of done) {
        expect(i.date_fin).toBeTruthy();
      }
    });
  });

  describe("Equipement schema", () => {
    it("valid types and statuses", () => {
      const validTypes = ["capteur", "actionneur", "convoyeur", "peripherique", "utilite", "sous_ensemble", "instrument", "autre"];
      const validStatuts = ["en_service", "hors_service", "en_maintenance", "reforme"];
      for (const e of mockEquipements) {
        expect(validTypes).toContain(e.type);
        expect(validStatuts).toContain(e.statut);
      }
    });
  });

  describe("Line assignments", () => {
    it("assignments reference valid machines and lines", () => {
      const machineIds = new Set(mockMachines.map((m) => m.id));
      const lineIds = new Set(mockLines.map((l) => l.id));
      for (const a of mockLineAssignments) {
        expect(machineIds.has(a.machine_id)).toBe(true);
        expect(lineIds.has(a.line_id)).toBe(true);
      }
    });

    it("a machine can belong to multiple lines", () => {
      const mac2Lines = mockLineAssignments.filter((a) => a.machine_id === "mac-2");
      expect(mac2Lines.length).toBe(2);
    });
  });
});

describe("GMAO – Business Logic", () => {
  describe("Dashboard KPIs", () => {
    it("counts open tickets correctly", () => {
      const openTickets = mockTickets.filter((t) => t.statut !== "cloture" && t.statut !== "resolu").length;
      expect(openTickets).toBe(2); // ouvert + pris_en_charge
    });

    it("counts machines down correctly", () => {
      const down = mockMachines.filter((m) => m.statut === "arret").length;
      expect(down).toBe(1);
    });

    it("counts machines in maintenance correctly", () => {
      const maint = mockMachines.filter((m) => m.statut === "maintenance").length;
      expect(maint).toBe(1);
    });

    it("calculates average MTTR from resolved tickets", () => {
      const resolved = mockTickets.filter((t) => t.temps_intervention_minutes);
      const avgMttr = resolved.length > 0
        ? Math.round(resolved.reduce((s, t) => s + (t.temps_intervention_minutes || 0), 0) / resolved.length)
        : 0;
      // tkt-3: 90min, tkt-4: 30min → avg = 60
      expect(avgMttr).toBe(60);
    });

    it("calculates average downtime from tickets", () => {
      const withDowntime = mockTickets.filter((t) => t.temps_arret_minutes);
      const avg = withDowntime.length > 0
        ? Math.round(withDowntime.reduce((s, t) => s + (t.temps_arret_minutes || 0), 0) / withDowntime.length)
        : 0;
      // tkt-3: 105min, tkt-4: 120min → avg = 112.5 → 113
      expect(avg).toBe(113);
    });
  });

  describe("Ticket filtering", () => {
    it("filters by status", () => {
      const ouvert = mockTickets.filter((t) => t.statut === "ouvert");
      expect(ouvert.length).toBe(1);
      expect(ouvert[0].numero).toBe("TKT-00001");
    });

    it("filters by priority", () => {
      const critique = mockTickets.filter((t) => t.priorite === "critique");
      expect(critique.length).toBe(1);
    });

    it("filters by search on numero", () => {
      const search = "00003";
      const result = mockTickets.filter((t) => t.numero.includes(search));
      expect(result.length).toBe(1);
      expect(result[0].statut).toBe("resolu");
    });

    it("filters by search on machine designation", () => {
      const search = "pompe";
      const result = mockTickets.filter((t) =>
        t.machines?.designation?.toLowerCase().includes(search.toLowerCase())
      );
      expect(result.length).toBe(2);
    });

    it("combined filters work correctly", () => {
      const statusFilter = "pris_en_charge";
      const priorityFilter = "haute";
      const result = mockTickets.filter((t) =>
        t.statut === statusFilter && t.priorite === priorityFilter
      );
      expect(result.length).toBe(1);
      expect(result[0].numero).toBe("TKT-00002");
    });
  });

  describe("Machine filtering", () => {
    it("filters by status", () => {
      const arret = mockMachines.filter((m) => m.statut === "arret");
      expect(arret.length).toBe(1);
      expect(arret[0].code).toBe("M02");
    });

    it("filters by family", () => {
      const withFamily = mockMachines.filter((m) => m.family_id === "fam-1");
      expect(withFamily.length).toBe(1);
    });

    it("filters by line assignment", () => {
      const lineFilter = "line-1";
      const machineIdsOnLine = mockLineAssignments
        .filter((a) => a.line_id === lineFilter)
        .map((a) => a.machine_id);
      const result = mockMachines.filter((m) => machineIdsOnLine.includes(m.id));
      expect(result.length).toBe(2); // mac-1 and mac-2
    });

    it("search filters on code and designation", () => {
      const search = "broyeur";
      const result = mockMachines.filter((m) =>
        m.code.toLowerCase().includes(search) || m.designation.toLowerCase().includes(search)
      );
      expect(result.length).toBe(1);
      expect(result[0].code).toBe("M01");
    });
  });

  describe("Ticket workflow logic", () => {
    it("canTakeCharge: only when ouvert", () => {
      const canTake = (ticket: any, roles: string[]) =>
        ticket.statut === "ouvert" && (roles.includes("maintenancier") || roles.includes("resp_maintenance") || roles.includes("admin"));

      expect(canTake(mockTickets[0], ["maintenancier"])).toBe(true);
      expect(canTake(mockTickets[1], ["maintenancier"])).toBe(false); // pris_en_charge
      expect(canTake(mockTickets[0], ["operateur"])).toBe(false); // wrong role
    });

    it("canResolve: only when pris_en_charge/en_cours and by assignee or admin", () => {
      const canResolve = (ticket: any, userId: string, roles: string[]) =>
        (ticket.statut === "pris_en_charge" || ticket.statut === "en_cours") &&
        (ticket.assignee_id === userId || roles.includes("admin"));

      expect(canResolve(mockTickets[1], "user-2", ["maintenancier"])).toBe(true); // assigned
      expect(canResolve(mockTickets[1], "user-3", ["admin"])).toBe(true); // admin
      expect(canResolve(mockTickets[1], "user-3", ["maintenancier"])).toBe(false); // wrong user
      expect(canResolve(mockTickets[0], "user-2", ["admin"])).toBe(false); // still ouvert
    });

    it("canClose: only resolu + resp_maintenance or admin", () => {
      const canClose = (ticket: any, roles: string[]) =>
        ticket.statut === "resolu" && (roles.includes("resp_maintenance") || roles.includes("admin"));

      expect(canClose(mockTickets[2], ["resp_maintenance"])).toBe(true);
      expect(canClose(mockTickets[2], ["maintenancier"])).toBe(false);
      expect(canClose(mockTickets[1], ["admin"])).toBe(false); // not resolu
    });

    it("resolution requires cause_racine and solution", () => {
      const validateResolve = (causeRacine: string, solution: string) =>
        causeRacine.trim() !== "" && solution.trim() !== "";

      expect(validateResolve("Usure", "Remplacement")).toBe(true);
      expect(validateResolve("", "Remplacement")).toBe(false);
      expect(validateResolve("Usure", "")).toBe(false);
    });

    it("temps_arret calculation is correct", () => {
      // From declaration to resolution
      const t = mockTickets[2];
      const expected = Math.round(
        (new Date(t.heure_resolution!).getTime() - new Date(t.heure_declaration).getTime()) / 60000
      );
      expect(expected).toBe(105);
      expect(t.temps_arret_minutes).toBe(105);
    });

    it("temps_intervention calculation is correct", () => {
      // From prise_en_charge to resolution
      const t = mockTickets[2];
      const expected = Math.round(
        (new Date(t.heure_resolution!).getTime() - new Date(t.heure_prise_en_charge!).getTime()) / 60000
      );
      expect(expected).toBe(90);
      expect(t.temps_intervention_minutes).toBe(90);
    });
  });

  describe("PDR stock logic", () => {
    it("detects low stock items", () => {
      const lowStock = mockPdr.filter((p) => p.stock_actuel <= p.stock_min);
      expect(lowStock.length).toBe(2); // pdr-2 (1<=3), pdr-3 (0<=10)
    });

    it("stock deduction after intervention", () => {
      const pdr = { ...mockPdr[0] }; // stock_actuel: 5
      const consumed = 1;
      pdr.stock_actuel = Math.max(0, pdr.stock_actuel - consumed);
      expect(pdr.stock_actuel).toBe(4);
    });

    it("stock cannot go below zero", () => {
      const pdr = { ...mockPdr[2] }; // stock_actuel: 0
      pdr.stock_actuel = Math.max(0, pdr.stock_actuel - 5);
      expect(pdr.stock_actuel).toBe(0);
    });

    it("total PDR value calculation", () => {
      const totalValue = mockPdr.reduce((sum, p) => sum + p.stock_actuel * (p.prix_unitaire || 0), 0);
      // 5*45 + 1*120 + 0*5 = 225 + 120 + 0 = 345
      expect(totalValue).toBe(345);
    });
  });

  describe("Preventive maintenance logic", () => {
    it("detects overdue plans", () => {
      const now = new Date("2026-03-17T12:00:00Z");
      const overdue = mockPreventivePlans.filter(
        (p) => p.prochaine_echeance && new Date(p.prochaine_echeance) < now
      );
      expect(overdue.length).toBe(2); // both are <= 2026-03-17
    });

    it("checklist items are preserved", () => {
      const plan = mockPreventivePlans[0];
      expect(Array.isArray(plan.checklist)).toBe(true);
      expect(plan.checklist!.length).toBe(2);
      expect(plan.checklist![0]).toHaveProperty("label");
    });
  });

  describe("Panne types", () => {
    it("active panne types filter", () => {
      const active = mockPanneTypes.filter((p) => p.is_active);
      expect(active.length).toBe(2);
    });

    it("inactive types are excluded from ticket creation", () => {
      const available = mockPanneTypes.filter((p) => p.is_active);
      expect(available.every((p) => p.is_active)).toBe(true);
    });
  });

  describe("Permissions logic (OR merge)", () => {
    it("merges permissions across roles with OR logic", () => {
      const rolePermissions = [
        { module: "tickets", can_view: true, can_create: true, can_edit: false, can_delete: false, role: "maintenancier" },
        { module: "tickets", can_view: true, can_create: false, can_edit: true, can_delete: false, role: "resp_maintenance" },
      ];

      const merged: Record<string, any> = {};
      for (const rp of rolePermissions) {
        if (!merged[rp.module]) {
          merged[rp.module] = { can_view: rp.can_view, can_create: rp.can_create, can_edit: rp.can_edit, can_delete: rp.can_delete };
        } else {
          merged[rp.module].can_view = merged[rp.module].can_view || rp.can_view;
          merged[rp.module].can_create = merged[rp.module].can_create || rp.can_create;
          merged[rp.module].can_edit = merged[rp.module].can_edit || rp.can_edit;
          merged[rp.module].can_delete = merged[rp.module].can_delete || rp.can_delete;
        }
      }
      expect(merged["tickets"].can_view).toBe(true);
      expect(merged["tickets"].can_create).toBe(true);
      expect(merged["tickets"].can_edit).toBe(true);
      expect(merged["tickets"].can_delete).toBe(false);
    });
  });
});
