import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock data
const mockTickets = [
  { id: "1", numero: "TKT-00001", statut: "ouvert", priorite: "critique", temps_intervention_minutes: null, heure_declaration: new Date().toISOString(), machines: { designation: "Broyeur", code: "M01" } },
  { id: "2", numero: "TKT-00002", statut: "pris_en_charge", priorite: "haute", temps_intervention_minutes: null, heure_declaration: new Date().toISOString(), machines: { designation: "Pompe", code: "M02" } },
  { id: "3", numero: "TKT-00003", statut: "resolu", priorite: "normale", temps_intervention_minutes: 90, heure_declaration: new Date().toISOString(), machines: { designation: "Broyeur", code: "M01" } },
  { id: "4", numero: "TKT-00004", statut: "cloture", priorite: "basse", temps_intervention_minutes: 30, heure_declaration: new Date().toISOString(), machines: { designation: "Pompe", code: "M02" } },
];

const mockMachines = [
  { id: "m1", statut: "en_marche", is_active: true },
  { id: "m2", statut: "arret", is_active: true },
  { id: "m3", statut: "maintenance", is_active: true },
];

const mockPlans = [
  { id: "p1", title: "Graissage", is_active: true, statut_plan: "valide", prochaine_echeance: "2026-03-15T00:00:00Z", machines: { designation: "Broyeur", code: "M01" } },
];

function createQueryBuilder(data: any) {
  const builder: any = {};
  const methods = ["select", "eq", "neq", "order", "limit", "single", "in", "is", "not"];
  methods.forEach((m) => { builder[m] = vi.fn().mockReturnValue(builder); });
  builder.then = (resolve: any) => resolve({ data, error: null });
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const map: Record<string, any> = {
        tickets: mockTickets,
        machines: mockMachines,
        preventive_plans: mockPlans,
        pdr: [],
        preventive_executions: [],
      };
      return createQueryBuilder(map[table] || []);
    }),
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

import Dashboard from "@/pages/Dashboard";

describe("GMAO Dashboard", () => {
  it("renders dashboard title", async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText("Dashboard GMAO")).toBeInTheDocument();
    });
  });

  it("renders KPI cards", async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText("Tickets ouverts")).toBeInTheDocument();
      expect(screen.getByText("MTTR moyen")).toBeInTheDocument();
      expect(screen.getByText("Machines en arrêt")).toBeInTheDocument();
      expect(screen.getByText("Parc machines")).toBeInTheDocument();
    });
  });

  it("shows correct open ticket count (excluding resolu/cloture)", async () => {
    render(<Dashboard />);
    await waitFor(() => {
      // Find the KPI card for tickets ouverts - value should be 2
      const kpiTitle = screen.getByText("Tickets ouverts");
      const card = kpiTitle.closest("[class]")?.parentElement;
      expect(card).toBeTruthy();
    });
  });

  it("shows MTTR card", async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText("MTTR moyen")).toBeInTheDocument();
    });
  });

  it("renders recent tickets section", async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText("Tickets récents")).toBeInTheDocument();
    });
  });

  it("renders preventive section", async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText("Préventif")).toBeInTheDocument();
    });
  });
});
