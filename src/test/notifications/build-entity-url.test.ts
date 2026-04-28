import { describe, it, expect } from "vitest";
import { buildEntityUrl } from "@/lib/notifications";

describe("buildEntityUrl", () => {
  it("returns null when type or id is missing", () => {
    expect(buildEntityUrl(undefined, "x")).toBeNull();
    expect(buildEntityUrl("machine", null)).toBeNull();
  });

  it.each([
    ["machine", "abc", "/machines/abc"],
    ["equipement", "e1", "/equipements/e1"],
    ["organe", "o1", "/organes/o1"],
    ["ligne", "l1", "/lignes/l1"],
    ["pdr", "p1", "/pdr/p1"],
    ["ticket", "t1", "/tickets/t1"],
    ["preventif", "pv1", "/preventif/pv1"],
    ["of", "of1", "/gpao/of/of1"],
    ["product", "pr1", "/gpao/produits/pr1"],
    ["article", "a1", "/gpao/articles/a1"],
    ["stop", "s1", "/gpao/arrets"],
    ["consumption", "c1", "/gpao/consommations"],
    ["user", "u1", "/parametres/users"],
  ])("maps %s -> %s", (type, id, expected) => {
    expect(buildEntityUrl(type, id)).toBe(expected);
  });

  it("returns null for unknown entity types", () => {
    expect(buildEntityUrl("alien", "x")).toBeNull();
  });
});
