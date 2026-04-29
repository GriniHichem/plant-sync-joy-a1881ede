# Module Non-conformités Qualité

## Objectif
Créer la table `quality_non_conformities` + page `/qualite/non-conformites` permettant de déclarer, suivre et clôturer des NC liées à un OF / produit / emballage / matière première / contrôle qualité, **sans toucher au statut production**.

## 1. Migration DB

Enums créés :
- `nc_type` : produit_fini, emballage, matiere_premiere, process, hygiene, etiquetage, poids, aspect, securite_alimentaire, autre
- `nc_severity` : minor, major, critical
- `nc_status` : draft, declared, under_review, blocked, decision_pending, action_in_progress, verified, closed, cancelled
- `nc_decision` : bloquer_lot, liberer, liberer_sous_derogation, retraiter, trier, rebuter, retour_fournisseur, quarantaine, autre

Table `quality_non_conformities` avec tous les champs demandés. `nc_number` auto via trigger format `NC-00001`. `metadata` JSONB nullable. Pas de FK contraignant vers les tables production (champs simplement `uuid` nullable) → pas d'effet en cascade.

Trigger `quality_nc_validate` :
- whitelist des `status` / `nc_type` / `severity` / `decision` (déjà via enum, ceinture+bretelle pour transitions)
- `closed_at`/`closed_by` requis si status='closed'
- `decision_at`/`decision_by` requis si `decision IS NOT NULL`

Trigger `quality_nc_search_refresh` (FTS sur title/description/closure_comment).

**Aucun trigger sur `ordres_fabrication`** — la NC ne change jamais `statut`. Si l'utilisateur choisit la décision `bloquer_lot` **et seulement dans ce cas**, le code applicatif appelle la RPC existante `set_of_quality_status(of_id, 'bloque', reason)` (statut qualité uniquement).

RLS :
- SELECT : tout authentifié
- INSERT : admin / resp_production / chef_ligne / bureau_methode / controleur_qualite (+ `declared_by = auth.uid()`)
- UPDATE : mêmes rôles + l'auteur (`declared_by = auth.uid()`)
- DELETE : admin uniquement

## 2. Page `/qualite/non-conformites`

Remplacer le placeholder `src/pages/qualite/QualiteNonConformites.tsx` par une page complète :

**Filtres** : recherche libre, OF (select sur OFs récents), type, sévérité, statut, plage de dates `detected_at`. Bouton **Réinitialiser les filtres** (`RotateCcw`) visible uniquement si filtres actifs.

**Tableau** : NC#, date détection, type, sévérité (badge), statut (badge), OF lié, produit, titre, décision, auteur. Tri par date desc.

**Bouton "Nouvelle NC"** ouvre `ResponsiveDialog` :
- Section identification : OF (optionnel, select), type, catégorie (texte), sévérité, titre, description, `detected_at` (datetime-local, défaut now), batch/lot
- Section liens optionnels : produit, ligne, shift, équipe, article, packaging_article, quality_check
- Section quantités : `detected_quantity`, `affected_quantity`, unité
- Section action immédiate : champ texte
- Bouton **Enregistrer comme brouillon** (status=draft) ou **Déclarer** (status=declared)

**Dialog "Décision & clôture"** (depuis ligne action) :
- Sélecteur de décision (enum), commentaire
- Si `decision = bloquer_lot` ET un `of_id` est lié → checkbox "Mettre le statut qualité OF à 'bloque'" (cochée par défaut), motif obligatoire ; appelle `set_of_quality_status` après l'update NC.
- Bouton "Clôturer la NC" exige `closure_comment`, met status=closed et `closed_at/closed_by`.

**Pré-remplissage depuis un contrôle hors tolérance** : support de `?from_check=<uuid>` en query string → pré-charge le contrôle (of_id, indicator, ligne, produit) dans le dialog d'ouverture. Bouton "Créer non-conformité" du `OfQualityTab` reste désactivé pour cette itération (sera activé dans une future itération une fois ce module testé en prod), mais on activera le bouton "Créer non-conformité" sur la liste `/qualite/controles` pour les contrôles `is_conform=false` (lien `?from_check=ID`).

**Export CSV** : toutes les colonnes visibles + lot/batch/décision.

Audit : `logAudit` sur create/update/decision/close, module `qualite`, entity_type `quality_non_conformity`, severity = `low` (minor), `medium` (major), `high` (critical).

## 3. Garanties d'isolation

- Aucun trigger DB sur `ordres_fabrication`, `consumptions`, `production_declarations`, `shifts`, `recipes`, `quality_checks`.
- Aucune écriture sur `ordres_fabrication.statut` depuis ce module.
- `ordres_fabrication.quality_status` modifié uniquement via la RPC `set_of_quality_status` existante, **sur action utilisateur explicite** (décision `bloquer_lot` + checkbox cochée).
- Pas de FK CASCADE : suppression d'un OF ne supprimera pas les NC (audit conservé).

## 4. Tests

`src/test/qualite/quality-non-conformities.test.ts` :
- Génération du payload NC pour OF (champs nullable corrects)
- Génération du payload NC emballage (sans of_id, avec packaging_article_id)
- Pré-remplissage depuis un contrôle hors tolérance (from_check) : copie of_id, product_id, line_id, quality_check_id
- Logique de décision `bloquer_lot` :
  - construit bien deux opérations : update NC + appel RPC `set_of_quality_status(of_id, 'bloque', reason)`
  - **n'inclut jamais `statut`** (production) dans aucun payload
- Logique de clôture : exige `closure_comment`, set `closed_at`/`closed_by`, status=closed
- Filtres (type/sévérité/statut/date) + reset
- Mapping sévérité → severity audit

## 5. Lien depuis QualiteControles (contrôles hors tolérance)

Modifier `src/pages/qualite/QualiteControles.tsx` : ajouter une colonne "Action" avec un petit bouton **"Créer NC"** (icône `AlertOctagon`) visible seulement quand `is_conform === false`, redirigeant vers `/qualite/non-conformites?from_check=<id>`.

## 6. Mémoire

Mettre à jour `mem://features/qualite-module` avec :
- table `quality_non_conformities` + enums
- règle d'or : NC ne touche jamais `statut` production ; seul `bloquer_lot` peut, sur consentement explicite, appeler `set_of_quality_status`
- pré-remplissage `?from_check=ID`

## Hors scope (non touché)
- `OfQualityTab` reste inchangé (bouton NC encore désactivé) — sera relié dans une itération suivante après validation utilisateur du nouveau module
- Pas de notifications automatiques (peut être ajouté plus tard via rules)
- Pas de pièces jointes (utilisera `entity-documents` / `entity-images` plus tard)
