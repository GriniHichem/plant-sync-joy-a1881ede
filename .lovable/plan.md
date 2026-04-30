# Ajout du module "Shift contrôle" dans la page Applications

## Problème
La page `/apps` (catalogue des modules) liste tous les modules de la plateforme mais le nouveau module **Shift contrôle Qualité** (`/qualite/shift`) n'y est pas référencé. Il est uniquement accessible via la sidebar.

Résultat : il n'apparaît pas dans la catégorie **Qualité** et n'a pas le badge **Live** visible (comme l'ont déjà "Shift Production" et "Tickets").

## Solution
Ajouter une seule entrée dans le tableau `MODULES` de `src/pages/Apps.tsx`, dans la section Qualité, alignée sur le style des autres modules "shift".

### Détails de l'entrée
- **Titre** : `Shift contrôle`
- **Description** : `Saisie temps réel par contrôleur qualité`
- **URL** : `/qualite/shift`
- **Icône** : `IconShift` (mêmes que Shift Maintenance, déjà importé)
- **Catégorie** : `Qualité`
- **Permission module** : `qualite`
- **Badge** : `Live` (identique à Shift Production)
- **Accent** : `from-rose-500/15 to-rose-500/5 text-rose-500` (cohérent avec les autres "Shift Live")

## Fichier modifié
- `src/pages/Apps.tsx` — ajout d'une ligne dans le tableau `MODULES` (section Qualité), juste après "Contrôles" ou "Non-conformités" pour mettre en avant l'écran opérationnel temps réel.

## Hors scope
Aucun changement de logique, route ou base de données — la route `/qualite/shift` et l'écran existent déjà. C'est uniquement une mise à jour du catalogue d'apps.
