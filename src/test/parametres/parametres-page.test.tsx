import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Parametres from "@/pages/Parametres";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("Parametres — Page d'accueil", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <Parametres />
      </MemoryRouter>
    );
  }

  it("affiche le titre et la description", () => {
    renderPage();
    expect(screen.getByText("Paramètres")).toBeInTheDocument();
    expect(screen.getByText("Administration et référentiels")).toBeInTheDocument();
  });

  const coreSections = [
    { title: "Utilisateurs", description: "Gérer les comptes et rôles", url: "/parametres/users" },
    { title: "Matrice des rôles", description: "Permissions détaillées par rôle", url: "/parametres/roles" },
    { title: "Familles machines", description: "Catégories et sous-familles", url: "/parametres/familles" },
    { title: "Types de panne", description: "Référentiel des types de panne", url: "/parametres/pannes" },
    { title: "Lignes de production", description: "Gérer les lignes et ateliers", url: "/parametres/lignes" },
    { title: "Shifts & Rotations", description: "Équipes, membres, autorisations, modèles, plannings, modes & règles", url: "/parametres/shifts" },
    { title: "Général", description: "Paramètres de l'application", url: "/parametres/general" },
  ];

  it("affiche toutes les sections de configuration attendues", () => {
    renderPage();
    coreSections.forEach((s) => {
      expect(screen.getByText(s.title)).toBeInTheDocument();
      expect(screen.getByText(s.description)).toBeInTheDocument();
    });
  });

  coreSections.forEach((section) => {
    it(`navigue vers ${section.url} au clic sur "${section.title}"`, () => {
      renderPage();
      fireEvent.click(screen.getByText(section.title));
      expect(mockNavigate).toHaveBeenCalledWith(section.url);
    });
  });

  it("chaque carte a une icône visible", () => {
    const { container } = renderPage();
    const iconContainers = container.querySelectorAll(".bg-primary\\/10");
    // 13 sections across 4 groups
    expect(iconContainers.length).toBeGreaterThanOrEqual(7);
    iconContainers.forEach((el) => {
      expect(el.querySelector("svg")).toBeTruthy();
    });
  });

  it("utilise un grid responsive (1 col mobile, 2 col md+)", () => {
    const { container } = renderPage();
    const grid = container.querySelector(".grid");
    expect(grid).toBeTruthy();
    expect(grid?.classList.contains("grid-cols-1")).toBe(true);
    expect(grid?.classList.contains("md:grid-cols-2")).toBe(true);
  });

  it("affiche les 4 groupes de paramètres", () => {
    renderPage();
    expect(screen.getByText("Sécurité & Accès")).toBeInTheDocument();
    expect(screen.getByText("Référentiels & Classification")).toBeInTheDocument();
    expect(screen.getByText("Production & Organisation")).toBeInTheDocument();
    expect(screen.getByText("Configuration générale")).toBeInTheDocument();
  });
});
