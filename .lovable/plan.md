## Constat de l'existant (à préserver intégralement)

| Existant | À conserver |
|---|---|
| `machines` (code, designation, marque, modele, numero_serie, criticite, criticite_maintenance, impact_ligne, disponibilite_pdr, role_fonctionnel, statut, localisation, date_mise_en_service…) | ✅ inchangé |
| `equipements` (mêmes familles de champs) | ✅ inchangé |
| `organes` (code, designation, type, statut, criticite, machine_id XOR equipement_id, sort_order) | ✅ inchangé |
| `pdr` (reference, designation, stock_actuel/min/max/securite/point_commande, pmp, devise DA, delai_approvisionnement, statut_pdr, family_id, duree_vie_min/max_jours, fournisseur libre legacy) | ✅ inchangé |
| `pdr_suppliers` (pdr_id, nom, reference_fournisseur, prix, delai_jours, is_principal, email/tel/adresse/url1/url2) | ✅ étendu, **pas remplacé** |
| `pdr_family_suppliers` (héritage par famille) | ✅ inchangé |
| `pdr_entity_links` (pdr_id ↔ machine/equipement/organe + quantite_recommandee) | ✅ étendu (criticité sur actif) |
| `machine_pdr` (legacy) | ✅ conservé, lecture conjointe avec `pdr_entity_links` |
| `pdr_instances` (lifespan tracking) | ✅ inchangé |

Stratégie : **ALTER TABLE ADD COLUMN nullable** uniquement, **aucun DROP / RENAME**, aucune contrainte rétroactive bloquante.

---

## 1. Migration — colonnes techniques nullables

### `machines` — ajouts
`fabricant`, `reference_constructeur`, `code_erp`, `code_immobilisation`, `qr_code`, `annee_fabrication` (int), `puissance_kw` (numeric), `tension_v` (numeric), `frequence_hz` (numeric), `pression_service_bar` (numeric), `cadence_nominale` (numeric), `unite_cadence` (text), `capacite_nominale` (numeric), `unite_capacite` (text), `longueur_mm`, `largeur_mm`, `hauteur_mm` (numeric), `poids_kg` (numeric), `matiere_principale`, `energie_utilisee` (enum `energie_type` : electrique/pneumatique/hydraulique/vapeur/gaz/mixte/autre), `niveau_risque` (text), `conditions_utilisation`, `consignes_securite`, `zone_installation`, `commentaire_technique` (text), `caracteristiques_techniques` (jsonb default `'{}'`).

### `organes` — ajouts
`fabricant`, `marque`, `modele`, `reference_constructeur`, `numero_serie`, `code_erp`, `code_immobilisation`,
dimensions : `longueur`, `largeur`, `hauteur`, `diametre_ext`, `diametre_int`, `epaisseur`, `poids` (numeric), `unite_dimension` (text default `'mm'`), `unite_poids` (text default `'kg'`),
techniques : `puissance`, `tension`, `intensite`, `frequence`, `pression`, `debit`, `vitesse_rotation`, `temperature_min`, `temperature_max` (numeric), `matiere`, `type_connexion`, `filetage`,
maintenance : `impact_panne` (enum `organe_impact_panne` : arret_complet/arret_partiel/degradation/aucun), `duree_vie_estimee_jours` (int), `frequence_inspection_jours` (int), `consignes_securite`, `commentaire_technique`,
flexible : `caracteristiques_techniques` jsonb.

→ Mettre à jour `organes_search_refresh` pour inclure `marque`, `modele`, `reference_constructeur`, `numero_serie`.

### `pdr` — ajouts
`fabricant`, `marque`, `modele`, `reference_constructeur`, `code_erp`, `code_barres`, `qr_code`, `sous_famille` (text — la famille reste `family_id`), `unite_stock` (text default `'unité'`), `criticite` (enum `criticite` default `'C'`),
dimensions identiques aux organes (mêmes noms),
techniques : `matiere`, `couleur`, `tension`, `puissance`, `intensite`, `frequence`, `pression`, `debit`, `temperature_min`, `temperature_max`, `vitesse_rotation`, `nombre_dents`, `pas`, `filetage`, `type_connexion`, `type_signal`, `commentaire_technique`,
flexible : `caracteristiques_techniques` jsonb.

