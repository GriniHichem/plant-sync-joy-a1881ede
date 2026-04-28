## Objectif

Permettre au maintenancier qui a pris en charge un ticket mais ne peut pas le résoudre (fin de shift) de :
- **Transférer** le ticket à un autre maintenancier (passation nominative)
- **Libérer** le ticket (le remettre dans le pool, statut `ouvert`, sans assigné)

Couvre les deux scénarios métier de fin de poste.

## Comportement métier

### 1. Transférer à un autre maintenancier
- Disponible si : statut = `pris_en_charge` ou `en_cours`, et user = `assignee_id` (ou admin / resp_maintenance)
- Sélection du nouveau maintenancier (liste `maintenancier` + `resp_maintenance`)
- Saisie obligatoire d'un **motif de passation** (raison fin de shift, blocage, etc.)
- Effets :
  - Clôture de l'intervention en cours du maintenancier sortant (`statut = transferee`, `date_fin = now`, note = motif)
  - Création d'une nouvelle intervention pour le repreneur (`statut = en_cours`)
  - `tickets.assignee_id` = nouveau maintenancier ; statut reste `pris_en_charge`
  - `heure_prise_en_charge` conservée (pour ne pas fausser le KPI temps total) — le transfert est tracé séparément
  - Les **collaborateurs** (table `ticket_collaborators`) sont conservés
  - Notification in-app au repreneur (règle dédiée `ticket.transferred`)
  - Audit log avec ancien/nouveau assigné + motif

### 2. Libérer le ticket
- Mêmes conditions d'accès que Transférer
- Saisie obligatoire d'un **motif de libération**
- Effets :
  - Clôture de l'intervention en cours (`statut = liberee`, note = motif)
  - `tickets.assignee_id = null`, `statut = ouvert`, `heure_prise_en_charge = null`
  - Collaborateurs conservés (peuvent rester pour info, mais le ticket redevient prenable par n'importe quel maintenancier)
  - Notification in-app au rôle `maintenancier` + `resp_maintenance` (règle `ticket.released`)
  - Audit log avec motif

## Modifications techniques

### Base de données (migration)
- Ajouter à l'enum `intervention_statut` les valeurs `transferee` et `liberee` (si absentes — sinon utiliser `terminee` + flag dans `notes`).
- Aucune nouvelle table requise — réutilisation de `interventions`, `audit_logs`, `notification_rules`.

### UI — `src/pages/TicketDetail.tsx`
Nouvelle carte **« Passation / Libération »** affichée quand `canTransferOrRelease` (assignee actuel + statut actif), située juste avant la carte Résolution :

```text
┌─ Passation / Libération ──────────────┐
│  [Transférer à]  [Select maintenanc.] │
│  [Motif *]       [Textarea]           │
│  [ Transférer ]  [ Libérer ticket ]   │
└───────────────────────────────────────┘
```

Handlers :
- `handleTransfer(newUserId, motif)` — UPDATE ticket + close/open interventions + audit + notification
- `handleRelease(motif)` — UPDATE ticket + close intervention + audit + notification

Sur mobile : actions intégrées dans `StickyActionBar` en mode secondaire (boutons outline).

### Notifications (paramétrables)
Deux nouveaux event_types ajoutés au catalogue (`src/lib/ruleCatalog.ts`) :
- `ticket.transferred` — destinataire = nouveau assigné, sévérité `info`
- `ticket.released` — destinataires = rôles `maintenancier`/`resp_maintenance`, sévérité `warning`

Règles seedées par défaut (actives, in_app uniquement).

### Audit
Entrées `audit_logs` avec :
- `module = "tickets"`, `action_type = "transfer"` ou `"release"`
- `old_values = { assignee_id: ancien }`, `new_values = { assignee_id: nouveau | null }`
- `description` = motif saisi

### Permissions / RLS
- Aucun changement RLS nécessaire — l'UPDATE de `tickets` reste autorisé pour admin / resp_maintenance / maintenancier.
- Garde-fou côté UI : seul l'assigné courant (ou admin / resp_maintenance) voit les boutons.

## Hors-scope
- Pas de file d'attente / shift planning automatique (le transfert reste manuel).
- Pas de transfert en masse (un ticket à la fois).
- Pas de modification du flow de prise en charge initial.
