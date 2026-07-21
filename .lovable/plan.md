# Réception Fruits & Légumes frais

Module autonome rattaché au **Qualité**, entièrement neuf (aucune version antérieure trouvée — pas de migration de données). Il réutilise le design system industriel (Matte Ceramic, IBM Plex, 48px targets), les composants shadcn, `EntityImageUploader`/lightbox, `ExportCsvButton`, `useAuth`, `usePermissions`, `has_role`, `audit_logs` et le bucket `entity-images` déjà en place.

## 1. Navigation

- Nouvelle app dans **Qualité** → `/qualite/reception` (icône `Truck`).
  - Ajoutée dans `AppSidebar` (groupe Qualité) et `Apps.tsx`.
- Écran d'accueil = `Tabs` shadcn avec 4 onglets :
  `Paramétrage` · `Réception qualitative` · `Réception quantitative` · `Consultation globale`.
- L'onglet actif est reflété dans l'URL (`?tab=…`) pour deep-link et back-button.

## 2. Base de données (une seule migration)

Ajout d'un rôle enum : `agent_pont_bascule` dans `public.app_role`.

Tables (préfixe `reception_` pour rester isolé du reste) :

- `reception_products` — code (unique), designation, description, normes[], calibres[], varietes[], caracteristiques (JSONB), actif.
- `reception_suppliers` — code, nom, region, wilaya, contact, telephone, adresse, notes, agree (bool), actif.
- `reception_campaigns` — code, libelle, product_id, date_debut, date_fin, objectif_kg numeric, kpi_targets JSONB, actif, is_default. Trigger `BEFORE INSERT/UPDATE` : quand `is_default=true`, forcer les autres à `false`. Contrainte `date_fin >= date_debut`.
- `reception_tickets` (qualitatif) — numero (unique, auto `RQ-YYYY-NNNN`), campaign_id, product_id (dérivé au trigger), supplier_id, date_ticket, heure_debut, heure_fin, taux_abattement (0-100), commentaire, statut (`ouvert` | `cloture`), cloture_at, cloture_by, created_by. Colonne générée `duree_minutes` via fonction (gère minuit).
- `reception_ticket_photos` — ticket_id, slot (1|2|3, unique par ticket), storage_path, uploaded_by, uploaded_at.
- `reception_weighings` (quantitatif) — ticket_id (unique → 1 pesée max), code_pesee (auto `PB-YYYY-NNNN`), poids_brut_kg, taux_abattement_snapshot, poids_abattement_kg (généré), poids_net_kg (généré), weighed_by, weighed_at.

Toutes tables : `created_at`/`updated_at` + trigger `update_updated_at_column`, RLS activée, GRANT explicites `authenticated`/`service_role`.

RPC : `close_reception_ticket(ticket_id)` — vérifie 3 photos + champs obligatoires, verrouille, écrit `audit_logs`.

Vue `v_reception_global` — jointure ticket + campagne + produit + fournisseur + pesée + calcul durée & abattement tonnes, utilisée par la consultation.

### Verrouillage (immuabilité après clôture)

Trigger `BEFORE UPDATE/DELETE` sur `reception_tickets` et `reception_ticket_photos` : refuse toute modification si `statut='cloture'` (sauf admin via service_role). Idem `reception_weighings` après validation.

### RLS (mapping rôles)

```
Paramétrage (products/suppliers/campaigns)  read: qualité + agent_pont_bascule + admin/resp_si + auditeur
                                            write: admin, resp_si, directeur_qualite, responsable_controle_qualite
Tickets qualitatifs read: qualité + agent_pont_bascule + admin/resp_si + auditeur
                    insert/close: controleur_qualite + resp_controle + dir_qualite + admin
                    update: interdit après clôture (trigger)
Pesées              read: idem tickets
                    insert: agent_pont_bascule + admin/resp_si
                    update/delete: interdit (trigger)
```

## 3. Stockage photos

Bucket **public** `reception-photos` (créé via `storage_create_bucket`). Policy `storage.objects` : upload = rôles contrôleurs + admin, read public. Chemin : `tickets/{ticket_id}/slot-{n}-{uuid}.jpg`.

