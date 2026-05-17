## Audit GMAO approfondi + liens cross-modules (GPAO, Qualité, PDR, Shifts, Notifications)

J'ai relu en détail TicketDetail, PreventifDetail, InterventionJournal/History, MaintenancierShiftView, ShiftScreen, useShiftSessionStats, useMaintenanceShiftWorkload, useLineSynopticData, ProductionShiftTicket/MaintenanceShiftIntervention, et croisé avec le schéma Postgres. Liste des bugs **réellement confirmés** (vérifiés en base) classés par sévérité.

### 🔴 Critiques

**C1 — `ProductionShiftTicket` insère `declared_by` mais la colonne s'appelle `declarant_id`**
Confirmé : `tickets` n'a aucune colonne `declared_by`. L'insert PostgREST échoue → toast "Erreur" générique, aucun ticket créé depuis le kiosque shift production. (Le précédent fix a corrigé `line_id → ligne_id` mais a introduit / laissé `declared_by`.) `ShiftScreen.handleCreateTicket` utilise déjà le bon `declarant_id`.
**Fix** : `declared_by` → `declarant_id` dans `ProductionShiftTicket.tsx`.

**C2 — KPI shift maintenance : filtre statut `"ferme"` invalide**
`useShiftSessionStats.ts:125` filtre `tickets.statut = 'ferme'`. L'enum `ticket_statut` ne contient que `ouvert|pris_en_charge|en_cours|resolu|cloture`. Conséquence : `closedTickets` est toujours vide → "Tickets clôturés", "Temps d'arrêt", "MTTR moy." affichent toujours 0 pour le responsable maintenance.
**Fix** : remplacer par `.in("statut", ["resolu","cloture"])`.

**C3 — Pré-cochage par défaut de toutes les PDR dans l'exécution préventive**
`PreventifDetail.openExecDialog` initialise `execPdrUsed[pp.id] = true` pour TOUTES les PDR du plan. Depuis le fix B5, chaque PDR cochée décrémente le stock PMP. Un opérateur pressé qui valide sans décocher consomme tout le kit → stock PMP faux à chaque exécution.
**Fix** : par défaut tout à `false` (opt-in). Texte d'info : "Cocher uniquement les PDR réellement utilisées".

