## Objectif
Corriger le blocage affiché : `null value in column "created_at" of relation "role_permissions" violates not-null constraint`, et rendre la gestion des accès fiable côté Lovable Cloud et serveur auto-hébergé.

## Diagnostic confirmé
- La table `role_permissions` exige `created_at` et `updated_at` non nuls, avec valeurs par défaut côté base actuelle.
- L’écran Matrice des rôles sauvegarde via `upsert(rows, { onConflict: "role,module" })` après suppression de `id`, mais conserve potentiellement des champs `created_at` / `updated_at` reçus à `null` depuis une base migrée ou un ancien seed.
- Le script auto-hébergé Réception insère `role_permissions` sans colonnes de timestamps, ce qui échoue sur un serveur où les defaults ne sont pas présents ou mal migrés.
- Le module `reception` est dans l’affichage, mais pas encore inclus dans les listes de presets (`QUALITY_MODS` / `ALL_KEYS`) : donc l’admin n’est pas garanti full access via preset global.

## Plan de correction
1. **Sécuriser la sauvegarde frontend de la matrice**
   - Nettoyer explicitement les lignes avant sauvegarde : envoyer uniquement `role`, `module`, `can_view`, `can_create`, `can_edit`, `can_delete`.
   - Ne jamais renvoyer `created_at` / `updated_at` depuis l’UI, afin que la base applique ses defaults/triggers.
   - Gérer le toast d’erreur avec message plus clair pour éviter un blocage silencieux.

2. **Garantir l’accès admin au module Réception**
   - Ajouter `reception` dans `QUALITY_MODS` pour que les presets Qualité l’incluent.
   - Vérifier que `admin` et `responsable_si` reçoivent full access via `ALL_KEYS`.
   - Ajouter `agent_pont_bascule` dans la liste des rôles visibles si nécessaire pour administrer ses droits depuis la matrice.

3. **Créer une migration corrective robuste**
   - Forcer/assurer les defaults `created_at = now()` et `updated_at = now()` sur `public.role_permissions`.
   - Corriger les lignes existantes avec timestamps nuls si elles existent.
   - Ajouter ou remplacer un trigger `updated_at` sur `role_permissions`.
   - Ajouter les permissions `reception` minimales par rôle avec timestamps explicites :
     - `admin`, `responsable_si` : accès complet.
     - rôles qualité pertinents : accès selon workflow Réception.
     - `agent_pont_bascule` : accès opérationnel Réception.
   - Ne pas élargir inutilement les droits des autres modules.

4. **Mettre à jour le script auto-hébergé Réception**
   - Modifier les insertions `role_permissions` pour inclure explicitement `created_at` et `updated_at`.
   - Ajouter un bloc préventif qui assure les defaults timestamp sur `role_permissions` avant l’insert.
   - Rendre le script rejouable sans casser une base déjà migrée.

5. **Vérification**
   - Relire les fichiers modifiés.
   - Interroger la base pour confirmer que `role_permissions.created_at/updated_at` ont des defaults non nuls.
   - Vérifier que les lignes `reception` existent pour admin et les rôles nécessaires.
   - Lancer un test ciblé de sauvegarde logique si possible côté UI ou au minimum vérifier la forme finale du payload sans timestamps.

## Résultat attendu
- Plus aucun blocage `created_at null` lors de la sauvegarde de la matrice des rôles.
- Le module Réception reste visible et accessible après migration serveur.
- L’administrateur garde tous les accès, y compris Réception, sans dépendre d’une réparation manuelle en base.