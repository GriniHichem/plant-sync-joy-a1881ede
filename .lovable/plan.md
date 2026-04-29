# Recipe Versioning Enhancement (Non-destructive)

## Current state (verified)

- `recipes` exists with: `id, product_id, name, version (int, default 1), is_active (bool), created_at, updated_at, search_vector`.
- `recipe_lines` exists with `recipe_id, article_id, quantite, unite`.
- `ordres_fabrication.recipe_id` already references a recipe (existing OFs preserved).
- `RecipesPage.tsx` (`/gpao/recettes`) already groups recipes by product and supports multiple versions.
- `/qualite/recettes-nomenclatures` is currently a placeholder.

The plan keeps every existing row, column and behavior intact. Only **additive** changes.

---

## 1. Database migration (additive only)

### Extend `recipes` — all new columns nullable / safe defaults
- `status text` default `'active'` (values: `draft`, `active`, `archived`) — backfilled from `is_active` (`true → 'active'`, `false → 'archived'`). `is_active` kept as-is for backward compatibility; a trigger will keep `is_active` and `status` in sync (status='active' ⇔ is_active=true).
- `valid_from timestamptz` nullable
- `valid_to timestamptz` nullable
- `approved_by uuid` nullable
- `approved_at timestamptz` nullable
- `created_by uuid` nullable
- `updated_by uuid` nullable
- `notes text` nullable

No NOT NULL added on existing columns. No data deleted. No rename.

### New table `recipe_steps`
```
id uuid pk
recipe_id uuid not null references recipes(id) on delete cascade
step_order int not null
title text not null
description text
process_parameter jsonb            -- e.g. {"temp_c":85,"pressure_bar":2.5}
expected_duration_minutes numeric
critical_control_point boolean default false
quality_indicator_id uuid references quality_indicators(id) on delete set null
created_at, updated_at timestamptz default now()
created_by, updated_by uuid
unique (recipe_id, step_order)
```

- RLS enabled. Read: authenticated. Write: `admin`, `resp_production`, `bureau_methode`, `controleur_qualite`.
- Trigger to auto-update `updated_at`.
- FTS on `title + description` (optional, follows existing pattern).
- Audit log entries on insert/update/delete via existing `logAudit` helper from the UI.

### Helper RPC `set_recipe_status(p_recipe_id uuid, p_status text, p_reason text)`
- SECURITY DEFINER, checks role `admin` / `resp_production` / `bureau_methode`.
- Transitions: `draft → active`, `active → archived`, `archived → active` (re-activation allowed).
- When activating: sets `status='active'`, `is_active=true`, `valid_from=coalesce(valid_from, now())`, `approved_by=auth.uid()`, `approved_at=now()`. Does **not** auto-archive other versions (keeps current "multiple active versions allowed" rule from memory).
- When archiving: `status='archived'`, `is_active=false`, `valid_to=now()`. Does **not** touch any OF.
- Inserts an `audit_logs` row with old/new values and reason.

### Critical guarantees
- `ordres_fabrication.recipe_id` is unchanged — old OFs keep pointing to their (possibly archived) recipe.
- No DELETE, no DROP, no NOT NULL tightening, no data migration that removes rows.
- Existing `RecipesPage` queries (`select *`) keep working; new fields just appear in the payload.

---

## 2. Code changes

### `src/pages/gpao/RecipesPage.tsx` (extend, do not rewrite)
- Show new `status` badge (`draft` / `active` / `archived`) alongside the existing `is_active` indicator.
- Buttons per version (when `canManage`): **Activer**, **Archiver**, **Nouvelle version** (already exists), **Comparer versions**.
- Comparison dialog: side-by-side recipe_lines + recipe_steps for two selected versions of the same product.
- "Étapes" sub-section per version: list/add/edit/delete `recipe_steps` with order, CCP toggle, link to a `quality_indicators` row.
- All actions go through the new RPC for status changes; lines/steps via direct table mutations with audit log.
- Existing line management untouched.

### `src/pages/qualite/QualiteRecettesNomenclatures.tsx` (replace placeholder)
- Read-only quality view: list recipes grouped by product, expand to see versions, steps, CCPs, linked quality indicators.
- Filter: status, product, has CCP, has linked indicator.
- Link per CCP step opens the indicator detail in `/qualite/indicateurs`.
- No write actions here (write stays in `/gpao/recettes`), avoiding duplication.

### Types
- `src/integrations/supabase/types.ts` is auto-generated; will refresh after migration.
- No edits to `client.ts`.

### Audit & notifications
- Use existing `logAudit` for step CRUD and status changes (RPC already logs).
- No new notification rules required (can be added later if requested).

---

## 3. Tests (`src/test/gpao/recipe-versioning.test.ts` + extend existing)

- Open existing recipe row → all new fields default correctly, no crash.
- Create new version of an existing product (insert with same `product_id`, `version+1`) → both versions visible.
- Activate version via RPC → `status='active'`, `is_active=true`, `approved_by/at` set.
- Archive version → `status='archived'`, `is_active=false`, `valid_to` set; OF still resolves recipe by id.
- Create OF with active recipe → unchanged behavior.
- Open OF whose recipe is now `archived` → still loads recipe + lines (no filter on `is_active` in OF detail path).
- Consumptions (`consumptions` table queries) untouched — verify existing GPAO consumption test still passes.
- Shift Production screen — verify existing tests still pass (no schema break).
- Insert/update/delete `recipe_steps` with CCP + indicator link.

Run full suite to confirm no regression in GPAO / Shift / Quality modules.

---

## 4. Memory update

Update `mem://features/recipe-versioning` with:
- New `status` lifecycle and `set_recipe_status` RPC.
- `recipe_steps` table with `critical_control_point` + `quality_indicator_id`.
- Rule: archiving never modifies OFs; old OFs retain their `recipe_id` pointer.

---

## Confirmations after implementation

- Migration purely additive — existing recipes & OFs preserved.
- `/gpao/recettes` still works for all current users; new actions visible only to managers.
- `/qualite/recettes-nomenclatures` becomes a real read-only quality view.
- Versioning lifecycle (draft → active → archived) tested end-to-end.
- No production blocking: status changes never touch `ordres_fabrication.statut`.
