## Problème identifié

Le bouton **« Nouvel indicateur »** n'apparaît jamais sur `/qualite/indicateurs` parce que le code vérifie la permission `qualite_indicators` (anglais), alors que la clé réellement enregistrée dans le système (umbrella, sidebar, matrice des rôles, base) est `qualite_indicateurs` (français).

Résultat : `canCreate("qualite_indicators")` retourne toujours `false`, même pour les rôles qui ont la permission Qualité. Même bug sur les boutons Modifier/Supprimer des affectations d'indicateurs.

## Fichiers à corriger (remplacement de clé uniquement)

- `src/pages/qualite/QualiteIndicateurs.tsx` — 3 occurrences de `qualite_indicators` → `qualite_indicateurs`
- `src/components/qualite/QualityIndicatorAssignments.tsx` — 4 occurrences de `qualite_indicators` → `qualite_indicateurs`

## Vérification du reste du module Qualité

Recherche déjà effectuée sur toutes les clés `qualite_*` du code : **aucun autre décalage** entre les clés utilisées dans les pages Qualité et celles déclarées dans `UMBRELLAS` / `RolesMatrix` / sidebar. Le bug est isolé aux indicateurs.

## Test après correctif

- Recharger `/qualite/indicateurs` → le bouton **« + Nouvel indicateur »** doit apparaître pour admin / responsable_controle_qualite / directeur_qualite.
- Créer un indicateur de test (ex. `POIDS_NET`, numérique, cible 250 g, min 245, max 255) pour valider la chaîne complète (formulaire → insert → audit log → affichage dans la table).
- Vérifier que les boutons Modifier / Supprimer apparaissent dans l'onglet **Affectations**.

Aucune migration DB, aucune création de table, aucune modification fonctionnelle au-delà du remplacement de la clé.