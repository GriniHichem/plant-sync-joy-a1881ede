# Module d'importation CSV — Configuration

Ajout d'un module unique d'importation dans les Paramètres, réservé aux **admins**, permettant d'importer en masse **Machines, Équipements, Organes et PDR** depuis des fichiers CSV (UTF-8, caractères français), avec template à télécharger pour chaque entité et création automatique des familles / sous-familles manquantes.

## Comportement validé

- **Doublons** : choix à l'import (case à cocher « Mettre à jour les existants »). Par défaut les doublons sont ignorés ; si coché, les enregistrements existants (même code/référence) sont mis à jour.
- **Liens manquants** : les **familles et sous-familles** sont créées automatiquement. Les autres cibles (ligne de production, machine/équipement parent) doivent déjà exister, sinon la ligne est rejetée avec un message clair.
- **Format** : un seul module `/parametres/import` avec un sélecteur d'entité (4 onglets).
- **Accès** : admin uniquement.

## Parcours utilisateur

```text
Paramètres › Configuration générale › Importation de données
   └─ /parametres/import
        ├─ Onglet Machines      [Télécharger modèle] [Importer CSV]
        ├─ Onglet Équipements   [Télécharger modèle] [Importer CSV]
        ├─ Onglet Organes       [Télécharger modèle] [Importer CSV]
        └─ Onglet PDR           [Télécharger modèle] [Importer CSV]

Import CSV (par onglet) :
  1. Choix fichier  →  2. Mapping colonnes (auto)  →  3. Aperçu + validation
  →  4. Options (☑ mettre à jour existants)  →  5. Import  →  6. Rapport
```

## Templates (colonnes des modèles CSV)

Chaque modèle est téléchargé avec **BOM UTF-8** + séparateur `;` (compatible Excel français) et une ligne d'exemple. Les colonnes de famille acceptent un **nom** (créé si absent) et une sous-famille via `Famille` + `Sous-famille`.

- **Machines** : `code*`, `designation*`, `famille`, `sous_famille`, `criticite` (A/B/C), `statut` (en_marche/arret/maintenance), `localisation`, `marque`, `modele`, `numero_serie`, `date_mise_en_service` (AAAA-MM-JJ), `description`, `code_erp`
- **Équipements** : `code*`, `designation*`, `famille`, `sous_famille`, `type` (capteur/actionneur/convoyeur/peripherique/utilite/sous_ensemble/instrument/autre), `statut`, `criticite`, `criticite_maintenance`, `role_fonctionnel`, `machine_parent_code` (doit exister), `ligne` (doit exister), `marque`, `modele`, `numero_serie`, `localisation`, `date_mise_en_service`, `description`, `code_erp`
- **Organes** : `code*`, `designation*`, `type` (mecanique/electrique/…), `statut`, `criticite`, `machine_parent_code` **ou** `equipement_parent_code` (au moins un, doit exister), `description`
- **PDR** : `reference*`, `designation*`, `famille`, `sous_famille`, `statut_pdr` (strategique/commune), `approvisionnement` (local/importation/mixte), `stock_actuel`, `stock_min`, `stock_max`, `stock_securite`, `point_commande`, `delai_approvisionnement`, `pmp`, `devise` (défaut DA)

Valeurs d'enum invalides → ligne rejetée avec message. Champs vides → valeur par défaut de la table.

## Implémentation technique

### Backend — RPC d'import (migration)
Quatre fonctions `SECURITY DEFINER` (une par entité), p. ex. `import_machines(_rows jsonb, _update_existing boolean)`, qui :
1. Vérifient le rôle admin via `has_role(auth.uid(),'admin')`, sinon `RAISE EXCEPTION`.
2. Pour chaque ligne :
   - Résolvent/créent la **famille** (par `name`, `is_active=true`) puis la **sous-famille** (par `name` + `parent_id` = famille) dans `machine_families` (machines/équipements) ou `pdr_families` (PDR).
   - Résolvent les liens existants (`machine_parent_code`, `equipement_parent_code`, `ligne` via `production_lines.nom`) — si introuvable, accumulent une erreur et **sautent** la ligne.
   - Valident les enums ; valeurs vides → défaut.
   - `INSERT` si nouveau, ou `UPDATE` si `_update_existing` et code/référence déjà présent, sinon **skip**.
   - Écrivent un `audit_logs` par mutation (auteur, action, table, valeurs) conformément à la convention du projet.
3. Retournent un récapitulatif JSON `{ created, updated, skipped, errors:[{row,message}] }` (transaction unique → atomicité).

> Les familles/sous-familles créées génèrent aussi leur propre entrée d'audit.

### Frontend
- **`src/pages/parametres/ImportData.tsx`** (nouveau) : onglets par entité (`Tabs` shadcn), bouton « Télécharger le modèle » (réutilise `exportToCsv` avec ligne d'exemple) et le composant d'import.
- **`src/components/parametres/EntityImporter.tsx`** (nouveau, basé sur l'actuel `CsvImporter`) : étapes fichier → mapping → aperçu → options → rapport ; parse via PapaParse avec `encoding: "UTF-8"` ; appelle la RPC correspondante au lieu d'un `upsert` direct ; affiche le rapport détaillé (créés / mis à jour / ignorés / erreurs ligne par ligne).
- **`src/pages/Parametres.tsx`** : ajout d'une carte « Importation de données » dans le groupe *Configuration générale* (icône `Upload`).
- **`src/App.tsx`** : route `/parametres/import` protégée admin (même garde que les autres pages admin).
- Définitions de champs/templates centralisées dans **`src/lib/importTemplates.ts`** (clé, label, requis, type, valeurs d'enum) — partagées entre génération du modèle, mapping et validation.

### Tests
- `src/test/parametres/import-templates.test.ts` : validité des définitions de colonnes, génération de modèle (en-têtes + BOM), mapping auto et détection des enums invalides.

## Notes
- Aucune table existante n'est modifiée structurellement ; seules de nouvelles fonctions RPC sont ajoutées.
- L'UTF-8 est garanti à l'export (BOM) et à l'import (PapaParse `encoding: UTF-8`).
- Les familles créées sont visibles immédiatement dans « Familles machines » / « Familles PDR ».
