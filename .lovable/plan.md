## Objectifs

1. Filigrane date/heure incrusté dans les photos capturées.
2. Traçabilité "Créé par" / "Clôturé par" / "Clôturé le" enregistrée puis affichable à la demande dans la consultation globale.
3. Consultation des 3 photos directement depuis chaque ligne du tableau global.

## 1. Filigrane des photos (`CameraCaptureDialog.tsx`)

Dans la fonction `snapshot()`, après `ctx.drawImage(...)` :

- Calculer un bandeau bas (~6% de hauteur, min 40 px).
- Remplir un rectangle noir semi-transparent (`rgba(0,0,0,0.55)`).
- Écrire en blanc, police proportionnelle (`Math.round(canvas.height * 0.03)px sans-serif`), le texte `"Photo {slot} — dd/mm/yyyy HH:MM"` (format FR via `new Date().toLocaleString('fr-FR')`).
- Padding horizontal 12 px, aligné à gauche ; à droite, afficher `N° ticket` si transmis en prop (optionnel — voir §4).

Le filigrane est appliqué avant `toDataURL` / `toBlob`, donc il est persistant côté stockage.

## 2. Données de traçabilité (déjà en base)

Les colonnes `created_by`, `cloture_at`, `cloture_by` existent déjà sur `reception_tickets`. Rien à migrer.

Vérifications côté code :
- `ReceptionQualitative.tsx` : à la création d'un ticket, forcer `created_by = auth.user.id` si non déjà setté.
- Clôture d'un ticket : setter `cloture_at = now()` et `cloture_by = auth.user.id`.
- Étendre `v_reception_global` : ajouter `created_by`, `cloture_by`, plus les libellés (`created_by_name`, `cloture_by_name`) via jointure sur `profiles`.

## 3. Consultation globale (`ReceptionGlobal.tsx`)

### 3a. Colonnes optionnelles

- Ajouter un bouton `DropdownMenu` "Colonnes" (icône `Columns3`) à côté de "Réinit." / "Export".
- Options avec cases à cocher, persistées dans `localStorage("reception-global-cols")` :
  - Créé par
  - Clôturé par
  - Clôturé le
  - Photos
- Par défaut : toutes masquées sauf Photos.
- Rendu conditionnel dans `<TableHead>` et `<TableCell>` (dates formatées `dd/MM/yyyy HH:mm`).

### 3b. Colonne Photos par ligne

- Nouvelle cellule affichant `[nb_photos] miniatures` cliquables.
- Bouton `Voir` (icône `Image`) ouvrant un `ResponsiveDialog` `TicketPhotosDialog` :
  - Charge `reception_ticket_photos` pour le `ticket_id` sélectionné.
  - Génère une URL signée via `supabase.storage.from('reception-photos').createSignedUrl(path, 300)` pour chaque photo.
  - Affiche les 3 slots côte à côte, cliquables (lightbox natif via `<a target="_blank">`).
- Export CSV : ajouter les colonnes `created_by_name`, `cloture_at`, `cloture_by_name`, `nb_photos` uniquement si visibles.

## 4. Détails techniques

Fichiers modifiés :
- `src/pages/qualite/reception/CameraCaptureDialog.tsx` — filigrane canvas + prop optionnelle `ticketNumero`.
- `src/pages/qualite/reception/PhotoSlot.tsx` — transmettre `ticketNumero`.
- `src/pages/qualite/reception/ReceptionQualitative.tsx` — passer `ticketNumero`, garantir `created_by`, `cloture_at`, `cloture_by`.
- `src/pages/qualite/reception/ReceptionGlobal.tsx` — sélecteur de colonnes, colonne Photos, ouverture du dialog.
- Nouveau : `src/pages/qualite/reception/TicketPhotosDialog.tsx`.
- Migration SQL : `CREATE OR REPLACE VIEW public.v_reception_global` pour exposer `created_by`, `created_by_name`, `cloture_by`, `cloture_by_name` (jointures LEFT sur `profiles`).

Aucune modification de RLS nécessaire (les buckets photos et policies existent déjà). Aucun impact sur les modules maintenance/GPAO.
