## Objectif

Créer un **module unifié `/parametres/access-control`** qui regroupe TOUTES les permissions, rôles, audits et workflows de sécurité dans une seule interface cohérente — sans casser l'existant et en restant 100% portable hors Lovable.

## Architecture cible

```text
/parametres/access-control                  ← Hub central (nouvelle page)
  ├─ Onglet "Vue d'ensemble"                ← KPIs + matrice résumée
  ├─ Onglet "Rôles"                         ← Liste rôles + rôles custom
  ├─ Onglet "Matrice modules"               ← role_permissions (existante enrichie qualité)
  ├─ Onglet "Documents"                     ← document_permissions (existante)
  ├─ Onglet "PDR & Stock"                   ← pdr_stock_permissions (existante)
  ├─ Onglet "Qualité"                       ← NOUVEAU quality_permissions
  ├─ Onglet "Workflows / Validations"       ← validation_permissions (existante)
  ├─ Onglet "Audit & Contrôle"              ← toggles audit par rôle/module
  └─ Onglet "Système de contrôle"           ← kill-switches globaux
```

Les pages actuelles (`/parametres/users`, `/parametres/roles`, `/parametres/document-permissions`, `/parametres/pdr-stock-permissions`) **restent fonctionnelles** (redirections + liens internes vers le hub).

## Détails par onglet

### 1. Vue d'ensemble
- KPIs : nb rôles actifs, nb utilisateurs par rôle, nb permissions accordées par catégorie
- Matrice condensée (rôles × catégories) avec compteur "X/Y permissions"
- Alertes : rôles sans permission, utilisateurs sans rôle, permissions orphelines

