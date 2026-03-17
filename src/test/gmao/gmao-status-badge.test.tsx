import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/gmao/StatusBadge";

describe("StatusBadge – Ticket statuses", () => {
  const ticketStatuses = [
    { value: "ouvert", label: "Ouvert" },
    { value: "pris_en_charge", label: "Pris en charge" },
    { value: "en_cours", label: "En cours" },
    { value: "resolu", label: "Résolu" },
    { value: "cloture", label: "Clôturé" },
  ];

  ticketStatuses.forEach(({ value, label }) => {
    it(`renders ticket status "${value}" with label "${label}"`, () => {
      render(<StatusBadge type="ticket" value={value} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("renders pulse dot for en_cours status", () => {
    const { container } = render(<StatusBadge type="ticket" value="en_cours" />);
    expect(container.querySelector(".animate-pulse-dot")).toBeInTheDocument();
  });

  it("does not render pulse dot for other statuses", () => {
    const { container } = render(<StatusBadge type="ticket" value="ouvert" />);
    expect(container.querySelector(".animate-pulse-dot")).toBeNull();
  });

  it("renders fallback badge for unknown status", () => {
    render(<StatusBadge type="ticket" value="unknown_status" />);
    expect(screen.getByText("unknown_status")).toBeInTheDocument();
  });
});

describe("StatusBadge – Machine statuses", () => {
  const machineStatuses = [
    { value: "en_marche", label: "En marche" },
    { value: "arret", label: "Arrêt" },
    { value: "maintenance", label: "Maintenance" },
  ];

  machineStatuses.forEach(({ value, label }) => {
    it(`renders machine status "${value}" with label "${label}"`, () => {
      render(<StatusBadge type="machine" value={value} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});

describe("StatusBadge – Priorities", () => {
  const priorities = [
    { value: "critique", label: "Critique" },
    { value: "haute", label: "Haute" },
    { value: "normale", label: "Normale" },
    { value: "basse", label: "Basse" },
  ];

  priorities.forEach(({ value, label }) => {
    it(`renders priority "${value}" with label "${label}"`, () => {
      render(<StatusBadge type="priority" value={value} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});

describe("StatusBadge – Criticité", () => {
  ["A", "B", "C"].forEach((value) => {
    it(`renders criticité "${value}"`, () => {
      render(<StatusBadge type="criticite" value={value} />);
      expect(screen.getByText(value)).toBeInTheDocument();
    });
  });
});

describe("StatusBadge – Custom className", () => {
  it("applies custom className", () => {
    const { container } = render(<StatusBadge type="ticket" value="ouvert" className="my-custom-class" />);
    expect(container.querySelector(".my-custom-class")).toBeInTheDocument();
  });
});
