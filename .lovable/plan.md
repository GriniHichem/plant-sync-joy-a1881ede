# Plan — Système de collecte qualité 360 (shift qualité unifié)

## Objectif
Faire du shift qualité un vrai miroir du shift production, relié au shift maintenance. Un seul tableau de travail : l'opérateur choisit un OF actif, voit tous ses contrôles (avec filtrage + épinglage), voit les problèmes maintenance de la ligne, et peut transformer un risque/NC en ticket curatif ou action préventive. Le tout sans complexifier l'existant : on améliore les pages qualité déjà en place plutôt que d'ajouter des modules.

## Ce qui existe déjà (réutilisé)
- `useActiveQualityShift` : shift qualité + lignes couvertes + shifts production liés.
- `get_quality_indicators_for_of` : plan de contrôle par OF (fréquence, requis, bloquant).
- `QualiteSaisieLigne` : saisie par OF avec conformité live + retards.
- `QualiteConsoleControle` : console responsable.
- `tickets` (of_id, ligne_id, machine_id, statut, priorite) et `preventive_plans` pour la maintenance.

## Améliorations proposées

### 1. Tableau de shift qualité unifié (page principale)
Refonte de `QualiteShiftScreen` en tableau de bord opérationnel en 3 zones :

```text
+------------------------------------------------------+
| Bandeau shift : équipe · type · KPIs · clôturer      |
+----------------------+-------------------------------+
| OF actifs (liste)    |  OF sélectionné               |
| - OF-123 [3 retard]  |  Contrôles du produit         |
| - OF-124 [à jour]    |  [filtres] [épinglés en haut] |
| - OF-125             |  Panneau maintenance ligne    |
+----------------------+-------------------------------+
```

- **Colonne OF actifs** : tous les OF `en_cours` (priorité aux lignes du shift, puis les autres repliés), badge « à saisir / en retard » calculé comme aujourd'hui.
- **Sélection d'un OF** → charge son plan de contrôle via la RPC existante, saisie inline conforme/non conforme (repris de `QualiteSaisieLigne`).

### 2. Filtrage + épinglage des contrôles
- **Filtres** au-dessus de la liste des contrôles : par catégorie, par statut (à saisir / en retard / à jour), par type, recherche texte.
- **Épinglage** : bouton « épingler » sur chaque contrôle → remonte en tête et le marque comme prioritaire **pour ce shift**. Persisté en base (voir table `quality_shift_pins`) pour que le responsable et les relais de shift voient les mêmes priorités.

### 3. Lien maintenance (couverture 360)
Sous l'OF sélectionné, un panneau **« Risques & maintenance »** :
- Tickets ouverts sur la ligne/machine de l'OF (`tickets` par `ligne_id`/`machine_id`, statut non clos) → lien vers le ticket.
- Actions préventives en cours sur ces équipements.
- Bouton **« Déclarer un ticket »** pré-rempli (of_id, ligne_id, origine qualité) à partir d'un contrôle non conforme ou d'un risque constaté.
- Un contrôle non conforme **bloquant** affiche une alerte « risque de retard / travail curatif » et propose de créer une NC + un ticket lié.

### 4. Liaison inter-shifts (équipe & relève)
- Chaque contrôle enregistré reste rattaché à `quality_shift_id`, `shift_id` (production), `team_id` (déjà fait).
- Bandeau « Shifts liés » : shifts production sur mes lignes + shift maintenance actif sur ces lignes → visibilité croisée pour un travail d'équipe et une relève propre.
- Console responsable enrichie d'une colonne « tickets/NC ouverts » par OF pour piloter la couverture.

## Détails techniques

### Base de données (1 migration)
- Table `public.quality_shift_pins` :
  - `quality_shift_id uuid` (→ quality_shifts), `of_id uuid`, `indicator_id uuid`, `pinned_by uuid`, `created_at`.
  - Contrainte unique (quality_shift_id, of_id, indicator_id).
  - GRANT authenticated + service_role ; RLS : lecture pour les rôles qualité, écriture par le contrôleur du shift / responsable / admin via `has_role`.
- (Optionnel) RPC `get_maintenance_context_for_of(p_of_id)` renvoyant tickets ouverts + préventifs de la ligne/machine, pour éviter plusieurs requêtes côté client.

### Frontend
- Refonte `src/pages/qualite/QualiteShiftScreen.tsx` en tableau maître-détail (liste OF + détail contrôles), réutilisant la logique de `QualiteSaisieLigne` (extraite en composant `OfControlsPanel`).
- Nouveau composant `MaintenanceRiskPanel` (tickets + préventifs + boutons création).
- Hook `useQualityShiftPins(qualityShiftId)` : lecture/ajout/suppression des épingles.
- Console responsable : ajout colonne tickets/NC ouverts + contrôles épinglés.

## Hors périmètre
- Pas de refonte du modèle d'indicateurs (déjà en place).
- Pas de nouveau module ; on garde 1 tableau de shift + la console responsable.
