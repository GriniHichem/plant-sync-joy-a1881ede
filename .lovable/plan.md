## Refonte du système shift — auto-génération depuis l'OF

### Principe directeur

- **Production & Qualité** : on ne crée plus les shifts à la main. On configure le **plan de shift sur l'OF** (mode + équipes + horaires), et le système **génère automatiquement** les sessions au fil de l'eau jusqu'à la clôture de l'OF.
- **Maintenance** : pas de génération automatique. Un shift maintenance s'ouvre quand le maintenancier prend son poste (réactif), et son contenu est piloté par :
  - les **tickets curatifs** déclarés par les chefs de ligne (urgent),
  - les **plans préventifs** programmés par le bureau méthode (planifié).

---

## Phase 1 — Production : shifts auto-générés depuis l'OF

### 1.1 Configuration sur l'OF (déjà 80% en place)

L'OF porte déjà `shift_mode_id` (3x8 / 2x8 / 1x8 / Surface). On enrichit le **plan d'OF** avec :

- `auto_generate_shifts` (bool, défaut true)
- Affectation **équipe → créneau** (ex. Équipe A = matin, B = après-midi, C = nuit) : nouvelle table `of_shift_assignments(of_id, shift_type, team_id, chef_ligne_id)`.
- Horaires par créneau hérités de la table `shift_slots` existante (ou par défaut 06-14 / 14-22 / 22-06).

UI : nouvel onglet « Plan de shifts » dans `OfDetail.tsx`, rempli à la création de l'OF. Le responsable production choisit qui fait quoi sur chaque créneau (équipe + chef de ligne titulaire).

### 1.2 Génération automatique

**Option retenue : génération paresseuse (lazy) au moment d'ouvrir le kiosk**, plutôt qu'un cron qui crée tout d'avance. Avantages : robuste aux changements de planning, pas de sessions fantômes.

Mécanisme :
- Trigger DB ou RPC `ensure_shift_session(p_of_id, p_now)` qui :
  1. Détermine le créneau en cours selon l'heure (matin/après-midi/nuit) et le mode.
  2. Cherche un `shifts` actif pour (of_id, line_id, date, shift_type).
  3. S'il n'existe pas et que l'OF est `en_cours` ET `auto_generate_shifts=true` ET un `of_shift_assignments` existe pour ce créneau : crée la session.
  4. Renvoie l'id de la session.
- Le kiosk `/gpao/shift/live` appelle cette RPC à l'ouverture (au lieu de chercher une session existante). Si l'opérateur connecté est le `chef_ligne_id` du plan, il rentre directement.
- Trigger sur `ordres_fabrication` : à passage en `termine` ou `annule`, **clôture automatique** des `shifts` encore actifs liés (avec observation auto « Clôturé suite fin OF »).

### 1.3 Console responsable simplifiée

`RespShiftConsole` (production) devient une **vue de supervision** :
- Liste des sessions en cours générées par le système (read-only).
- Bouton « Ajustement manuel » conservé pour cas exceptionnels (remplacement chef de ligne, intercalaire), avec audit obligatoire.
- Plus besoin du dialog « Ouvrir une session » dans le flux nominal.

---

## Phase 2 — Qualité : sessions auto-couvrant les lignes en production

Aujourd'hui le contrôleur ouvre une `quality_shifts` et coche les lignes. On bascule vers :

