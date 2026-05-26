import { describe, expect, it } from "vitest";
import { parseManual, searchManual } from "@/manual/parseManual";
import { getManualSectionForRoute } from "@/manual/manualRouteMap";

const SAMPLE = `# Title

## Table des matières

ignored

## 1. Présentation & architecture

Intro paragraph.

### 1.1 Sous section

Du contenu **important**.

## 3. Module GMAO — Maintenance

### 3.2 Machines

Gestion des machines. Code unique.

### 3.6 Tickets de maintenance

Création de tickets.

## 6 bis. Notifications & Emails

### 6 bis.2 Configuration SMTP (\`/parametres/smtp\`)

Réglages serveur.
`;

describe("parseManual", () => {
  it("ignores TOC and parses chapters + sections", () => {
    const { sections, toc } = parseManual(SAMPLE);
    const numbers = sections.map((s) => s.number);
    expect(numbers).toContain("1");
    expect(numbers).toContain("1.1");
    expect(numbers).toContain("3.2");
    expect(numbers).toContain("6 bis");
    expect(numbers).toContain("6 bis.2");
    // No table of contents
    expect(sections.find((s) => /table des mati/i.test(s.title))).toBeUndefined();
    // Slugs are stable
    const machines = sections.find((s) => s.number === "3.2");
    expect(machines?.id).toBe("3-2-machines");
    // TOC chapters
    expect(toc.chapters.length).toBeGreaterThanOrEqual(3);
    const gmao = toc.chapters.find((c) => c.number === "3");
    expect(gmao?.sections.map((s) => s.number)).toEqual(["3.2", "3.6"]);
  });

  it("renders html safely (no script tags)", () => {
    const { sections } = parseManual(SAMPLE + "\n<script>alert(1)</script>\n");
    const all = sections.map((s) => s.html).join("\n");
    expect(all.toLowerCase()).not.toContain("<script");
  });
});

describe("searchManual", () => {
  it("matches accent-insensitive and scores titles higher", () => {
    const { sections } = parseManual(SAMPLE);
    const res = searchManual(sections, "machines");
    expect(res[0]?.section.title).toBe("Machines");
    // accent insensitive: query without accent should match "Présentation"
    const res3 = searchManual(sections, "presentation");
    expect(res3.length).toBeGreaterThan(0);
    expect(res3[0]?.section.title.toLowerCase()).toContain("présentation");
  });

  it("ignores short queries", () => {
    const { sections } = parseManual(SAMPLE);
    expect(searchManual(sections, "a")).toEqual([]);
  });
});

describe("getManualSectionForRoute", () => {
  it("maps frequent routes", () => {
    expect(getManualSectionForRoute("/machines")).toBe("3-2-machines");
    expect(getManualSectionForRoute("/machines/abc-123")).toBe("3-2-machines");
    expect(getManualSectionForRoute("/gpao/of/42")).toBe("4-2-ordres-de-fabrication-of");
    expect(getManualSectionForRoute("/parametres/smtp")).toBe(
      "6-bis-2-configuration-smtp-parametres-smtp",
    );
  });

  it("returns null when no match", () => {
    expect(getManualSectionForRoute("/totally/unknown/path")).toBeNull();
  });
});

describe("MANUAL.md ↔ routeMap coherence", () => {
  it("every section targeted by the route map exists in MANUAL.md", async () => {
    const raw = (await import("../../../MANUAL.md?raw")).default as string;
    const { sections } = parseManual(raw);
    const ids = new Set(sections.map((s) => s.id));
    const targets = [
      "1-presentation-architecture",
      "2-authentification-securite",
      "3-1-dashboard",
      "3-2-machines",
      "3-5-pieces-de-rechange-pdr",
      "3-6-tickets-de-maintenance",
      "3-8-shift-maintenance",
      "4-2-ordres-de-fabrication-of",
      "4-5-recettes-unifiees-avec-la-nomenclature-bom-qualite",
      "4-6-shift-production",
      "4-9-module-qualite",
      "6-administration-parametres",
      "6-1-securite-acces",
      "6-bis-2-configuration-smtp-parametres-smtp",
      "9-roles-permissions",
      "9-5-permissions-stock-pdr-speciales",
    ];
    for (const t of targets) expect(ids.has(t), `missing section ${t}`).toBe(true);
  });
});
