import { describe, it, expect } from "vitest";
import {
  buildNcInsertPayload,
  validateNcForm,
  emptyNcForm,
  buildBlockLotRpcArgs,
  buildClosurePayload,
  filterNc,
  emptyNcFilters,
  ncSeverityMeta,
  type NcRow,
} from "@/pages/qualite/QualiteNonConformites";

describe("NC – form validation", () => {
  it("requires title", () => {
    const f = emptyNcForm();
    expect(validateNcForm(f)).toBe("Titre obligatoire");
  });
  it("passes when title/type/severity present", () => {
    const f = { ...emptyNcForm(), title: "Étiquette manquante" };
    expect(validateNcForm(f)).toBeNull();
  });
});

describe("NC – insert payload", () => {
  it("builds payload for OF-linked NC with nullable fields", () => {
    const f = { ...emptyNcForm(), of_id: "of-1", title: "T", nc_type: "produit_fini", severity: "major" };
    const p = buildNcInsertPayload(f, "user-1", "declared");
    expect(p.of_id).toBe("of-1");
    expect(p.declared_by).toBe("user-1");
    expect(p.status).toBe("declared");
    expect(p.packaging_article_id).toBeNull();
    expect(p.statut).toBeUndefined();
  });
  it("builds packaging NC without of_id but with packaging_article_id", () => {
    const f = { ...emptyNcForm(), packaging_article_id: "pkg-1", title: "Carton humide", nc_type: "emballage" };
    const p = buildNcInsertPayload(f, "u", "draft");
    expect(p.of_id).toBeNull();
    expect(p.packaging_article_id).toBe("pkg-1");
    expect(p.nc_type).toBe("emballage");
    expect(p.status).toBe("draft");
  });
  it("parses decimal quantities (comma & dot)", () => {
    const f = { ...emptyNcForm(), title: "T", detected_quantity: "1,5", affected_quantity: "2.25" };
    const p = buildNcInsertPayload(f, "u", "declared");
    expect(p.detected_quantity).toBe(1.5);
    expect(p.affected_quantity).toBe(2.25);
  });
});

describe("NC – bloquer_lot decision", () => {
  it("returns RPC args only when bloquer_lot + of_id + opt-in", () => {
    expect(buildBlockLotRpcArgs("bloquer_lot", "of-1", "raison", true))
      .toEqual({ p_of_id: "of-1", p_status: "bloque", p_reason: "raison" });
  });
  it("returns null for any other decision", () => {
    expect(buildBlockLotRpcArgs("liberer", "of-1", "x", true)).toBeNull();
    expect(buildBlockLotRpcArgs("rebuter", "of-1", "x", true)).toBeNull();
  });
  it("returns null without of_id or when user opts out", () => {
    expect(buildBlockLotRpcArgs("bloquer_lot", null, "x", true)).toBeNull();
    expect(buildBlockLotRpcArgs("bloquer_lot", "of-1", "x", false)).toBeNull();
  });
  it("never includes production statut", () => {
    const args = buildBlockLotRpcArgs("bloquer_lot", "of-1", "x", true)!;
    expect(Object.keys(args)).not.toContain("statut");
    expect(args.p_status).toBe("bloque");
  });
});

describe("NC – closure", () => {
  it("requires comment", () => {
    expect(buildClosurePayload("", "u")).toBe("Commentaire de clôture obligatoire");
    expect(buildClosurePayload("   ", "u")).toBe("Commentaire de clôture obligatoire");
  });
  it("returns closed payload when valid", () => {
    const p = buildClosurePayload("ok", "u-1") as Record<string, any>;
    expect(p.status).toBe("closed");
    expect(p.closure_comment).toBe("ok");
    expect(p.closed_by).toBe("u-1");
    expect(typeof p.closed_at).toBe("string");
    expect(p.statut).toBeUndefined();
  });
});

describe("NC – filters", () => {
  const rows: NcRow[] = [
    { id: "1", nc_number: "NC-00001", detected_at: "2026-04-01T10:00:00Z", declared_by: null, of_id: "of-1", quality_check_id: null, product_id: null, production_line_id: null, shift_id: null, team_id: null, article_id: null, packaging_article_id: null, batch_number: null, lot_number: null, nc_type: "produit_fini", nc_category: null, severity: "major", status: "declared", title: "Carton humide", description: null, detected_quantity: null, affected_quantity: null, unit: null, immediate_action: null, decision: null, decision_at: null, decision_by: null, closure_comment: null, closed_at: null, closed_by: null },
    { id: "2", nc_number: "NC-00002", detected_at: "2026-04-15T10:00:00Z", declared_by: null, of_id: null, quality_check_id: null, product_id: null, production_line_id: null, shift_id: null, team_id: null, article_id: null, packaging_article_id: "p", batch_number: "B1", lot_number: null, nc_type: "emballage", nc_category: null, severity: "critical", status: "closed", title: "Étiquette absente", description: null, detected_quantity: null, affected_quantity: null, unit: null, immediate_action: null, decision: "rebuter", decision_at: null, decision_by: null, closure_comment: "ok", closed_at: null, closed_by: null },
  ];
  const ctx = { ofLabel: () => "OF-1" };

  it("filters by type", () => {
    expect(filterNc(rows, { ...emptyNcFilters(), type: "emballage" }, ctx)).toHaveLength(1);
  });
  it("filters by severity", () => {
    expect(filterNc(rows, { ...emptyNcFilters(), severity: "major" }, ctx)).toHaveLength(1);
  });
  it("filters by status", () => {
    expect(filterNc(rows, { ...emptyNcFilters(), status: "closed" }, ctx)).toHaveLength(1);
  });
  it("filters by date range", () => {
    expect(filterNc(rows, { ...emptyNcFilters(), dateFrom: "2026-04-10" }, ctx)).toHaveLength(1);
  });
  it("text search matches NC number, title, batch", () => {
    expect(filterNc(rows, { ...emptyNcFilters(), q: "00001" }, ctx)).toHaveLength(1);
    expect(filterNc(rows, { ...emptyNcFilters(), q: "humide" }, ctx)).toHaveLength(1);
    expect(filterNc(rows, { ...emptyNcFilters(), q: "B1" }, ctx)).toHaveLength(1);
  });
});

describe("NC – severity → audit mapping", () => {
  it("maps each severity to audit level", () => {
    expect(ncSeverityMeta("minor").audit).toBe("info");
    expect(ncSeverityMeta("major").audit).toBe("low");
    expect(ncSeverityMeta("critical").audit).toBe("high");
  });
});

describe("NC – pre-fill from out-of-tolerance check", () => {
  it("pre-fill payload preserves links and never sets production statut", () => {
    const f = {
      ...emptyNcForm(),
      of_id: "of-9",
      quality_check_id: "qc-1",
      product_id: "prod-1",
      production_line_id: "line-1",
      title: "Non-conformité contrôle",
      nc_type: "produit_fini",
    };
    const p = buildNcInsertPayload(f, "u", "declared");
    expect(p.quality_check_id).toBe("qc-1");
    expect(p.of_id).toBe("of-9");
    expect(p.product_id).toBe("prod-1");
    expect(p.statut).toBeUndefined();
  });
});
