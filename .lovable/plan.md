## Objectif

Renforcer la fiabilité des modules **Notifications** et **Validations** avec :
1. Une **suite de tests Vitest** couvrant un maximum de scénarios sur la logique pure (matchers, pré-flight, doublons, dispatcher, dedup).
2. Un **jeu de règles de démonstration** (seed SQL) couvrant les cas typiques d'usine pour permettre un test manuel exhaustif.

Aucun changement de schéma n'est nécessaire — uniquement de nouveaux fichiers de tests, un mock enrichi et une migration "seed" idempotente.

---

## 1. Tests unitaires (Vitest, logique pure)

### `src/test/notifications/match-conditions.test.ts`
Couvre `matchConditions` de `src/lib/validation.ts` :
- conditions nulles → match
- égalité simple (`priority: "high"`)
- tableau de valeurs (`priority: ["high","critical"]`)
- groupe `or` (au moins un sous-groupe matche)
- seuils numériques : `min_duration_minutes`, `ecart_seuil_pct` (valeur absolue), `min_age_hours`
- contexte vide ou champ absent → faux pour seuils, faux pour égalité
- combinaisons multi-clés (AND implicite)

### `src/test/notifications/evaluate-conditions.test.ts`
Couvre `evaluateConditions` (moteur `all`/`any` de `src/lib/notifications.ts`) :
- groupe `all` avec leaves `eq`/`gte`/`in`
- groupe `any` (un seul vrai suffit)
- imbrication `all > any > leaf`
- opérateurs : `eq, neq, gt, gte, lt, lte, in, nin, contains` (chaîne insensible à la casse)
- chemin imbriqué (`metadata.criticality`) via `getField`
- types incompatibles (string vs number sur `gt`) → faux
- conditions nulles ou indéfinies → vrai

### `src/test/notifications/build-entity-url.test.ts`
- Tous les `entity_type` listés (machine, ticket, of, article…) renvoient l'URL correcte.
- Type inconnu → `null`.
- `entity_id` manquant → `null`.

### `src/test/rules/preflight-notif-rule.test.ts`
- Nom/module/event manquants → erreurs.
- Module hors catalogue (sans `allowCustom`) → erreur ; avec `allowCustom` → OK.
- Event non standard pour le module → warning seulement.
- Aucun destinataire (roles + users) → warning.
- `channels` vide → erreur.
- Sévérité `critical` sans canal email → warning.
- Règle critique + quiet hours → warning.
- Conditions JSON string invalide → erreur ; valide → OK.

### `src/test/rules/preflight-validation-rule.test.ts`
- Champs obligatoires manquants → erreurs.
- Action hors catalogue → warning.
- `enforcement=blocking` sans validateur → **erreur bloquante** (cas critique du retour utilisateur).
- `enforcement=blocking` sur module terrain (`tickets`, `interventions`, `pdr_stock`) → warning.
- Validateurs présents (roles ou users) → pas d'erreur.

### `src/test/rules/find-duplicates.test.ts`
- 2 règles inactives identiques → pas de doublon (filtre `is_active`).
- 2 règles actives identiques (module/event/conditions) → doublon détecté.
- Conditions différentes → pas de doublon.
- Plusieurs groupes de doublons indépendants → tous remontés.

### `src/test/rules/rule-catalog.test.ts`
Garde-fou sur le catalogue (évite les régressions silencieuses) :
- Tous les `MODULES` ont un `label` et un `group`.
- Chaque clé de `NOTIF_EVENTS_BY_MODULE` et `VALIDATION_ACTIONS_BY_MODULE` existe dans `MODULES`.
- `getConditionFields` retourne au moins le set commun pour un module non listé.
- Les `defaultEnforcement` sont bien `post_hoc` ou `blocking`.

### `src/test/notifications/dedup-window.test.ts`
Test indirect : exporter (ou répliquer) la logique de fenêtre :
- `immediate` → 5 min
- `grouped_hourly` → 1h
- `grouped_daily` → 24h
Si la fonction reste interne, on testera via un petit wrapper exporté.

