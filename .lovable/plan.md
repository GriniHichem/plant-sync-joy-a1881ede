# Plan : Manuel parfait pour nouvel utilisateur

## Objectif
Transformer `MANUAL.md` (1418 lignes, technique) en un **guide pédagogique** orienté débutant, riche en **icônes**, **schémas ASCII**, **exemples concrets** et **parcours pas-à-pas**, tout en restant la source unique lue par le `ManualSheet` interactif déjà en place.

## Principes
- **Une seule source** : `MANUAL.md` à la racine (copié vers `public/MANUAL.md` pour le lien "Source"). Le parseur existant (`parseManual.ts`) consomme `##`/`###` — on garde cette structure.
- **Icônes inline** : usage d'emojis Lucide-équivalents (📘 🔧 🏭 ✅ ⚠️ 🔍 🧑‍🔧 📦 🛒 📊 🔔 🔐 🧪 📋 ⏱️ ▶️ ⏸️) déjà supportés par `marked` — pas besoin de toucher le parseur.
- **Schémas ASCII** dans blocs ```` ```text ```` (workflows OF, hiérarchie actifs, cycle ticket, shift…).
- **Exemples concrets nommés** (ex : « OF-2026-042, ligne L1, produit Yaourt Nature 125g »).
- **Encadrés pédagogiques** : `> 💡 Astuce`, `> ⚠️ Attention`, `> 📌 Exemple`, `> 🎯 Cas d'usage`.

## Nouveau plan de MANUAL.md (v3.0)

### Section ajoutée — Chapitre 0 bis : Démarrage rapide (nouvel utilisateur)
- « Mes 5 premières minutes » selon le rôle (Opérateur, Chef de ligne, Maintenancier, Qualité, Admin)
- Schéma ASCII de la page d'accueil annotée
- Tour des éléments d'interface : Topbar, Sidebar, Bell 🔔, Aide ❓, Scanner 📷, Recherche 🔍

### Section ajoutée — Chapitre 1 bis : Vue d'ensemble visuelle
- Schéma ASCII modules ↔ rôles ↔ données
- Flux global : `Article → Recette → OF → Production → Stock → Qualité → Maintenance`

### Enrichissements par chapitre existant
Pour chaque section (3.1 → 4.9), ajouter :
1. **« À quoi ça sert »** (1 phrase + emoji)
2. **« Qui l'utilise »** (rôles concernés)
3. **Capture textuelle / schéma ASCII** de l'écran clé
4. **Parcours pas-à-pas numéroté** avec icônes (▶️ étape, ✅ résultat, ⚠️ piège)
5. **Exemple concret complet** (données réalistes algériennes : Laiterie Amour, ligne L1…)
6. **FAQ courte** (« Pourquoi je vois X ? », « Comment je débloque Y ? »)

### Schémas ASCII clés à intégrer
- **Hiérarchie actifs** : `Ligne → Machine → Équipement → Organe → PDR`
- **Cycle ticket** : `Ouvert → Assigné → En cours → Résolu → Clôturé`
- **OF lifecycle** : `Planifié → En cours → Pause → Terminé`
- **Shift production** : `Ouverture → Déclarations horaires → Arrêts/Stops → Consommations → Clôture → Bilan`
- **Workflow PDR** : `Demande → Validation → Sortie stock → Mouvement audité`
- **Notifications** : `Événement → Règle → Dédup → Bell + Email`
- **RBAC** : matrice rôles × modules sous forme de tableau visuel

### Nouveaux encadrés transverses (Chapitre 5 enrichi)
- 🎯 « Scénario A : ouvrir un OF + déclarer 3 heures + clôturer le shift »
- 🎯 « Scénario B : panne machine → ticket → intervention → réception PDR »
- 🎯 « Scénario C : contrôle qualité loupé → NC → action corrective »
- 🎯 « Scénario D : inventaire double comptage »

### Nouveau Chapitre 11 enrichi — Dépannage
- Tableau symptôme / cause / solution avec icônes
- « Je ne vois pas mon shift » → causes (date_shift, RLS, rôle…)
- « Mon scan ne fonctionne pas » → fallback manuel
- « Erreur RLS / permission » → contacter admin

### Annexe ajoutée — Raccourcis clavier & gestes
- `?` aide, `Ctrl+K` recherche, `Esc` ferme, scan caméra…

## Méthode d'écriture
- Réécriture chapitre par chapitre en gardant **les IDs de section** (numérotation `3.2`, `4.6 bis`, etc.) pour ne pas casser `manualRouteMap.ts`.
- Vérifier après écriture que **chaque slug du `manualRouteMap` correspond encore** (test `manual-parser.test.ts` + ajout d'un test « tous les slugs de la routemap existent dans le manuel »).
- Conserver le ton industriel / professionnel.

## Fichiers touchés
- ✏️ `MANUAL.md` (réécriture enrichie, ~2200-2500 lignes attendues)
- ✏️ `public/MANUAL.md` (copie synchro)
- ✏️ `src/test/manual/manual-parser.test.ts` (ajout test cohérence routeMap ↔ sections)
- ✏️ `src/index.css` (`.manual-prose` — petits ajustements pour blockquotes 💡⚠️🎯 et blocs ASCII : `font-mono`, fond légèrement teinté)
- ✏️ `mem://features/interactive-manual` (note : v3.0, icônes inline + schémas ASCII + parcours nouveau)

## Hors scope
- Pas d'images PNG/SVG embarquées (poids + maintenance) — uniquement ASCII + emojis.
- Pas de refonte du composant `ManualSheet` (déjà bon).
- Pas de traduction (FR uniquement, comme l'app).
- Pas d'analytics de consultation (peut venir plus tard).

## Validation
- `bun test src/test/manual` doit passer.
- Ouverture du manuel sur 5 routes clés (`/gpao/of`, `/tickets`, `/qualite/shift`, `/parametres`, `/`) → chaque page ouvre bien la bonne section enrichie.
- Lecture visuelle du `ManualSheet` : encadrés lisibles, ASCII aligné en `font-mono`.