→ Mettre à jour `pdr_search_refresh` pour inclure `reference_constructeur`, `code_erp`, `marque`, `fabricant`, `modele`.

### `pdr_suppliers` — extension (table existante préservée)
Ajouts : `supplier_designation`, `manufacturer_reference`, `brand`, `currency` (text default `'DA'`), `moq` (numeric), `packaging_unit`, `last_purchase_price` (numeric), `last_purchase_date` (date), `supplier_url`, `contact_email`, `contact_phone`, `is_active` (boolean default true), `created_by`, `updated_by`.

Trigger `pdr_suppliers_unique_principal` BEFORE INSERT OR UPDATE : si `NEW.is_principal = true`, mettre les autres lignes du même `pdr_id` à `false`.

Suppression « logique » uniquement : si une `pdr_supplier` est référencée par un `pdr_stock_movement` (via `reference_source`/futur `supplier_ref_id`), forcer `is_active=false` au lieu de DELETE — implémenté côté UI + RLS DELETE inchangée pour admins.

### `pdr_entity_links` — ajout
`criticite_sur_actif` (enum `criticite` nullable), `position_installation` (text nullable). Aucune contrainte ajoutée.

### Nouvelle table `pdr_equivalences`
```
id uuid pk, pdr_id uuid not null fk pdr,
equivalent_pdr_id uuid null fk pdr,
external_reference text, manufacturer text, brand text,
equivalence_type text check in ('equivalent','compatible','remplacement','depannage'),
validation_status text default 'non_valide' check in ('non_valide','valide','rejete'),
validated_by uuid, validated_at timestamptz,
notes text, created_at, updated_at, created_by, updated_by.
```
+ contrainte `CHECK (equivalent_pdr_id IS NOT NULL OR external_reference IS NOT NULL)`,
+ index `(pdr_id)`, RLS : view authenticated, manage admin/resp_maintenance/bureau_methode/gestionnaire_magasin, validate admin/resp_maintenance.

### Catégories documents
INSERT (idempotent via `ON CONFLICT DO NOTHING` sur `name`) dans `document_categories` : `fiche_technique`, `manuel_constructeur`, `schema_electrique`, `schema_mecanique`, `plan_pneumatique`, `certificat`, `photo_plaque_signaletique`, `notice_montage`. Aucune suppression.

---

## 2. Types TypeScript & client

`src/integrations/supabase/types.ts` est régénéré automatiquement par la migration. Pas d'édition manuelle.

---

## 3. UI — `MachineForm.tsx`
Ajouter accordéons (composant `Accordion` shadcn déjà présent) sous le bloc « Informations » existant, sans toucher aux champs actuels :
- **Identification** (fabricant, ref constructeur, code ERP, code immobilisation, qr_code)
- **Dimensions & poids** (longueur/largeur/hauteur mm, poids kg, matiere)
- **Énergie** (energie_utilisee Select, puissance, tension, frequence, pression service)
- **Performance** (annee_fabrication, cadence_nominale + unite, capacite_nominale + unite)
- **Sécurité** (niveau_risque, conditions_utilisation, consignes_securite, zone_installation)
- **Caractéristiques personnalisées** (éditeur clé/valeur/unité → `caracteristiques_techniques` jsonb)

Validation : seuls `code` et `designation` restent requis (déjà le cas).

## 4. UI — `OrganeForm.tsx` / `OrganeDetail.tsx`
Form : ajouter accordéons « Références », « Dimensions », « Caractéristiques techniques », « Maintenance ». Detail : nouveaux onglets `Données techniques`, `Dimensions`, `PDR liées` (déjà existant), `Fournisseurs` (lecture des `pdr_suppliers` des PDR liées), `Tickets`, `Préventif`, `Documents`, `Images`.