**C4 — Stop de production lié à un ticket jamais clôturé automatiquement**
`production_stops.ticket_id` existe (vérifié). Quand un ticket est résolu, le stop GPAO associé garde `heure_fin = null` et `duree_minutes = null` → le temps d'arrêt continue de courir dans les KPI production (`useShiftSessionStats` calcule `now() - heure_debut` si `heure_fin` nul).
**Fix** : dans `TicketDetail.handleResolve` (et `MaintenanceShiftIntervention.handleSubmit` lors d'une clôture), update `production_stops` correspondants : `heure_fin = now`, `duree_minutes = ticket.temps_arret_minutes ?? round((now-heure_debut)/60000)`.

### 🟠 Logiques

**L1 — Comptage interventions du shift maintenance inflaté**
`useShiftSessionStats.ts:130` `intervCount` compte toutes les lignes `interventions` du technicien dans la fenêtre, y compris : `"Prise en charge"` (créée à chaque take-charge), `"Collaboration (...)"` (créée à chaque add collaborator), `"transferee"`, `"liberee"`. Le manager voit 6 "interventions" pour 1 ticket réel.
**Fix** : exclure `statut in ('transferee','liberee')` ET (description ne commence pas par `Collaboration` OU role = 'lead'). Compter par `ticket_id` distinct serait encore mieux ; on garde l'approche actuelle mais avec exclusions.

**L2 — `assignment_status` reste "transferred"/"released" après résolution**
`TicketDetail.handleResolve` ne reset pas `assignment_status`. Un ticket résolu après transfert reste badgé "Transféré" dans la liste/sticker.
**Fix** : `assignment_status: "assigned"` (ou null) dans l'update de résolution.

**L3 — Notification au déclarant absente quand son ticket est résolu/clôturé**
Le déclarant (opérateur production, qualité, GPAO) n'est jamais notifié de la résolution. La règle Core "audit_critical_event" couvre les criticités, pas le suivi du déclarant.
**Fix** : dans `handleResolve` et `handleClose`, insérer une `notifications` row pour `recipient_user_id = ticket.declarant_id` (skip si declarant = assignee).

**L4 — Mode clôture mobile : aucune décrémentation PDR ni saisie possible**
`MaintenanceShiftIntervention.handleSubmit` (closeTicket=true) résout le ticket sans permettre de saisir les PDR consommées et ne touche pas au stock. Un opérateur qui clôture en mobile contourne involontairement la gestion PMP.
**Fix court terme** : afficher une note "Pièces utilisées ? Saisissez-les depuis l'écran complet du ticket avant de clôturer." + lien direct vers `/tickets/:id`. (Refonte mobile complète = hors scope.)

**L5 — `useShiftSessionStats` production : `tickets` ne compte pas le temps d'arrêt généré**
Ligne 71 : seul un `count` est fait. L'extra "Temps d'arrêt" du shift production additionne uniquement `production_stops`, pas `tickets.temps_arret_minutes`. Si un ticket bloquant ne crée pas de stop, l'arrêt est invisible.
**Fix** : récupérer aussi `tickets.temps_arret_minutes` du shift et l'additionner aux stops (en dédupliquant via `production_stops.ticket_id` pour éviter double-comptage : si stop déjà lié au ticket, ne pas compter le ticket).

**L6 — `MaintenancierShiftView` : plans préventifs sans filtre ligne quand machine multi-ligne**
`useMaintenanceShiftWorkload.ts:84` filtre `line_id.in.(...)` pour les plans, mais beaucoup de plans préventifs ont `line_id = null` et héritent de la ligne via la machine. Conséquence symétrique au B8 ticket : plans manquants pour les machines multi-lignes.
**Fix** : précharger `machine_line_assignments` pour les machines des plans assignés, accepter le plan si `plan.line_id ∈ shiftLineIds` OU `machine ∈ machines des shiftLineIds`.

### 🟡 Robustesse / cohérence

**R1 — Boucle PDR préventive sans gestion d'erreur lecture**
`PreventifDetail.submitExecution` fait `.single()` sur `pdr` — si une PDR a été désactivée, `.single()` retourne `error` et fait throw → l'exécution est créée mais la boucle s'interrompt en milieu de course (PDR partiellement décrémentées). 
**Fix** : `.maybeSingle()`, continuer la boucle, journaliser les PDR ignorées dans `notes` de l'exécution.

**R2 — `InterventionHistory` filtre Ticket dropdown plafonné à 500**
Anciens tickets absents du select.
**Fix** : passer à 5000 (cohérent avec les autres listes), bandeau si atteint.

**R3 — Audit de transfert/libération sans contexte machine**
`handleTransfer/handleRelease` audit ne contient pas `machine_id` ni `ligne_id` dans metadata → recherche audit moins fine.
**Fix** : ajouter `entity_code = ticket.numero`, `metadata.machine_id`, `metadata.ligne_id`.

### Hors périmètre (à valider séparément)

- **Atomicité stock PDR** (RPC SQL) — toujours non implémentée, nécessite migration.
- **Refonte UX clôture mobile** avec saisie PDR — changement plus lourd.
- **Notification déclencheurs `ticket_resolved`/`ticket_closed` via règles configurables** — l'infra notification_rules existe mais aucune règle pré-câblée ; L3 est un fallback hard-coded en attendant.

### Fichiers touchés (≈9 fichiers, 3–30 lignes chacun)

- `src/pages/shift/ProductionShiftTicket.tsx` — C1
- `src/hooks/useShiftSessionStats.ts` — C2, L1, L5
- `src/pages/PreventifDetail.tsx` — C3, R1
- `src/pages/TicketDetail.tsx` — C4, L2, L3, R3
- `src/pages/shift/MaintenanceShiftIntervention.tsx` — C4 (variant), L4
- `src/hooks/useMaintenanceShiftWorkload.ts` — L6
- `src/pages/InterventionHistory.tsx` — R2
- Tests : ajout dans `src/test/gmao/` (statut KPI shift maintenance, default PDR opt-in, stop auto-close).

Je ne touche qu'à la logique listée — pas de refonte UI, pas de migration SQL.