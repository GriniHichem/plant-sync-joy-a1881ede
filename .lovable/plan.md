# Module Validation & Approbation — V1 (terrain non bloquant)

Principe directeur : **la réalité terrain est prioritaire**. La validation est un contrôle **a posteriori** pour les actions opérationnelles (intervention, sortie PDR liée à un ticket, déclarations shift, résolution technique). Elle est **a priori (bloquante)** uniquement pour un petit ensemble d'actions administratives sensibles (annulation/correction stock manuelle, suppressions, changements de rôles/permissions, modifications rétroactives importantes).

Aucun workflow existant n'est cassé. Si aucune règle active ne couvre une action → comportement actuel inchangé.

## Deux modes de validation

| Mode | Quand | Effet sur l'action terrain |
|------|-------|----------------------------|
| **post_hoc** (par défaut terrain) | Intervention, résolution technique, sortie PDR liée à un ticket, déclaration panne/arrêt, déclaration prod, déclaration consommation shift, clôture shift | Action **appliquée immédiatement**. `validation_status = pending`. Demande créée + responsable notifié. |
| **blocking** (administratif seulement) | Annulation mouvement stock, correction stock manuelle (hors intervention), correction d'une consommation déjà validée, suppression sensible, changement rôle/permission, modification règle notif/validation, archivage doc sensible | Action **non appliquée** tant que non approuvée. Demande en `submitted`. |

Le mode est porté par chaque `validation_rule` via un champ `enforcement` enum `post_hoc | blocking`.

## Base de données

### Table `validation_requests`
Tous les champs demandés, plus :
- `enforcement` enum `post_hoc | blocking` (déduit de la règle au moment de la création)
- `status` enum : `draft | submitted | pending_post_hoc | approved | rejected | cancelled | applied | archived`
  - `pending_post_hoc` : action déjà appliquée terrain, en attente de validation responsable
  - `submitted` : action bloquée, en attente
- `applied_at` : timestamp de l'application réelle (pour `post_hoc`, == created_at ; pour `blocking`, == approved_at)
- `target_record_id` : id de l'enregistrement métier déjà créé (pour les cas `post_hoc`, ex: id du `pdr_stock_movements`, id de `consumptions`, id du `tickets`)
- Indexes : `created_at`, `status`, `module`, `entity_type`, `entity_id`, `submitted_by_user_id`, `assigned_validator_user_id`, `priority`, `enforcement`

### Table `validation_rules`
Champs demandés + :
- `enforcement` enum `post_hoc | blocking` (default `post_hoc`)
- `conditions` JSONB simple (égalité / OR sur `priority`, `criticite`, `impact_ligne`, `ecart_seuil`, etc.)

### Colonnes ajoutées (toutes nullable, additives)
- `tickets.validation_status text` (`null | not_required | pending | approved | rejected`)
- `tickets.validation_request_id uuid`
- `pdr_stock_movements.validation_status text`, `pdr_stock_movements.validation_request_id uuid`
- `pdr_stock_movements.applied boolean default true` (toujours `true` en post_hoc ; `false` tant que non approuvé en blocking)
- `consumptions.validation_status text`, `consumptions.validation_request_id uuid`
- Aucun statut enum existant n'est modifié.

### RLS
- `validation_requests` : SELECT ouvert au demandeur, validateur assigné, rôles validateurs de la règle, admin, responsable_si, auditeur. INSERT authenticated. UPDATE via security definer `can_validate_request`. DELETE admin.
- `validation_rules` : SELECT authenticated. ALL via `can_manage_validation_rule(_user_id, _module)` (admin + responsable_si).

### Permissions
Module `validations` ajouté à `role_permissions` + table fine `validation_permissions` similaire à `pdr_stock_permissions` :
`view_own, view_all, submit, approve, reject, cancel, configure_rules, view_technical_details`

Defaults :
- admin : tout
- responsable_si : view_all, approve, reject, configure_rules, view_technical_details
- resp_maintenance : view_all + approve/reject sur scope GMAO/PDR/tickets/préventif/interventions
- resp_production : view_all + approve/reject sur scope GPAO/OF/conso/arrêts
- gestionnaire_magasin : submit, view_own, approve uniquement sur règles le permettant
- maintenancier, chef_ligne, opérateur : submit, view_own
- auditeur : view_all read-only

## Règles par défaut seedées

