## Objectif

Rendre le module Réception Fruits & Légumes pleinement utilisable sur **tablette** et **smartphone** (agent pont-bascule et contrôleur qualité en mobilité), et garantir que les vues restent **toujours à jour sans rafraîchissement manuel**, sans jamais bloquer la saisie.

## Constat actuel

- `ReceptionPage` : titre + `TabsList grid-cols-2 md:grid-cols-4` — sur mobile les 4 onglets tiennent sur 2 lignes mais la page perd le contexte au scroll.
- `ReceptionQualitative` : grille `md:grid-cols-2` + colonne latérale "10 derniers tickets" en `xl:col-span-2` → sur mobile la table dépasse et les champs heure/abattement sont trop petits pour un usage tactile. Le bouton "Ouvrir le ticket" et "Clôturer" ne sont pas sticky.
- `ReceptionQuantitative` : layout `lg:grid-cols-3` avec table à gauche et panneau détail à droite → sur tablette portrait et mobile le panneau détail passe sous la liste, l'utilisateur doit scroller à chaque sélection. La `Table` déborde en largeur.
- `ReceptionGlobal` : 8 KPIs `grid-cols-2 md:grid-cols-4 lg:grid-cols-8`, filtres en grille, et grande table à 15+ colonnes → illisible en mobile, pas de scroll horizontal encadré, filtres prennent tout l'écran.
- `ReceptionSettings` : non audité mais mêmes patterns Card + Table.
- **Realtime** : `ReceptionGlobal` et `ReceptionQuantitative` s'abonnent aux `postgres_changes` mais n'ont **aucun filet de sécurité** (pas de refresh sur focus/visibilité, pas de polling) — si le socket tombe (mise en veille tablette, coupure Wi-Fi, onglet en arrière-plan) la liste ne se rafraîchit plus jusqu'à un reload manuel. Le hook `useShiftRealtime` fait déjà exactement ça pour les autres modules.
- `useIsMobile` (breakpoint 768px) et `ResponsiveDialog`, `ScrollTable`, `StickyActionBar`, `FilterSheet` existent déjà et ne sont pas utilisés ici.

## Plan d'action

### 1. Stabilité live (priorité — sans changer la logique métier)

- Remplacer les blocs `useEffect` d'abonnement de `ReceptionGlobal` et `ReceptionQuantitative` par le hook existant `useShiftRealtime` (deux appels, un par table : `reception_tickets`, `reception_weighings`).
- Bénéfices immédiats : rafraîchissement automatique
  - au retour de focus onglet,
  - au retour de visibilité (tablette qui sort de veille),
  - poll de secours 15 s si le socket est mort.
- Ajouter aussi ce hook dans `ReceptionQualitative` sur la query `reception_tickets_recent` et sur `reception_photos` (filtre `ticket_id=eq.<id>`) pour que les photos apparaissent live si un autre appareil les ajoute.
- Aucun changement de RPC ni de RLS.

### 2. Page shell responsive (`ReceptionPage`)

- Header condensé sur mobile : masquer le sous-titre `<p>` en `sm:hidden`, garder icône + titre `text-lg md:text-2xl`.
- `TabsList` : rendre défilable horizontalement sur mobile (`overflow-x-auto flex` avec `whitespace-nowrap` sur les triggers) plutôt qu'une grille 2×2, pour éviter les triggers écrasés. Rendre la barre **sticky top-0** sous le `AppTopBar` pour garder l'accès aux 4 onglets pendant le scroll long des formulaires.

### 3. Onglet **Qualitative** (usage tablette portrait + smartphone)

- Sur mobile/tablette portrait, réordonner : le bloc formulaire prend toute la largeur ; la carte "10 derniers tickets clôturés" passe **en bas** (déjà géré par le grid, mais lui donner un titre repliable via `<details>`/`Accordion` pour ne pas polluer).
- Champs tactiles : passer les `Input` et `Select` critiques à `h-11` (touch target ≥ 44 px) sur mobile via classe conditionnelle.
- Boutons "Maintenant" (heure) : sur mobile passer en icône-seule (`Clock`) pour libérer la ligne.
- Photos : la grille des 3 slots reste `grid-cols-1 md:grid-cols-3`. Réduire `min-h` à 140 px sur mobile pour voir les 3 slots en scrollant peu.
- **StickyActionBar** en bas pour "Ouvrir le ticket" (avant création) puis "Enregistrer et clôturer" (après création), pour que l'action principale reste toujours accessible sans scroll.

