## Module Audit & Traçabilité

Mise en place d'un module d'audit complet avec table étendue, helper de journalisation, page `/audit` riche (KPI, filtres, table paginée serveur, détails, export CSV) et permissions RLS par rôle.

---

### 1. Migration SQL — étendre `audit_logs`

La table actuelle `audit_logs` est minimaliste (action, table_name, record_id, old/new). On l'étend de façon **non destructive** (ALTER ADD COLUMN IF NOT EXISTS) pour ne casser aucun usage existant.

**Nouvelles colonnes :**
- `user_email`, `user_full_name` text
- `action_type` text (login, logout, create, update, delete, status_change, role_change, permission_change, stock_entry, stock_exit, stock_inventory, stock_correction, production_declaration, production_correction, document_upload/download/delete, import_csv, export_csv, access_denied, error)
- `module` text (auth, users, roles, permissions, machines, equipements, organes, pdr, pdr_stock, tickets, interventions, preventif, lignes, gpao, of, produits, articles, recettes, consommations, arrets, documents, images, parametres)
- `entity_type`, `entity_id` (uuid), `entity_code`, `entity_label`
- `action_label`, `description` text
- `changed_fields` jsonb
- `ip_address` inet, `user_agent` text
- `status` text CHECK (success|failed|denied|warning) DEFAULT 'success'
- `severity` text CHECK (info|low|medium|high|critical) DEFAULT 'info'
- `source` text CHECK (app|auth|database|edge_function|system) DEFAULT 'app'
- `metadata` jsonb
- `archived_at` timestamptz

**Indexes :** `created_at DESC`, `user_id`, `module`, `action_type`, `entity_type`, `entity_id`, `status`, `severity`, plus index GIN trigram sur `description || entity_code || entity_label || user_email` pour la recherche globale.

**RLS — remplacer la policy SELECT actuelle :**
- Fonction `has_audit_access(_uid, _module text DEFAULT NULL)` SECURITY DEFINER :
  - admin / `responsable_si` / `auditeur` → tous modules
  - `resp_maintenance` → modules GMAO (machines, equipements, organes, tickets, interventions, preventif, pdr, pdr_stock, lignes)
  - `resp_production` → modules GPAO (gpao, of, produits, articles, recettes, consommations, arrets)
  - autres → false
- Policy SELECT : `has_audit_access(auth.uid(), module)` AND `archived_at IS NULL OR (filtre côté app)`
- Policy INSERT existante conservée (`auth.uid() = user_id`)
- Pas de DELETE/UPDATE (immutabilité)

**Nouveaux rôles app_role :** ajouter `responsable_si` et `auditeur` à l'enum `app_role` (ALTER TYPE ... ADD VALUE IF NOT EXISTS).

**Permissions — table existante `role_permissions` :** ajouter le module `'audit'` avec actions view/create/edit/delete (mappées sur view/export/technical/archive).

---

### 2. Helper de journalisation `src/lib/audit.ts`

Fonction `logAudit(params)` qui insère dans `audit_logs` avec :
- `user_id`, `user_email`, `user_full_name` lus depuis `useAuth` / session
- `user_agent` depuis `navigator.userAgent`
- `ip_address` laissée null (impossible côté client de façon fiable — laissée à edge functions plus tard)
- Calcule `changed_fields` automatiquement par diff `old_values` vs `new_values`
- **Masquage automatique** des clés sensibles : `password`, `token`, `api_key`, `secret`, `*_key`, `authorization` → remplacées par `"***"` avant insert
- Construit `description` lisible si non fournie (template par action_type/module)
- Try/catch silencieux pour ne jamais bloquer l'action métier

Hooks d'usage :
- `useLogAudit()` retourne `logAudit` lié à l'utilisateur courant
- Wrapper `withAudit(supabaseCall, auditParams)` pour combiner mutation + log
- Helper `logAuthEvent(type)` appelé dans `AuthContext` (signIn success/fail, signOut, password reset)
- Helper `logAccessDenied(module, route)` appelé dans `ProtectedRoute` quand `has_role` échoue