| # | Action | enforcement | priority | validateurs |
|---|--------|-------------|----------|-------------|
| 1 | Sortie PDR liée à ticket/intervention | `post_hoc` | medium | resp_maintenance, gestionnaire_magasin |
| 2 | Résolution technique ticket critique (priority=high OR machine.criticite=critique OR impact_ligne=arret_complet) | `post_hoc` | high | resp_maintenance, admin |
| 3 | Intervention curative terminée | `post_hoc` | medium | resp_maintenance |
| 4 | Déclaration arrêt long (durée > seuil paramétrable, ex 60 min) | `post_hoc` | high | resp_production |
| 5 | Clôture shift avec écart consommation important | `post_hoc` | medium | resp_production |
| 6 | Correction stock manuelle (hors intervention) | **`blocking`** | high | admin, resp_maintenance, gestionnaire_magasin |
| 7 | Annulation mouvement stock | **`blocking`** | critical | admin, resp_maintenance |
| 8 | Inventaire stock PDR avec écart > seuil | **`blocking`** | high | gestionnaire_magasin, resp_maintenance |
| 9 | Correction consommation déjà validée | **`blocking`** | high | resp_production, admin |
| 10 | Modification rétroactive production (>24h) | **`blocking`** | high | resp_production |

Les règles administratives (changements rôles/permissions, suppressions sensibles, archivage docs) : **structure prête** mais pas de seed en V1 (activable plus tard via `/parametres/validations`).

## Couche logique partagée — `src/lib/validation.ts`

```ts
// Évalue les règles applicables
checkValidationRequired({ module, action, entity, context }): {
  rule: ValidationRule | null;
  enforcement: 'post_hoc' | 'blocking' | 'none';
}

// Mode bloquant : crée la demande, n'applique RIEN
createBlockingValidationRequest(payload): Promise<ValidationRequest>

// Mode post-hoc : enregistre la demande APRÈS que l'action métier a été appliquée
recordPostHocValidationRequest({ ...payload, target_record_id }): Promise<ValidationRequest>

// Approbation
approveValidationRequest(id, comment): 
  - blocking → exécute la mutation réelle (apply...) puis status='applied'
  - post_hoc → marque target_record.validation_status='approved', status='approved'

rejectValidationRequest(id, reason):
  - blocking → rien à défaire, status='rejected'
  - post_hoc → marque target_record.validation_status='rejected', notifie demandeur,
              NE défait PAS automatiquement (un responsable décidera de la correction manuelle)
              Exception : pour un ticket, le statut métier peut être ramené de "resolu_techniquement" à "en_cours" (champ statut existant inchangé, on agit via validation_status)

cancelValidationRequest(id) // par le demandeur tant que pending
```

Toutes les transitions appellent `logEvent` (module=`validations`) et `triggerNotification` avec nouveaux events :
`validation_request.created / approved / rejected / cancelled / applied / overdue`.
La déduplication 24h `notification_email_log` existante est réutilisée.

## Intégrations métier V1

### A. PDR — `src/pages/PdrDetail.tsx`
- **Sortie liée à intervention/ticket** (champ `source_type='ticket'|'intervention'`) : insert mouvement immédiat (stock décrémenté), puis `recordPostHocValidationRequest` selon règle 1. **Aucun blocage**.
- **Entrée normale, sortie sans ticket** : inchangé, pas de validation.
- **Correction manuelle / Inventaire / Annulation** : `checkValidationRequired` → si règle `blocking` matche, **ne pas insérer** le mouvement, créer demande `submitted`. Application réelle au moment de l'approbation.
- Inventaire : la règle 8 ne déclenche le bloquant que si `|stock_compté - stock_actuel| > seuil` (seuil dans `app_settings`, default 5%).

### B. Consommations — `src/pages/gpao/ConsumptionPage.tsx`
- **Saisie shift normale** : inchangée, pas de validation. Si l'écart prévu/réel dépasse seuil règle 5 → `recordPostHocValidationRequest` après insert.
- **Correction d'une conso déjà validée / hors jour** (cas existant `production_correction`) : règle 9 `blocking` → la modif n'est pas appliquée tant que non approuvée.

### C. Tickets — `src/pages/TicketDetail.tsx`
- **Prise en charge, intervention en cours, saisie résolution technique** : **jamais bloqués**.
- À la résolution d'un ticket matchant règle 2 (critique) :
  - on garde le statut métier existant (`resolu` actuel) **inchangé** côté enum
  - on positionne `tickets.validation_status='pending'`
  - badge UI "Résolu techniquement — en attente validation responsable"
  - `recordPostHocValidationRequest` créée
  - la ligne peut redémarrer, l'intervention est enregistrée, les PDR consommées sont décrémentées
- Tickets non critiques : workflow strictement inchangé.

### D. Interventions
- `interventions.statut` enum existant inchangé.
- Ajout colonne nullable `validation_status` sur `interventions`.
- Règle 3 : à la clôture d'intervention curative → post_hoc, notif resp_maintenance.

### E. Arrêts production
- Règle 4 : à la création/clôture d'un arrêt avec durée > seuil → post_hoc, notif resp_production. Pas de blocage de la clôture shift.

## Frontend

