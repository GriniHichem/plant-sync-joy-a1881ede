## Audit GMAO — bugs trouvés et corrections

J'ai parcouru les modules Tickets, Interventions, Préventif, Shift maintenance et hiérarchie d'assets, puis vérifié le schéma Supabase pour confirmer les écarts. Voici les problèmes confirmés et le plan de correction.

### 🔴 Critiques (cassent une fonctionnalité)

**B1 — Création de ticket depuis le kiosque shift production échoue silencieusement**
`src/pages/shift/ProductionShiftTicket.tsx:68` insère `line_id` dans `tickets`, mais la colonne réelle est `ligne_id` (vérifié en base). L'insert renvoie une erreur PostgREST → toast "Erreur" générique, aucun ticket créé.
**Fix** : remplacer `line_id` par `ligne_id` dans l'objet inséré.

**B2 — Clôture mobile (kiosque maintenance shift) écrit un statut invalide**
`src/pages/shift/MaintenanceShiftIntervention.tsx:173` met `statut: "ferme"`. L'enum `ticket_statut` n'accepte que `ouvert | pris_en_charge | en_cours | resolu | cloture`. L'update échoue, l'intervention est insérée mais le ticket reste "pris_en_charge". Pas de vérif d'erreur → silencieux.
**Fix** : passer le ticket à `resolu` (puisqu'on saisit cause + solution), poser `heure_resolution`, calculer `temps_arret_minutes` et `temps_intervention_minutes`, vérifier l'erreur d'update et la propager au toast. La clôture finale (`cloture`) reste réservée au resp. maintenance via `TicketDetail`.

**B3 — Race condition à la prise en charge**
`TicketDetail.handleTakeCharge` ne vérifie pas que `assignee_id` est nul → deux maintenanciers cliquant en même temps écrasent l'un l'autre.
**Fix** : ajouter `.is("assignee_id", null)` au `.update()` et vérifier `data.length === 0` pour avertir "Ticket déjà pris par un collègue, recharger".

**B4 — `handleResolve` ne vérifie pas l'erreur de l'update ticket**
Si la résolution échoue (RLS, contrainte), les insertions PDR + sortie de stock partent quand même → désynchro stock.
**Fix** : `if (error) { toast destructive; return; }` avant toute écriture PDR.

### 🟠 Logiques (le code marche mais le résultat est faux)

**B5 — Exécution préventive ne décrémente pas le stock PDR**
`PreventifDetail.submitExecution` enregistre `pdr_used` en JSON mais ne fait ni `pdr.stock_actuel` ni `pdr_stock_movements` (contrairement à `TicketDetail.handleResolve`). Conséquence : stock PMP faux dès qu'un préventif consomme.
**Fix** : pour chaque PDR coché, décrémenter `stock_actuel`, insérer un mouvement `sortie` avec `source_type='preventive_execution'`, `source_id=execId`, `motif=plan.title`, `user_id`. Encadrer d'un try/catch comme dans tickets.

**B6 — `temps_intervention_minutes` gonflé par le fallback**
`TicketDetail.handleResolve` utilise `heure_prise_en_charge || heure_declaration`. Quand un ticket est resté en file d'attente plusieurs heures puis résolu sans prise en charge formelle, le KPI MTTR confond temps d'attente et temps d'intervention.
**Fix** : si `heure_prise_en_charge` est nul, mettre `temps_intervention_minutes = null` (et conserver `temps_arret_minutes` qui reste valable). MTBF/MTTR se calculent déjà à partir des tickets, pas des interventions (memory `gmao-maintenance`).

**B7 — Aucun audit sur les actions sensibles préventif/ticket**
- `TicketDetail.handleResolve` n'écrit pas d'audit_log (seul `validation_request` post-hoc est appelé).
- `TicketDetail.handleClose` : aucun audit, aucun check de validation.
- `PreventifDetail.updateStatut` (valider/suspendre/réactiver) : aucun audit.
- `PreventifDetail.submitExecution` : aucun audit.
**Fix** : `logAudit` à chaque mutation avec `module`, `entity_type`, `entity_id`, `action_label`, `old_values`/`new_values`, `severity` adapté. Conforme à la règle Core "Every mutation needs audit_logs".

**B8 — Filtre Ligne du Journal ne capte pas les anciens tickets**
`InterventionJournal:105` lit bien `t.ligne_id`, mais avant l'arrivée de `machine_line_assignments`, beaucoup de tickets ont `ligne_id = null`. Le fallback via `machineLineMap` fonctionne, sauf que `machine_line_assignments` ne renvoie que la 1ʳᵉ ligne par machine (Map écrase). Les machines présentes sur plusieurs lignes (cf. memory asset-hierarchy : max 3) sont sous-comptées.
**Fix** : transformer `machineLineMap` en `Record<string, string[]>` et accepter le filtre si l'une des lignes correspond.

**B9 — `InterventionHistory` filtre nested PostgREST suspect**
`q.eq("ticket.ligne_id", filterLine)` — la syntaxe nested avec relation n'est pas garantie. À tester : si invalide, basculer vers `q.eq("tickets.ligne_id", ...)` (nom de table) ou récupérer puis filtrer en mémoire.
**Fix** : ajouter un test en local et corriger si l'API renvoie 0 résultats à tort.

### 🟡 Robustesse

**B10 — Limite implicite 1000 lignes**
`TicketsList`, `PreventifList`, `InterventionJournal` chargent sans `.limit()` → Supabase tronque à 1000. Sur un site mature, des tickets/plans deviennent invisibles.
**Fix** : ajouter `.limit(5000)` explicite + bandeau d'avertissement quand on l'atteint (et invitation à filtrer).

**B11 — Décrément stock PDR non atomique**
`TicketDetail.handleResolve` lit `stock_actuel` côté client puis update. Deux interventions concurrentes peuvent écrire le même `stock_apres`.
**Fix court terme** : remplacer par un RPC `decrement_pdr_stock(pdr_id, qty, source_type, source_id, motif, user_id)` qui fait l'update + insert mouvement en SQL atomique. (Migration séparée si tu valides.)

### Périmètre fichiers (≈9 fichiers, 5–25 lignes par fichier)

- `src/pages/shift/ProductionShiftTicket.tsx` — B1
- `src/pages/shift/MaintenanceShiftIntervention.tsx` — B2
- `src/pages/TicketDetail.tsx` — B3, B4, B6, B7
- `src/pages/PreventifDetail.tsx` — B5, B7
- `src/pages/InterventionJournal.tsx` — B8
- `src/pages/InterventionHistory.tsx` — B9
- `src/pages/TicketsList.tsx`, `src/pages/PreventifList.tsx` — B10
- Tests : ajouts dans `src/test/gmao/` (statut clôture mobile, prise en charge concurrente, fallback intervention KPI, décrément stock préventif)

### Hors périmètre (mentionné mais reporté)

- B11 (RPC atomique stock) : nécessite une migration SQL. Je peux l'inclure si tu valides séparément la création de la fonction.
- Refonte UX du flux de clôture mobile (passer par `/tickets/:id` complet) : changement plus lourd, à discuter si tu veux.

Je touche uniquement à la logique GMAO listée — pas de refactoring UI ni de changement de schéma sans nouvelle approbation pour B11.