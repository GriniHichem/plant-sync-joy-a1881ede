# Import CSV — Module Réception

Objectif : ajouter deux flux d'import CSV avec mapping intelligent :
1. **Fournisseurs** (upsert par `code`) — dans Paramétrage.
2. **Tickets pesée historiques** (statut spécial `pese_importe`) — dans Consultation (admin).

## 1. Backend (une seule migration)

### Enum statut ticket
Ajouter `'pese_importe'` à la contrainte `reception_tickets_statut_check`.

### RPC `import_reception_suppliers(rows jsonb) → jsonb`
- `SECURITY DEFINER`, réservé aux rôles ayant l'écriture fournisseurs (admin, responsable_si, directeur_qualite, responsable_controle_qualite).
- Pour chaque ligne : upsert sur `code` (met à jour `nom`, `region`, `wilaya`, plus `contact/telephone/adresse` si fournis).
- Retourne `{ total, created, updated, errors: [{row, code, motif}] }`.

### RPC `import_reception_tickets(rows jsonb, on_conflict text) → jsonb`
- `SECURITY DEFINER`, réservé admin + responsable_si.
- `on_conflict` ∈ `ignore` | `replace`.
- Pour chaque ligne :
  1. Résout `supplier_id` par `code` puis `nom` (insensible casse). Rejet si introuvable.
  2. Résout `product_id` par `code` puis `désignation`. Rejet si introuvable.
  3. Résout `campaign_id` : campagne active (`actif=true`) pour ce produit couvrant `date_ticket`, sinon campagne par défaut du produit, sinon rejet ("Aucune campagne active").
  4. Doublon `numero` :
     - `ignore` → skip avec motif.
     - `replace` → supprime pesée + photos + ticket existant, puis réinsère.
  5. Insère ticket avec `statut='pese_importe'`, `numero` = valeur CSV, `date_ticket`, `heure_debut/fin`, `commentaire`, `taux_abattement`. Contourne le trigger de verrouillage via variable de session (`SET LOCAL prodintime.bypass_lock='on'` + adaptation du trigger `reception_tickets_lock` pour laisser passer si flag).
  6. Insère `reception_weighings` avec `poids_brut_kg` (net/abattement calculés par colonnes générées). `weighed_at` = date_ticket + heure_fin (ou now()).
- Retourne `{ total, imported, replaced, skipped, errors: [{row, numero, motif}] }`.

### Ajustement trigger `reception_tickets_lock`
Autoriser UPDATE/DELETE quand la variable de session `prodintime.bypass_lock = 'on'` (utilisée uniquement par les RPC d'import). Les tickets `pese_importe` restent en lecture seule via l'UI (voir §3).

## 2. Frontend — composants partagés

### `src/components/reception/CsvImportDialog.tsx` (nouveau, générique)
Modale réutilisable :
- Sélection fichier + parsing client (papaparse déjà installé ? sinon parser léger maison, séparateurs `;` / `,` auto, BOM UTF-8 géré).
- Aperçu 5 premières lignes.
- Mapping intelligent : pour chaque champ système (obligatoires marqués `*`), dropdown des colonnes CSV. Auto-mapping par similarité (normalisation : minuscule, sans accents, sans espaces/`_`/`-`). Alias par champ (ex : `code fournisseur` ↔ `codef`, `code`, `code_fournisseur`).
- Blocage du bouton "Lancer l'import" tant que tous les champs obligatoires ne sont pas mappés.
- Options spécifiques tickets : radio "Ignorer doublons" / "Remplacer".
- Après import : rapport `{ total, réussis, échoués }` + tableau des erreurs (ligne, valeur clé, motif) + export CSV du rapport.

Props :
```ts
{
  title: string;
  fields: { key: string; label: string; required?: boolean; aliases?: string[] }[];
  options?: React.ReactNode; // ex: radio doublons
  onImport: (rows: Record<string,string>[]) => Promise<ImportReport>;
}
```

## 3. Intégrations UI

### `ReceptionSettings.tsx` (onglet Fournisseurs)
- Bouton **"Importer CSV"** à côté de "Ajouter fournisseur".
- Visible seulement si l'utilisateur a le droit d'écriture fournisseurs.
- Champs mappés : `code*`, `nom*`, `region*`, `wilaya*`, `contact`, `telephone`, `adresse`.
- Appelle `import_reception_suppliers` puis invalide la query.

### `ReceptionGlobal.tsx` (Consultation)
- Bouton **"Importer tickets CSV"** visible uniquement pour `admin` / `responsable_si`.
- Champs mappés : `numero*`, `date*`, `fournisseur*`, `produit*`, `taux_abattement*`, `poids_brut*`, `heure_debut`, `heure_fin`, `commentaire`.
- Option doublons (ignore/replace).
- Appelle `import_reception_tickets` puis invalide la liste + rafraîchit.

### Verrouillage UI des tickets `pese_importe`
- `ReceptionQualitative.tsx` : si un ticket sélectionné a `statut='pese_importe'`, désactive le formulaire qualitatif (bannière "Ticket importé — édition désactivée").
- `TicketDetailDialog.tsx` : badge dédié "Pesé importé" (couleur distincte).
- Listes (`ReceptionGlobal`, `ReceptionQuantitative`) : afficher le badge dans la colonne statut.

## 4. Rapport de règles d'import tickets (résumé backend)

| Cas | Action |
|---|---|
| Fournisseur introuvable | rejet ligne, motif "Fournisseur X introuvable" |
| Produit introuvable | rejet ligne, motif "Produit Y introuvable" |
| Aucune campagne active pour le produit à la date | rejet ligne |
| Doublon numéro + `ignore` | skip, comptabilisé |
| Doublon numéro + `replace` | remplace ticket + pesée |
| Brut ≤ 0 ou abattement hors [0,100] | rejet ligne |
| OK | insert ticket (`pese_importe`) + pesée (net calculé automatiquement) |

## 5. Fichiers touchés

**Nouveaux :**
- `supabase/migrations/<timestamp>_reception_csv_import.sql`
- `src/components/reception/CsvImportDialog.tsx`
- `src/lib/receptionImport.ts` (parser CSV + normalisation + auto-mapping)
- `src/test/qualite/reception-import.test.ts` (auto-mapping + validation)

**Modifiés :**
- `src/pages/qualite/reception/ReceptionSettings.tsx` (bouton import fournisseurs)
- `src/pages/qualite/reception/ReceptionGlobal.tsx` (bouton import tickets)
- `src/pages/qualite/reception/ReceptionQualitative.tsx` (blocage édition si `pese_importe`)
- `src/pages/qualite/reception/TicketDetailDialog.tsx` (badge)

## Notes techniques

- Parser CSV : implémentation légère maison (séparateurs `;`/`,`, guillemets, BOM) pour éviter d'ajouter une dépendance ; ~40 lignes.
- Aucun changement de RLS sur les tables existantes ; toute la logique d'import passe par les RPC `SECURITY DEFINER`.
- Le trigger `reception_tickets_derive_product` reste en place (le `product_id` est validé/aligné à la campagne).