Composant photo dédié (pas `EntityImageUploader` — comportement 3 slots fixes) :
- Bouton « Prendre la photo » → `<input type="file" accept="image/*" capture="environment">` (ouvre appareil arrière sur mobile).
- Preview + actions **Enregistrer / Reprendre / Annuler**.
- Compression canvas côté client (réutilise l'utilitaire existant de `useEntityImages`), max 1600px, JPEG q=0.82.
- Indicateur visuel des 3 slots (rempli / vide).

## 4. Écrans

### A. Paramétrage — `ReceptionSettings.tsx`
Sous-tabs Produits / Fournisseurs / Campagnes. Chaque onglet = table + dialog CRUD (patterns identiques à `PdrSuppliers`, `ProductsList`). Recherche + filtres + toggle actif/inactif. Suppression bloquée si références (message clair).

### B. Réception qualitative — `ReceptionQualitative.tsx`
Formulaire haut + « 10 derniers tickets clôturés » dessous.
- Campagne par défaut auto-sélectionnée ; produit lecture seule ; date système lecture seule ; numéro auto.
- Fournisseur : combobox filtré `agree=true AND actif=true`.
- Heure début : bouton `Capturer l'heure` → `new Date().toTimeString().slice(0,5)`.
- Trois `PhotoSlot` (composant dédié) obligatoires.
- Sur mobile : formulaire en **accordéon 5 étapes** ; sur desktop : grille responsive.
- Bouton « Enregistrer et clôturer » → `AlertDialog` de confirmation → RPC `close_reception_ticket`.
- Historique = 10 lignes, photos cliquables (lightbox lecture seule).

### C. Réception quantitative — `ReceptionQuantitative.tsx`
- Liste initiale 20 tickets clôturés, tri « à peser » d'abord.
- Bouton « Charger 20 de plus » (pagination cumulée en state local, pas de reset).
- Recherche multi-champ + filtres.
- Sélection d'un ticket → panneau latéral (desktop) / plein écran (mobile) :
  - Infos qualitatif + photos (lecture seule, lightbox).
  - Saisie **poids brut** ; calculs live abattement + net ; code pesée preview.
  - Validation avec confirmation ; contrainte unique en base empêche la double pesée.

### D. Consultation globale — `ReceptionGlobal.tsx`
- Bandeau KPI (9 cartes) : totaux, poids brut/net, abattement tonnes (3 décimales), durée moyenne, hors délai, progression campagne (barre vs `objectif_kg`).
- Table depuis `v_reception_global`.
  - Durée : format `X min` / `H h MM min`.
  - **> 20 min** : ligne fond `bg-destructive/10`, icône `AlertTriangle`, badge « Hors délai ». **20 min = conforme**.
  - Non pesé → colonnes brut/net/abattement = `—` + badge « En attente de pesée ».
- Filtres complets (dates, campagne, produit, fournisseur, région, wilaya, ticket, pesé/non, conforme/hors délai) + réinitialisation.
- `ExportCsvButton` respectant les filtres.

## 5. Logique partagée

`src/lib/reception.ts` :
- `computeDurationMinutes(start, end)` — gère minuit : si `end < start`, +24h. Retour ≥ 0.
- `formatDuration(min)` — `"8 min"`, `"1 h 05 min"`.
- `isOverdue(min)` — `min > 20`.
- `computeAbattementTonnes(brut, taux)` — `(brut * taux / 100) / 1000`.
- Formatage nombres 3 décimales min pour tonnes.

Tests Vitest : `computeDurationMinutes` (23:59→00:07 = 8), seuils 19/20/21 min, calculs pesée, sélecteur campagne par défaut.

## 6. Rôles & permissions

- Ajout enum `agent_pont_bascule` + entrée matrice rôles (`RolesMatrix`) + libellé « Agent pont-bascule ».
- Nouvelle permission `reception` (visible / non visible) dans `role_permissions`, gérée dans l'écran Access Control.
- Sidebar/Apps : `reception` visible selon rôle (mapping donné §2). Auditeur = lecture seule (déjà géré côté RLS).

## 7. UX / accessibilité

- Tous les boutons d'action ≥ 48px.
- Messages toasts succès/erreur (`sonner`).
- Loaders `Skeleton` sur listes.
- États vides explicites (« Aucun ticket à peser »).
- Anti-double-clic : `disabled` pendant la mutation React Query.
- Confirmations `AlertDialog` avant clôture & validation pesée.

## 8. Vérifications finales (checklist)

Un fichier `docs/reception-checks.md` reprenant les 16 scénarios listés + une suite Vitest ciblée sur la logique pure (durée, seuils, abattement).

---

## Détails techniques (référence)

- Auto-numérotation : séquence `reception_ticket_seq` + fonction `next_reception_ticket_no()` (année en préfixe). Idem pour code pesée.
- Photos : soft-delete impossible (trigger). Suppression physique via cron admin uniquement (hors scope).
- Realtime : `useEffect` supabase channel sur `reception_tickets`/`reception_weighings` pour rafraîchir la liste quantitative sans F5.
- Aucune modification des modules existants sauf : `AppSidebar`, `Apps.tsx`, `RolesMatrix`, matrice permissions.