## 5. UI — `PdrForm.tsx` / `PdrDetail.tsx`
Form : sections pliables (Identification / Références / Dimensions / Caractéristiques techniques / Stock / Caractéristiques personnalisées). Pas de champ obligatoire ajouté.

Detail — nouveaux onglets :
- **Références fournisseurs** : tableau (fournisseur, ref fournisseur, désignation, marque, prix, devise, délai, MOQ, principal toggle, actif toggle, actions). Boutons « Ajouter référence fournisseur » et « Ajouter une autre référence fournisseur » (même action). Toggle principal appelle update + le trigger SQL garantit l'unicité. Désactivation = `is_active=false` ; suppression seulement si jamais utilisée.
- **Équivalences** : tableau lecture/écriture, badges statut validation, action « Valider » réservée admin/resp_maintenance.
- **Compatibilité** (déjà partiellement présent) : merge `pdr_entity_links` + `machine_pdr` legacy en lecture, écriture sur `pdr_entity_links` uniquement, ajout colonne `criticite_sur_actif`.

## 6. UI — `MachineDetail.tsx` / `EquipmentDetail.tsx`
Onglet « PDR » : lister PDR directes (`pdr_entity_links` + `machine_pdr` legacy) + PDR via les organes attachés (UNION côté hook, déduplication par `pdr.id`).

## 7. Recherche & filtres
- `pdr_search_refresh` et `organes_search_refresh` mis à jour côté migration.
- `global_search` SQL fonction : déjà construit via `search_vector` → automatique.
- `PdrList.tsx` : ajouter filtres `criticite`, `marque`, `fabricant`, `avec/sans equivalence`, `sans fournisseur`, `sans dimension`, `sans document technique`, `liée à machine/equipement/organe`. Bouton « Réinitialiser les filtres » (icône `RotateCcw`) suivant la convention mémoire `ui-reset-convention`.
- `OrganesList.tsx` : ajouter filtres `marque`, `fabricant`, `avec ref constructeur`.

## 8. Import / Export CSV
`src/lib/exportCsv.ts` est générique → ajouter de nouveaux callers :
- `PdrList.tsx` : export enrichi (toutes nouvelles colonnes + fournisseur principal résolu via jointure côté client).
- Nouveau export dédié « Références fournisseurs » dans `PdrDetail` ou `PdrList` (toutes lignes `pdr_suppliers` actives).
- Import : ajouter dans `CsvImporter.tsx` deux modes supplémentaires (`pdr_enriched`, `pdr_supplier_refs`) avec validation : ref PDR obligatoire, fournisseur obligatoire, pas de doublon `(pdr_id, nom, reference_fournisseur)`, prix/délai ≥ 0, rapport ligne par ligne. Imports existants intouchés.

## 9. Audit & Notifications
- Audit (via `src/lib/audit.ts`) : ajouter `logAudit(...)` à chaque mutation : create/update PDR techniques, ajout/maj/désactivation/principal-change ref fournisseur, ajout/validation équivalence, modif technique organe, modif technique machine.
- Notifications (via `src/lib/notifications.ts` + règles configurables) : nouvelles règles seedées idempotentes :
  - PDR stratégique sans fournisseur principal
  - PDR critique sans ref fournisseur principale
  - PDR rupture + délai principal > seuil paramétrable
  - PDR stratégique sans dimensions
  - Équivalence en attente de validation
  - Fournisseur principal désactivé (audit_critical_event existant déclenchera la notif)
  Déduplication via le `dedup_window` standard.

