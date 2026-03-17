import { describe, it, expect } from "vitest";

// ── Constants répliquées depuis RolesMatrix.tsx ──────────────────

const MODULE_GROUPS = [
  {
    label: "Maintenance (GMAO)",
    modules: [
      { key: "machines", label: "Machines" },
      { key: "tickets", label: "Tickets" },
      { key: "pdr", label: "Pièces détachées" },
      { key: "preventif", label: "Préventif" },
    ],
  },
  {
    label: "Production (GPAO)",
    modules: [
      { key: "of", label: "Ordres de fab." },
      { key: "produits", label: "Produits" },
      { key: "articles", label: "Articles" },
      { key: "recettes", label: "Recettes" },
      { key: "arrets", label: "Arrêts" },
      { key: "consommations", label: "Consommations" },
    ],
  },
  {
    label: "Système",
    modules: [
      { key: "analytiques", label: "Analytiques & KPI" },
      { key: "utilisateurs", label: "Utilisateurs" },
      { key: "parametres", label: "Paramètres" },
    ],
  },
];

const ALL_MODULES = MODULE_GROUPS.flatMap((g) => g.modules);

const ROLES = [
  "admin", "resp_maintenance", "maintenancier", "resp_production",
  "chef_ligne", "operateur", "gestionnaire_magasin", "bureau_methode",
];

const ACTIONS = ["can_view", "can_create", "can_edit", "can_delete"] as const;
type ActionKey = (typeof ACTIONS)[number];

