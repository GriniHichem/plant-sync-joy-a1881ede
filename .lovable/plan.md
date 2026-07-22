
# Améliorations Module Réception Fruits & Légumes

Toutes les évolutions sans toucher à la logique métier existante (calcul net, RLS, workflow clôture/pesée).

## 1. Historique cliquable + téléchargement photos (Réception qualitative)

- Dans `ReceptionQualitative.tsx`, rendre chaque ligne du tableau « 10 derniers tickets clôturés » cliquable (row entière + `cursor-pointer` + `hover:bg-muted`).
- Réutiliser `TicketDetailDialog.tsx` (déjà utilisé par Consultation globale) pour afficher la fiche complète en modale.
- Étendre `TicketDetailDialog.tsx` : ajouter à côté de chaque miniature Photo 1/2/3 un bouton icône **Download**. Téléchargement via `fetch(signedUrl)` → `Blob` → `URL.createObjectURL` + `<a download="ticket-{numero}-photo-{slot}.jpg">` pour forcer le save local (attribut `download` seul ne fonctionne pas sur cross-origin signed URLs).

## 2. Refonte UX/UI tactile (Réception qualitative)

Réorganisation de la grille du formulaire :

- Ligne 1 compacte pleine largeur (4 colonnes sur ≥ md) : **Date auto | N° ticket | Heure début | Heure fin**. Sur mobile : 2 colonnes.
- Retrait des boutons « Maintenant » redondants (ou compactés en icône seule dans le champ heure).
- **Taux d'abattement** et **Commentaire** en pleine largeur (`col-span-full`).
- Campagne / Produit / Fournisseur restent groupés en 2 colonnes.
- **Bouton « Enregistrer & clôturer »** reste dans `StickyActionBar` (déjà sticky) — s'assurer qu'il est bien visible en bas sur mobile (padding-bottom du container).

Compacité des listes (Consultation globale + historique) :

- Dans `ReceptionGlobal.tsx` (vue liste) et le tableau historique : réduire les paddings (`py-1.5`), passer en `text-xs`, `whitespace-nowrap` sur les colonnes clés, garantir affichage sur une seule ligne avec `truncate` pour Fournisseur/Produit long.

## 3. Pied de page fournisseur (Réception qualitative)

- Dans `StickyActionBar`, au-dessus du bouton, ajouter un mini-bloc info affichant **Code + Nom** du fournisseur sélectionné (récupéré via `suppliers.find(s => s.id === form.supplier_id)`). Style : `text-xs text-muted-foreground`, icône Truck, discret mais toujours visible.

## 4. Génération automatique du code ticket (Paramétrage produit + Pont-bascule)

### 4a. Schéma (migration SQL)

Ajouter à `reception_products` :

- `code_prefix text` (nullable, ex. `T`)
- `code_digits smallint DEFAULT 5 CHECK (code_digits BETWEEN 1 AND 12)`

Mettre à jour `supabase/reception/reception_module.sql` (ALTER TABLE IF NOT EXISTS pattern pour rester idempotent en self-hosting).

Ajouter à `reception_weighings` :

- `code_saisi text` (nullable) : le nombre brut saisi par l'agent, pour audit.
- Contrainte : `UNIQUE (code_pesee)` déjà existante suffit.

### 4b. Paramétrage produit

Dans `ReceptionSettings.tsx` (form produit) : ajouter deux inputs **Préfixe** (text, uppercase) et **Nombre de chiffres** (number, 1-12, défaut 5). Persistance dans `reception_products`.

### 4c. Réception quantitative

Dans `ReceptionQuantitative.tsx` :

- Charger `code_prefix` / `code_digits` du produit du ticket sélectionné (déjà joint via `v_reception_global` — sinon ajouter au SELECT du view ou requête complémentaire).
- Ajouter au-dessus du champ « Poids brut » : un champ **Numéro ticket** (input number, autofocus) + une preview live du **Code système** calculé : `prefix + String(n).padStart(digits, "0")`.
- À la validation de pesée : passer `code_pesee = codeCalculé` et `code_saisi = numéroSaisi` dans l'insert `reception_weighings`.
- Fallback : si le produit n'a pas de préfixe configuré, garder le comportement actuel (`next_reception_weighing_no()`).
- Validation client : refuser si le nombre saisi dépasse `10^digits - 1`. Toast d'erreur clair en cas de collision unique.

## Récap fichiers modifiés

```text
src/pages/qualite/reception/ReceptionQualitative.tsx   (grille + row click + footer fournisseur)
src/pages/qualite/reception/TicketDetailDialog.tsx     (bouton download par photo)
src/pages/qualite/reception/ReceptionGlobal.tsx        (liste compacte)
src/pages/qualite/reception/ReceptionSettings.tsx      (champs préfixe/digits produit)
src/pages/qualite/reception/ReceptionQuantitative.tsx  (saisie n° + code calculé)
supabase/reception/reception_module.sql                (ALTER TABLE + view update)
```

## Détails techniques

- Téléchargement cross-origin : `fetch(url).then(r => r.blob())` puis `a.download` (indispensable car les signed URLs Supabase Storage n'honorent pas `Content-Disposition` par défaut).
- La modale de détail affiche déjà les photos ; le bouton Download est ajouté en overlay sur chaque miniature (`absolute top-2 left-2`) à côté du `ZoomIn`.
- Aucune modification des RPC `close_reception_ticket` ni des triggers de calcul.
- Migration idempotente : `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pour compatibilité self-hosting.
