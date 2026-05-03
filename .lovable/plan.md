
# Workflow d'intervention PDR avec sélection de position

## Principe directeur
- Étendre, sans casser, le workflow actuel `intervention_pdr` (TicketDetail) et `preventive_executions.pdr_used` (PreventifDetail).
- Si la PDR a des **positions actives** sur la machine/équipement du ticket ou du plan : la sélection de position devient **obligatoire** par ligne de PDR consommée.
- Sinon : comportement actuel inchangé (juste pdr + quantité).
- Stock : aucune modification de la logique de décrémentation existante (`pdr.stock_actuel` + `pdr_stock_movements`).

## 1) Schéma BDD — additif

### Extension `intervention_pdr`
Colonnes nullables ajoutées :
```
position_id            uuid FK → pdr_install_positions(id) ON DELETE SET NULL
compteur_fin           numeric  -- snapshot du compteur de la position au moment du remplacement
cause_remplacement     text     -- usure | casse | fuite | preventif | amelioration | non_conformite | autre
commentaire_technique  text
photo_avant_path       text     -- storage path bucket entity-images
photo_apres_path       text
compteur_initial_new   numeric DEFAULT 0  -- compteur de départ du nouveau cycle
```

### Trigger `tg_intervention_pdr_lifecycle` (AFTER INSERT)
Quand `position_id` n'est pas null :
1. Marquer la `pdr_instances` active sur cette position en `replaced` :
   `date_remplacement = now()`, `notes` enrichies (cause + commentaire), conserve l'historique.
