# Co-intervenants sur ticket de maintenance

Permettre à plusieurs maintenanciers de collaborer à la résolution d'un même ticket. Le maintenancier qui prend en charge reste **le responsable principal** (`assignee_id`), mais peut ajouter des **collaborateurs** (« Avec l'aide de »).

## 1. Base de données

Nouvelle table `ticket_collaborators` (1 ticket → N collaborateurs) :

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `ticket_id` | uuid | référence `tickets(id)` (cascade delete) |
| `user_id` | uuid | l'utilisateur collaborateur |
| `role_label` | text | `aide`, `co_intervenant` (défaut `aide`) |
| `added_by` | uuid | qui l'a ajouté |
| `added_at` | timestamptz | défaut now() |
| `removed_at` | timestamptz nullable | soft-delete pour traçabilité |

- **Unicité** : `(ticket_id, user_id)` quand `removed_at IS NULL`.
- **RLS** :
  - SELECT : authentifié.
  - INSERT/UPDATE : `admin`, `resp_maintenance`, ou l'`assignee_id` du ticket (ne peut ajouter que des users ayant rôle `maintenancier`/`resp_maintenance`).
  - Trigger d'audit (`audit_logs`) sur ajout/retrait — conforme à la règle Core.
- À la résolution, on insère **une `intervention` par collaborateur** (statut `terminee`, description « Collaboration ») afin que l'historique et les KPI techniciens reflètent leur participation.

## 2. UI — `src/pages/TicketDetail.tsx`

Dans la carte **Résolution** (visible quand `canResolve`), ajouter un bloc **« Avec l'aide de »** au-dessus des PDR :

```text
┌─ Avec l'aide de ───────────────────────────┐
│ [Sélectionner un maintenancier ▾] [+]      │
│                                            │
│ • Karim B.        (aide)        [×]        │
│ • Sofiane M.      (co-intervenant) [×]     │
└────────────────────────────────────────────┘
```

- **Select** : liste les users ayant rôle `maintenancier` ou `resp_maintenance`, hors `assignee_id` et hors déjà ajoutés.
- **Toggle rôle** par chip : `aide` ↔ `co_intervenant`.
- **Mobile-first** : Select pleine largeur + bouton 48px ; chips empilés.
- Ajout/retrait **immédiat** (persistance directe) — pas de bouton « Enregistrer » séparé. Toast de confirmation.

Dans la carte **Informations**, ajouter un `InfoItem` « Pris en charge par » :
- Principal : nom + badge `Responsable`.
- En dessous : liste des collaborateurs avec leur libellé.

Dans la carte **Historique interventions**, afficher les interventions des collaborateurs (déjà supporté par le rendu existant — on ajoute juste le nom du technicien).

## 3. Permissions / règles

- Seul l'assignee, un `resp_maintenance` ou `admin` peut **gérer** la liste.
- Tant que le ticket est `resolu`/`cloture`, la liste devient **lecture seule**.
- Auto-exclusion : impossible d'ajouter le déclarant ou un non-maintenancier.

## 4. Notifications

Hook sur insertion `ticket_collaborators` → notification in-app au collaborateur ajouté : « Vous avez été ajouté en collaboration sur le ticket {numero} ». Utilise le système de règles existant (`notification_rules`, événement `ticket_collaborator_added`).

## 5. Hors scope

- Pas de chat/discussion entre collaborateurs.
- Pas de répartition de temps par collaborateur (le `temps_intervention_minutes` reste global).
- Pas de modification rétroactive après clôture.

## Fichiers touchés

- **Migration SQL** : création `ticket_collaborators` + RLS + trigger audit.
- `src/pages/TicketDetail.tsx` : bloc « Avec l'aide de », chargement collaborateurs, persistance, intervention par collaborateur à la résolution.
- `src/pages/TicketsList.tsx` : badge « +N » à côté de l'assignee si collaborateurs (optionnel, petit).
- Règle de notification seedée si non existante.
