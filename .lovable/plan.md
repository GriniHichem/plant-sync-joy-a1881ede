## Objectif

Sécuriser la saisie longue (20-30 min) d'un ticket de **Réception qualitative** : empêcher la sortie accidentelle du sous-module tant qu'un ticket est en cours, restaurer la saisie si la page est fermée, et garder la connexion base de données active pendant toute la durée.

## 1. Sauvegarde automatique du brouillon (localStorage)

Fichier : `src/pages/qualite/reception/ReceptionQualitative.tsx`

- Clé de stockage : `reception.qualitative.draft.v1` (localStorage, plus fiable que les cookies pour ~2 Ko de JSON).
- Persister automatiquement (debounce ~500 ms) : `ticketId`, `form` complet (numéro, campagne, fournisseur, heures, abattement, commentaire) et l'ouverture du champ commentaire.
- Au montage, si un brouillon existe :
  - Si `ticketId` présent → vérifier côté base qu'il existe et n'est pas encore clôturé, puis restaurer form + ticketId + photos (rechargées via la query existante).
  - Sinon (pas encore ouvert) → restaurer uniquement les champs du formulaire pour ne pas perdre la saisie.
- Purger le brouillon à la clôture réussie ou si le ticket est introuvable/clôturé côté serveur.

## 2. Garde de navigation « ticket en cours »

Éviter de quitter le sous-module par mégarde tant qu'un ticket est ouvert (ticketId défini et non clôturé).

- **Onglets internes** (`Qualitative` / `Quantitative` / `Global` / `Consultation`) : intercepter le changement d'onglet, afficher une confirmation « Un ticket est en cours, quitter ? ». Confirmation → changement autorisé (brouillon conservé, non purgé).
- **Navigation React Router** vers une autre route : utiliser `useBlocker` (React Router v6) pour afficher la même confirmation.
- **Fermeture d'onglet / rechargement** : handler `beforeunload` pour afficher l'avertissement natif du navigateur.
- Aucun blocage tant qu'aucun ticket n'est ouvert.

## 3. Keep-alive base de données (session 20-30 min active)

- Un `setInterval` léger toutes les **4 minutes** tant qu'un ticket est ouvert : appel `supabase.auth.getSession()` (rafraîchit le token silencieusement) + un ping léger `select 1` via une table déjà accessible (`reception_tickets` count `head:true` sur le ticketId) pour maintenir le socket HTTP chaud.
- Realtime déjà présent (`useShiftRealtime`) : ajouter un `visibilitychange` listener qui, quand la page redevient visible, invalide les queries photos + ticket pour resynchroniser immédiatement.
- Aucune modification backend nécessaire — tout est côté client.

## Détails techniques

- Debounce natif via `useEffect` + `setTimeout` (pas de dépendance ajoutée).
- Restauration : au premier rendu uniquement (`useRef` d'initialisation) pour ne pas boucler.
- Le brouillon stocke un timestamp ; si > 24 h → ignoré et purgé.
- `useBlocker` disponible dans la version de `react-router-dom` déjà utilisée dans le projet ; à défaut, fallback sur `beforeunload` seul + confirmation manuelle sur les onglets.
- Aucun changement de schéma ni de RLS.

## Hors périmètre

- Pas de synchronisation multi-onglet (un seul ticket à la fois par poste).
- Pas de brouillon partagé entre utilisateurs.
- Pas de modification des sous-modules Quantitative / Global.
