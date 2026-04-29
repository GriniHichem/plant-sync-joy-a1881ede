# BOM (Nomenclature) Module — additive to Recipe & GPAO

## Current state (verified)

- No `bill_of_materials` / `bom_items` tables exist.
- `ordres_fabrication` already has `recipe_id` (no `bom_id`) — OFs will not be forced to use a BOM.
- `articles`, `consumptions`, `recipes`, `recipe_lines` remain untouched.
- `/qualite/recettes-nomenclatures` is a single-page recipe view that needs to be reorganized into tabs.

Strict rule: purely additive. No NOT NULL, no DROP, no rename. Recipes ≠ BOM (Recipe = composition+process; BOM = sourceable items / packaging / quality-sensitivity).

---

## 1. Database migration (additive)

### `bill_of_materials`
```
id uuid pk
product_id uuid not null references products(id) on delete cascade
version int not null default 1
status text not null default 'draft' check (status in ('draft','active','archived'))
description text
valid_from timestamptz
valid_to timestamptz
created_by uuid
approved_by uuid
approved_at timestamptz
created_at, updated_at timestamptz default now()
unique (product_id, version)
```

### `bom_items`
```
id uuid pk
bom_id uuid not null references bill_of_materials(id) on delete cascade
article_id uuid not null references articles(id) on delete restrict
item_type text not null check (item_type in
  ('raw_material','packaging','label','carton','pallet','consumable'))
quantity_per_unit numeric not null default 0
unit text not null default 'g'
waste_percent numeric
is_mandatory boolean not null default true
is_quality_sensitive boolean not null default false
notes text
created_at, updated_at timestamptz default now()
unique (bom_id, article_id, item_type)
```

### `ordres_fabrication` — add `bom_id uuid` (nullable, no FK enforced action that breaks old OFs)
- Pure ADD COLUMN IF NOT EXISTS. Existing OFs keep `bom_id = NULL` and continue to work exactly as before.

### RLS
- Read: any authenticated user.
- Write `bill_of_materials` & `bom_items`: `admin`, `resp_production`, `bureau_methode`, `controleur_qualite`.

### Triggers / RPC
- `update_updated_at_column` trigger on both new tables.
- RPC `set_bom_status(p_bom_id, p_status, p_reason)` mirroring `set_recipe_status`:
  - SECURITY DEFINER, role-checked.
  - Activate → `status='active'`, `valid_from=coalesce(...,now())`, clears `valid_to`, sets `approved_by/at`.
  - Archive → `status='archived'`, `valid_to=now()`. Never touches OFs.
  - Inserts `audit_logs` entry (module `gpao`, action `update_bom_status`).

### Critical guarantees
- No edits to `recipes`, `recipe_lines`, `articles`, `consumptions`, `ordres_fabrication.statut`, or any production logic.
- `bom_id` on OFs is optional — old OFs unaffected, new OFs may opt in later (out of scope for this task).

---

## 2. UI

### `/qualite/recettes-nomenclatures` → restructure into 4 tabs
- **Recettes** — current recipe view, untouched (extract into `<RecipesTabContent>` to keep the file readable).
- **Nomenclatures** — full CRUD: list BOMs grouped by product (mirroring recipe layout), expand to see versions and `bom_items`.
  - Create BOM (product + version + description).
  - Add/edit/delete items: article picker, item_type select, quantity_per_unit, unit, waste_percent, is_mandatory, is_quality_sensitive.
  - Activer / Archiver (via RPC).
  - **Export CSV** of the active BOM (or any selected version).
- **Comparaison** — choose two BOM versions of the same product → side-by-side diff (article list, quantities, waste, sensitivity flags).
- **Articles qualité sensibles** — flat list of `bom_items` where `is_quality_sensitive=true`, joined to article + product + BOM version. Filterable by product/status.

### Permissions
- Read: any authenticated user.
- Write: `admin || resp_production || bureau_methode || controleur_qualite` (matches RLS).

### Audit
- Use existing `logAudit` from UI for create/update/delete on BOM and items; status changes are audited inside the RPC.

---

## 3. Tests (`src/test/qualite/bom.test.ts`)

- Default `is_mandatory=true`, `is_quality_sensitive=false`.
- Status lifecycle helper (`activate` sets `valid_from`, `archive` sets `valid_to`, never modifies OFs).
- Item type whitelist (raw_material, packaging, label, carton, pallet, consumable).
- CSV export shape (headers + one row per item, comma-decimal-safe numbers).
- RPC payload contains no production status fields (`statut`, `quality_status`).
- Quality-sensitive filter returns only items with the flag.

Plus run the full suite to confirm GPAO/recipe/consumption tests stay green.

---

## 4. Memory

Add `mem://features/bom-nomenclature` describing:
- Recipes vs BOM separation.
- Status lifecycle through `set_bom_status`.
- BOM-item types and the `is_quality_sensitive` flag.
- BOM is optional on OFs (`ordres_fabrication.bom_id` nullable).

---

## Confirmations after implementation

- New tables created with RLS + lifecycle RPC.
- BOM tied to product through `product_id`; multiple versions allowed; one or more may be active.
- Existing recipes, articles, consumptions, OFs unchanged — no regressions in GPAO.
- `/qualite/recettes-nomenclatures` shows 4 tabs (Recettes / Nomenclatures / Comparaison / Qualité sensibles) with full BOM CRUD and CSV export.