### Page `/validations` (`src/pages/ValidationsPage.tsx`)
- KPI : En attente / Critiques / Validées aujourd'hui / Rejetées / Mes demandes / Stock / Maintenance / Production / **Post-hoc en attente** / **Bloquantes en attente**
- Filtres : période, statut, module, type, priorité, **enforcement (post_hoc/blocking)**, demandeur, validateur, rôle validateur, entité, code, recherche texte (titre/description/justification/code/label/module/type/email/nom). Bouton Reset (`RotateCcw`) selon convention projet.
- Tableau paginé serveur (50/page). Badge visuel distinct **post_hoc** (gris/info) vs **blocking** (orange/rouge).
- Sheet détail : titre, description, justification, demandeur, entité (lien), `changed_fields` lisible, priorité, statut, enforcement, commentaire validation, motif rejet, historique. Boutons Approuver / Rejeter / Annuler / Ouvrir entité.
- Section "Détails techniques" (JSON brut) gated par `validations.view_technical_details`.

### Page `/parametres/validations`
- Liste règles + dialog création/édition (pattern `RuleEditorDialog`).
- Champs : nom, description, module, entity_type, action_type, **enforcement (post_hoc/blocking)**, is_active, is_required, priority, validator_roles, validator_users, conditions (form simple clé/valeur), auto_approve_if_low_risk.
- Avertissement UI clair quand l'admin passe une règle terrain en `blocking` : "Cette règle bloquera l'opération terrain en attendant validation. À utiliser uniquement pour des actions administratives."
- Accessible : admin, responsable_si.

### Composants nouveaux
- `src/components/validations/ValidationKpiCards.tsx`
- `src/components/validations/ValidationFilters.tsx`
- `src/components/validations/ValidationTable.tsx`
- `src/components/validations/ValidationDetailSheet.tsx`
- `src/components/validations/RuleEditorDialog.tsx`
- `src/hooks/useValidations.ts`, `src/hooks/useValidationPermissions.ts`

### Navigation
- Entrée "Validations" dans `AppSidebar` (icône `ShieldCheck`) + badge pulse pour demandes pertinentes à l'utilisateur (validateur).
- Tile dans `/apps` (groupe Sécurité).
- Tile dans `/parametres` groupe "Sécurité & Accès" → `/parametres/validations`.

## Audit
Chaque transition validation génère un log `module=validations` avec entity lisible. Pour éviter la duplication : le log métier existant (mouvement stock, consommation, résolution) reste tel quel ; le log validation est complémentaire (`validation_request.created`, `.approved`, etc.).

## Sécurité
- `SENSITIVE_FIELDS` dans `src/lib/validation.ts` : password, token, api_key, smtp_password, document_content. Si modifié → `changed_fields` contient seulement le nom, `old/proposed_values` masquent par `"***"`.
- Aucune nouvelle exposition de secret.
- Toutes les nouvelles RLS additives.

## Garanties anti-régression
- Aucun champ existant supprimé/renommé.
- Aucun statut enum existant modifié (`tickets.statut`, `interventions.statut`, `pdr_stock_movements.type`, `consumptions`, `of_statut` : tous inchangés).
- Toutes les nouvelles colonnes nullable, defaults compatibles.
- Si `validation_rules` vide ou règle inactive → branche "no validation" → comportement strictement identique à aujourd'hui.
- Tests Vitest : `validation-logic.test.ts` (matching règle, enforcement post_hoc vs blocking, conditions), `validations-page.test.tsx` (filtres + permissions), `validation-pdr-flow.test.ts` (sortie urgente non bloquée), `validation-ticket-critical.test.ts` (résolution technique non bloquée).

## Fichiers

**Migrations**
- `validation_requests`, `validation_rules`, `validation_permissions`
- colonnes nullable `validation_status`, `validation_request_id` sur `tickets`, `pdr_stock_movements`, `consumptions`, `interventions`
- colonne nullable `applied boolean default true` sur `pdr_stock_movements`
- security definers `can_validate_request`, `can_manage_validation_rule`
- seed des 10 règles par défaut + permissions par défaut

**Code nouveau**
- `src/lib/validation.ts`
- `src/hooks/useValidations.ts`, `src/hooks/useValidationPermissions.ts`
- `src/pages/ValidationsPage.tsx`
- `src/pages/parametres/ValidationRulesAdmin.tsx`
- `src/components/validations/*` (5 fichiers)
- `src/test/validations/*`

**Code modifié (additif uniquement)**
- `src/App.tsx`, `src/pages/Apps.tsx`, `src/pages/Parametres.tsx`, `src/components/gmao/AppSidebar.tsx`
- `src/lib/notifications.ts` (nouveaux event_types `validation_request.*`)
- `src/pages/PdrDetail.tsx` (post_hoc sur sortie liée intervention, blocking sur correction/inventaire/annulation)
- `src/pages/gpao/ConsumptionPage.tsx` (post_hoc écart shift, blocking correction conso validée)
- `src/pages/TicketDetail.tsx` (post_hoc résolution critique, jamais bloquant)
- `MANUAL.md` (chapitre "Validations & Approbations" + tableau post_hoc vs blocking)
- mémoire projet (`mem://features/validation-system`)
