
# Shift Qualité — application miroir du shift production

## Constat du système shift existant

Le shift production est porté par 4 tables et est ouvert/fermé par le chef de ligne dans `/gpao/shift` :

- `shifts` : un enregistrement par couple (`line_id`, `date_shift`, `heure_debut`) avec `shift_type` (matin/après-midi/nuit), `shift_team_id`, `chef_ligne_id`, `is_active`.
- `shift_teams` : équipes nommées (A/B/C…) avec couleur, partagées par toutes les lignes.
- `shift_modes` + `shift_mode_slots` : modèles d'horaires (3x8, 2x12…) attachés à un OF (`ordres_fabrication.shift_mode_id`).
- `shift_settings` : règles globales (Hour-1, etc.).

Côté qualité, deux tables référencent déjà `shift_id` + `team_id` mais **ne sont jamais alimentées** parce qu'aucun écran ne demande à un contrôleur d'ouvrir un shift :
- `quality_checks.shift_id`, `quality_checks.team_id`
- `quality_non_conformities.shift_id`, `quality_non_conformities.team_id`

Le contrôleur travaille pourtant sur les **mêmes créneaux** que le chef de ligne (mêmes 3x8, mêmes équipes A/B/C, même atelier). Il faut donc se brancher sur les `shifts` déjà ouverts par la production plutôt que créer un système parallèle.

## Principe — un "shift contrôleur" rattaché aux shifts production

Un contrôleur qualité couvre généralement **plusieurs lignes** sur un même créneau horaire. On modélise donc :

```text
production : 1 shift = 1 ligne x 1 créneau (existant, inchangé)
qualité    : 1 quality_shift = 1 contrôleur x 1 créneau x N lignes couvertes
                 └── relié 1..N aux shifts production en cours sur ces lignes
```

À l'ouverture d'un shift qualité, on choisit l'équipe (A/B/C) et un ou plusieurs ateliers/lignes. Le système rattache automatiquement les `shifts` production actifs qui matchent. Tous les contrôles et NC créés pendant ce quality_shift héritent de `shift_id` (le shift production de la ligne contrôlée), `team_id`, et d'un nouveau `quality_shift_id` pour la traçabilité côté qualité.

## Modèle de données — additif

```sql
-- 1) Le shift contrôleur
CREATE TABLE public.quality_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_shift date NOT NULL,
  shift_type shift_type_enum NOT NULL,        -- réutilise l'enum production
  shift_team_id uuid REFERENCES shift_teams(id),
  controller_id uuid NOT NULL REFERENCES auth.users(id),
  heure_debut timestamptz NOT NULL DEFAULT now(),
  heure_fin   timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Quelles lignes/ateliers ce contrôleur couvre
CREATE TABLE public.quality_shift_lines (
  quality_shift_id uuid REFERENCES quality_shifts(id) ON DELETE CASCADE,
  production_line_id uuid REFERENCES production_lines(id),
  PRIMARY KEY (quality_shift_id, production_line_id)
);

-- 3) Lien direct vers les shifts production couverts (résolu à l'ouverture
--    et rafraîchi quand un nouveau shift production démarre sur une ligne couverte)
CREATE TABLE public.quality_shift_production_links (
  quality_shift_id uuid REFERENCES quality_shifts(id) ON DELETE CASCADE,
  production_shift_id uuid REFERENCES shifts(id) ON DELETE CASCADE,
  PRIMARY KEY (quality_shift_id, production_shift_id)
);

-- 4) Traçabilité côté contrôles & NC
ALTER TABLE public.quality_checks
  ADD COLUMN quality_shift_id uuid REFERENCES quality_shifts(id);
ALTER TABLE public.quality_non_conformities
  ADD COLUMN quality_shift_id uuid REFERENCES quality_shifts(id);

-- 5) RLS : un contrôleur voit/édite ses propres shifts ;
--    resp_qualite + admin voient tout ; auditeur lit seulement.
```

Trigger `quality_shifts_attach_links()` à l'ouverture : peuple `quality_shift_production_links` avec les `shifts` actifs aujourd'hui sur les lignes choisies. RPC `quality_shift_refresh_links(shift_id)` appelable manuellement quand la production ouvre/ferme un shift en cours de quart.

Trigger `quality_shifts_close_validate()` : à la fermeture, exige `observations` et bloque si NC ouvertes sans `immediate_action` renseignée (parallèle au comportement chef de ligne pour les arrêts).

## Nouvelle app : `/qualite/shift`

Écran dédié qui copie l'ergonomie de `/gpao/shift` (confort opérateur identique) :