### 2. Rôles (incl. rôles personnalisés)
- Liste des 13 rôles enum + table `custom_roles` (nouvelle)
- Création/édition de rôles custom avec libellé, description, couleur, héritage d'un rôle de base
- Les rôles custom sont stockés en table dédiée (pas dans l'enum) pour rester additifs et portables
- Bouton "Cloner depuis…" pour copier les permissions d'un rôle existant

### 3. Matrice modules (existant amélioré)
- Réutilise `RolesMatrix.tsx` mais intégré comme onglet
- Ajoute colonnes pour les nouveaux rôles qualité (déjà fait en partie)
- Filtres par groupe de modules (Maintenance / Production / Qualité / Système)
- Recherche, export CSV, import CSV (pour migration)

### 4. Documents
- Réutilise `DocumentPermissionsAdmin.tsx` comme onglet

### 5. PDR & Stock
- Réutilise `PdrStockPermissionsAdmin.tsx` comme onglet

### 6. Qualité (NOUVEAU)
Nouvelle table `quality_permissions` avec actions granulaires :
- `can_create_check`, `can_validate_check`, `can_reject_check`
- `can_create_nc`, `can_close_nc`, `can_decide_nc`
- `can_create_action`, `can_verify_action`, `can_close_action`
- `can_manage_indicators`, `can_manage_assignments`
- `can_publish_recipe`, `can_publish_bom`
- `can_export_tracability`, `can_view_reports`

### 7. Workflows / Validations
- Réutilise `validation_permissions` (déjà en base)
- Ajoute lien vers `/parametres/validations` (règles) et `/parametres/notifications` (règles notif)

### 8. Audit & Contrôle (NOUVEAU)
Nouvelle table `audit_role_settings` :
- `role`, `module`, `audit_enabled` (bool), `severity_threshold` (info/warning/critical)
- Permet d'activer/désactiver la journalisation audit par rôle × module
- Toggle global "tracer toutes les actions admin" (recommandé ON)
- Vue temps réel des derniers événements audit filtrés

### 9. Système de contrôle (kill-switches globaux)
Stockés dans `app_settings` (clés dédiées) :
- `control.enforce_validations` : active/désactive le moteur de validations bloquantes
- `control.enforce_notifications` : active/désactive l'envoi de notifications
- `control.enforce_audit` : active/désactive l'audit (toujours laisser ON en prod)
- `control.enforce_rls_strict` : mode strict pour les modules sensibles
- `control.allow_custom_roles` : autorise les rôles personnalisés
- `control.maintenance_mode` : bloque les écritures non-admin

Chaque toggle affiche : description, dernière modification, qui l'a modifié, impact estimé.

## Self-hosting & migration hors Lovable

Section dédiée "Portabilité" dans l'onglet Système :
- **Export complet** (bouton) : JSON contenant tous les rôles, permissions, settings → `access-control-export-YYYY-MM-DD.json`
- **Import** depuis JSON (avec dry-run et diff avant application)
- **Génération de migration SQL** : produit un fichier `.sql` reproductible avec tous les `INSERT` de permissions courantes — utile pour bootstrapper une instance Supabase auto-hébergée
- Documentation MANUAL.md mise à jour avec section "Migration hors Lovable" : étapes Supabase CLI, variables d'env, edge functions

## Schéma de base à créer

```sql
-- Rôles personnalisés (additif à l'enum)
CREATE TABLE custom_roles (
  id uuid PK, code text UNIQUE, label text, description text,
  color text, inherits_from app_role, is_active bool, created_by, timestamps
);

-- Permissions qualité granulaires
CREATE TABLE quality_permissions (
  id uuid PK, role text UNIQUE,
  can_create_check bool, can_validate_check bool, can_reject_check bool,
  can_create_nc bool, can_close_nc bool, can_decide_nc bool,
  can_create_action bool, can_verify_action bool, can_close_action bool,
  can_manage_indicators bool, can_manage_assignments bool,
  can_publish_recipe bool, can_publish_bom bool,
  can_export_tracability bool, can_view_reports bool,
  timestamps
);

-- Audit configurable par rôle/module
CREATE TABLE audit_role_settings (
  id uuid PK, role text, module text,
  audit_enabled bool DEFAULT true,
  severity_threshold text DEFAULT 'info',
  UNIQUE(role, module), timestamps
);

-- Fonction helper (security definer)
CREATE FUNCTION has_quality_permission(_user_id uuid, _action text) RETURNS bool ...
CREATE FUNCTION is_audit_enabled(_role text, _module text) RETURNS bool ...
```

RLS : admin + responsable_si peuvent gérer ; tous les authentifiés lisent leurs propres permissions.

## Garanties de non-régression

- **Tables existantes intactes** : `role_permissions`, `document_permissions`, `pdr_stock_permissions`, `validation_permissions` ne sont PAS modifiées en structure
- **Routes existantes préservées** : `/parametres/users`, `/parametres/roles`, etc. restent accessibles
- **Aucun droit qualité auto-attribué** : `quality_permissions` créée vide ; seuls admin et `directeur_qualite` reçoivent les droits par défaut via seed explicite
- **Backward compat** : tous les `usePermissions()`, `useDocumentPermissions()`, `usePdrStockPermissions()` existants continuent de fonctionner

## Tests

- `src/test/parametres/access-control-hub.test.tsx` : navigation entre onglets, fallback rôles
- `src/test/parametres/quality-permissions.test.ts` : matrice qualité, defaults vides
- `src/test/parametres/custom-roles.test.ts` : création + héritage + suppression sécurisée
- `src/test/parametres/audit-toggles.test.ts` : activation/désactivation audit par rôle
- `src/test/parametres/control-switches.test.ts` : kill-switches respectés côté hooks
- Vérification non-régression : GMAO, GPAO, OF, Shift, Tickets, PDR, Notifications, Audit, RLS

## Fichiers à créer / modifier

**Nouveaux**
- `src/pages/parametres/AccessControlHub.tsx` (page hub avec tabs)
- `src/pages/parametres/access-control/RolesTab.tsx`
- `src/pages/parametres/access-control/QualityPermissionsTab.tsx`
- `src/pages/parametres/access-control/AuditControlTab.tsx`
- `src/pages/parametres/access-control/ControlSwitchesTab.tsx`
- `src/pages/parametres/access-control/PortabilityTab.tsx`
- `src/hooks/useQualityPermissions.ts`
- `src/hooks/useCustomRoles.ts`
- `src/hooks/useControlSwitches.ts`
- `src/hooks/useAuditRoleSettings.ts`
- `src/lib/accessControlExport.ts` (export/import JSON + génération SQL)
- 1 migration SQL (3 tables + 2 fonctions + RLS + seeds vides)
- 5 fichiers de tests

**Modifiés**
- `src/App.tsx` : ajout route `/parametres/access-control`
- `src/pages/Parametres.tsx` : nouvelle carte "Sécurité, Rôles & Accès" en tête de groupe
- `src/lib/audit.ts` : check `is_audit_enabled()` avant insertion
- `src/lib/notifications.ts` + `src/lib/qualityNotifications.ts` : check kill-switches
- `MANUAL.md` : section self-hosting + portabilité

## Confirmation finale après implémentation

- Hub `/parametres/access-control` opérationnel avec 9 onglets
- Anciennes pages toujours fonctionnelles
- Aucun rôle existant cassé, aucune permission auto-élevée
- Tests verts : GMAO, GPAO, OF, Shift, Tickets, PDR, Notifications, Audit, RLS
- Export/Import JSON fonctionnel
- Migration SQL générable pour self-hosting