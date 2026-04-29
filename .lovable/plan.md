
# Points de contrôle qualité — Liaison Lignes / OF

## Contexte

L’écran actuel `/parametres/qualite/control-points` utilise le composant générique `QualityRefAdmin` avec un simple champ texte `production_line_id` (UUID à coller manuellement). De plus, le code lit `production_lines.nom` qui **n’existe pas** (la colonne s’appelle `designation`) → la liste de lignes est vide.

La règle métier demandée : un point de contrôle peut être associé à **une ou plusieurs lignes**, **un ou plusieurs OF**, ou les **deux** (ex. poste “Sortie ligne” partagé par L1+L2 ; ou contrôle ad-hoc lié à un OF spécifique).

## Modèle de données (migration additive)

Garder `quality_control_points` (référentiel) + ajouter deux tables de liaison + un champ `scope`.

```sql
-- 1) Champ scope sur le référentiel
ALTER TABLE quality_control_points
  ADD COLUMN scope text NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global','line','of','mixed'));

-- (la colonne production_line_id reste pour rétro-compat, considérée legacy)

-- 2) Liaison Points ↔ Lignes (N..N)
CREATE TABLE quality_control_point_lines (
  id uuid PK default gen_random_uuid(),
  control_point_id uuid REFERENCES quality_control_points(id) ON DELETE CASCADE,
  production_line_id uuid REFERENCES production_lines(id) ON DELETE CASCADE,
  created_at timestamptz default now(),
  UNIQUE (control_point_id, production_line_id)
);

-- 3) Liaison Points ↔ OF (N..N)
CREATE TABLE quality_control_point_ofs (
  id uuid PK default gen_random_uuid(),
  control_point_id uuid REFERENCES quality_control_points(id) ON DELETE CASCADE,
  of_id uuid REFERENCES ordres_fabrication(id) ON DELETE CASCADE,
  created_at timestamptz default now(),
  UNIQUE (control_point_id, of_id)
);
```

RLS sur les deux tables : SELECT pour `authenticated`, mutations restreintes via `has_quality_permission(auth.uid(),'manage_assignments')` OU `has_role('admin')`. Audit log inclus.

## Écran dédié

Remplacer `QualiteControlPointsAdmin.tsx` par une page autonome (plus utiliser `QualityRefAdmin` pour ce ref). Layout :

```text
┌─────────────────────────────────────────────────────────────┐
│ ← Points de contrôle                            [+ Nouveau] │
│ Postes/étapes où des contrôles qualité sont effectués       │
├──────────────┬──────────────────────────────────────────────┤
│  LISTE       │  DÉTAIL (panneau latéral)                    │
│              │                                              │
│ [search…]    │  Code  PC-01     Libellé  Sortie ligne       │
│ ──────────   │  Description ……                              │
│ ▸ PC-01      │  Portée : ◯ Global ◯ Lignes ◯ OF ◯ Mixte    │
│   Sortie L.  │                                              │
│ ▸ PC-02      │  ── Lignes liées (3) ──────── [+ Ajouter] ── │
│   Pesée      │   • L01 — Conditionnement      [x]           │
│ ▸ PC-03      │   • L02 — Embouteillage         [x]          │
│   Étiquetage │                                              │
│              │  ── OF liés (1) ─────────────  [+ Ajouter] ──│
│              │   • OF-00123 (en cours)         [x]          │
│              │                                              │
│              │  Actif [●]  Ordre [10]   [Supprimer] [Save]  │
└──────────────┴──────────────────────────────────────────────┘
```

### Comportements

- **Portée (scope)** : radio rapide qui filtre l’UI mais reste informative ; les liens lignes/OF sont toujours autorisés tant que cohérents.
- **Sélecteurs combobox** :
  - Lignes : `production_lines` (code + designation, actives), multi-ajout.
  - OF : recherche par `numero`, filtrée par défaut sur `statut in ('planifie','en_cours')` avec toggle « inclure clos ».
- **Liste à gauche** : badge code + libellé, compteur de liens (ex. `2L · 1OF`), switch actif inline.
- **Création** : dialog rapide (code, libellé, description, scope) puis ouverture en mode édition pour ajouter les liens.
- **Suppression** : bloquée si des `quality_checks` y référent (vérification via count avant delete) → toast explicite.

## Intégration / hooks

- Hook `useControlPointLinks(cpId)` : retourne `{ lines, ofs, addLine, removeLine, addOf, removeOf }` avec invalidation react-query.
- `getControlPointsForOf(ofId)` (utilitaire) : union des points liés à l’OF + ceux liés à sa ligne + ceux scope `global`. Sera réutilisé plus tard par les écrans de saisie de contrôles.

## Audit

Chaque mutation (create/update/delete CP, add/remove line, add/remove OF) → `audit_logs` module `qualite`, action `quality_control_point.*`.

## Fichiers touchés

- **Migration** : `supabase/migrations/<ts>_quality_control_point_links.sql` (colonne `scope` + 2 tables + RLS + index).
- **Réécriture** : `src/pages/parametres/qualite/QualiteControlPointsAdmin.tsx` (écran dédié maître/détail).
- **Nouveau** : `src/hooks/qualite/useControlPointLinks.ts`.
- **Nouveau** : `src/lib/qualite/controlPoints.ts` (utilitaire `getControlPointsForOf`).
- Aucun changement sur les autres référentiels.

## Hors-scope (à confirmer plus tard)

- Drag & drop ordre.
- Import CSV.
- Liaison points ↔ recettes / familles produit (peut être ajoutée symétriquement si demandé).
