## Objectif
Permettre à un administrateur de **supprimer un utilisateur** depuis la page « Utilisateurs & Rôles », avec une confirmation sécurisée : il faut **retaper le nom complet de l'utilisateur** pour valider la suppression.

## Fonctionnement côté utilisateur
- Un bouton corbeille rouge apparaît dans la colonne « Actions » de chaque ligne utilisateur (à côté du crayon de modification).
- Un administrateur ne peut pas se supprimer lui-même (bouton désactivé sur sa propre ligne).
- Au clic, une fenêtre de confirmation s'ouvre :
  - Avertissement clair : action irréversible, suppression du compte, du profil, des rôles et des photos.
  - Un champ texte demandant de **saisir exactement le nom complet** (Prénom Nom) de l'utilisateur.
  - Le bouton « Supprimer définitivement » reste désactivé tant que le texte saisi ne correspond pas exactement au nom.
- Après suppression : message de confirmation et rafraîchissement de la liste.

## Détails techniques

### 1. Nouvelle edge function `admin-delete-user`
Calquée sur `admin-create-user` (auto-hébergeable, `verify_jwt = false` dans `config.toml`) :
- Vérifie le bearer token et que l'appelant a le rôle `admin` (via `has_role`).
- Refuse si l'appelant tente de supprimer son propre compte.
- Reçoit `{ user_id }`.
- Supprime via `admin.auth.admin.deleteUser(user_id)` (les lignes `profiles` et `user_roles` liées à `auth.users` sont supprimées en cascade ; nettoyage explicite de secours si nécessaire).
- Enregistre un évènement dans `audit_logs` (auteur = appelant, action de suppression, valeurs supprimées) conformément aux règles du projet.
- Retourne `{ ok: true }` ou une erreur.

### 2. Déclaration dans `supabase/config.toml`
Ajout du bloc :
```toml
[functions.admin-delete-user]
verify_jwt = false
```

### 3. UI dans `src/pages/parametres/UsersAdmin.tsx`
- Ajout d'un état pour la fenêtre de suppression (`deleteProfile`, `confirmName`, `deleting`).
- Bouton corbeille dans la colonne Actions (désactivé pour l'utilisateur courant via `user.id`).
- `Dialog` de confirmation avec champ de saisie du nom complet et validation stricte (`confirmName.trim() === \`${first_name} ${last_name}\`.trim()`).
- Appel `supabase.functions.invoke("admin-delete-user", { body: { user_id } })`, gestion des toasts succès/erreur, puis `load()`.

## Aucune migration de base de données nécessaire
La suppression passe par l'API admin Auth ; les tables liées se nettoient en cascade.