## 10. Permissions
Aucune migration RBAC bloquante. Réutiliser les rôles existants (`admin`, `resp_maintenance`, `gestionnaire_magasin`, `bureau_methode`, `maintenancier`, `resp_production`, `chef_ligne`). Étendre les RLS suivantes :
- `pdr_suppliers` : write → admin/resp_maintenance/gestionnaire_magasin (déjà OK), ajouter `bureau_methode` en lecture-écriture sur `pdr_equivalences`.
- `pdr_equivalences` : view authenticated ; insert maintenancier (proposition seulement, status forcé `non_valide` via trigger) ; update/validate admin/resp_maintenance/bureau_methode ; delete admin uniquement.
- Les permissions UI utilisent `usePermissions` / `usePdrStockPermissions` existants — pas de nouveau hook nécessaire.

## 11. Tests
- `src/test/pdr/supplier-references.test.ts` : trigger principal unique, désactivation logique, dédup.
- `src/test/pdr/equivalences.test.ts` : workflow validation, insert maintenancier force `non_valide`.
- `src/test/pdr/csv-import-suppliers.test.ts` : règles de validation import.
- `src/test/gmao/machine-organe-tech-fields.test.ts` : sérialisation jsonb caracteristiques + lecture.

## 12. Mémoire
Mettre à jour :
- `mem://features/pdr-inventory-system` : multi-fournisseurs sur `pdr_suppliers` étendu (PAS de nouvelle table `pdr_supplier_references`), trigger principal unique, désactivation logique si historique.
- Nouveau `mem://features/pdr-equivalences` : table + workflow validation.
- Nouveau `mem://features/asset-technical-data` : champs JSONB `caracteristiques_techniques` sur machines/organes/pdr + accordéons UI.
- `mem://index.md` : ajouter ces 2 entrées.

---

## Garde-fous (anti-régression)

- ✅ Aucun DROP, aucun RENAME, aucune contrainte NOT NULL ajoutée à des colonnes existantes ou nouvelles (toutes nullables).
- ✅ `pdr_suppliers` étendu, `pdr_family_suppliers` intact, `machine_pdr` intact (lecture conjointe).
- ✅ `pdr.fournisseur` legacy (text libre) conservé — affiché en lecture seule s'il existe et qu'aucune ligne `pdr_suppliers` n'existe encore.
- ✅ Imports/exports CSV existants inchangés (nouveaux modes additifs).
- ✅ Workflows tickets/préventif/interventions/stock/audit/notifs : zéro modification de schéma de leurs tables.
- ✅ RLS existantes inchangées ; uniquement des policies ajoutées sur la nouvelle table `pdr_equivalences` et les nouvelles colonnes héritent automatiquement.
- ✅ Search vectors : seules les fonctions `_search_refresh` reçoivent `CREATE OR REPLACE`, suivi d'un `UPDATE table SET updated_at = updated_at` ciblé pour réindexer (optionnel — sinon réindexation au prochain UPDATE naturel).

## Fichiers touchés

**Migrations**
- `supabase/migrations/<ts>_enrich_machines_organes_pdr.sql`

**Code**
- `src/pages/MachineForm.tsx`, `src/pages/MachineDetail.tsx`
- `src/pages/OrganeForm.tsx`, `src/pages/OrganeDetail.tsx`
- `src/pages/PdrForm.tsx`, `src/pages/PdrDetail.tsx`, `src/pages/PdrList.tsx`
- `src/pages/EquipmentDetail.tsx` (onglet PDR enrichi)
- `src/components/gpao/CsvImporter.tsx` (nouveaux modes)
- nouveau `src/components/pdr/SupplierReferencesTable.tsx`
- nouveau `src/components/pdr/EquivalencesTable.tsx`
- nouveau `src/components/forms/CustomCharacteristicsEditor.tsx` (jsonb clé/valeur/unité)
- nouveau `src/hooks/usePdrSuppliers.ts`, `src/hooks/usePdrEquivalences.ts`

**Tests + Mémoire**
- 4 nouveaux fichiers `src/test/...`
- 3 fichiers `mem://...` (1 update, 2 créations) + `mem://index.md`