**Intégration progressive (Phase 1 = critique) :**
- AuthContext : login/logout/reset
- UserAdmin : create/activate/role add/remove
- DocumentPermissionsAdmin / pdr_stock_permissions / role_permissions : modifications
- PDR stock movements (entry/exit/inventory/correction/cancel)
- Tickets : create/update/close + Interventions
- Préventif : create/validate/execute
- OF : create/update/cancel + mode shift change
- Production declarations + corrections (avec motif)
- Consumptions + corrections
- Arrêts production
- Documents : upload/download/delete + métadonnées
- Images : upload/delete/set_primary
- Machines/Equipements/Organes : CRUD + status_change
- Imports/Exports CSV (compteurs lignes ok/rejetées)
- ProtectedRoute : access_denied

---

### 3. Page `/audit` — UI

Route protégée par `audit.view`. Ajoutée dans `AppTopBar` (menu Paramètres) et `Apps`.

**Structure (`src/pages/AuditPage.tsx`) :**

```text
┌─ Header (titre + bouton "Réinitialiser" + "Exporter CSV") ─┐
│                                                             │
├─ KPI Cards (8) ────────────────────────────────────────────┤
│ Total · Aujourd'hui · Critiques · Refusées · Erreurs       │
│ Connexions jour · Modifs sensibles · Activité PDR          │
│                                                             │
├─ Filtres rapides (chips) ──────────────────────────────────┤
│ Aujourd'hui | Semaine | Mois | Critiques | Refusés | ...  │
│                                                             │
├─ Filtres avancés (collapsible) ────────────────────────────┤
│ Période · User · Module · Action · Statut · Sévérité       │
│ Type entité · Code entité · IP · Source · Recherche libre  │
│                                                             │
├─ Table (colonnes ci-dessus) ───────────────────────────────┤
│ Skeleton loader · pagination serveur · tri date desc       │
└─────────────────────────────────────────────────────────────┘
```

**Composants :**
- `src/components/audit/AuditKpiCards.tsx`
- `src/components/audit/AuditFilters.tsx` (chips + form avancé)
- `src/components/audit/AuditTable.tsx` (badges colorés statut/sévérité)
- `src/components/audit/AuditDetailSheet.tsx` (Sheet Radix avec tabs Général / Valeurs / Technique)
- `src/hooks/useAuditLogs.ts` (fetch paginé serveur + count, dépendances filtres)

**Détails (Sheet) :**
- Section Général : user, module, action, entité, description, date, statut, sévérité
- Section Valeurs : tableau diff `changed_fields` avec ancien/nouveau (champs sensibles affichés "valeur masquée")
- Section Technique (visible si `audit.view_technical_details`) : IP, user_agent, JSON brut old_values/new_values/metadata, source
- Boutons contextuels selon `entity_type` → "Voir machine/PDR/ticket/OF/utilisateur" via `useNavWithFrom`

**Recherche globale :** filtre serveur avec `or(...)` Supabase sur `user_email,user_full_name,module,action_type,entity_type,entity_code,entity_label,action_label,description` (ilike).

**Export CSV :**
- Réutilise les filtres actifs, pagine par 1000 jusqu'à fin
- UTF-8 BOM, séparateur `;`, nom `audit_logs_YYYY-MM-DD.csv`
- Colonnes par défaut : date, user, email, module, action, entité, description, statut, sévérité, IP, source
- Checkbox "Inclure JSON technique" visible seulement si admin → ajoute old_values, new_values, metadata sérialisés

---

### 4. Permissions appliquées en UI

