# Fusionner Shifts + Rotations + Autorisations en un seul module

## Objectif
Un seul module de paramétrage regroupant équipes, membres/autorisations, modèles, plannings, modes de production et règles. Supprimer la logique et le vocabulaire dupliqués (deux pages, deux entrées, deux gestions d'équipes, créneaux morts).

## Module unifié — `/parametres/shifts`
Page unique avec onglets (réutilise l'architecture propre de RotationsAdmin) :

```text
Équipes & Rotations
├── Équipes                  (TeamsTab — shift_teams)
├── Membres & Autorisations  (MembersTab — shift_team_members + autorisation_libre)
├── Modèles de shift         (TemplatesTab — shift_templates)
├── Plannings de rotation    (SchedulesTab — shift_schedules)
├── Modes de production      (nouveau — shift_modes / shift_mode_slots, 3x8…)
└── Règles                   (nouveau — shift_settings)
```

## Changements

1. **Page unifiée** : transformer `RotationsAdmin.tsx` en module complet (renommé titre « Shifts & Rotations »), en ajoutant deux onglets repris de ShiftsAdmin :
   - `ModesTab` : lecture/édition des modes (`shift_modes`) et de leurs créneaux (`shift_mode_slots`), activation.
   - `RulesTab` : édition des règles (`shift_settings`).

2. **Suppression des doublons** :
   - Supprimer `src/pages/parametres/ShiftsAdmin.tsx` (sa gestion Équipes, l'onglet Créneaux `shift_time_slots` et l'onglet Rotation-redirection sont des doublons).
   - Les parties utiles (Modes, Règles) sont migrées vers le module unifié.

3. **Routage** (`src/App.tsx`) :
   - `/parametres/shifts` → module unifié.
   - `/parametres/rotations` → redirection vers `/parametres/shifts` (compatibilité des anciens liens).

4. **Page Paramètres** (`src/pages/Parametres.tsx`) :
   - Remplacer les deux entrées (« Shifts & Rotation » + « Rotations & Autorisations ») par **une seule** : « Shifts & Rotations » → `/parametres/shifts`, description « Équipes, membres, autorisations, modèles, plannings, modes & règles ».

5. **Nettoyage logique dupliquée (DB)** :
   - Migration : `DROP TABLE shift_time_slots` (0 ligne, aucune référence dans le code applicatif ni dans les fonctions SQL) — c'est le doublon mort des `shift_templates`.

6. **Tests** : mettre à jour `src/test/parametres/parametres-page.test.tsx` (entrée unique au lieu de « Shifts & Rotation »).

## Notes techniques
- `shift_modes` / `shift_mode_slots` restent intacts (consommés par OfDetail, OfList, ShiftScreen pour le mode 3x8).
- `shift_settings` reste (lu par ShiftScreen) même si actuellement vide.
- Aucun changement au moteur de rotation (`get_active_shift_context`, `get_scope_shift_context`, `open_my_work_session`).
- Toutes les mutations conservent l'écriture dans `audit_logs`.

## Résultat
Un module unique, sans gestion d'équipes en double, sans créneaux morts, sans entrée « Rotations & Autorisations » redondante.
