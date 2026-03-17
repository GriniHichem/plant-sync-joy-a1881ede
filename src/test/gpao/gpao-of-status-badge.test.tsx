import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfStatusBadge } from "@/pages/gpao/GpaoDashboard";

// Mock supabase (needed because GpaoDashboard imports it)
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: [], error: null }),
    }),
  },
}));

describe("OfStatusBadge", () => {
  it("renders planifie correctly", () => {
    render(<OfStatusBadge value="planifie" />);
    expect(screen.getByText("Planifié")).toBeInTheDocument();
  });

  it("renders en_cours correctly", () => {
    render(<OfStatusBadge value="en_cours" />);
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("renders termine correctly", () => {
    render(<OfStatusBadge value="termine" />);
    expect(screen.getByText("Terminé")).toBeInTheDocument();
  });

  it("renders annule correctly", () => {
    render(<OfStatusBadge value="annule" />);
    expect(screen.getByText("Annulé")).toBeInTheDocument();
  });

  it("renders unknown status as-is", () => {
    render(<OfStatusBadge value="unknown_status" />);
    expect(screen.getByText("unknown_status")).toBeInTheDocument();
  });
});
