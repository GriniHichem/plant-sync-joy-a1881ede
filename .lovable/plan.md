## Objectif
Ajouter une matrice de permissions dédiée au module Réception, gérée depuis une modale accessible via une icône engrenage dans l'en-tête du module. Aucun changement de logique métier — uniquement du masquage/désactivation d'UI.

## Approche
Réutiliser l'infrastructure `role_permissions` existante (déjà exploitée par `usePermissions`) plutôt que créer une table dédiée. Les 4 sous-modules deviennent des enfants du parapluie `reception` déjà déclaré dans `UMBRELLAS`.

Sous-modules ajoutés :
- `reception_qualitative`
- `reception_quantitative`
- `reception_global`
- `reception_settings`

## 1. Backend (migration)

- Ajouter les 4 sous-modules à `UMBRELLAS.reception` dans `src/hooks/usePermissions.ts` pour l'héritage automatique.
- Migration d'amorçage : insérer les valeurs par défaut demandées pour les rôles pertinents (admin, controleur_qualite, responsable_qualite, agent_pont_bascule) avec `ON CONFLICT DO NOTHING` pour ne pas écraser un paramétrage existant.
- Valeurs par défaut proposées :

| Rôle | qualitative (V/C/M/S) | quantitative | global | settings |
|---|---|---|---|---|
| admin | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅ |
| controleur_qualite | ✅✅❌❌ | ❌❌❌❌ | ✅❌❌❌ | ❌❌❌❌ |
| agent_pont_bascule | ❌❌❌❌ | ✅❌✅❌ | ✅❌❌❌ | ❌❌❌❌ |
| responsable_qualite | ✅✅❌❌ | ✅❌✅❌ | ✅❌✅✅ | ✅✅✅✅ |

L'admin peut ensuite tout ajuster via la modale.

## 2. Modale de paramétrage (nouveau composant)

`src/pages/qualite/reception/ReceptionAccessMatrixDialog.tsx` :
- Sélecteur de rôle en haut (liste des rôles système + rôles custom actifs).
- Grille 4 lignes (sous-modules) × 4 colonnes (Voir / Créer / Modifier / Supprimer) avec checkboxes.
- Boutons Enregistrer / Annuler. Upsert dans `role_permissions` (une ligne par module).
- Accès restreint : bouton visible uniquement pour les utilisateurs ayant `can_edit` sur `parametres` (même règle que la matrice globale existante).
- Note explicative rappelant les règles métier (ex : « Modifier/Supprimer Qualitative désactivés par convention — passer par Consultation pour les corrections admin »).

## 3. Bouton engrenage

Dans `ReceptionPage.tsx`, ajouter un bouton icône `Settings2` à droite du titre, visible seulement si `canEdit('parametres')`, ouvrant la modale.

## 4. Application des droits dans l'UI

- `ReceptionPage.tsx` : masquer chaque `TabsTrigger` + `TabsContent` si `canView('reception_<sub>')` est faux. Redirection auto vers le premier onglet autorisé si l'onglet courant n'est pas visible.
- `ReceptionQualitative.tsx` : bouton "Ouvrir le ticket" gardé par `canCreate('reception_qualitative')`. Boutons éventuels de modification/suppression respectent `canEdit`/`canDelete`.
- `ReceptionQuantitative.tsx` : champs de saisie de poids restent (c'est un `edit`), pas de bouton "nouveau ticket" à créer. Vérifier qu'aucun bouton de suppression n'est exposé.
- `ReceptionGlobal.tsx` / `TicketDetailDialog.tsx` : boutons Modifier et Supprimer conditionnés par `canEdit`/`canDelete` sur `reception_global`. Ces boutons existent-ils déjà ? Sinon, cette étape se limite à la garde — l'ajout effectif d'actions admin peut être planifié ensuite si demandé.
- `ReceptionSettings.tsx` : boutons Créer / Modifier / Supprimer produits, fournisseurs, campagnes conditionnés par les droits sur `reception_settings`.

## 5. Points hors périmètre (à confirmer)

- **Aucune modification** des RPC, triggers, calculs ou politiques RLS backend. Les permissions restent purement UI comme demandé.
- Si tu veux également durcir côté base (empêcher un utilisateur de contourner l'UI par appel direct), c'est un chantier séparé qui nécessite d'étendre les politiques RLS de `reception_tickets`, `reception_weighings`, etc.

## Détails techniques

**Fichiers modifiés :**
- `src/hooks/usePermissions.ts` — ajout des 4 enfants à `UMBRELLAS.reception`.
- `src/pages/qualite/reception/ReceptionPage.tsx` — bouton engrenage + garde des onglets.
- `src/pages/qualite/reception/ReceptionQualitative.tsx` — gardes create/edit/delete.
- `src/pages/qualite/reception/ReceptionQuantitative.tsx` — gardes edit.
- `src/pages/qualite/reception/ReceptionGlobal.tsx` + `TicketDetailDialog.tsx` — gardes edit/delete.
- `src/pages/qualite/reception/ReceptionSettings.tsx` — gardes create/edit/delete.

**Fichier créé :**
- `src/pages/qualite/reception/ReceptionAccessMatrixDialog.tsx`.

**Migration :**
- INSERT idempotent des lignes par défaut dans `role_permissions`.

## Question ouverte
Confirmes-tu que la matrice est **par rôle** (l'admin choisit un rôle dans la modale puis coche/décoche) ? Ta description énumère des rôles-cibles (« un agent… un super-admin… ») mais le tableau lui-même n'a pas de colonne rôle. Je pars sur « par rôle » car c'est le seul modèle cohérent avec le système d'accès existant.