- `quality_shift_assignments(controller_id, shift_type, line_ids[])` : affectation par contrôleur (config statique par le responsable qualité, pas par OF).
- À l'ouverture du kiosk qualité par le contrôleur (ou auto à l'arrivée du créneau), le système :
  - crée le `quality_shifts` (date, créneau dérivé de l'heure, équipe dérivée de la prod en cours sur ses lignes),
  - peuple `quality_shift_lines` depuis l'affectation,
  - le trigger `quality_shift_lines_attach_links` existant relie déjà les `shifts` production actifs.

Pas besoin de couplage par OF — un contrôleur couvre **toutes les lignes de son périmètre** quel que soit l'OF en cours.

---

## Phase 3 — Maintenance : pas de shift planifié, file d'interventions

Le shift maintenance reste **ouvert manuellement** par le maintenancier en début de poste (un seul clic, pas de paramétrage). Son contenu est alimenté par 2 sources :

### 3.1 Curatif (tickets chefs de ligne)
- Existe déjà : un chef de ligne crée un `tickets` pendant son shift production (`ProductionShiftTicket`).
- Amélioration : à la création, **notif push automatique vers le shift maintenance actif** sur le même atelier (déjà partiellement en place via `notify_shift_event` mais à étendre aux tickets).
- Le ticket apparaît dans la liste live du kiosk maintenance, classé par criticité.

### 3.2 Préventif (bureau méthode)
- Existe déjà : `preventive_plans` avec dates programmées.
- Amélioration : vue « À faire aujourd'hui » dans le kiosk maintenance qui agrège les `preventive_plans` dont la `next_due_date <= today` sur les machines/organes de l'atelier.
- À l'exécution d'un préventif, recalcul automatique de `next_due_date` (déjà en place).

### 3.3 Console responsable maintenance
- Vue supervision : qui est en poste, file curative en attente, préventifs du jour, KPI MTTR/MTBF live.
- Bouton « Forcer ouverture pour X » conservé pour cas où le maintenancier ne peut pas ouvrir lui-même.

---

## Détails techniques

### Tables nouvelles
- `of_shift_assignments(id, of_id fk, shift_type enum, shift_team_id fk, chef_ligne_id fk profiles, created_at, updated_at)` — unique sur (of_id, shift_type).
- `quality_shift_assignments(id, controller_id fk profiles, shift_type enum, line_id fk production_lines, created_at)` — unique sur (controller_id, shift_type, line_id).

### Champs ajoutés
- `ordres_fabrication.auto_generate_shifts` (bool, default true).

### RPC nouvelles
- `ensure_production_shift_session(p_of_id uuid)` returns uuid — crée si besoin, renvoie l'id.
- `ensure_quality_shift_session(p_controller_id uuid)` returns uuid — idem côté qualité.

### Triggers
- `ordres_fabrication` AFTER UPDATE : si `statut` passe à `termine`/`annule`, clôt les `shifts` actifs liés.
- `tickets` AFTER INSERT : notification vers `maintenance_shifts` actif sur l'atelier de la machine concernée.

### Migration des données
- Sessions en cours préservées telles quelles.
- Pour les OF actifs sans `of_shift_assignments`, fallback sur le mode actuel (création manuelle) tant qu'on n'a pas configuré le plan — pas de cassure.

### Permissions
- Configurer plan shift OF : `resp_production` + `admin`.
- Configurer affectations qualité : `responsable_controle_qualite` + `admin`.
- Ajustement manuel session : audité avec motif obligatoire.

### UI principalement touchée
- `OfForm.tsx` / `OfDetail.tsx` : nouvel onglet « Plan de shifts ».
- `RespShiftConsole.tsx` : passe en mode supervision, dialog manuel devenu secondaire.
- `ShiftHomePage.tsx` : opérateur chef de ligne déclenche `ensure_production_shift_session` à l'arrivée.
- Nouveau écran `/parametres/quality-shift-assignments` (matrice contrôleur × créneau × lignes).

### Tests
- `auto-shift-generation.test.ts` : RPC `ensure_production_shift_session` crée 1 session, idempotente, ne crée rien si OF clôturé.
- `of-close-cascade.test.ts` : passage OF → terminé clôture les shifts actifs.
- `ticket-notify-maintenance.test.ts` : ticket crée notif vers shift maintenance actif sur même atelier.

---

## Hors scope
- Génération à l'avance sur calendrier (cron). On reste en lazy.
- Rotation automatique d'équipes A/B/C/D semaine paire/impaire (à faire en Phase 4 si demandé).
- Réaffectation auto si chef de ligne absent (admin doit faire l'ajustement manuel).

---

## Question avant de coder

Avant de lancer, confirmez :
1. **Phase 1 + 2 + 3 d'un coup**, ou Phase 1 d'abord (production seule) puis valider avant qualité+maintenance ?
2. La **génération paresseuse** (à l'ouverture du kiosk) vous convient, ou vous préférez un cron qui crée toutes les sessions de la journée à minuit ?
3. Qui doit pouvoir configurer le **Plan de shifts OF** : uniquement responsable production, ou aussi le créateur de l'OF ?