- **Header sticky** : badge équipe + créneau actif + bouton "Clôturer le shift". Si aucun shift actif → carte "Démarrer un shift contrôleur" (équipe A/B/C, ateliers/lignes couverts en multi-select, créneau auto-déduit de l'heure courante via `shift_settings`).
- **Onglet "Contrôles"** : reprend l'UI de `QualiteControles` mais pré-filtré sur les lignes du shift courant. Le formulaire de saisie est mono-clic : sélection OF (lignes du shift), sélection indicateur (depuis `get_quality_indicators_for_of`), valeur, sauvegarde. `shift_id`, `team_id`, `quality_shift_id`, `controlled_by` remplis automatiquement.
- **Onglet "Non-conformités du shift"** : tableau filtré + bouton "Déclarer une NC" qui ouvre le dialog NC existant pré-rempli (OF, ligne, équipe, shift, contrôleur). Le contrôleur peut clôturer ses propres NC mineures ; les NC majeures/critiques restent à valider par responsable_controle_qualite.
- **Onglet "Rappels"** : indicateurs requis non encore mesurés sur les OF du shift (basé sur `effective_frequency_type` + dernier `quality_check`). Pulse rouge si retard.
- **Pied de page** : KPIs du shift (contrôles faits, conformes, NC ouvertes, OF couverts) + observations fin de shift obligatoires à la clôture.

L'écran fonctionne aussi en mobile (contrôleur en atelier) : layout single-column, gros boutons (48px), input numérique avec dot/comma agnostique (convention déjà en place).

## Intégration avec le reste de l'app

- **`/gpao/shift` (chef de ligne)** : ajout d'un encart "Contrôleur de quart" listant les `quality_shifts` actifs couvrant cette ligne (nom du contrôleur, équipe, nombre de contrôles faits, NC du shift). Permet au chef de ligne de voir qui contrôle son atelier.
- **`OfQualityTab`** : nouvelle colonne "Shift" sur les contrôles et NC (badge équipe + heure). Les KPIs existants (`computeQualityKpis`) ne changent pas.
- **`QualiteTracabilite` & `QualiteRapports`** : ajout d'un filtre "Quality shift" et "Équipe", export CSV inclut les nouvelles colonnes.
- **Dashboard `QualiteDashboard`** : nouveau widget "Shifts qualité du jour" (équipe / contrôleur / lignes / contrôles / NC) calqué sur le widget shift production.
- **Sidebar Qualité** : nouvelle entrée "Shift contrôle" (icône calque shift production) au-dessus de "Contrôles".
- **Notifications** : règle automatique "NC critique déclarée pendant shift X" notifie le responsable_controle_qualite et le chef de ligne du shift production lié (réutilise `notifyQualityNcCreated`).
- **Audit** : ouverture/fermeture du quality_shift loggée dans `audit_logs` (module `qualite`, action `quality_shift_open` / `quality_shift_close` avec raison).

## Permissions

Aucune nouvelle permission Quality. On réutilise celles existantes :
- Ouvrir/fermer un shift contrôle : `controleur_qualite`, `responsable_controle_qualite`, `directeur_qualite`, `admin`.
- Déclarer une NC depuis le shift : permission `create_nc` (déjà existante via `quality_permissions`).
- Voir tous les shifts qualité : `responsable_controle_qualite`, `directeur_qualite`, `admin`, `auditeur`.

## Tests

- `src/test/qualite/quality-shift.test.ts` (nouveau) : ouverture/fermeture, calcul des liens production, validation des observations obligatoires.
- `src/test/qualite/quality-checks.test.ts` : ajouter cas "shift_id et quality_shift_id auto-remplis quand un shift contrôleur est actif".
- `src/test/qualite/quality-non-conformities.test.ts` : idem pour les NC.
- Mise à jour de `src/test/__mocks__/supabase.ts` pour les nouvelles tables.

## Fichiers impactés

**Migration** : `supabase/migrations/<ts>_quality_shift.sql` — tables, triggers, RLS, RPC, index.

**Créés** :
- `src/pages/qualite/QualiteShiftScreen.tsx` (écran principal contrôleur).
- `src/components/qualite/QualityShiftHeader.tsx`, `QualityShiftStartDialog.tsx`, `QualityShiftCloseDialog.tsx`, `QualityShiftKpiCards.tsx`.
- `src/hooks/useActiveQualityShift.ts` (récupère le shift actif du contrôleur courant + auto-fill).
- `src/lib/qualityShiftLinks.ts` (helpers pour rafraîchir les liens production).

**Modifiés** :
- `src/pages/qualite/QualiteControles.tsx` — auto-fill `shift_id`/`team_id`/`quality_shift_id` quand un shift est actif.
- `src/pages/qualite/QualiteNonConformites.tsx` — idem + filtre par quality_shift.
- `src/pages/gpao/ShiftScreen.tsx` — encart "Contrôleur de quart".
- `src/components/qualite/OfQualityTab.tsx` — colonne shift.
- `src/pages/qualite/QualiteDashboard.tsx` — widget shifts du jour.
- `src/pages/qualite/QualiteTracabilite.tsx`, `QualiteRapports.tsx`, `components/RapportsHelpers.ts`, `TracabiliteCsv.ts` — filtres + export.
- `src/components/gmao/AppSidebar.tsx` — nouvelle entrée Qualité.
- `src/App.tsx` — route `/qualite/shift`.
- `MANUAL.md` — section 4.9 mise à jour.

## Hors-scope

- Affectation planifiée (planning hebdo) des contrôleurs aux ateliers — sera une PR future basée sur ces tables.
- Synchronisation automatique de fermeture si tous les shifts production liés se ferment (déclencheur côté chef de ligne) — laissé manuel pour l'instant.
- Rotation automatique d'équipe entre quality_shifts (uniquement déductible, pas imposé).
