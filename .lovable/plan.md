# Risque qualité ↔ Maintenance (tickets / préventif)

Relier la qualité à la maintenance : le contrôle qualité peut ouvrir un ticket « risque qualité » (choix ligne + machine, demande d'intervention, décision arrêt/maintien production), ou attacher un risque qualité à un ticket existant. Le maintenancier voit clairement cette information, et tout ticket à risque qualité est marqué d'une icône dédiée.

## 1. Base de données (migration)

Ajout de colonnes sur `public.tickets` (aucune table nouvelle) :

- `quality_risk` boolean NOT NULL DEFAULT false — drapeau risque qualité
- `quality_risk_level` text — `mineur` | `majeur` | `critique`
- `quality_risk_note` text — description du risque qualité
- `quality_production_decision` text — `arret` | `maintien` (recommandation qualité)
- `quality_risk_declared_by` uuid — auteur qualité
- `quality_risk_declared_at` timestamptz
- `quality_shift_id` uuid — lien vers le shift qualité (`quality_shifts`)
- `quality_check_id` uuid, `quality_nc_id` uuid — liens optionnels vers le contrôle/NC d'origine

Index partiel `WHERE quality_risk = true` pour les listes.

### RPC `attach_quality_risk_to_ticket` (SECURITY DEFINER)

La politique UPDATE actuelle n'autorise que déclarant/assigné/maintenance/admin. Pour permettre à la qualité d'annoter un ticket existant sans élargir l'accès à toutes les colonnes, une fonction dédiée :

```
attach_quality_risk_to_ticket(
  p_ticket_id uuid, p_level text, p_note text,
  p_decision text, p_shift_id uuid, p_check_id uuid, p_nc_id uuid)
```

- Vérifie `has_role(auth.uid(), 'controleur_qualite' | 'responsable_controle_qualite' | 'directeur_qualite' | 'admin')`
- Met à jour uniquement les colonnes `quality_*`, positionne `quality_risk = true`, `quality_risk_declared_by = auth.uid()`, `quality_risk_declared_at = now()`
- Journalise via `audit_logs` (déclenchée aussi côté client)

La **création** d'un ticket reste un `INSERT` direct (politique existante `declarant_id = auth.uid()`), avec les champs `quality_*` renseignés.

## 2. Sélection ligne + machine

Aujourd'hui `MaintenanceRiskPanel` déduit une seule machine via `production_lines.machine_id`. On étend :

- Choix de la **ligne** (par défaut celle de l'OF)
- Choix de la **machine** parmi celles rattachées à la ligne via `machine_line_assignments` (+ `line.machine_id`) ; machine facultative — si absente, on retombe sur la machine principale de la ligne (contrainte `machine_id NOT NULL` sur tickets respectée). Si aucune machine n'existe, le ticket ne peut être créé (message clair).

## 3. UI Qualité — `src/components/qualite/MaintenanceRiskPanel.tsx`

Enrichir le dialogue « Déclarer un ticket » :

- Sélecteurs Ligne et Machine
- **Gravité** (mineur/majeur/critique)
- **Décision production** : boutons segmentés `Arrêter la production` / `Maintenir la production`
- Description (obligatoire)
- À la création : `quality_risk = true`, `quality_shift_id` (shift qualité courant), champs `quality_*`, description préfixée `[Risque qualité]`

Nouvelle action sur chaque **ticket ouvert déjà listé** : bouton « Ajouter risque qualité » ouvrant un mini-dialogue (gravité + note + décision) qui appelle `attach_quality_risk_to_ticket`. Les tickets déjà à risque affichent le badge/icône `ShieldAlert`.

## 4. UI Maintenance — affichage du risque qualité

### `src/pages/TicketDetail.tsx`
- Badge `ShieldAlert` (ambre/rouge selon gravité) dans l'en-tête quand `quality_risk`
- Nouvelle **Card « Risque qualité »** (visible si `quality_risk`) : gravité, note, décision production mise en évidence (arrêt = rouge), auteur + date, lien vers le shift qualité / contrôle d'origine
- Étendre le `select` de chargement du ticket pour inclure les colonnes `quality_*`
- Bouton qualité « Signaler un risque qualité » pour les rôles qualité lorsque le ticket n'est pas encore marqué (réutilise l'RPC)

### `src/pages/TicketsList.tsx` et `src/pages/MaintenancierShiftView.tsx`
- Icône `ShieldAlert` à côté du numéro pour les tickets `quality_risk` (vue cartes + tableau + file maintenancier)
- Ajout de `quality_risk`, `quality_risk_level` au `select` des listes
- Filtre rapide optionnel « Risque qualité » dans TicketsList

## 5. Notifications & cohérence inter-modules

- À la création/annotation d'un risque qualité : notification aux `resp_maintenance` (via `notifications`, `notification_type: "ticket_quality_risk"`)
- Si `quality_production_decision = 'arret'` : notification au responsable production du shift lié (si `of_id`/`shift_id` connus) pour cohérence avec le module production
- Réutilise le helper `logAudit` déjà en place ; pas de logique métier production modifiée (la décision est une recommandation tracée, pas un arrêt automatique)

## Vérification

- `tsgo --noEmit`
- Contrôle visuel : `/qualite/shift` (création + annotation), `/tickets/:id` (Card risque qualité + icône), `/tickets` (icône + filtre), vue maintenancier
- Test création ticket avec décision « arrêt » → présence badge, note, notification
