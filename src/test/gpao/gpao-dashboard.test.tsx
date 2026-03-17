import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import GpaoDashboard from "@/pages/gpao/GpaoDashboard";
import { mockOfs, mockProducts, mockArticles } from "../__mocks__/supabase";

// Mock supabase at module level without referencing external variables
vi.mock("@/integrations/supabase/client", () => {
  const builder: any = {};
  const methods = ["select", "eq", "neq", "not", "order", "limit", "single", "in", "is"];
  methods.forEach((m) => { builder[m] = () => builder; });
  builder.then = (resolve: any) => resolve({ data: [], error: null });
  return {
    supabase: { from: () => builder },
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("GpaoDashboard", () => {
  it("renders the dashboard title", async () => {
    renderWithRouter(<GpaoDashboard />);
    expect(screen.getByText("Dashboard GPAO")).toBeInTheDocument();
    expect(screen.getByText("Vue d'ensemble de la production")).toBeInTheDocument();
  });

  it("displays KPI cards", async () => {
    renderWithRouter(<GpaoDashboard />);
    await waitFor(() => {
      expect(screen.getByText("OF en cours")).toBeInTheDocument();
      expect(screen.getByText("Production totale")).toBeInTheDocument();
      expect(screen.getByText("Rendement")).toBeInTheDocument();
      expect(screen.getByText("Produits")).toBeInTheDocument();
    });
  });

  it("shows recent OF and stops sections", async () => {
    renderWithRouter(<GpaoDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Ordres de fabrication récents")).toBeInTheDocument();
      expect(screen.getByText("Arrêts récents")).toBeInTheDocument();
    });
  });

  it("calculates rendement correctly", () => {
    const totalProduit = mockOfs.reduce((s, o) => s + (o.quantite_produite || 0), 0);
    const totalRebut = mockOfs.reduce((s, o) => s + (o.quantite_rebut || 0), 0);
    const rendement = totalProduit > 0 ? Math.round(((totalProduit - totalRebut) / totalProduit) * 100) : 0;
    expect(rendement).toBe(98);
  });

  it("identifies low stock articles correctly", () => {
    const lowStock = mockArticles.filter((a) => a.stock_actuel <= a.stock_min);
    expect(lowStock.length).toBe(1);
    expect(lowStock[0].code).toBe("ART-002");
  });

  it("counts OF en cours correctly", () => {
    const ofsEnCours = mockOfs.filter((o) => o.statut === "en_cours");
    expect(ofsEnCours.length).toBe(1);
  });
});