- Route `/audit` : redirection si pas `check_permission(uid, 'audit', 'view')`
- Bouton Export : visible si `audit.export` (= edit dans la matrice mappée)
- Onglet Technique du Sheet : si `audit.view_technical_details` (= delete mappé) — sinon section masquée
- Toggle "Inclure archives" (filtre `archived_at`) : visible pour admin/responsable_si

Ajout d'entrée dans `Apps.tsx` (carte "Audit & Traçabilité") et dans `AppTopBar` (sous Paramètres ou dropdown utilisateur si rôle autorisé).

---

### 5. Protection des données sensibles & rétention

- Helper `sanitizeValues(obj)` masque récursivement les clés correspondant à la regex `/(password|token|secret|api[_-]?key|authorization|service[_-]?role)/i`
- Champ `archived_at` permet d'archiver sans supprimer ; vue par défaut filtre `archived_at IS NULL`
- Pas de DELETE policy (admin doit archiver, pas supprimer) — sauf besoin futur d'une policy spécifique
- Paramètre app_settings `audit_retention_months` (default 24) — utilisé uniquement comme info affichée (pas de purge automatique dans cette itération, à demander explicitement)

---

### 6. Détails techniques

**Fichiers créés :**
- `supabase/migrations/{ts}_audit_logs_extended.sql`
- `src/lib/audit.ts` (logger + sanitizer + types)
- `src/hooks/useAuditLogs.ts`
- `src/hooks/useLogAudit.ts`
- `src/pages/AuditPage.tsx`
- `src/components/audit/AuditKpiCards.tsx`
- `src/components/audit/AuditFilters.tsx`
- `src/components/audit/AuditTable.tsx`
- `src/components/audit/AuditDetailSheet.tsx`
- `src/components/audit/AuditQuickChips.tsx`
- `src/lib/auditExport.ts`

**Fichiers modifiés :**
- `src/App.tsx` : route `/audit` protégée
- `src/components/gmao/AppTopBar.tsx` : entrée menu
- `src/pages/Apps.tsx` : carte Audit
- `src/contexts/AuthContext.tsx` : `logAuthEvent` sur signIn/signOut/reset
- `src/components/auth/ProtectedRoute.tsx` (ou équivalent) : `logAccessDenied`
- Pages CRUD critiques (Phase 1) : injection `logAudit` après mutations — au minimum :
  - `src/pages/parametres/UserAdmin.tsx`, `DocumentPermissionsAdmin.tsx`, `RolePermissionsAdmin.tsx`, `PdrStockPermissionsAdmin.tsx`
  - `src/pages/PdrDetail.tsx` (stock movements) + composants Entry/Exit/Inventory/Correction
  - `src/pages/TicketDetail.tsx`, `MachineDetail/Form`, `EquipmentDetail/Form`, `OrganeDetail/Form`, `PreventifDetail/Form`
  - `src/pages/gpao/OfDetail.tsx`, `ConsumptionPage.tsx`, `ShiftScreen.tsx` (déclarations + corrections + arrêts)
  - Hooks documents/images : `useEntityDocuments`, `useEntityImages`

**Notes mémoire à mettre à jour après build :**
- Nouvelle fiche `mem://features/audit-trail` — schéma audit_logs étendu, helper logAudit, sanitization, RLS par module, page /audit
- Mise à jour `mem://auth/rbac-permissions` — nouveaux rôles `responsable_si`, `auditeur` + module permission `audit`
- Mise à jour `mem://tech/architecture-security` — référence helper centralisé

---

### Hors périmètre (à confirmer plus tard)

- Capture IP réelle (nécessite edge function proxy ou trigger avec headers PostgREST) — laissée null en phase 1
- Triggers DB automatiques sur toutes les tables (approche actuelle : log côté app pour avoir contexte user/description) — peut être ajouté plus tard pour un filet de sécurité
- Purge automatique selon rétention — manuel pour le moment
- Tentatives de login échouées : Supabase ne les expose pas côté client de façon fiable, on logge uniquement le retour error de signInWithPassword