2. Insérer une nouvelle `pdr_instances` :
   `pdr_id`, `machine_id`/`equipement_id` dérivés du `pdr_entity_links` de la position, `position_id`, `intervention_id`, `ticket_id` (depuis l'intervention parente), `installed_by = auth.uid()`,
   `compteur_pose_at = NEW.compteur_initial_new` (0 par défaut → nouveau cycle), `statut = 'active'`.
3. Audit log standard `pdr_instance / replaced` avec valeurs avant/après.

### Trigger `tg_preventive_execution_pdr_lifecycle` (AFTER INSERT/UPDATE)
Lit `pdr_used` JSONB ; pour chaque entrée contenant `position_id`, applique la même logique que ci‑dessus en référant `preventive_execution_id` au lieu de `intervention_id`.

### Vue `pdr_position_status` — déjà existante
Réutilisée telle quelle pour le compteur courant, le pourcentage et `niveau` (vert/orange/rouge).

## 2) UI — composant partagé `PdrPositionPicker`

Nouveau : `src/components/pdr/PdrPositionPicker.tsx`. Props :
```
{ pdrId, machineId?, equipementId?, value: PositionPickValue, onChange, required }
```
Comportement :
- Charge `pdr_entity_links` pour `(pdr_id, entity)` puis `pdr_install_positions` actives via `usePdrPositions`.
- **Si aucune position** : pas de rendu (mode legacy preserved → champ optionnel).
- **Si positions** :
  - **Tabs**: « Liste » + « Image ».
  - **Liste** : cartes 48px+, chaque ligne = désignation, badge couleur (vert/orange/rouge), barre de progression `pct_consomme`, compteur actuel / max + unité, dernière date de changement (depuis `pdr_instances.date_installation` MAX), dernier motif (depuis `intervention_pdr.cause_remplacement`).
  - **Image** : réutilise `EntityThumbnail`/`useEntityImages` pour l'image principale de l'actif. Overlay SVG : un cercle par position aux coordonnées `marker_x/marker_y` (0–100%), couleur selon `niveau`, tap → sélection + tooltip. Pinch‑zoom natif via CSS `touch-action: pinch-zoom`.
  - Liste de secours toujours visible sous l'image (mobile‑first).

## 3) UI — intégration dans le workflow ticket

`src/pages/TicketDetail.tsx` (zone PDR ligne 324–333 + 386–399) :
- Remplacer la mini‑form actuelle par un sous‑composant `InterventionPdrLineEditor` qui enchaîne :
  1. Select PDR (existing).
  2. Quantité (existing).
  3. `<PdrPositionPicker pdrId machineId={ticket.machine_id} equipementId={...} required={hasPositions} />`.
  4. Cause de remplacement (Select obligatoire si position) — enum: `usure_normale | casse | fuite | preventif | amelioration | non_conformite | autre`.
  5. Commentaire technique (Textarea).
  6. Photo avant / Photo après (uploads optionnels via `EntityImageUploader` → bucket `entity-images`, scope `intervention_pdr`).
  7. Compteur initial du nouveau cycle (numeric, défaut 0).
- Avant validation, **dialog "Confirmer le remplacement"** affichant :
  ```
  PDR : ROBINET-DN50
  Machine : Remplisseuse L1
  Équipement : Bloc dosage
  Position : Robinet voie 3
  Compteur actuel : 480 000 unités
  Durée max : 500 000 unités
  Stock après : N − qte
  ```
- À `handleResolve` :
  - L'`insert intervention_pdr` inclut désormais `position_id`, `compteur_fin` (= `get_position_counter` snapshot), `cause_remplacement`, `commentaire_technique`, photos, `compteur_initial_new`.
  - Le trigger DB clôt l'ancien cycle et ouvre le nouveau (§1).
  - Décrémentation stock + `pdr_stock_movements` : **inchangée**.

Validation côté client (Zod) : si la PDR a des positions actives → `position_id` + `cause_remplacement` requis ; sinon optionnels.

## 4) UI — intégration dans le workflow préventif

`src/pages/PreventifDetail.tsx` :
- Dans le dialogue d'exécution (`execPdrUsed`), pour chaque PDR cochée afficher le même `PdrPositionPicker` (machine/équipement = ceux du plan). Stocker dans le JSONB `pdr_used` : `{ pdr_id, quantite, position_id, compteur_fin, cause_remplacement, commentaire, photo_avant, photo_apres, compteur_initial_new }`.
- Le trigger `tg_preventive_execution_pdr_lifecycle` (§1) gère la clôture/relance de cycle.
- Décrémentation stock préventif : conserver le code existant.

## 5) Alertes & raccourcis depuis position

Dans `PdrPositionsManager` (existant) et `PdrPositionPicker` :
- Badge orange si `pct_consomme >= seuil_alerte_pct`.
- Badge rouge si `pct_consomme >= 100` ou `compteur_actuel > compteur_max`.
- Boutons d'action contextuels (visibles uniquement orange/rouge) :
  - **Créer ticket** → `navigate('/tickets/new?machine=...&pdr=...&position=...')` (params transportés via querystring, préremplit le formulaire ticket).
  - **Créer plan préventif** → `navigate('/preventif/new?machine=...&source_pdr=...&position=...')`.

## 6) Mode "heures" et "unités"

Le calcul est déjà encapsulé dans `get_position_counter` (heures via `lifespan_mode='time'`, unités via `production` + `production_rule`). UI du picker affiche :
- mode heures → "heures consommées / max / restantes".
- mode unités → "unités consommées / max / restantes" + libellé règle (`complète` / `répartie` / `coefficient ×N` / `manuelle`).

## 7) Sécurité, non‑régression, audit

- Toutes les nouvelles colonnes sont **nullables** ; les flux sans position continuent à fonctionner à l'identique.
- Le trigger lifecycle ne s'exécute **que** si `position_id IS NOT NULL`.
- RLS : aucune politique nouvelle requise (les tables touchées ont déjà des policies maintenance).
- Audit (`audit_logs`) : entrées au moment de l'insert `intervention_pdr` avec position, et clôture de cycle PDR.
- Historique immuable : on ne supprime jamais une `pdr_instances`, on la passe en `replaced`.

## 8) Stockage photos

Réutilisation du bucket existant `entity-images` avec préfixes :
- `intervention_pdr/<intervention_id>/before-<uuid>.jpg`
- `intervention_pdr/<intervention_id>/after-<uuid>.jpg`
Compression Canvas via le hook `useImageMaxSize` existant.

## 9) Plan d'implémentation

```text
Étape 1 — Migration SQL
  ├─ ALTER intervention_pdr add columns
  ├─ trigger tg_intervention_pdr_lifecycle
  └─ trigger tg_preventive_execution_pdr_lifecycle

Étape 2 — Composant partagé
  ├─ src/components/pdr/PdrPositionPicker.tsx
  └─ src/components/pdr/PositionImageMarkers.tsx (overlay SVG cliquable)

Étape 3 — Editor de ligne PDR
  └─ src/components/pdr/InterventionPdrLineEditor.tsx
     (PDR + qte + position + cause + commentaire + photos + compteur init)

Étape 4 — Intégration TicketDetail
  ├─ Remplacer mini-form PDR par InterventionPdrLineEditor
  ├─ Dialog "Confirmer remplacement"
  └─ handleResolve : insert enrichi + trigger DB

Étape 5 — Intégration PreventifDetail
  ├─ PdrPositionPicker dans execPdrUsed
  └─ JSONB pdr_used enrichi

Étape 6 — Alertes & raccourcis
  ├─ Badges niveau dans le picker
  └─ Boutons "Créer ticket / Créer plan" depuis position en alerte

Étape 7 — Mémoire & MANUAL.md
  └─ Mettre à jour mem://features/pdr-install-positions
```

## 10) Garanties

- Stock, mouvements, KPIs ticket/préventif : **inchangés**.
- Interventions sans position : aucun changement de comportement.
- PDR sans positions actives sur l'actif : pas d'obligation, pas de friction.
- Historique des cycles préservé via `pdr_instances` + traces `intervention_pdr.cause_remplacement`/`compteur_fin`.
