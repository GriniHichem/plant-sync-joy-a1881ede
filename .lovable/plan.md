# Programmation automatique des shifts maintenance

## Objectif
Permettre au responsable maintenance de **programmer à l'avance** les shifts de chaque maintenancier (par créneau : matin / après-midi / nuit, équipe, lignes couvertes) pour qu'ils **s'ouvrent automatiquement** chaque jour concerné — sans devoir les ouvrir manuellement à chaque fois. Le système manuel actuel (console + self-open) reste inchangé.

## Concept
On ajoute une notion de **plan d'affectation maintenance** (un modèle récurrent par maintenancier). Un job automatique vérifie régulièrement les plans actifs et **ouvre la session** (`maintenance_shifts`) au bon créneau, le bon jour, en évitant les doublons.

```text
Responsable programme    →  table maintenance_shift_schedules
   (par maintenancier)         (créneau, équipe, lignes, jours, plage de dates)
                                        │
              cron (chaque 15 min) ─────┤
                                        ▼
              RPC apply_maintenance_shift_schedules()
                 - pour chaque plan actif valable aujourd'hui
                 - si l'heure du créneau est atteinte
                 - et aucune session active déjà ce jour/créneau
                 → INSERT maintenance_shifts (auto)
```

## 1. Base de données

### Nouvelle table `maintenance_shift_schedules`
Champs métier :
- `maintenancier_id` — l'utilisateur concerné (programmation **par utilisateur**)
- `shift_type` — créneau (`matin` / `apres_midi` / `nuit`)
- `shift_team_id` — équipe (optionnel)
- `line_ids` — lignes couvertes (tableau)
- `weekdays` — jours de la semaine actifs (ex. `{1,2,3,4,5}` = lun→ven ; vide = tous les jours)
- `date_debut`, `date_fin` — plage de validité (`date_fin` nullable = sans fin)
- `auto_open` — booléen (ouverture auto activée)
- `is_active` — plan actif/désactivé
- standards : id, created_by, created_at, updated_at (+ trigger updated_at)

Avec GRANT (authenticated + service_role) et RLS via `has_role()` : lecture/écriture réservées aux responsables maintenance / admin ; le maintenancier peut lire ses propres plans.

### RPC `apply_maintenance_shift_schedules()` (SECURITY DEFINER)
- Parcourt les plans `is_active` + `auto_open`, valables à la date du jour (plage + weekday).
- Calcule l'heure de début du créneau depuis `shift_time_slots` (ou heures par défaut matin/après-midi/nuit).
- N'ouvre que si l'heure actuelle ≥ heure de début du créneau.
- Vérifie qu'aucune session `maintenance_shifts` active n'existe déjà pour ce maintenancier ce jour-là sur ce créneau (anti-doublon).
- Insère la session (`opened_by = NULL`, marqueur observation « [Ouverture automatique] »).
- Retourne la liste des sessions créées.

### Cron + Edge function
- Nouvelle edge function `apply-maintenance-schedules` (sans auth, comme `auto-close-stale-shifts`) appelant le RPC.
- Job `pg_cron` toutes les 15 min (via l'outil insert, car contient l'URL/clé du projet).

## 2. Interface (console responsable maintenance)
Dans `RespShiftConsole` (uniquement `kind === "maintenance"`), ajouter une section/onglet **« Programmation »** :
- Liste des plans existants par maintenancier (créneau, équipe, lignes, jours, plage, statut auto).
- Bouton **« Programmer un shift »** ouvrant un dialog : maintenancier, créneau, équipe, lignes, jours de la semaine, date début/fin, interrupteur ouverture auto.
- Actions par plan : activer/désactiver, modifier, supprimer (avec audit `logAudit`).
- L'ouverture manuelle (« Ouvrir une session ») et le self-open restent disponibles tels quels.

## 3. Tests
- Test unitaire de la logique de sélection des plans (weekday, plage de dates, heure de créneau atteinte) et de l'anti-doublon, dans `src/test/shift/`.

## Détails techniques
- Heures de créneau par défaut si `shift_time_slots` absent : matin 06:00, après-midi 14:00, nuit 22:00.
- L'anti-doublon réutilise la même logique que le self-open (jour + créneau + maintenancier + actif).
- Audit : chaque création/modif/suppression de plan loggée (`module: interventions`).
- Aucune modification du schéma `maintenance_shifts` ; on ne fait qu'y insérer.
