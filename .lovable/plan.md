## Objectif

Pour le **Responsable Contrôle Qualité**, supprimer la création manuelle de sessions pour d'autres contrôleurs. Le responsable ne peut ouvrir une session **que pour lui-même** (intervention personnelle avec motif). Les sessions des contrôleurs sont créées automatiquement au démarrage de leur shift (déjà en place via l'auto-ouverture et l'auto-ouverture des contrôleurs).

Production et Maintenance conservent leur fonctionnement actuel inchangé.

## Changements (uniquement `kind === "quality"`)

Fichier : `src/components/shift/RespShiftConsole.tsx`

1. **Bouton d'ouverture** : renommer le bouton pour le contexte qualité en « Intervenir moi-même » (au lieu de « Ouvrir une session »). Pour production/maintenance il reste « Ouvrir une session ».

2. **Dialogue (qualité)** :
   - Forcer le mode « self » : le toggle « Intervenir moi-même » et sa case à cocher sont supprimés — le responsable est toujours le contrôleur.
   - Supprimer le sélecteur « Opérateur » pour la qualité (plus de création pour autrui).
   - Conserver : le motif d'intervention (obligatoire), l'équipe, le créneau, et les lignes contrôlées.
   - Titre/description du dialogue adaptés : « Intervention personnelle du responsable qualité ».

3. **Logique `handleOpenSession`** :
   - Pour la qualité, `isQualitySelf` devient toujours vrai : `controller_id = user.id`, `is_self_intervention = true`, motif obligatoire.
   - Retirer la branche qualité qui insérait une session pour `operatorId`.

4. **Nettoyage** : le mode self reste géré via un état interne toujours à `true` pour la qualité, sans UI de bascule.

## Détails techniques

- `selfMode` : pour la qualité, initialiser/forcer à `true` à l'ouverture du dialogue ; masquer le switch.
- Les validations restent : motif requis, au moins une ligne contrôlée.
- Aucun changement de base de données requis (colonnes `is_self_intervention` / `intervention_reason` déjà présentes).
- Production et maintenance : aucune modification.

## Vérification

- Typecheck (`tsgo --noEmit`).
- Vérifier dans le preview `/qualite/shift` que le responsable ne voit plus le sélecteur d'opérateur et ne peut ouvrir qu'une session pour lui-même avec motif.
