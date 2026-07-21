# Consultation Réception — UI/UX polish

Portée strictement UI/affichage dans `src/pages/qualite/reception/ReceptionGlobal.tsx` et `TicketPhotosDialog.tsx`. Aucun changement de logique métier ni de base.

## 1. Formats d'affichage (helpers `src/lib/reception.ts`)
- Ajouter `formatKgInt(kg)` → poids en kg **entiers** avec séparateur de milliers FR + suffixe " kg" (ex : `12 345 kg`). Utilisé partout dans Consultation à la place de `formatKg` (qui gardera 2 décimales pour l'usage saisie/pesée).
- Ajouter `formatTonnesInt(kg)` → tonnes entières (`Math.round(kg/1000)` + `" t"`) pour les KPIs.
- Ajouter `formatHm(time)` → tronque `HH:mm:ss(.ms)` → `HH:mm`.

## 2. KPIs (haut de page)
- Basculer Brut / Net / Abattement en **tonnes entières** (`formatTonnesInt`) au lieu de kg/tonnes décimales — cohérent avec la demande "afficher en tonne, pas de kg".

## 3. Vue Cartes — refonte lisible
Nouvelle carte cliquable (toute la carte ouvre le détail) avec hiérarchie visuelle claire :
```text
┌──────────────────────────────────────────┐
│ #NUMERO         [Pesé / En attente]      │
│ Produit — Fournisseur                    │
│ ─────────────────────────────────────── │
│ 📅 12/07/2026   ⏱ 08:15 → 08:32 (17 min)│
│ [Hors délai] (si applicable)             │
│ ─────────────────────────────────────── │
│ Brut   Abat.   Net                       │
│ 12 t   1 t     11 t                      │
│ ─────────────────────────────────────── │
│ 📷 2/3 photos                            │
└──────────────────────────────────────────┘
```
- Bordure gauche colorée (2px) : vert = pesé, ambre = à peser, rouge = hors délai.
- Grille 3 colonnes pour Brut/Abat./Net avec libellé au-dessus, valeur en gras `tabular-nums`, tonnes entières.
- Heures via `formatHm`.
- Photos : indicateur seulement (badge/pastille), plus de bouton dédié — le clic carte ouvre le détail.
- Suppression de la sous-section optionnelle "Créé par / Clôturé par" dans la carte (déplacée dans le dialog détail).

## 4. Vue Tableau
- Colonnes poids passent en `formatKgInt` (kg entiers, séparateur milliers) — l'utilisateur a demandé "entiers", pas nécessairement tonnes ici pour rester précis en tableau.
- Colonnes Début/Fin via `formatHm`.
- Ligne cliquable pour ouvrir le détail (le bouton Photos disparaît de la ligne).

## 5. Fenêtre flottante « Détail ticket » (nouveau composant `TicketDetailDialog.tsx`)
Remplace l'actuel `TicketPhotosDialog` (qui reste utilisé rien qu'à travers ce nouveau composant s'il n'y a que les photos à recharger — sinon supprimé). Design en sections avec header type "bill of lading" :

```text
Header
  #NUMERO — Produit                              [Pesé] [Hors délai?]
  Fournisseur · Wilaya · Région

Section 1 — Chronologie (icônes horloge/calendrier)
  Date · Début → Fin · Durée
  Créé par · Clôturé par · Clôturé le

Section 2 — Pesée (grille 3 colonnes cartes légères)
  Brut          Abattement (taux %)     Net
  12 345 kg     1 235 kg (10 %)         11 110 kg
  ≈ 12 t        ≈ 1 t                    ≈ 11 t   (petit sous-libellé)

Section 3 — Campagne
  Libellé · Objectif · Progression cumulée du ticket dans la campagne (badge)

Section 4 — Photos
  Grille responsive 1/2/3 colonnes, chaque photo cliquable → lightbox plein écran.
  Sous chaque photo : "Photo n · date/heure prise".
  État vide propre si 0 photo.
```
- Dialog large (`max-w-3xl`), scrollable, header sticky.
- Sur mobile : plein écran (via `ResponsiveDialog` pattern déjà en place).
- Bouton "Fermer" en bas + touch targets ≥ 44px.
- Aucun appel muté ; uniquement `select` sur `v_reception_global` (déjà en cache via React Query) + fetch photos signées comme aujourd'hui.

## 6. Câblage `ReceptionGlobal.tsx`
- `useState<Row | null>` pour le ticket sélectionné.
- `onClick` sur la carte / la ligne → `setSelected(r)`.
- Rendu `<TicketDetailDialog row={selected} open={!!selected} onOpenChange={...} />`.
- Suppression de la gestion `photoTicket` séparée.

## Détails techniques
- Formatage : `Math.round(kg).toLocaleString('fr-FR')`.
- `formatHm` : `String(t).slice(0,5)` avec garde `null`.
- Aucune migration DB, aucune modification de politiques RLS.
- Tests existants non impactés (helpers additifs, `formatKg` inchangé).

## Fichiers touchés
- `src/lib/reception.ts` — ajout de 3 helpers.
- `src/pages/qualite/reception/ReceptionGlobal.tsx` — refonte cartes/tableau + wiring dialog.
- `src/pages/qualite/reception/TicketDetailDialog.tsx` — **nouveau**.
- `src/pages/qualite/reception/TicketPhotosDialog.tsx` — supprimé (remplacé) ou conservé en interne pour la grille photos si utile ; à trancher à l'implémentation.
