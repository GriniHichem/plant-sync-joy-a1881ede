# Module Contrôles qualité par OF

Ajout strictement additif. Aucune modification de `ordres_fabrication`, `shifts`, `production_declarations`, `consumptions`, ni des dashboards GPAO.

## 1. Migration BD — `quality_checks`

```text
id                       uuid PK default gen_random_uuid()
of_id                    uuid NOT NULL → ordres_fabrication(id) ON DELETE CASCADE
product_id               uuid NULL → products(id) ON DELETE SET NULL
production_line_id       uuid NULL → production_lines(id) ON DELETE SET NULL
shift_id                 uuid NULL → shifts(id) ON DELETE SET NULL
team_id                  uuid NULL → shift_teams(id) ON DELETE SET NULL
indicator_id             uuid NOT NULL → quality_indicators(id) ON DELETE RESTRICT
measured_value_numeric   numeric NULL
measured_value_text      text NULL
measured_value_boolean   boolean NULL
selected_value           text NULL              -- pour indicateurs "select"
unit                     text NULL              -- snapshot au moment du contrôle
target_value             numeric NULL           -- snapshot
min_value                numeric NULL           -- snapshot
max_value                numeric NULL           -- snapshot
is_conform               boolean NULL           -- calculé côté trigger
deviation_value          numeric NULL           -- mesuré - target
deviation_percent        numeric NULL           -- (mesuré - target) / target * 100
control_time             timestamptz NOT NULL DEFAULT now()
controlled_by            uuid NULL
comment                  text NOT NULL DEFAULT ''
status                   text NOT NULL DEFAULT 'submitted'   -- draft|submitted|validated|rejected
validation_status        text NOT NULL DEFAULT 'not_required' -- not_required|pending|approved|rejected
validated_by             uuid NULL
validated_at             timestamptz NULL
created_at               timestamptz NOT NULL DEFAULT now()
updated_at               timestamptz NOT NULL DEFAULT now()
```

Triggers / index :
- `update_updated_at_column` sur UPDATE.
- Trigger `quality_checks_compute_conformity()` AVANT INSERT/UPDATE :
  - Si `indicator_type = numeric` et `measured_value_numeric` non null :
    - `is_conform = (min_value IS NULL OR v >= min_value) AND (max_value IS NULL OR v <= max_value)`.
    - `deviation_value = v - target_value` si `target_value` non null.
    - `deviation_percent = (v - target) / target * 100` si target ≠ 0.
  - Si `boolean` : `is_conform = measured_value_boolean`.
  - Si `select` : `is_conform = NULL` (pas d'auto-évaluation).
  - Si `text` : `is_conform = NULL`.
- Trigger de validation des `status` / `validation_status` (whitelist).
- Index : `(of_id)`, `(indicator_id)`, `(production_line_id)`, `(control_time DESC)`, `(is_conform)`.
- RLS :
  - SELECT : authenticated.
  - INSERT/UPDATE : `admin`, `bureau_methode`, `resp_production`, `chef_ligne`, `controleur_qualite` (via has_role) — fallback sur `controlled_by = auth.uid()` autorisé pour l'auteur.
  - DELETE : admin uniquement.

**Aucun trigger n'est posé sur `ordres_fabrication`, `shifts`, `production_declarations`, `consumptions`.** L'OF n'est jamais bloqué.

## 2. Page UI — `src/pages/qualite/QualiteControles.tsx`

Remplace le placeholder existant. Sections :

### Bandeau actions
- Bouton "+ Nouveau contrôle".
- Bouton Export CSV.

### Filtres (Card)
- Recherche texte (indicateur code/nom + commentaire).
- Select OF (parmi OFs actifs `en_cours` / `planifie`).
- Select Produit (alimenté depuis OFs filtrés).
- Select Ligne.
- Select Conformité : Tous / Conformes / Non conformes / Non évalués.
- Plage de dates (date début / date fin sur `control_time`).
- Bouton "Réinitialiser" conditionnel (RotateCcw).

### Tableau
Colonnes : Date, OF, Produit, Ligne, Indicateur, Valeur (avec unité), Cible / Min-Max, Conformité (badge `Conforme` / `Non conforme` / `Hors tolérance` / `—`), Auteur, Actions.

### Dialog "Nouveau contrôle" (`ResponsiveDialog`)
1. Select **OF** obligatoire — depuis OFs actifs (`statut IN planifie/en_cours/...`).
2. Affichage automatique (lecture seule) du Produit et de la Ligne de l'OF.
3. Select **Indicateur** : appelle `get_quality_indicators_for_of(of_id)` à l'ouverture pour ne proposer que les indicateurs applicables (globaux + scope).
4. Champ Valeur dynamique selon `indicator_type` :
   - numeric → input décimal (`parseDecimal` accepte `.` et `,`)
   - boolean → Switch
   - select → Select avec `select_options`
   - text → Textarea
5. Snapshot affiché : unité, cible, min/max issus de l'indicateur (override d'assignation appliqué côté résolveur).
6. Calcul de conformité **en temps réel** (preview) avant submit, miroir du trigger SQL.
7. Champ Commentaire.
8. À la soumission : insert dans `quality_checks` avec snapshots `unit/target/min/max`, `controlled_by = user.id`, `status = submitted`. Audit log via `logAudit` (module `parametres`, entity `quality_check`).

## 3. Tests — `src/test/qualite/quality-checks.test.ts`
- `computeConformity` numérique : conforme dans [min,max], non conforme hors plage, badge "Hors tolérance" si `tolerance_minus/plus` snapshot dépassée.
- numérique sans min/max → `is_conform` = NULL.
- boolean → reflète la valeur saisie.
- select / text → `is_conform` = NULL.
- `deviation_value` et `deviation_percent` calculés correctement (target=0 → percent NULL).
- Validation : OF obligatoire, indicateur obligatoire, valeur obligatoire.
- Filtrage liste (OF, ligne, conformité, plage dates, recherche texte).
- Régression : aucun appel à `ordres_fabrication.update`, `consumptions.update`, `production_declarations.update` dans le module.

## 4. Garantie de non-régression
- Aucune modification de tables existantes.
- Aucun trigger sur `ordres_fabrication` / `shifts` / `consumptions` / `production_declarations`.
- La page Shift Production, le dashboard GPAO et les déclarations restent inchangés.
- L'OF n'est jamais bloqué : `quality_checks.is_blocking` n'existe pas et aucune logique côté SQL ne lit cette table depuis les autres modules.

## Fichiers
- **Nouveau** : migration `quality_checks` + trigger conformité.
- **Modifié** : `src/pages/qualite/QualiteControles.tsx` (remplace placeholder).
- **Nouveau** : `src/test/qualite/quality-checks.test.ts`.
- **Mise à jour** : `mem://features/qualite-module`.

## Confirmation finale (livrée après implémentation)
- Table `quality_checks` créée ✓
- Page `/qualite/controles` opérationnelle ✓
- Calcul de conformité validé par tests ✓
- Aucun blocage OF / Shift / Production / Consommations ✓
