## Objectif

Transformer le dialogue **Orientations récentes** (bouton ampoule à côté du taux) d'une liste plate d'avis vers une vue **par ticket** : chaque carte = un ticket du même contexte (campagne/produit), avec ses photos et tous les avis affichés comme **tags cliquables**. On liste les **30 derniers tickets ayant au moins une orientation**.

## Nouveau concept UX

Vue **carte par ticket** dans `OrientationsAdvisorDialog.tsx` :

```text
┌─────────────────────────────────────────────────────────┐
│ #10023 · Tomate · 22/07 08:15   [Moy. 6.5%] [3 avis]    │
│ ┌────┐ ┌────┐ ┌────┐                                    │
│ │img1│ │img2│ │img3│  ← miniatures cliquables (lightbox)│
│ └────┘ └────┘ └────┘                                    │
│ Taux appliqué : 7 %                                     │
│ Orientations : [5% — Karim]  [7% — Sara]  [8% — Ali]    │
│   ↳ clic tag → popover (explication + date)             │
└─────────────────────────────────────────────────────────┘
```

- **En-tête** : n° ticket, produit, date/heure, moyenne des taux recommandés, nombre d'avis, taux d'abattement réellement appliqué (si dispo) pour comparaison rapide.
- **Photos** : 3 miniatures via URLs signées (bucket `reception-photos`), clic → lightbox plein écran (réutilise le pattern existant de `TicketDetailDialog`).
- **Tags orientations** : `Badge` compact avec `taux % — auteur`. Clic → `Popover` avec explication complète + horodatage.
- Tri : plus récent d'abord. Toggle d'inversion conservé.
- Filtrage contextuel : même campagne (et même produit si défini sur le ticket courant), inchangé.

## Implémentation technique

### 1. Backend — nouvelle vue agrégée

Migration : créer `v_reception_ticket_orientations_summary` (une ligne par ticket) :
- `ticket_id`, `ticket_numero`, `ticket_date`, `heure_debut`
- `product_id`, `produit_nom`, `campaign_id`, `campagne_nom`
- `taux_abattement` (appliqué), `poids_net_kg`
- `orientations_count`, `taux_moyen`
- `orientations` : agrégat `jsonb` `[{id, taux_recommande, explication, author_name, created_at}, ...]`
- `last_orientation_at` (pour tri)

Filtres RLS hérités via la vue existante `v_reception_orientations` (jointure). GRANT SELECT à `authenticated`.

### 2. Frontend — refonte du dialogue

Fichier : `src/components/reception/OrientationsAdvisorDialog.tsx` (réécriture)
- Query sur la nouvelle vue, limit 30, tri `last_orientation_at desc`.
- Hook local pour récupérer les 3 photos par ticket à la demande (batch : 1 requête `reception_ticket_photos` groupée par `ticket_id IN (...)` + `createSignedUrls` en batch).
- Composant carte `TicketOrientationCard` avec :
  - Section photos (grille 3 col, aspect 4/3, clic → état `lightbox`)
  - Section tags (`Badge` + `Popover` de shadcn)
- Lightbox interne (Dialog imbriqué) identique au pattern de `TicketDetailDialog`.

### 3. Aucun changement fonctionnel ailleurs

- `TicketOrientations.tsx` (saisie côté détail ticket) : inchangé.
- Table `reception_ticket_orientations` : inchangée.
- Bouton "Voir les orientations" dans `ReceptionQualitative.tsx` : inchangé (mêmes props).

## Fichiers touchés

- **Migration** : nouvelle vue `v_reception_ticket_orientations_summary` + GRANT.
- **Modifié** : `src/components/reception/OrientationsAdvisorDialog.tsx` (refonte complète : cartes ticket + photos + tags popover + lightbox).

## Règles conservées

- Purement informatif, aucun impact sur le ticket courant.
- Filtrage par campagne + produit du ticket ouvert.
- Limite 30 tickets, tri récent → ancien.