interface PermRow {
  id?: string;
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

// ── Helper functions répliquant la logique de RolesMatrix ──────

function getPerm(perms: PermRow[], role: string, module: string): PermRow {
  return (
    perms.find((p) => p.role === role && p.module === module) || {
      role, module, can_view: false, can_create: false, can_edit: false, can_delete: false,
    }
  );
}

function toggle(perms: PermRow[], role: string, module: string, action: ActionKey): PermRow[] {
  const next = [...perms];
  const idx = next.findIndex((p) => p.role === role && p.module === module);
  if (idx >= 0) {
    next[idx] = { ...next[idx], [action]: !next[idx][action] };
    return next;
  }
  return [
    ...next,
    { role, module, can_view: false, can_create: false, can_edit: false, can_delete: false, [action]: true },
  ];
}

function toggleAllForRole(perms: PermRow[], role: string, action: ActionKey): PermRow[] {
  const allSet = ALL_MODULES.every((m) => getPerm(perms, role, m.key)[action]);
  const next = [...perms];
  for (const m of ALL_MODULES) {
    const idx = next.findIndex((p) => p.role === role && p.module === m.key);
    if (idx >= 0) {
      next[idx] = { ...next[idx], [action]: !allSet };
    } else {
      next.push({ role, module: m.key, can_view: false, can_create: false, can_edit: false, can_delete: false, [action]: !allSet });
    }
  }
  return next;
}

function toggleFullAccess(perms: PermRow[], role: string): PermRow[] {
  const allSet = ALL_MODULES.every((m) => {
    const p = getPerm(perms, role, m.key);
    return p.can_view && p.can_create && p.can_edit && p.can_delete;
  });
  const next = [...perms];
  const val = !allSet;
  for (const m of ALL_MODULES) {
    const idx = next.findIndex((p) => p.role === role && p.module === m.key);
    if (idx >= 0) {
      next[idx] = { ...next[idx], can_view: val, can_create: val, can_edit: val, can_delete: val };
    } else {
      next.push({ role, module: m.key, can_view: val, can_create: val, can_edit: val, can_delete: val });
    }
  }
  return next;
}

function getRoleStats(perms: PermRow[], role: string) {
  let total = 0, active = 0;
  for (const m of ALL_MODULES) {
    const p = getPerm(perms, role, m.key);
    total += 4;
    if (p.can_view) active++;
    if (p.can_create) active++;
    if (p.can_edit) active++;
    if (p.can_delete) active++;
  }
  return { total, active, pct: Math.round((active / total) * 100) };
}

// ── Merge OR (usePermissions) ──────

function mergePermissions(perms: PermRow[], userRoles: string[]) {
  const merged = new Map<string, { module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>();
  for (const row of perms) {
    if (!userRoles.includes(row.role)) continue;
    const existing = merged.get(row.module);
    if (existing) {
      existing.can_view = existing.can_view || row.can_view;
      existing.can_create = existing.can_create || row.can_create;
      existing.can_edit = existing.can_edit || row.can_edit;
      existing.can_delete = existing.can_delete || row.can_delete;
    } else {
      merged.set(row.module, {
        module: row.module,
        can_view: row.can_view,
        can_create: row.can_create,
        can_edit: row.can_edit,
        can_delete: row.can_delete,
      });
    }
  }
  return Array.from(merged.values());
}

// ══════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════

describe("Matrice des rôles — Structure & constantes", () => {
  it("déclare 3 groupes de modules", () => {
    expect(MODULE_GROUPS).toHaveLength(3);
    expect(MODULE_GROUPS.map((g) => g.label)).toEqual([
      "Maintenance (GMAO)",
      "Production (GPAO)",
      "Système",
    ]);
  });

  it("totalise 13 modules", () => {
    expect(ALL_MODULES).toHaveLength(13);
  });

  it("GMAO contient 4 modules (machines, tickets, pdr, preventif)", () => {
    const gmao = MODULE_GROUPS[0];
    expect(gmao.modules.map((m) => m.key)).toEqual(["machines", "tickets", "pdr", "preventif"]);
  });

  it("GPAO contient 6 modules", () => {
    const gpao = MODULE_GROUPS[1];
    expect(gpao.modules).toHaveLength(6);
    expect(gpao.modules.map((m) => m.key)).toContain("of");
    expect(gpao.modules.map((m) => m.key)).toContain("consommations");
  });

  it("Système contient analytiques, utilisateurs, parametres", () => {
    const sys = MODULE_GROUPS[2];
    expect(sys.modules.map((m) => m.key)).toEqual(["analytiques", "utilisateurs", "parametres"]);
  });

  it("déclare exactement 8 rôles", () => {
    expect(ROLES).toHaveLength(8);
    expect(ROLES).toContain("admin");
    expect(ROLES).toContain("bureau_methode");
    expect(ROLES).toContain("gestionnaire_magasin");
  });

  it("chaque module a un key unique", () => {
    const keys = ALL_MODULES.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("4 actions CRUD", () => {
    expect(ACTIONS).toEqual(["can_view", "can_create", "can_edit", "can_delete"]);
  });
});

describe("Matrice des rôles — getPerm (lecture permission)", () => {
  const perms: PermRow[] = [
    { role: "admin", module: "machines", can_view: true, can_create: true, can_edit: true, can_delete: true },
    { role: "operateur", module: "tickets", can_view: true, can_create: true, can_edit: false, can_delete: false },
  ];

  it("retourne la permission existante", () => {
    const p = getPerm(perms, "admin", "machines");
    expect(p.can_view).toBe(true);
    expect(p.can_delete).toBe(true);
  });

  it("retourne une permission vide si absente", () => {
    const p = getPerm(perms, "operateur", "machines");
    expect(p.can_view).toBe(false);
    expect(p.can_create).toBe(false);
    expect(p.can_edit).toBe(false);
    expect(p.can_delete).toBe(false);
    expect(p.role).toBe("operateur");
    expect(p.module).toBe("machines");
  });

  it("ne confond pas les rôles", () => {
    const p1 = getPerm(perms, "admin", "tickets");
    const p2 = getPerm(perms, "operateur", "tickets");
    expect(p1.can_view).toBe(false); // admin n'a pas de ligne tickets
    expect(p2.can_view).toBe(true);
  });
});

describe("Matrice des rôles — toggle (basculer une permission)", () => {
  it("active une permission inactive", () => {
    const result = toggle([], "admin", "machines", "can_view");
    expect(result).toHaveLength(1);
    expect(result[0].can_view).toBe(true);
    expect(result[0].can_create).toBe(false);
  });

  it("désactive une permission active", () => {
    const initial: PermRow[] = [
      { role: "admin", module: "machines", can_view: true, can_create: false, can_edit: false, can_delete: false },
    ];
    const result = toggle(initial, "admin", "machines", "can_view");
    expect(result[0].can_view).toBe(false);
  });

  it("ne modifie pas les autres actions", () => {
    const initial: PermRow[] = [
      { role: "admin", module: "machines", can_view: true, can_create: true, can_edit: true, can_delete: true },
    ];
    const result = toggle(initial, "admin", "machines", "can_delete");
    expect(result[0].can_view).toBe(true);
    expect(result[0].can_create).toBe(true);
    expect(result[0].can_edit).toBe(true);
    expect(result[0].can_delete).toBe(false);
  });

  it("crée une nouvelle entrée si le couple role/module n'existe pas", () => {
    const result = toggle([], "operateur", "of", "can_create");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      role: "operateur", module: "of", can_view: false, can_create: true, can_edit: false, can_delete: false,
    });
  });

  it("ne modifie pas les permissions d'autres rôles/modules", () => {
    const initial: PermRow[] = [
      { role: "admin", module: "machines", can_view: true, can_create: false, can_edit: false, can_delete: false },
      { role: "operateur", module: "tickets", can_view: true, can_create: false, can_edit: false, can_delete: false },
    ];
    const result = toggle(initial, "admin", "machines", "can_create");
    expect(result[1]).toEqual(initial[1]); // operateur/tickets inchangé
  });
});

describe("Matrice des rôles — toggleAllForRole (action globale par rôle)", () => {
  it("active une action sur tous les 13 modules si aucune n'est active", () => {
    const result = toggleAllForRole([], "admin", "can_view");
    expect(result).toHaveLength(13);
    result.forEach((p) => {
      expect(p.role).toBe("admin");
      expect(p.can_view).toBe(true);
      expect(p.can_create).toBe(false);
    });
  });

  it("désactive si toutes sont déjà actives", () => {
    // Pré-remplir: admin a can_view sur tous les modules
    let perms: PermRow[] = ALL_MODULES.map((m) => ({
      role: "admin", module: m.key, can_view: true, can_create: false, can_edit: false, can_delete: false,
    }));
    const result = toggleAllForRole(perms, "admin", "can_view");
    result.forEach((p) => {
      expect(p.can_view).toBe(false);
    });
  });

  it("active tout si au moins une est manquante", () => {
    let perms: PermRow[] = ALL_MODULES.slice(0, 12).map((m) => ({
      role: "admin", module: m.key, can_view: true, can_create: false, can_edit: false, can_delete: false,
    }));
    // Le 13e module manque → pas tous actifs → on active tout
    const result = toggleAllForRole(perms, "admin", "can_view");
    const adminPerms = result.filter((p) => p.role === "admin");
    expect(adminPerms).toHaveLength(13);
    adminPerms.forEach((p) => expect(p.can_view).toBe(true));
  });

  it("n'affecte pas les permissions d'un autre rôle", () => {
    const initial: PermRow[] = [
      { role: "operateur", module: "machines", can_view: true, can_create: false, can_edit: false, can_delete: false },
    ];
    const result = toggleAllForRole(initial, "admin", "can_view");
    const opPerm = result.find((p) => p.role === "operateur" && p.module === "machines");
    expect(opPerm?.can_view).toBe(true); // inchangé
  });
});

describe("Matrice des rôles — toggleFullAccess (accès complet)", () => {
  it("active les 4 actions sur les 13 modules (52 permissions)", () => {
    const result = toggleFullAccess([], "admin");
    expect(result).toHaveLength(13);
    result.forEach((p) => {
      expect(p.can_view).toBe(true);
      expect(p.can_create).toBe(true);
      expect(p.can_edit).toBe(true);
      expect(p.can_delete).toBe(true);
    });
  });

  it("désactive tout si déjà tout actif", () => {
    const full: PermRow[] = ALL_MODULES.map((m) => ({
      role: "admin", module: m.key, can_view: true, can_create: true, can_edit: true, can_delete: true,
    }));
    const result = toggleFullAccess(full, "admin");
    result.forEach((p) => {
      expect(p.can_view).toBe(false);
      expect(p.can_create).toBe(false);
      expect(p.can_edit).toBe(false);
      expect(p.can_delete).toBe(false);
    });
  });

  it("active tout si un seul module manque une action", () => {
    const perms: PermRow[] = ALL_MODULES.map((m) => ({
      role: "admin", module: m.key, can_view: true, can_create: true, can_edit: true, can_delete: true,
    }));
    // Retirer can_delete sur un seul module
    perms[5].can_delete = false;
    const result = toggleFullAccess(perms, "admin");
    result.forEach((p) => {
      expect(p.can_view).toBe(true);
      expect(p.can_delete).toBe(true);
    });
  });
});

describe("Matrice des rôles — getRoleStats (statistiques)", () => {
  it("0% si aucune permission", () => {
    const stats = getRoleStats([], "admin");
    expect(stats.total).toBe(13 * 4); // 52
    expect(stats.active).toBe(0);
    expect(stats.pct).toBe(0);
  });

  it("100% si toutes les permissions sont actives", () => {
    const full: PermRow[] = ALL_MODULES.map((m) => ({
      role: "admin", module: m.key, can_view: true, can_create: true, can_edit: true, can_delete: true,
    }));
    const stats = getRoleStats(full, "admin");
    expect(stats.total).toBe(52);
    expect(stats.active).toBe(52);
    expect(stats.pct).toBe(100);
  });

  it("calcule correctement un % partiel", () => {
    const partial: PermRow[] = [
      { role: "operateur", module: "tickets", can_view: true, can_create: true, can_edit: false, can_delete: false },
    ];
    const stats = getRoleStats(partial, "operateur");
    expect(stats.active).toBe(2);
    expect(stats.pct).toBe(Math.round((2 / 52) * 100));
  });

  it("ne compte pas les permissions d'un autre rôle", () => {
    const mixed: PermRow[] = [
      { role: "admin", module: "machines", can_view: true, can_create: true, can_edit: true, can_delete: true },
      { role: "operateur", module: "machines", can_view: true, can_create: false, can_edit: false, can_delete: false },
    ];
    expect(getRoleStats(mixed, "admin").active).toBe(4);
    expect(getRoleStats(mixed, "operateur").active).toBe(1);
  });
});

describe("Matrice des rôles — hasChanges (détection modifications)", () => {
  it("pas de changement si identique", () => {
    const perms: PermRow[] = [
      { role: "admin", module: "machines", can_view: true, can_create: false, can_edit: false, can_delete: false },
    ];
    const original = JSON.parse(JSON.stringify(perms));
    expect(JSON.stringify(perms) !== JSON.stringify(original)).toBe(false);
  });

  it("détecte un changement d'une seule valeur booléenne", () => {
    const original: PermRow[] = [
      { role: "admin", module: "machines", can_view: true, can_create: false, can_edit: false, can_delete: false },
    ];
    const modified = toggle([...original], "admin", "machines", "can_create");
    expect(JSON.stringify(modified) !== JSON.stringify(original)).toBe(true);
  });

  it("détecte l'ajout d'une nouvelle ligne de permission", () => {
    const original: PermRow[] = [];
    const modified = toggle([], "admin", "machines", "can_view");
    expect(JSON.stringify(modified) !== JSON.stringify(original)).toBe(true);
  });
});

describe("Matrice des rôles — Fusion permissions multi-rôles (OR)", () => {
  const perms: PermRow[] = [
    { role: "maintenancier", module: "tickets", can_view: true, can_create: true, can_edit: false, can_delete: false },
    { role: "chef_ligne", module: "tickets", can_view: true, can_create: false, can_edit: true, can_delete: false },
    { role: "maintenancier", module: "machines", can_view: true, can_create: false, can_edit: true, can_delete: false },
    { role: "chef_ligne", module: "of", can_view: true, can_create: true, can_edit: true, can_delete: false },
  ];

  it("fusionne en OR pour un utilisateur avec 2 rôles", () => {
    const merged = mergePermissions(perms, ["maintenancier", "chef_ligne"]);
    const ticketPerm = merged.find((p) => p.module === "tickets")!;
    expect(ticketPerm.can_view).toBe(true);
    expect(ticketPerm.can_create).toBe(true);  // maintenancier
    expect(ticketPerm.can_edit).toBe(true);    // chef_ligne
    expect(ticketPerm.can_delete).toBe(false); // ni l'un ni l'autre
  });

  it("n'inclut pas les permissions de rôles non assignés", () => {
    const merged = mergePermissions(perms, ["maintenancier"]);
    const ofPerm = merged.find((p) => p.module === "of");
    expect(ofPerm).toBeUndefined(); // seul chef_ligne a des perms sur "of"
  });

  it("retourne un tableau vide si aucun rôle n'est assigné", () => {
    const merged = mergePermissions(perms, []);
    expect(merged).toHaveLength(0);
  });

  it("gère un seul rôle correctement", () => {
    const merged = mergePermissions(perms, ["chef_ligne"]);
    expect(merged).toHaveLength(2); // tickets + of
    expect(merged.find((p) => p.module === "machines")).toBeUndefined();
  });
});

describe("Matrice des rôles — Sauvegarde (format attendu)", () => {
  it("les lignes sauvegardées excluent le champ id", () => {
    const perms: PermRow[] = [
      { id: "uuid-1", role: "admin", module: "machines", can_view: true, can_create: true, can_edit: true, can_delete: true },
    ];
    const rows = perms.map(({ id, ...rest }) => rest);
    expect(rows[0]).not.toHaveProperty("id");
    expect(rows[0]).toHaveProperty("role", "admin");
    expect(rows[0]).toHaveProperty("module", "machines");
  });

  it("supporte la sauvegarde de 104 lignes (8 rôles × 13 modules)", () => {
    const full: PermRow[] = [];
    for (const role of ROLES) {
      for (const m of ALL_MODULES) {
        full.push({ role, module: m.key, can_view: true, can_create: false, can_edit: false, can_delete: false });
      }
    }
    expect(full).toHaveLength(104);
  });
});

describe("Matrice des rôles — Scénarios métier réalistes", () => {
  it("Admin a accès complet à tous les modules", () => {
    const perms = toggleFullAccess([], "admin");
    ALL_MODULES.forEach((m) => {
      const p = getPerm(perms, "admin", m.key);
      expect(p.can_view && p.can_create && p.can_edit && p.can_delete).toBe(true);
    });
  });

  it("Opérateur: lecture seule sur tickets et OF", () => {
    let perms = toggle([], "operateur", "tickets", "can_view");
    perms = toggle(perms, "operateur", "of", "can_view");
    perms = toggle(perms, "operateur", "tickets", "can_create");

    const tickets = getPerm(perms, "operateur", "tickets");
    expect(tickets.can_view).toBe(true);
    expect(tickets.can_create).toBe(true);
    expect(tickets.can_edit).toBe(false);
    expect(tickets.can_delete).toBe(false);

    const of = getPerm(perms, "operateur", "of");
    expect(of.can_view).toBe(true);
    expect(of.can_create).toBe(false);
  });

  it("Resp. Maintenance: CRUD complet sur GMAO, lecture GPAO", () => {
    let perms: PermRow[] = [];
    // Full GMAO
    const gmaoModules = MODULE_GROUPS[0].modules;
    gmaoModules.forEach((m) => {
      perms.push({ role: "resp_maintenance", module: m.key, can_view: true, can_create: true, can_edit: true, can_delete: true });
    });
    // Read-only GPAO
    const gpaoModules = MODULE_GROUPS[1].modules;
    gpaoModules.forEach((m) => {
      perms.push({ role: "resp_maintenance", module: m.key, can_view: true, can_create: false, can_edit: false, can_delete: false });
    });

    gmaoModules.forEach((m) => {
      const p = getPerm(perms, "resp_maintenance", m.key);
      expect(p.can_delete).toBe(true);
    });
    gpaoModules.forEach((m) => {
      const p = getPerm(perms, "resp_maintenance", m.key);
      expect(p.can_view).toBe(true);
      expect(p.can_create).toBe(false);
    });
  });

  it("Gestionnaire Magasin: CRUD PDR + Articles, lecture reste", () => {
    let perms: PermRow[] = [
      { role: "gestionnaire_magasin", module: "pdr", can_view: true, can_create: true, can_edit: true, can_delete: true },
      { role: "gestionnaire_magasin", module: "articles", can_view: true, can_create: true, can_edit: true, can_delete: true },
      { role: "gestionnaire_magasin", module: "machines", can_view: true, can_create: false, can_edit: false, can_delete: false },
    ];
    expect(getPerm(perms, "gestionnaire_magasin", "pdr").can_delete).toBe(true);
    expect(getPerm(perms, "gestionnaire_magasin", "machines").can_create).toBe(false);
  });

  it("Bureau Méthode: accès recettes + produits, pas de suppression", () => {
    let perms: PermRow[] = [
      { role: "bureau_methode", module: "recettes", can_view: true, can_create: true, can_edit: true, can_delete: false },
      { role: "bureau_methode", module: "produits", can_view: true, can_create: true, can_edit: true, can_delete: false },
    ];
    expect(getPerm(perms, "bureau_methode", "recettes").can_edit).toBe(true);
    expect(getPerm(perms, "bureau_methode", "recettes").can_delete).toBe(false);
  });
});

describe("Matrice des rôles — Cas limites", () => {
  it("toggle sur un tableau vide crée une entrée", () => {
    const result = toggle([], "admin", "machines", "can_view");
    expect(result).toHaveLength(1);
  });

  it("toggleFullAccess puis toggleFullAccess revient à zéro", () => {
    const step1 = toggleFullAccess([], "admin");
    const step2 = toggleFullAccess(step1, "admin");
    step2.forEach((p) => {
      expect(p.can_view).toBe(false);
      expect(p.can_create).toBe(false);
      expect(p.can_edit).toBe(false);
      expect(p.can_delete).toBe(false);
    });
  });

  it("statistiques cohérentes après toggle complet aller-retour", () => {
    const step1 = toggleFullAccess([], "admin");
    expect(getRoleStats(step1, "admin").pct).toBe(100);
    const step2 = toggleFullAccess(step1, "admin");
    expect(getRoleStats(step2, "admin").pct).toBe(0);
  });

  it("permissions de rôles multiples restent indépendantes", () => {
    let perms = toggleFullAccess([], "admin");
    perms = toggleFullAccess(perms, "operateur");
    // Désactiver admin ne touche pas operateur
    perms = toggleFullAccess(perms, "admin");
    expect(getRoleStats(perms, "admin").pct).toBe(0);
    expect(getRoleStats(perms, "operateur").pct).toBe(100);
  });
});
