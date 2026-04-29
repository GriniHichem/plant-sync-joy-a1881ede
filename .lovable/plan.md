# Module Non-conformités Qualité — état actuel et finalisation

Le module a déjà été livré dans la dernière itération (table, page, workflow, tests). Ce plan **ne refait pas le travail** : il vérifie ce qui existe et complète les deux derniers détails demandés dans le brief.

## Ce qui existe déjà (vérifié dans le code)

### Base de données (migration `20260429145923_*.sql`)
- Enums `nc_type` (10 valeurs), `nc_severity` (minor/major/critical), `nc_status` (9 valeurs), `nc_decision` (9 valeurs) — conformes au brief.
- Table `quality_non_conformities` avec **tous les champs demandés** : `id`, `nc_number` (UNIQUE, auto), `created_at`, `updated_at`, `detected_at`, `declared_by`, liens nullable (`of_id`, `quality_check_id`, `product_id`, `production_line_id`, `shift_id`, `team_id`, `article_id`, `packaging_article_id`), `batch_number`, `lot_number`, `nc_type`, `nc_category`, `severity`, `status`, `title`, `description`, quantités, action immédiate, root_cause, décision (+ `decision_by`/`decision_at`), clôture (+ `closed_by`/`closed_at`), `validation_status` default `not_required`, `metadata` JSONB.
- Trigger `trg_qnc_number` génère `NC-00001` automatiquement.
- Trigger FTS sur `search_vector`.
- Trigger validation : `closed_at`/`closed_by` obligatoires si `status='closed'`, `decision_at`/`decision_by` obligatoires si décision posée.
- RLS : SELECT authentifié, INSERT/UPDATE pour admin / resp_production / chef_ligne / bureau_methode / controleur_qualite + auteur, DELETE admin.
- Rôle `controleur_qualite` ajouté à `app_role`.
- **Aucun trigger** sur `ordres_fabrication`, `consumptions`, `production_declarations`, `shifts`, `quality_checks`. Aucune écriture sur `ordres_fabrication.statut`.

### Page `/qualite/non-conformites` (`QualiteNonConformites.tsx`, 775 lignes)
- Filtres : recherche libre, OF, type, sévérité, statut, plage de dates ; bouton **Réinitialiser** (`RotateCcw`) conditionnel.
- Tableau : NC#, date, type, sévérité, statut, OF, produit, titre, décision, auteur.
- Dialog **Nouvelle NC** (responsive) : identification + liens optionnels + quantités + action immédiate + boutons brouillon/déclarer.
- Dialog **Décision & clôture** : sélecteur enum, commentaire, checkbox "Mettre quality_status OF à `bloque`" affichée **uniquement si décision = `bloquer_lot` ET `of_id` lié**, motif obligatoire ; appelle la RPC `set_of_quality_status` (jamais `statut`).
- Pré-remplissage via `?from_check=<uuid>` (of_id, indicator, ligne, produit, quality_check_id).
- Export CSV via `exportToCsv`.
- Audit `logAudit` (module `qualite`, severity mappée minor→info / major→low / critical→high).

### Tests (`quality-non-conformities.test.ts`, 137 lignes)
Couvrent : validation form, payload OF, payload emballage, parsing décimales (virgule/point), pré-remplissage `from_check`, décision `bloquer_lot` (RPC args corrects, **n'inclut jamais `statut` production**), clôture (commentaire requis, payload), filtres (type/sévérité/statut/date/recherche), mapping sévérité → audit.

## Ce qui reste à faire

### 1. Lien "Créer NC" depuis les contrôles hors tolérance
Le plan original prévoit un bouton **"Créer NC"** (icône `AlertOctagon`) dans `src/pages/qualite/QualiteControles.tsx`, visible uniquement quand `is_conform === false`, qui redirige vers `/qualite/non-conformites?from_check=<id>`. À vérifier : le code de l'itération précédente l'a normalement ajouté ; sinon l'ajouter (≤ 15 lignes).

### 2. Exécution Vitest et vérification des régressions
- Lancer `bunx vitest run src/test/qualite/quality-non-conformities.test.ts` pour confirmer les 7 groupes de tests.
- Lancer la suite GPAO (`src/test/gpao/*`) pour confirmer qu'aucune régression sur Shift / OF / dashboard / consumptions.
- Lancer la suite Qualité complète (`src/test/qualite/*`) : checks, indicateurs, OF tab, NC.

### 3. Mémoire
Mettre à jour `mem://features/qualite-module` avec :
- table `quality_non_conformities` + 4 enums
- règle d'or : NC ne touche jamais `statut` production ; seul `bloquer_lot` peut, sur consentement explicite, appeler `set_of_quality_status`
- rôle `controleur_qualite` ajouté
- pré-remplissage `?from_check=ID`

## Confirmation des garanties demandées

- **Table créée** : oui (migration `20260429145923`).
- **Workflow créé** : déclaration → décision → clôture, tous les états du brief couverts.
- **Génération NC testée** : trigger `generate_nc_number` + tests payload.
- **Pas de blocage production non voulu** : aucun trigger DB sur `ordres_fabrication`, aucune écriture sur `statut`. `quality_status` modifié uniquement via RPC explicite après opt-in utilisateur sur la décision `bloquer_lot`.

## Hors scope (non touché)
- `OfQualityTab` reste inchangé (le bouton "Créer NC" depuis l'OF reste désactivé pour cette itération).
- Pas de notifications automatiques NC (peut être ajouté via `notification_rules` plus tard).
- Pas de pièces jointes NC (réutilisera `entity-documents` plus tard).