### 4. Onglet **Pont-bascule** (`Quantitative`) — pattern master/détail mobile

- Sur ≥ `lg` : conserver le layout actuel liste + panneau détail.
- Sur `< lg` (tablette portrait + mobile) : la liste occupe 100 %, et cliquer sur une ligne ouvre un **ResponsiveDialog plein-écran** (Drawer sur mobile) avec le panneau de pesée + photos. À la validation ou annulation, retour à la liste. Empêche le scroll long, évite la perte de contexte.
- Encadrer la `Table` dans `ScrollTable` pour scroll horizontal contrôlé, et rendre la première colonne (N° ticket) sticky via la classe `first-col-sticky` mentionnée dans `ScrollTable`.
- Input `Poids brut` : `inputMode="decimal"` en plus de `type="number"` pour ouvrir le pavé décimal iOS/Android, `h-14 text-2xl` pour la saisie tactile.
- Bouton "Valider la pesée" en `StickyActionBar` dans le dialog mobile.

### 5. Onglet **Consultation globale**

- KPIs : sur mobile passer `grid-cols-2` (2 cartes par ligne) et masquer 2 KPIs secondaires ("Durée moyenne", "Abattement") derrière un bouton "Plus" ou en `hidden sm:block`, pour garder l'écran lisible. Sur tablette `md:grid-cols-4`, desktop `lg:grid-cols-8` inchangé.
- **Filtres** : sur mobile, remplacer la grille de 8 filtres par un bouton "Filtres" ouvrant `FilterSheet` (Drawer) contenant les mêmes contrôles + boutons Réinit. / Appliquer. Un badge affiche le nombre de filtres actifs.
- **Table** : envelopper dans `ScrollTable`, première colonne N° sticky. Les colonnes optionnelles restent gérées par le menu existant (déjà correct).
- Sur mobile, offrir une **vue "cartes"** alternative togglée (une carte par ticket avec les infos clés : N°, date, fournisseur, produit, net, état, badge hors délai, bouton photos). L'utilisateur choisit Cartes/Tableau, choix persisté en `localStorage` comme la sélection de colonnes.

### 6. `ReceptionSettings`

- Auditer les 3 sous-sections (Produits, Fournisseurs, Campagnes) et appliquer le même traitement `ScrollTable` + `ResponsiveDialog` pour les formulaires d'édition. Vue en cartes empilées sur mobile pour les 3 listes.

### 7. Détails UX

- `TicketPhotosDialog` : sur mobile grille `grid-cols-1` au lieu de 3, images pleine largeur.
- `PhotoLightbox` (déjà utilisé dans Pont-bascule) : vérifier qu'il reste tactile.
- Ajouter `useIsMobile()` uniquement là où nécessaire (viewer conditionnel), pour éviter les re-renders.
- Toasts existants inchangés ; les mutations `onError` déjà branchées suffisent.

## Détails techniques

- Hooks/composants réutilisés : `useShiftRealtime`, `useIsMobile`, `ResponsiveDialog`, `ScrollTable`, `StickyActionBar`, `FilterSheet`.
- Aucune migration Supabase, aucune modification de RPC, RLS ou schéma.
- Pas d'ajout de dépendance npm.
- Persistance locale (`localStorage`) réutilisée pour le nouveau toggle Cartes/Tableau (clé `reception-global-view`).

## Ce qui reste inchangé

- Logique de création/clôture des tickets, calculs d'abattement/net, workflow pont-bascule, capture caméra in-app, filigrane, filtres et exports CSV.
- Rôles et permissions.
- Structure de la sidebar et des routes.

## Points à confirmer

1. Vue mobile de la **Consultation globale** : préférez-vous **Cartes** ou **Tableau scrollable** comme défaut sur mobile ? (Je peux garder les deux avec un toggle et défaut = Cartes.)
2. Sur le **Pont-bascule** en mobile, ouvrir un **Drawer plein-écran** pour la pesée est-il OK, ou préférez-vous une **page dédiée** (`/qualite/reception/pesee/:id`) qui persiste l'URL et permet le partage ?