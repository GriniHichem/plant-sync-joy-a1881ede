## Objectif

Refondre **Matrice modules** (`/securite?section=matrix`) pour permettre une configuration **fiable, complète et productive** des permissions par rôle, alignée avec ce que l'app utilise réellement.

## Problèmes actuels

1. **Modules incomplets** : `equipements`, `lignes`, `qualite`, `inventaire`, `audit`, `validations`, `notifications` ne figurent pas dans la matrice alors qu'ils sont vérifiés dans `Apps.tsx` et les hooks. Conséquence : un rôle ne peut pas voir ces apps même bien configuré.
2. **Rôles incomplets** : `responsable_inventaire` et `agent_inventaire` (présents dans l'enum) sont absents de la liste.
3. **Sauvegarde dangereuse** : `DELETE … neq id 0…` puis `INSERT` → si l'INSERT échoue après le DELETE, **toutes les permissions sont perdues**. Doit être un `upsert` sur `(role, module)`.
4. **Matrice vide à l'init** : aucun bouton pour pré-remplir des profils raisonnables → l'admin doit tout cocher à la main pour 16 rôles × 18 modules × 4 actions = 1152 cases.
5. **Pas de cohérence** : on peut activer "Supprimer" sans "Voir" → permission morte.
6. **Pas de productivité** : impossible de copier les droits d'un rôle vers un autre, pas de filtre/recherche, pas de regroupement par famille de rôle.

## Améliorations

### Fonctionnel
- **Modules complets** alignés sur `Apps.tsx` + nav, regroupés en 5 familles : Maintenance, Production, Qualité, Inventaire, Système & Gouvernance.
- **Tous les rôles** (15) regroupés par famille métier : Direction, Maintenance, Production, Qualité, Logistique.
- **Presets recommandés** par rôle (admin = full, auditeur = lecture seule globale, opérateur = limité, etc.) :
  - Bouton **"Initialiser les presets"** quand la matrice est vide (carte primaire bien visible).
  - Bouton **"Appliquer presets globaux"** (avec dialog de confirmation).
  - Bouton **"Preset recommandé"** par rôle.
- **Copier d'un rôle** : sélecteur dans chaque rôle pour cloner les permissions d'un autre.
- **Tout effacer** par rôle.
- **Cohérence auto** : activer C/M/D force `can_view = true` + bandeau d'avertissement si incohérences existantes.
- **Sauvegarde sûre** via `upsert(onConflict: "role,module")` — plus de delete destructif.

### UX
- Recherche de rôle + filtre par famille.
- Regroupement visuel des rôles par famille.
- Conserve toggles individuels, actions rapides (V/C/M/S sur tous), plein accès, expand/collapse all.
- Stats par rôle (X/Y permissions, %), résumé V/C/M/S quand replié.

### Sécurité
- Reste accessible aux `admin` uniquement.
- Le mode aperçu (impersonation) bloque déjà les écritures via le guard global.

## Fichier modifié

- `src/pages/parametres/RolesMatrix.tsx` — réécriture complète (~500 lignes).

Aucune migration DB nécessaire (la table `role_permissions` a déjà `(role, module)` unique implicite via la contrainte enum + index, et l'`upsert` fonctionne).
