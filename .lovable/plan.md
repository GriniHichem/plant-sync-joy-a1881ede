# Module Actions Qualité (CAPA)

Suivi des actions curatives / correctives / préventives issues des non-conformités. Strictement isolé des tickets/interventions de maintenance — table dédiée `quality_actions`.

## 1. Migration DB

### Enums
- `quality_action_type` : `curative`, `corrective`, `preventive`
- `quality_action_status` : `open`, `in_progress`, `done`, `verified`, `closed`, `cancelled`
- `quality_action_priority` : `low`, `medium`, `high`, `critical`

### Table `quality_actions`
Champs demandés :
- `id` uuid PK, `nc_id` uuid nullable, `of_id` uuid nullable
- `title` text NOT NULL, `description` text
- `action_type` enum NOT NULL, `priority` enum NOT NULL default `medium`, `status` enum NOT NULL default `open`
- `responsible_user_id` uuid nullable, `due_date` date nullable
- `verification_comment` text nullable
- `created_by` uuid (= `auth.uid()`), `created_at`/`updated_at` timestamptz
- `closed_at` timestamptz nullable, `closed_by` uuid nullable
- `verified_at` timestamptz nullable, `verified_by` uuid nullable
- `search_vector` tsvector

### Triggers
- `quality_actions_validate` : whitelist enums (ceinture+bretelle), si `status='closed'` exige `verification_comment` non vide + remplit `closed_at`/`closed_by` ; si `status='verified'` remplit `verified_at`/`verified_by`. Met à jour `updated_at`.
- `quality_actions_search_refresh` (FTS sur title/description/verification_comment).

**Aucun trigger** sur `tickets`, `interventions`, `ordres_fabrication`, `quality_non_conformities`. Liens via `nc_id`/`of_id` simplement uuid nullable, pas de FK CASCADE.

### RLS
- SELECT : tout authentifié.
- INSERT/UPDATE : admin / resp_production / chef_ligne / bureau_methode / controleur_qualite / responsible_user_id = auth.uid() / created_by = auth.uid().
- DELETE : admin uniquement.

### Indexes
`(status)`, `(responsible_user_id)`, `(nc_id)`, `(due_date)`.

## 2. Page `/qualite/actions`

Remplacer le placeholder `src/pages/qualite/QualiteActions.tsx`.

**Filtres** : recherche libre, statut, responsable (select users), priorité, NC liée (texte sur nc_number), période `due_date`. Bouton **Réinitialiser** (`RotateCcw`) conditionnel.

**Tableau** : titre, type, priorité (badge), statut (badge), responsable, échéance (badge rouge si en retard), NC liée (NC-#####), OF, créée le.

**Bouton "Nouvelle action"** → `ResponsiveDialog` :
- Section : NC (optionnel, select sur NC récentes), OF (optionnel), titre, description
- Type, priorité, responsable, échéance
- Bouton **Créer**

**Dialog "Mettre à jour"** (depuis ligne) :
- Sélecteur statut (open → in_progress → done → verified → closed) ou cancelled
- Si statut = closed → champ `verification_comment` obligatoire
- Possibilité d'éditer responsable / échéance / priorité
- Boutons "Marquer terminée" (raccourci status=done), "Vérifier efficacité" (status=verified + commentaire), "Clôturer"

**Export CSV** : toutes colonnes visibles.

**Audit** : `logAudit` module `qualite`, entity_type `quality_action`, sur create / status_change / close. Sévérité : critical/high → `medium`, autres → `info`.

## 3. Onglet "Actions" dans le détail NC

Modifier `src/pages/qualite/QualiteNonConformites.tsx` (déjà 775 lignes — la page liste les NC dans une table) : remplacer le clic-ligne par un dialog/sheet de détail NC contenant deux onglets :
- **Détails** (infos actuelles : décision, clôture, etc.)
- **Actions** : liste des `quality_actions` où `nc_id = current.id` + bouton "Nouvelle action" pré-rempli avec `nc_id` et `of_id` de la NC.

Alternative plus légère (préférée pour limiter la diff) : ajouter une mini-section "Actions liées" dans le dialog "Décision & clôture" existant + un raccourci "Créer action" (icône `ListTodo`) sur chaque ligne NC du tableau, qui redirige vers `/qualite/actions?from_nc=<nc_id>` (le dialog "Nouvelle action" se pré-remplit via query string).

→ **Approche retenue** : raccourci par ligne NC + pré-remplissage `?from_nc=ID&from_of=OF_ID`. Plus simple, cohérent avec le pattern `?from_check=` déjà en place, et évite de réécrire la page NC.

## 4. Notifications

Trois `notification_rules` insérées via migration (event_type sous module `qualite`) :
- `qualite_action_assigned` (severity `info`, in_app, immediate) → déclenché à la création / changement de `responsible_user_id`. Cible : `responsible_user_id`.
- `qualite_action_overdue` (severity `medium`, in_app) → utilise le système d'événements existant ; déclenchement par `supabase/functions/check-deadlines` (déjà en place pour les tickets). Étendre la fonction pour scanner aussi `quality_actions` où `due_date < today AND status NOT IN ('done','verified','closed','cancelled')`.
- `qualite_action_closed` (severity `info`, in_app) → déclenché à status=closed. Cible : créateur + responsable.

Utilisation du pattern existant : insérer `notifications` côté client après l'update (cohérent avec NC). Pas de trigger DB sur notifications.

## 5. Audit

`logAudit` côté client à chaque opération (création, changement statut, clôture). Module `qualite`, entity_type `quality_action`, entity_label = title, entity_code = id court.

## 6. Tests

`src/test/qualite/quality-actions.test.ts` :
- `validateActionForm` : titre obligatoire, type obligatoire
- `buildActionInsertPayload` : champs nullable (nc_id/of_id), `created_by` injecté, status default `open`
- `buildStatusUpdatePayload` : 
  - status=closed → exige `verification_comment`, ajoute `closed_at`/`closed_by`
  - status=verified → ajoute `verified_at`/`verified_by`
  - n'inclut **jamais** `tickets`/`interventions`/`statut` production
- `buildOverdueDetector` : retourne true si due_date < today ET status ouvert
- `filterActions` : statut, responsable, priorité, période, NC, recherche + reset
- Notifications : `buildAssignmentNotificationPayload` cible bien `recipient_user_id = responsible_user_id`, jamais `tickets`
- Audit : sévérité critical/high → `medium`

## 7. Garanties d'isolation

- Table dédiée `quality_actions` : aucun conflit avec `interventions` (maintenance), `validation_requests`, `notification_rules.action_type` (qui est juste une colonne text).
- Liens `nc_id`/`of_id` simplement uuid nullable, pas de FK CASCADE.
- Aucun trigger sur `ordres_fabrication`, `tickets`, `interventions`, `quality_non_conformities`.
- Code séparé : composant et hook préfixés `Quality*` / `quality_*`.

## 8. Mémoire

Mettre à jour `mem://features/qualite-module` avec :
- table `quality_actions` + 3 enums
- workflow CAPA depuis NC (`?from_nc=ID&from_of=ID`)
- 3 règles de notifications qualité
- isolation stricte vs maintenance/tickets

## Hors scope
- Pas de dépendances entre actions (préalable / dépendant) — pourra venir plus tard.
- Pas de pièces jointes (réutilisera `entity-documents` plus tard).
- Pas d'intégration KPI dashboard qualité (séparé).