### Mock Supabase enrichi (`src/test/__mocks__/supabase.ts`)
Ajout de :
- `mockNotificationRules` (3 règles : tickets/critical, pdr_stock/out, audit/critical)
- `mockValidationRules` (3 règles : pdr correction blocking, ticket close post_hoc, of cancel blocking)
- `mockNotifications` (in_app non lue, lue, archivée)
- `mockValidationRequests` (1 submitted, 1 approved, 1 rejected)
- Entrées correspondantes dans `fromMap`.

---

## 2. Seed de règles de démonstration

### `supabase/migrations/<timestamp>_seed_notification_validation_rules.sql`
Migration **idempotente** (`ON CONFLICT DO NOTHING` ou `WHERE NOT EXISTS`), insère un jeu réaliste pour pouvoir tester chaque chemin dans l'UI.

**Notification rules (≈10) :**
| Module | Event | Sévérité | Conditions | Canaux |
|---|---|---|---|---|
| tickets | ticket_created | critical | `priority in [high,critical]` ou `machine_criticality=A` | in_app+email |
| tickets | ticket_resolved | info | `min_duration_minutes=60` | in_app |
| pdr_stock | pdr_stock_critical | high | `stock_actuel <= stock_min` | in_app+email |
| pdr_stock | pdr_stock_out | critical | aucune | in_app+email |
| pdr_stock | pdr_dead_age | high | `age_jours >= 365` | in_app |
| preventif | preventive_late | high | `days_late >= 3` | in_app+email |
| consommations | production_declaration_missing | medium | `hours_late >= 2` | in_app |
| consommations | consumption_correction | medium | `ecart_seuil_pct=10` | in_app |
| audit | audit_critical_event | critical | aucune (catch-all) | in_app+email |
| users | user_role_changed | high | aucune | in_app+email |

**Validation rules (≈8) :**
| Module | Action | Enforcement | Conditions | Validateurs |
|---|---|---|---|---|
| pdr_stock | correction | blocking | `ecart_seuil_pct=5` | resp_maintenance, admin |
| pdr_stock | inventaire | blocking | aucune | resp_maintenance, admin |
| pdr_stock | exit | post_hoc | aucune | resp_maintenance |
| tickets | resolve_critical | post_hoc | `priority in [high,critical]` | resp_maintenance |
| tickets | reopen | blocking | aucune | resp_maintenance, admin |
| consommations | correction | blocking | `ecart_seuil_pct=15` | resp_production |
| of | cancel | blocking | aucune | resp_production, admin |
| users | role_change | blocking | aucune | admin, responsable_si |

Chaque règle est insérée seulement si `name` n'existe pas déjà → relance sans danger.

---

## 3. Bénéfices pour l'utilisateur

- **Fiabilité** : chaque ajout futur sur le catalogue ou le moteur de conditions casse immédiatement les tests si une régression est introduite.
- **Démo / QA** : l'admin peut ouvrir `/parametres/notifications` et `/parametres/validations` et voir une dizaine de règles réalistes pré-configurées, prêtes à tester (création de ticket, sortie PDR, correction conso, etc.).
- **Pas d'impact runtime** : aucune nouvelle dépendance, aucune modification du code applicatif.

---

## Fichiers créés/modifiés

**Nouveaux :**
- `src/test/notifications/match-conditions.test.ts`
- `src/test/notifications/evaluate-conditions.test.ts`
- `src/test/notifications/build-entity-url.test.ts`
- `src/test/notifications/dedup-window.test.ts`
- `src/test/rules/preflight-notif-rule.test.ts`
- `src/test/rules/preflight-validation-rule.test.ts`
- `src/test/rules/find-duplicates.test.ts`
- `src/test/rules/rule-catalog.test.ts`
- `supabase/migrations/<timestamp>_seed_notification_validation_rules.sql`

**Modifiés :**
- `src/test/__mocks__/supabase.ts` → ajout des datasets règles/notifications/requests
- `src/lib/notifications.ts` → mineur : exporter `dedupWindowSince` (ou un alias) pour le test
