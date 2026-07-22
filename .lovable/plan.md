## Objectif

Permettre aux utilisateurs autorisés (Consultation : Voir/Modifier) d'émettre des **orientations** (taux d'abattement recommandé + explication) sur un ticket. L'agréeur peut consulter ces avis lors de la saisie sans que cela n'altère le ticket.

## 1. Backend (migration)

Nouvelle table `public.reception_ticket_orientations` :
- `ticket_id` (FK → reception_tickets, cascade)
- `user_id` (FK → auth.users)
- `taux_recommande` numeric(5,2) — entre 0 et 100
- `explication` text nullable
- `created_at`, `updated_at`
- Unicité `(ticket_id, user_id)` → un seul avis par utilisateur/ticket (upsert écrase)

GRANTs : `authenticated` (SELECT/INSERT/UPDATE de son avis), `service_role` full. Admin peut DELETE.

RLS :
- SELECT : tout utilisateur ayant `can_view` sur `reception_global` (via `reception_permissions`).
- INSERT/UPDATE : `can_view` OU `can_edit` sur `reception_global`, et `user_id = auth.uid()`.
- DELETE : `admin` uniquement.

Vue helper `v_reception_orientations` joignant profil (nom) + ticket (produit, campagne, date).

## 2. UI — Consultation ticket (`TicketDetailDialog.tsx`)

Nouvelle section **« Orientations »** sous les photos :
- Liste sous forme de **badges cliquables** affichant le taux (`5 %`). Popover au clic montrant : explication, nom utilisateur, date/heure. Tri chronologique décroissant (plus récent d'abord), toggle inversion.
- Formulaire compact en ligne (si droit Voir/Modifier sur Consultation) :
  - Input numérique `Taux recommandé (%)` (0–100, pas 0.1)
  - Textarea `Explication (facultatif)`
  - Bouton `Ajouter / Mettre à jour mon orientation` — upsert; si existante, préremplit le formulaire.
- Bouton corbeille sur chaque badge visible **uniquement pour admin**.

## 3. UI — Réception qualitative (`ReceptionQualitative.tsx`)

À côté du champ **Taux d'abattement (%)**, bouton `Voir les orientations` (icône Lightbulb) :
- Ouvre un `ResponsiveDialog` secondaire listant les **30 dernières orientations** filtrées par `campagne_id` du ticket courant ET `produit_id` (si défini), triées par `created_at desc`.
- Chaque ligne : badge taux, produit, ticket n°, auteur, date, explication (repliable).
- Purement informatif ; ne modifie pas la saisie.

## 4. Règles de gestion

- Ajout autorisé même sur ticket **clôturé** ou **annulé**.
- Aucun impact sur `taux_abattement`, `poids_*`, statut du ticket.
- Traçabilité complète (horodatage + user_id).
- Contrôle doublon en base via contrainte unique (upsert clair côté UI).

## Fichiers touchés

- **Migration** : nouvelle table + policies + vue.
- **Nouveau** : `src/components/reception/TicketOrientations.tsx` (section badges + formulaire).
- **Nouveau** : `src/components/reception/OrientationsAdvisorDialog.tsx` (30 dernières, contextuel).
- **Modifié** : `src/pages/qualite/reception/TicketDetailDialog.tsx` — intégrer `TicketOrientations`.
- **Modifié** : `src/pages/qualite/reception/ReceptionQualitative.tsx` — bouton "Voir les orientations" à côté du champ taux.

Aucun changement sur la logique de pesée, statuts, ou permissions existantes.
