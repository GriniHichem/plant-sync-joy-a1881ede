# 📘 Manuel Utilisateur — PROD IN TIME (GMAO · GPAO · Qualité · Inventaire)

> Application industrielle intégrée de **gestion de maintenance** (GMAO), **gestion de production** (GPAO), **qualité** et **inventaire**.
> Version manuel : **3.1** — Mise à jour : 14/06/2026 — Édition « Rotations de shift ».

> 💡 **Astuce permanente** : à tout moment, appuyez sur la touche `?` (point d'interrogation) pour ouvrir ce manuel directement sur le chapitre lié à votre écran courant.

---

## Table des matières

0. [Glossaire & conventions](#0-glossaire--conventions)
0 bis. [Démarrage rapide — Vos 5 premières minutes](#0-bis-demarrage-rapide--vos-5-premieres-minutes)
1. [Présentation & architecture](#1-presentation--architecture)
1 bis. [Vue d'ensemble visuelle](#1-bis-vue-densemble-visuelle)
2. [Authentification & sécurité](#2-authentification--securite)
3. [Module GMAO — Maintenance](#3-module-gmao--maintenance)
4. [Module GPAO — Production](#4-module-gpao--production)
5. [Workflows transverses (scénarios pas-à-pas)](#5-workflows-transverses-scenarios-pas-a-pas)
6. [Administration & paramètres](#6-administration--parametres)
6 bis. [Notifications & Emails](#6-bis-notifications--emails)
7. [Documents](#7-documents)
8. [Images](#8-images)
9. [Rôles & permissions](#9-roles--permissions)
10. [Export / Import CSV](#10-export--import-csv)
11. [Cas d'erreur & dépannage](#11-cas-derreur--depannage)
12. [Annexes](#12-annexes)
13. [Modifications récentes (v2.3)](#13-modifications-recentes-v23)
14. [Modifications récentes (v2.4)](#14-modifications-recentes-v24)
15. [Modifications récentes (v2.5)](#15-modifications-recentes-v25--audit-gmao-approfondi)
16. [Modifications récentes (v3.1)](#16-modifications-recentes-v31--rotations-de-shift-par-employe)

---

## 0. Glossaire & conventions

### 🔤 Acronymes

| Sigle | Signification |
|-------|---------------|
| **GMAO** | Gestion de Maintenance Assistée par Ordinateur |
| **GPAO** | Gestion de Production Assistée par Ordinateur |
| **OF** | Ordre de Fabrication |
| **PDR** | Pièce de Rechange |
| **PMP** | Prix Moyen Pondéré |
| **MTBF** | Mean Time Between Failures — temps moyen entre pannes |
| **MTTR** | Mean Time To Repair — temps moyen de réparation |
| **RBAC** | Role-Based Access Control |
| **RLS** | Row Level Security (sécurité au niveau de la ligne BDD) |
| **DA** | Dinar Algérien (devise par défaut) |
| **NC** | Non-Conformité (qualité) |
| **CCP** | Critical Control Point (point de contrôle critique) |
| **BOM** | Bill Of Materials — nomenclature, fusionnée dans les recettes |

### 📐 Conventions du manuel

- Un astérisque **\*** signale un champ **obligatoire** au formulaire.
- Les **codes** d'entité (machine, PDR, équipement, produit, article…) sont **uniques** dans la base.
- Les dates sont au format **JJ/MM/AAAA** ; les heures au format **24h** (`HH:mm`).
- Tous les **prix et montants** sont en **DA (Dinar Algérien)**, précision **4 décimales**.
- L'unité de base pour les quantités matière est le **gramme**.
- Les actions destructrices (suppression) sont précédées d'une **boîte de confirmation**.
- Les notifications **toast** confirment les actions ou affichent les erreurs.
- Les **badges de statut** utilisent un code couleur cohérent dans toute l'application.

### 🎨 Codes couleur des statuts

| Couleur | Signification | Exemples |
|---------|---------------|----------|
| 🟢 Vert | En service, validé, terminé, OK | Machine en service, OF terminé, ticket clôturé |
| 🟠 Orange | En cours, attention, à surveiller | Intervention en cours, stock critique, OF en cours |
| 🔴 Rouge | Critique, en panne, retard, rupture | Machine en panne, préventif en retard, rupture stock |
| ⚫ Gris | Inactif, brouillon, hors service | Plan brouillon, utilisateur désactivé |
| 🔵 Bleu | Information, planifié | OF planifié, ticket nouveau |

### 🎯 Légende des encadrés du manuel

> 💡 **Astuce** — un raccourci ou un truc utile.
> 📌 **Exemple** — un cas concret avec données réalistes.
> ⚠️ **Attention** — un piège classique à éviter.
> 🎯 **Cas d'usage** — un scénario complet de bout en bout.
> 🔒 **Sécurité** — un point lié aux droits ou à la RLS.

---

## 0 bis. Démarrage rapide — Vos 5 premières minutes

> 🎯 Objectif : pouvoir vous repérer dans l'application en moins de 5 minutes, quel que soit votre rôle.

### 🗺️ Anatomie de l'écran principal

```text
 ┌────────────────────────────────────────────────────────────────────┐
 │ ☰  PROD IN TIME              🔍 Recherche  📷  🔔(3)  ❓  👤 Vous │  ← Topbar
 ├──────────┬─────────────────────────────────────────────────────────┤
 │ 🏭 GMAO  │                                                         │
 │  • Dash. │                                                         │
 │  • Mach. │                  CONTENU DE LA PAGE                     │
 │  • PDR   │              (listes, fiches, formulaires)              │
 │  • Tick. │                                                         │
 │  ─────── │                                                         │
 │ 📦 GPAO  │                                                         │
 │  • OF    │                                                         │
 │  • Shift │                                                         │
 │ ─────── │                                                         │
 │ 🧪 Qual. │                                                         │
 │ 📊 Inv.  │                                                         │
 │ ⚙️ Param. │                                                         │
 └──────────┴─────────────────────────────────────────────────────────┘
   Sidebar                       Zone principale
```

| 🧭 Repère | Rôle |
|----------|------|
| **Topbar** | Recherche globale (`Ctrl+K`), scanner caméra 📷, cloche notifications 🔔, bouton **Aide** ❓ (ce manuel), menu utilisateur |
| **Sidebar** | Navigation par module — n'affiche **que** les modules autorisés par vos rôles |
| **Cloche 🔔** | Pastille rouge = notifications non lues. Cliquer ouvre le tiroir |
| **Aide ❓** | Ouvre ce manuel à la section correspondant à votre route actuelle |

### 🚀 Parcours selon votre rôle

#### 👷 Opérateur de production
1. ▶️ Connectez-vous → vous arrivez sur l'écran **Shift Production** (`/gpao/shift`).
2. ▶️ Choisissez votre **équipe** (A/B/C/D) et le **créneau** horaire.
3. ▶️ Déclarez vos quantités produites + rebut + consommations matière à chaque créneau écoulé.
4. ✅ Bouton **Clôturer le shift** disponible quand toutes les saisies sont complètes.

> 💡 La règle "Heure -1" : on déclare l'heure **qui vient de se terminer**, pendant l'heure courante.

#### 🧑‍🔧 Maintenancier
1. ▶️ Ouvrez **Shift Maintenance** (`/maintenance/shift`).
2. ▶️ Onglet **Curatif** : vos tickets ouverts. Cliquez **« Prendre en charge »** pour démarrer.
3. ▶️ Onglet **Préventif** : plans à exécuter aujourd'hui.
4. ✅ Cause racine + solution = obligatoires à la résolution.

#### 👨‍💼 Chef de ligne
1. ▶️ Ouvrez **Synoptique de votre ligne** (`/lignes/:id`) — vue temps réel des machines.
2. ▶️ Vérifiez OF en cours, arrêts, performances.
3. ▶️ Lancez la **Console responsable shift** pour ouvrir/clôturer les sessions.

#### 🧪 Contrôleur Qualité
1. ▶️ Ouvrez **Shift Qualité** (`/qualite/shift`).
2. ▶️ Saisissez les **contrôles** aux points de contrôle de votre périmètre.
3. ▶️ Déclarez les **non-conformités** observées avec catégorie + gravité.

#### 🛒 Gestionnaire magasin / PDR
1. ▶️ Liste **PDR** (`/pdr`) → filtrez par état stock (critique/rupture).
2. ▶️ Saisissez les **mouvements** (entrée/sortie/inventaire) avec réf ERP.
3. ✅ PMP recalculé automatiquement à chaque entrée.

#### 🔐 Administrateur
1. ▶️ **Paramètres** (`/parametres`) → 4 pôles (Sécurité, Référentiels, Production, Configuration).
2. ▶️ **Utilisateurs** : créer comptes, affecter rôles.
3. ▶️ **Matrice des rôles** : ajuster permissions par module.
4. ▶️ **Contrôle d'accès** : export portabilité, kill-switches.

### ⌨️ Raccourcis clavier essentiels

| Raccourci | Action |
|-----------|--------|
| `?` ou `Shift + /` | Ouvrir/fermer ce manuel |
| `Ctrl + K` (`Cmd + K`) | Recherche globale (palette) |
| `Esc` | Fermer dialog / panneau ouvert |
| `Tab` | Navigation entre champs |
| `Entrée` | Valider un formulaire ou une saisie |

---

## 1. Présentation & architecture

> 🏭 **À quoi ça sert** : une seule application web pour piloter votre usine — maintenance, production, qualité et inventaire, sans jongler entre 5 logiciels.

**PROD IN TIME** combine quatre modules opérationnels intégrés :

| Module | Icône | Couvre |
|--------|-------|--------|
| **GMAO** | 🔧 | Parc machines, tickets curatifs, plans préventifs, PDR & fournisseurs |
| **GPAO** | 📦 | Ordres de fabrication, recettes, déclarations horaires, arrêts, consommations |
| **Qualité** | 🧪 | Contrôles, non-conformités, actions correctives, indicateurs, traçabilité |
| **Inventaire** | 📊 | Campagnes de comptage double avec arbitrage |

### 🧱 Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| UI | Tailwind CSS v3 + shadcn/ui + design tokens HSL |
| Backend | Lovable Cloud (PostgreSQL, Auth, Storage, Edge Functions) |
| Sécurité | RLS PostgreSQL + RBAC applicatif via `has_role()` |
| Temps réel | Mises à jour live sur tickets, stocks, déclarations, shifts |

### 🗂️ Modèle de données — entités principales

```text
profiles ─── user_roles ─── role_permissions
   │
   └── (interventions, tickets, consommations, executions…)

production_lines ── machine_line_assignments ── machines ── equipements
       │                                          │
       │                                          ├── pdr_machines ── pdr
       │                                          │                    │
       │                                          ├── tickets          ├── pdr_movements
       │                                          ├── plans_preventifs ├── pdr_suppliers
       │                                          └── entity_documents └── pdr_instances
       │
       └── ordres_fabrication ── of_mode_history
                  │
                  ├── declarations_production
                  ├── consommations
                  └── arrets_production
```

### 🔄 Cycle de vie utilisateur type

```text
  1️⃣ Inscription     2️⃣ Email vérifié     3️⃣ Rôles affectés
  ───────────────►   ────────────────►   ──────────────────►   4️⃣ Accès modules
   (signup)          (lien mail)          (par un admin)         (sidebar dynamique)
```

> ⚠️ **Attention** : à l'inscription, **aucun rôle n'est attribué**. L'utilisateur ne voit rien tant qu'un admin ne lui en a pas affecté au moins un.

---

## 1 bis. Vue d'ensemble visuelle

> 🎯 Comprendre comment les modules s'articulent en un seul coup d'œil.

### 🔗 Flux de données global

```text
       ┌──────────┐    ┌──────────┐    ┌─────────┐
       │ Articles │───►│ Recettes │───►│   OF    │
       │ (MP)     │    │ (BOM)    │    │         │
       └──────────┘    └──────────┘    └────┬────┘
                                            │
            ┌───────────────────────────────┼───────────────────────────┐
            ▼                               ▼                           ▼
     ┌────────────┐                 ┌────────────┐              ┌────────────┐
     │ Shift Prod │                 │   Qualité  │              │ Maintenance│
     │ déclar/    │◄──── panne ─────│ Contrôles, │              │ Tickets &  │
     │ arrêts/    │                 │    NC      │              │ Préventif  │
     │ conso      │                 └────────────┘              └─────┬──────┘
     └─────┬──────┘                                                   │
           │                                                          │
           ▼                                                          ▼
     ┌────────────┐                                            ┌────────────┐
     │  Stocks    │◄──────── sortie PDR ───────────────────────│ PDR / Stock│
     │  articles  │                                            └────────────┘
     └────────────┘
```

### 👥 Modules ↔ rôles

| Module | Rôles principaux |
|--------|------------------|
| 🔧 GMAO | `admin`, `resp_maintenance`, `maintenancier`, `gestionnaire_magasin` |
| 📦 GPAO | `admin`, `resp_production`, `chef_ligne`, `operateur`, `bureau_methode` |
| 🧪 Qualité | `admin`, `resp_qualite`, `controleur_qualite` |
| 📊 Inventaire | `admin`, `responsable_inventaire`, `agent_inventaire` |
| ⚙️ Paramètres | `admin` uniquement |

---

## 2. Authentification & sécurité

**Routes** : `/auth`, `/reset-password`

> 🔐 **À quoi ça sert** : créer un compte, se connecter, gérer son mot de passe en toute sécurité.

### 2.1 Inscription (signup)

**Champs requis** : prénom\*, nom\*, email\*, mot de passe\* (min. 6 caractères).

```text
  ┌─────────────────────┐   ┌──────────────┐   ┌──────────────┐
  │  Formulaire signup  │──►│ Email envoyé │──►│ Lien cliqué  │
  │  (email + mdp)      │   │              │   │ → compte     │
  └─────────────────────┘   └──────────────┘   │   activé     │
                                                └──────┬───────┘
                                                       │
                                                       ▼
                                              ┌────────────────┐
                                              │ Admin affecte  │
                                              │ rôle(s)        │
                                              └────────────────┘
```

À la création :
- Le trigger PostgreSQL `handle_new_user` crée automatiquement la fiche `profiles` associée.
- ⚠️ Aucun rôle n'est attribué par défaut → l'utilisateur **ne peut accéder à rien** tant qu'un administrateur ne lui en assigne au moins un.
- ✉️ Un **email de vérification** est envoyé. La connexion échoue tant que l'email n'est pas confirmé.

Toast affiché : *« Compte créé — Vérifiez votre email pour confirmer votre compte. »*

### 2.2 Connexion

**Cas d'erreur** :

| Cause | Message affiché | 💡 Solution |
|-------|-----------------|-------------|
| Identifiants invalides | *« Invalid login credentials »* | Vérifier email + mot de passe |
| Email non vérifié | *« Email not confirmed »* | Cliquer le lien reçu par mail |
| Compte introuvable | *« User not found »* | Vérifier l'orthographe de l'email |
| Mot de passe trop court | *« Password should be at least 6 characters »* | Minimum 6 caractères |

### 2.3 Réinitialisation du mot de passe

▶️ Étapes :
1. Sur `/auth`, saisir l'email puis cliquer **« Mot de passe oublié ? »**.
2. ⚠️ Si l'email est vide → toast d'erreur : *« Saisissez votre adresse email puis cliquez… »*.
3. ✉️ Un email contenant un lien temporaire est envoyé.
4. Le lien redirige vers `/reset-password` où vous saisissez un nouveau mot de passe.
5. ⏱️ Le lien expire au bout d'une période courte (sécurité Lovable Cloud).

> 📌 **Exemple** : Ahmed a oublié son mot de passe. Il saisit `ahmed@laiterie-amour.dz`, clique « Mot de passe oublié ? », reçoit un mail dans la minute, clique le lien, saisit `MonNouveauMdp2026!`, et se reconnecte immédiatement.

### 2.4 Déconnexion

🚪 Bouton **Déconnexion** dans la sidebar (icône Logout). Vide la session et redirige vers `/auth`.

### 2.5 Sécurité des données

| 🔒 Élément | Protection |
|-----------|-----------|
| Mots de passe | **Hachés** côté serveur — jamais accessibles en clair |
| Toutes les tables sensibles | **RLS activée** |
| Vérifications de rôle | Fonctions `SECURITY DEFINER` (`has_role`, `check_permission`) — évitent la récursion RLS |
| Stockage rôles | Uniquement dans `user_roles` (jamais dans `profiles`) — empêche l'escalade de privilèges |

---

## 3. Module GMAO — Maintenance

> 🔧 **À quoi ça sert** : suivre le parc machines, gérer les pannes (curatif) et planifier les entretiens (préventif).

### 🧬 Hiérarchie du parc

```text
   🏭 Ligne de production (ex. L1 — Conditionnement Yaourt 125g)
     │
     ├── 🛠️ Machine 1 (ex. Doseuse SIG-2000)
     │     ├── ⚙️ Équipement A (Pompe doseuse)
     │     ├── ⚙️ Équipement B (Capteur niveau)
     │     └── 🔩 PDR rattachés (joints, courroies…)
     │
     └── 🛠️ Machine 2 (ex. Operculeuse OPER-450)
           └── ⚙️ Équipement (Résistance scellage)
                 └── 🔩 PDR rattachés
```

---

### 3.1 Dashboard

**Route** : `/`

> 📊 **À quoi ça sert** : voir d'un coup d'œil l'état de votre maintenance.

**Tous les KPI sont filtrables par période** via le sélecteur en haut à droite, avec **comparaison à la période précédente** (variation en %).

| KPI | Source | Calcul | 🎨 Couleur si critique |
|-----|--------|--------|----------------------|
| Tickets ouverts | `tickets.statut='ouvert'` | Count | 🟠 si > seuil |
| Interventions en cours | `interventions.statut='en_cours'` | Count | 🔵 |
| Machines en panne | `machines.statut='en_panne'` | Count | 🔴 |
| Taux de disponibilité | machines OK / total | % | 🟠 si < 80% |
| PDR en stock critique | `stock_actuel ≤ stock_min` | Count | 🟠 |
| PDR en rupture | `stock_actuel = 0` | Count | 🔴 |
| Plans préventifs actifs | `statut_plan='valide'` | Count | 🟢 |
| Préventifs en retard | `prochaine_echeance < now()` | Count | 🔴 |
| MTBF / MTTR | Voir §3.10 | Moyenne | — |

> 📌 **Exemple** : 3 tickets ouverts (🟠), 1 machine en panne (🔴), disponibilité 92% (🟢). Vous savez immédiatement quoi traiter en priorité.

---

### 3.2 Machines

**Routes** : `/machines`, `/machines/new`, `/machines/:id`, `/machines/:id/edit`

> 🛠️ **À quoi ça sert** : référentiel central de toutes les machines de l'usine.

#### 📋 Vue liste

```text
 ┌──────────────────────────────────────────────────────────────────┐
 │ 🔍 [Rechercher…]   [Statut ▼]  [Criticité ▼]   ⟲ Reset   📷 ⬇ + │
 ├────────┬────────────────────┬───────────┬───────────┬────────────┤
 │ Code   │ Désignation        │ Statut    │ Criticité │ Loc.       │
 ├────────┼────────────────────┼───────────┼───────────┼────────────┤
 │ M-001  │ Doseuse SIG-2000   │ 🟢 Service│ Critique  │ L1 / Atelier A│
 │ M-002  │ Operculeuse 450    │ 🔴 Panne  │ Critique  │ L1 / Atelier A│
 └────────┴────────────────────┴───────────┴───────────┴────────────┘
```

- **Recherche** textuelle (code ou désignation).
- **Filtres** : statut, criticité.
- **⟲ Bouton "Réinitialiser les filtres"** quand au moins un filtre est actif.
- **📷 Scanner QR** : redirige vers la fiche machine scannée.
- **⬇ Export CSV** des données filtrées.

#### 📂 Fiche machine — onglets

| Onglet | Contenu |
|--------|---------|
| **Informations** | Code, désignation, marque, modèle, n° série, date mise en service |
| **Classification** | Famille (arborescence), criticité, rôle fonctionnel, impact ligne, disponibilité PDR |
| **Localisation** | Zone, atelier, position |
| **Documents** | Voir §7 |
| **Images** | Voir §8 |
| **PDR** | Pièces associées + quantité recommandée |
| **Lignes** | Lignes où la machine est affectée |
| **Préventif** | Plans liés + bouton **« Voir tous les plans de cette ligne »** |

#### ✏️ Création / édition

| Champ | Obligatoire | Règle |
|-------|-------------|-------|
| Code | ✅ | **Unique** dans la base |
| Désignation | ✅ | — |
| Marque, modèle, n° série, description, localisation, date MES | ❌ | — |
| Famille | ❌ | Sélecteur arborescent |
| Statut | ✅ | Défaut : `en_service` |
| Criticité, rôle fonctionnel, impact ligne, disponibilité PDR | ❌ | Voir tableau ci-dessous |

#### 🏷️ Métadonnées industrielles

| Champ | Valeurs |
|-------|---------|
| **Criticité** | Critique · Importante · Normale |
| **Criticité maintenance** | Haute · Moyenne · Basse |
| **Rôle fonctionnel** | Dosage · Convoyage · Remplissage · Bouchage · Étiquetage · Emballage · Palettisation · Contrôle · Nettoyage · Stockage |
| **Impact ligne** | Arrêt complet · Arrêt partiel · Dégradation performance |
| **Disponibilité PDR** | Disponible · Partielle · Indisponible |
| **Statut** | En service · En panne · En maintenance · Hors service |

> 📌 **Exemple complet** :
> ```
> Code         : M-018
> Désignation  : Operculeuse OPER-450
> Marque       : OPER-Tech
> Modèle       : 450-X
> N° série     : 2023-OP-0187
> Famille      : Conditionnement > Operculage
> Criticité    : Critique
> Rôle fonct.  : Bouchage
> Impact ligne : Arrêt complet
> Dispo PDR    : Partielle
> Statut       : 🟢 En service
> Ligne        : L1 (Conditionnement Yaourt)
> ```

#### ⚠️ Cas particuliers

- **🚫 Suppression bloquée** si la machine est référencée par : tickets, plans préventifs, PDR, équipements, lignes, déclarations.
  Toast : *« Suppression impossible — utilisée dans : … »*.
- Le **changement de statut « En panne »** est généralement issu d'un ticket et non d'une édition manuelle (traçabilité).

#### ❓ FAQ Machines

- **Pourquoi je ne peux pas supprimer ma machine ?** → Elle est utilisée dans un historique. C'est volontaire (intégrité). Mettez-la en `hors_service` plutôt.
- **Comment basculer en panne ?** → Créez un ticket : le statut bascule automatiquement.

---

### 3.3 Équipements

**Routes** : `/equipements`, `/equipements/new`, `/equipements/:id`, `/equipements/:id/edit`

> ⚙️ **À quoi ça sert** : décomposer une machine en sous-ensembles fonctionnels (pompe, capteur, vérin…) pour des PDR et un suivi plus fins.

#### ✏️ Champs obligatoires
- **Code\*** (unique), **Désignation\***, **Type\***, **Statut\***.

#### 🏷️ Types disponibles
🔩 Mécanique · ⚡ Électrique · 💨 Pneumatique · 💧 Hydraulique · 🔌 Électronique · 📐 Instrumentation.

#### ⚠️ Cas particuliers
- Un équipement **doit** être rattaché à une machine **ou** à une ligne (sinon orphelin).
- 🚫 Suppression bloquée si tickets, préventif ou documents liés.

---

### 3.4 Lignes de production

**Routes** : `/lignes`, `/lignes/:id`, `/lignes/:id/config`

> 🏭 **À quoi ça sert** : organiser vos machines en lignes séquentielles et visualiser leur état en temps réel.

#### 📋 Liste
Colonnes : Code, Désignation, Atelier, Statut, Actions.
- 🔧 Action **« Préventif »** → `/preventif?line=<id>` (filtre pré-rempli).
- 🗺️ Action **« Synoptique »** → vue `/lignes/:id`.

#### 🗺️ Synoptique (`/lignes/:id`)

```text
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ M-001    │───►│ M-002    │───►│ M-003    │───►│ M-018    │
   │ Doseuse  │    │ Capsuleuse│   │ Étiquet. │    │ Operc.   │
   │ 🟢 OK    │    │ 🟢 OK    │    │ 🟠 Maint │    │ 🔴 Panne │
   │ Critique │    │ Normale  │    │ Importante│   │ Critique │
   └──────────┘    └──────────┘    └──────────┘    └──────────┘
        │ Aux: Pompe        │ Aux: Compresseur
        └──────────         └──────────
```

- Représentation visuelle **séquentielle** des machines (`sort_order`).
- 🖱️ Blocs interactifs (240 px) cliquables → fiche machine.
- ⏱️ Indicateurs temps réel : marche, arrêt, maintenance.
- 🏷️ Affichage criticité, rôle fonctionnel, disponibilité PDR.
- ⚙️ Équipements auxiliaires regroupés sous leur machine parente.
- 🔧 Bouton header **« Plans préventifs »** → `/preventif?line=<id>`.
- 📖 Légende industrielle intégrée.

#### ⚙️ Configuration (`/lignes/:id/config`)
- 🖐️ **Drag & drop** des machines pour définir l'ordre séquentiel.
- ➕ Ajout / ➖ retrait de machines.
- ⏱️ Définition de la **vitesse théorique** (cadence cible).

---

### 3.5 Pièces de rechange (PDR)

**Routes** : `/pdr`, `/pdr/new`, `/pdr/:id`, `/pdr/:id/edit`

> 🔩 **À quoi ça sert** : gérer le magasin PDR — stock, fournisseurs, durée de vie, mouvements valorisés en PMP.

#### 🔄 Workflow PDR

```text
  ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌────────────┐
  │ Création │──►│ Entrée   │──►│ Stock OK   │──►│ Sortie     │
  │ fiche    │   │ stock    │   │ PMP calc.  │   │ (ticket /  │
  │          │   │ + réf ERP│   │            │   │ préventif) │
  └──────────┘   └──────────┘   └────┬───────┘   └─────┬──────┘
                                     │                 │
                                     ▼                 ▼
                              ┌─────────────┐   ┌──────────────┐
                              │ Inventaire  │   │ Audit log    │
                              │ (recale)    │   │ (immutable)  │
                              └─────────────┘   └──────────────┘
```

#### 📋 Liste
- Colonnes : Référence, Désignation, Stock actuel, Min, Max, Statut, Famille.
- 🔍 Filtres : statut (stratégique/commun), famille, état stock (normal/critique/rupture).
- 🔴 Badge rouge si **rupture**, 🟠 orange si **critique**.
- ⟲ **Bouton "Réinitialiser les filtres"**.
- 📷 **Scanner** : résout uniquement les PDR.

#### 📂 Onglet Informations
- **Référence\*** (unique), **Désignation\***.
- Description, **Famille** (avec **héritage** : approvisionnement, statut, fournisseurs hérités automatiquement).
- Fournisseur principal, emplacement de stockage.
- Type d'approvisionnement : Achat local · Import · Fabrication interne.
- **Statut** : Stratégique 🔒 ou Commun.

#### 📦 Onglet Stock
- Stock actuel, **Stock min**, **Stock max**, stock sécurité, point de commande.
- Délai d'approvisionnement (jours).
- **Prix unitaire (DA)**, **PMP (DA)** — calculé automatiquement à chaque entrée.

> 💡 **Astuce PMP** : Prix Moyen Pondéré = `((stock_actuel × PMP) + (qty_entrée × prix_entrée)) / (stock_actuel + qty_entrée)`. Calcul automatique — vous n'avez rien à faire.

#### 📜 Onglet Mouvements de stock

```text
   📥 ENTRÉE          📤 SORTIE          📊 INVENTAIRE
   stock + qty        stock − qty        stock = qty (absolue)
   réf ERP requise    bloque si qty>stock   recale tout
```

| Type | Effet sur stock | ⚠️ Règle / blocage |
|------|-----------------|--------------------|
| **📥 Entrée** | `stock_actuel + quantité` | **Réf document ERP\*** obligatoire |
| **📤 Sortie** | `stock_actuel - quantité` | Bloquée si `quantité > stock_actuel` → toast *« Stock insuffisant — Stock actuel : X »* |
| **📊 Inventaire** | Remplace par **valeur absolue** | La quantité saisie devient le nouveau stock total |

Chaque mouvement enregistre : stock avant, stock après, utilisateur, date, motif, référence ERP.

> 🔒 **L'historique est immuable** — pas de modification après enregistrement. Annulation uniquement par mouvement compensatoire avec permission dédiée.

**Validations** :
- Quantité ≤ 0 → toast *« Quantité invalide »*.

#### ⏳ Onglet Durée de vie
- Durée de vie min/max (jours). ⚠️ **Validation** : `min ≤ max` sinon toast *« Durée de vie min doit être ≤ durée de vie max »*.
- **Instances actives** : suivi de chaque pièce installée (date pose, machine).
- 🔴 Alerte **« dead age »** lorsqu'une instance dépasse sa durée max.
- 🔧 Bouton **« Générer plan préventif »** → crée un plan préventif pré-rempli.

#### 🛒 Onglet Fournisseurs
- Fournisseurs **propres** à la PDR + fournisseurs **hérités** de la famille (lecture seule au niveau PDR).
- Champs : nom\*, référence fournisseur, prix (DA), délai (jours), email, téléphone, adresse, URLs.
- ⭐ Marquage **fournisseur principal** (un seul à la fois).
- 🔐 Permissions PDR stock dédiées : voir, créer, modifier, supprimer fournisseur.

#### 🛠️ Onglet Machines
- Machines associées + quantité recommandée par machine.
- ⚠️ Si PDR **stratégique**, au moins **une machine\*** doit être liée → toast bloquant.

#### ⚠️ Validations à l'enregistrement (formulaire PDR)

| Règle | Message |
|-------|---------|
| Référence + désignation requises | *« Référence et désignation obligatoires »* |
| PDR stratégique sans machine | *« PDR stratégique : au moins une machine doit être liée »* |
| `duree_vie_min > duree_vie_max` | *« Durée de vie min doit être ≤ durée de vie max »* |
| `stock_min > stock_max` | *« Stock min doit être ≤ stock max »* |

#### 🔐 Permissions stock PDR
Voir §9.5. Actions contrôlées : Créer entrée · Créer sortie · Correction · Inventaire · Annulation mouvement · CRUD fournisseurs.

> 📌 **Exemple concret** : Karim, magasinier, reçoit une livraison de 50 joints toriques (réf JT-014). Il ouvre `/pdr`, scanne le QR du carton, va sur **Mouvements** → **Entrée**, saisit qty=50, prix=120 DA, réf ERP=`LIV-2026-441`. Le PMP recalcule, le stock passe de 12 à 62, l'historique est figé.

---

### 3.6 Tickets de maintenance

**Routes** : `/tickets`, `/tickets/:id`

> 🎫 **À quoi ça sert** : déclarer une panne et suivre sa résolution de A à Z avec traçabilité complète.

#### 🔄 Cycle de vie

```text
                            (réouverture si nécessaire)
                  ┌─────────────────────────────────────┐
                  ▼                                     │
   ┌─────────┐ ┌──────────┐ ┌──────────────┐ ┌────────┐ │
   │ Ouvert  │►│ En cours │►│   Résolu     │►│Clôturé │ ┘
   │ 🔵      │ │ 🟠       │ │   ✅         │ │ ⚫     │
   └────┬────┘ └─────┬────┘ └──────┬───────┘ └────────┘
        │            │             │
   « Prendre    « Résoudre »  « Clôturer »
   en charge »
```

#### 📋 Liste
- Numéro auto-généré **`TKT-00001`** (trigger `generate_ticket_numero`).
- Colonnes : Numéro, Titre, Machine, Priorité, Statut, Date.
- Filtres : statut, priorité, machine. ⟲ Réinitialiser.

#### ✅ Résolution — champs obligatoires

| Champ | Validation |
|-------|------------|
| **Cause racine\*** | Non vide |
| **Solution appliquée\*** | Non vide |
| Pièces consommées (PDR + quantité) | Décrémente automatiquement le stock |
| Notes de clôture | Optionnel |

⚠️ Champ manquant → toast *« Cause racine et solution obligatoires »*.

#### 🤝 Collaboration multi-maintenanciers — « Avec l'aide de »

Un ticket peut être résolu par **plusieurs techniciens** (2 ou 3 intervenants).

| Élément | Comportement |
|---------|--------------|
| Sélecteur maintenancier | Liste `maintenancier` et `resp_maintenance` (hors assigné principal) |
| Rôle | **Aide** (ponctuelle) ou **Co-intervenant** (conjointe) — bascule |
| Suppression | Bouton ❌ retire le collaborateur (soft-delete via `removed_at`) |
| Carte info | Affiche assigné principal (badge **Lead**) + collaborateurs actifs |

✅ À la résolution, une **`intervention` distincte** est créée pour chaque collaborateur actif → traçabilité KPI individuelle.

🔐 **Permissions** : seuls l'assigné principal, `resp_maintenance` ou `admin` gèrent les collaborateurs (RLS).

#### 🔄 Passation / Libération de ticket (fin de shift)

| Action | Effet métier | Effet base |
|--------|--------------|------------|
| **🔁 Transférer à** | Passation nominative à un autre maintenancier. Statut reste `pris_en_charge`. | Intervention sortante `statut=transferee` ; nouvelle intervention `en_cours` ; `assignee_id` mis à jour ; collaborateurs conservés |
| **🆓 Libérer le ticket** | Remet le ticket dans le pool, prenable par n'importe quel maintenancier. | `assignee_id=null`, `statut=ouvert` ; intervention close avec `statut=liberee` |

⚠️ **Champ Motif obligatoire** dans les deux cas. Sans motif → action bloquée.

**Traçabilité** :
- Entrée `audit_logs` (`action_type=transfer/release`) avec ancien/nouveau assigné et motif.
- 🔔 Notification : `ticket.transferred` au repreneur, `ticket.released` à `maintenancier` + `resp_maintenance`.

#### 📱 Mobile
La résolution, passation et libération sont **optimisées mobile** (formulaire vertical, gros boutons, scan rapide PDR, `StickyActionBar`).

> 📌 **Exemple complet — Cas d'usage B (panne)** :
> 1. 14h32 : Opérateur déclare panne « Operculeuse arrêtée — pas de scellage » depuis Shift Production.
> 2. Ticket `TKT-00187` créé, machine M-018 bascule 🔴, notification 🔔 pour `maintenancier`.
> 3. 14h35 : Yacine clique « Prendre en charge » → statut 🟠.
> 4. 14h50 : Yacine demande de l'aide → ajoute Riad (rôle « Aide »).
> 5. 15h20 : Résolution → Cause : résistance HS · Solution : remplacement résistance + 2 joints. PDR R-014 ×1, JT-014 ×2 consommés (stock décrémenté).
> 6. ✅ Ticket résolu → arrêt production lié auto-clôturé, déclarant prévenu, intervention KPI agrégée à chacun.

---

### 3.7 Maintenance préventive

**Routes** : `/preventif`, `/preventif/new`, `/preventif/:id`, `/preventif/:id/edit`

> 🛡️ **À quoi ça sert** : planifier les entretiens récurrents pour éviter les pannes plutôt que de les subir.

#### 📋 Liste
- Colonnes : Titre, Machine, Ligne, Fréquence, Statut plan, Prochaine échéance, Actions.
- 🔴 Badge **« En retard »** si `prochaine_echeance < now()` ET statut `valide`.
- 🔍 **Filtres cumulables** : statut plan, **ligne**, machine, fréquence, recherche textuelle. ⟲ Réinitialiser.
- 📊 **KPIs contextuels** : Validés, En retard, Brouillons, Suspendus.
- 🔗 Lecture query params `?line=<id>` et `?machine=<id>` au chargement.

#### 📝 Formulaire — workflow en cascade

```text
   1️⃣ Machine* ──► 2️⃣ Ligne (auto)
                       │
   3️⃣ Titre* + desc.   │
   4️⃣ Fréquence        │
   5️⃣ Type maint.      │
   6️⃣ Checklist        │
   7️⃣ PDR nécessaires  │
   8️⃣ Maintenanciers   │
   9️⃣ 1ère échéance   ─┴──► ✅ Sauvegarder (Brouillon)
                                │
                                ▼
                          ▶️ Valider → 🟢 Actif
```

| Étape | Description |
|-------|-------------|
| **1. Machine\*** | Sélection de la machine cible |
| **2. Ligne** | Auto-détectée si machine sur une seule ligne |
| **3. Titre\* + desc.** | Libellé clair |
| **4. Fréquence** | quotidien · hebdo · bimensuel · mensuel · trimestriel · semestriel · annuel |
| **5. Type** | mécanique · électrique · lubrification · nettoyage · inspection · calibration |
| **6. Checklist** | Opérations à réaliser (ajout dynamique) |
| **7. PDR nécessaires** | Pièces + quantités prévisionnelles |
| **8. Maintenanciers** | Techniciens responsables |
| **9. Échéance** | Date initiale |

#### ⚠️ Validations
- **Titre + machine obligatoires** sinon *« Titre et machine obligatoires »*.

#### 🏷️ Statuts du plan

| Statut | Effet |
|--------|-------|
| ⚫ Brouillon | Plan en rédaction, non actif |
| 🟢 Validé | Plan actif → génère échéances, apparaît en Shift |
| ⏸️ Suspendu | Désactivé temporairement |

#### ▶️ Exécution d'un plan

Accessible depuis le détail du plan ou la vue **Shift Maintenance**.

| Champ | Détail |
|-------|--------|
| **Date d'exécution\*** | — |
| **Durée d'intervention\*** (min) | Sinon toast *« Durée obligatoire »* |
| **Checklist** | Validation point par point (OK / NOK) |
| **PDR utilisées** | ⚠️ **OFF par défaut** — cocher uniquement celles réellement consommées |
| **Notes** | Observations du technicien |

À l'enregistrement :
- ✅ Mise à jour `derniere_execution` et **calcul auto** de `prochaine_echeance` selon la fréquence.
- Toast : *« Exécution enregistrée — Prochaine échéance : JJ/MM/AAAA »*.
- Historique conservé dans `preventif_executions`.

> 💡 **Astuce sécurité** : depuis v2.5, toutes les PDR sont décochées par défaut pour éviter la déplétion accidentelle de stock en cas de validation rapide.

---

### 3.8 Shift Maintenance

**Route** : `/maintenance/shift`

> 🧑‍🔧 **À quoi ça sert** : vue dédiée au maintenancier pour son quart de travail — tout ce qu'il doit faire aujourd'hui.

#### 📑 Onglets

| Onglet | Contenu |
|--------|---------|
| **🆘 Curatif** | Tickets ouverts ou en cours assignés au maintenancier |
| **🛡️ Préventif** | Plans préventifs assignés (échéances jour/semaine) |

#### 🃏 Affichage par carte
- 🖼️ Image principale de la machine ou équipement.
- 🏷️ Badges : priorité, urgence, type de panne.
- ▶️ Bouton d'**accès rapide** au détail (ticket ou plan).
- 🔢 Compteur dans chaque onglet.
- 💓 Animations *pulse* sur tickets neufs et indicateurs de retard.

#### 🔍 Filtres
- Filtre par **ligne de production**. ⟲ Réinitialiser.

---

### 3.9 Journal des interventions

**Route** : `/maintenance/journal`

> 📒 **À quoi ça sert** : vue centralisée et auditable de toutes les interventions (curatives + préventives), avec exports CSV.

#### 🔍 Filtres

| Filtre | Description |
|--------|-------------|
| 📅 **Période** | Du / Au |
| 🏷️ **Type** | Tous / Curative / Préventive (avec compteurs) |
| 🏭 **Ligne** | Restreint aux machines de la ligne |
| 🛠️ **Machine** | Machine spécifique |
| 🧑‍🔧 **Maintenancier** | Technicien |

⟲ **Bouton "Réinitialiser les filtres"** pour tout remettre à zéro.

#### 📋 Colonnes
- Type (badge curative/préventive)
- Machine et ligne
- Technicien responsable
- Date et **durée**
- Statut (en cours / terminée)
- 🔗 **Lien direct** vers le document source (ticket ou plan)

---

### 3.10 Analyse & KPI

**Route** : `/analytics`

> 📊 **À quoi ça sert** : mesurer la performance maintenance dans le temps.

#### 🔍 Filtres
- 📅 **Période personnalisable**.
- 📈 **Comparaison automatique** avec période précédente (% variation).
- ⟲ Réinitialiser.

#### 📊 KPI clés

| KPI | Définition | Formule |
|-----|------------|---------|
| **MTBF** | Temps moyen entre 2 pannes | Σ temps service / nb pannes |
| **MTTR** | Temps moyen de réparation | Σ durée interventions / nb interventions |
| **Disponibilité** | % temps opérationnel | (temps service − arrêts) / temps total |
| **Curatif vs Préventif** | Ratio | nb curatives / nb préventives |
| **Coût maintenance** | Valorisation PDR | Σ (PMP × quantité consommée) |
| **Tendances** | Graphiques temporels | par jour / semaine / mois |

---

## 4. Module GPAO — Production

> 📦 **À quoi ça sert** : piloter la production — des ordres de fabrication aux déclarations horaires, en passant par les arrêts et consommations matières.

### 4.1 Dashboard Production

**Route** : `/gpao`

KPIs production temps réel :
- 📋 OF en cours / terminés / planifiés
- 📊 Taux de rendement (OEE simplifié)
- 📦 Quantités produites vs prévues
- ❌ Taux de rebut

---

### 4.2 Ordres de fabrication (OF)

**Routes** : `/gpao/of`, `/gpao/of/new`, `/gpao/of/:id`

> 📋 **À quoi ça sert** : décrire ce qu'on doit produire, sur quelle ligne, en quelle quantité, avec quelle recette.

#### 🔄 Cycle de vie OF

```text
   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │Planifié │──►│ En cours │──►│ Terminé  │
   │  🔵     │   │  🟠      │   │   🟢     │
   └────┬────┘   └────┬─────┘   └──────────┘
        │             │
        └─────────────┴────► ⚫ Annulé (toute étape)
```

#### 📋 Liste
- Numéro auto-généré **`OF-00001`** (trigger `generate_of_numero`).
- Colonnes : Numéro, Produit, Ligne, Statut, Quantités, Dates.
- 🔍 Filtres : statut, ligne, produit. ⟲ Réinitialiser.
- 📥📤 **Import / Export CSV** disponibles.

#### 📂 Détail OF — onglets
- 🛒 Produit fabriqué + **recette utilisée** (version verrouillée)
- 🔢 Quantités : prévue, produite, rebut, écart
- 🏭 Ligne de production assignée
- ⏱️ **Mode shift** : 3×8 (défaut), 2×8, 1×8, Surface
- 📝 **Déclarations de production** par shift
- 📦 **Consommations matières premières**
- ⏸️ **Arrêts de production**
- 📜 **Historique des modes** (`of_mode_history`)

#### 🔄 Changement de mode shift en cours d'OF

- 🔘 Bouton **« Changer le mode »** dans le détail.
- ⚠️ **Motif obligatoire**.
- 📜 Trace dans `of_mode_history` : ancien mode, nouveau mode, motif, utilisateur, date.

#### ⚠️ Validations
- Quantité prévue > 0.
- Date début ≤ date fin prévisionnelle.
- Une recette doit exister pour le produit avant le démarrage.

> 📌 **Exemple** :
> ```
> N°          : OF-00187
> Produit     : Yaourt Nature 125g (P-005)
> Recette     : v3 (Active)
> Ligne       : L1 — Conditionnement Yaourt
> Mode        : 3×8
> Qty prévue  : 12 000 unités
> Date début  : 26/05/2026 06h00
> Date fin    : 27/05/2026 22h00
> Statut      : 🟠 En cours
> ```

---

### 4.3 Produits

**Routes** : `/gpao/produits`, `/gpao/produits/:id`

> 🛒 **À quoi ça sert** : référentiel des produits finis vendus.

- **Code\*** (unique), **Désignation\***, Famille, Unité, Poids unitaire.
- Code ERP (référence externe).
- Familles **hiérarchiques**.
- 📦 **Configuration de conditionnement** : niveaux multiples (unité → carton → palette), coefficients, poids par niveau.

#### 🚫 Suppression
- Bloquée si utilisé dans une recette, un OF ou une déclaration.
- Toast : *« Suppression impossible — Ce produit est utilisé dans : … »*.

---

### 4.4 Articles (matières premières)

**Routes** : `/gpao/articles`, `/gpao/articles/:id`

> 🧪 **À quoi ça sert** : matières premières et consommables intervenant dans les recettes.

- **Code\*** (unique), **Désignation\***, Famille, Unité.
- Stock actuel, stock minimum.
- 💰 **Prix unitaire (DA)**.
- Fournisseur, Code ERP.

#### 🚫 Suppression
- Bloquée si utilisé dans une recette ou une consommation.

---

### 4.5 Recettes (unifiées avec la nomenclature BOM Qualité)

**Route** : `/gpao/recettes`

> 🧬 **À quoi ça sert** : décrire comment fabriquer un produit (matières + procédé), avec versions et composants sensibles qualité.

Depuis la version 2.2, **recettes de production** et **nomenclatures (BOM) du module Qualité** sont **fusionnées** : une recette porte à la fois la composition matière et le procédé.

#### 🧩 Lignes de recette

| Champ | Détail |
|-------|--------|
| Article | Référence MP |
| Quantité + unité | Avec **% de perte** (`waste_percent`) |
| **Type d'article** | `raw_material`, `packaging`, `label`, `carton`, `pallet`, `consumable` |
| Drapeaux | **obligatoire**, **sensible qualité** (`is_quality_sensitive`) |

#### 🔄 Versioning

```text
   v1 (Active)  ──duplique──►  v2 (Brouillon)  ──valide──►  v2 (Active)
                                                                │
                                                                ▼
                                                          v1 (Archivée)*
   * Plusieurs versions actives possibles simultanément
```

- ⚠️ **Sélection obligatoire de la version** à la création d'un OF.
- 🔒 La version reste **verrouillée** sur l'OF pour traçabilité.
- RPC `get_recipe_for_of(of_id)` renvoie le snapshot complet.
- Trigger renseigne `bom_id` dans `ordres_fabrication` (compatibilité ancienne).

> Voir aussi §4.9 pour les onglets Qualité de l'OF.

---

### 4.6 Shift Production

**Route** : `/gpao/shift`

> ⏱️ **À quoi ça sert** : écran opérateur pour déclarer la production heure par heure pendant le quart.

#### 🚀 Initialisation du shift
- Sélection **équipe** (A/B/C/D) et **créneau** (selon mode OF : 3×8 → Matin/Après-midi/Nuit · 2×8 → Matin/Après-midi · 1×8 → Journée · Surface → Surface).

#### ⏱️ Règle de saisie horaire — fenêtre de tolérance

> 🔑 Un créneau horaire **ne devient saisissable qu'APRÈS sa fin**, et reste ouvert pendant **`tolerance_saisie_heures`** (défaut : **1 heure**).

| Heure actuelle | Créneau 22h–23h | Créneau 23h–00h |
|----------------|-----------------|-----------------|
| 22h30 | ❌ Verrouillé (en cours) | ❌ Pas commencé |
| 23h30 | ✅ Ouvert (tolérance 1h) | ❌ En cours |
| 00h30 | ❌ Fermé (au-delà tolérance) | ✅ Ouvert |

- ⚙️ Paramètre `tolerance_saisie_heures` **modifiable** dans `/parametres/shifts`.
- 🚫 Hors fenêtre → bouton **désactivé** avec tooltip explicatif.

#### 📝 Saisies par créneau
- 🔢 Quantité produite (unité)
- ❌ Rebut (unité)
- 📦 Consommations matières (article + quantité réelle)
- 📊 Comparaison **recette théorique** → écart en % affiché.

#### 🚨 Création de ticket maintenance depuis Shift
- 🔘 Bouton **« Déclarer une panne »** ouvre dialog → crée un ticket lié à la machine de la ligne courante.
- 🔔 Ticket apparaît immédiatement en **Shift Maintenance** côté curatif.

#### ✅ Clôture du shift
- Exige **complétion totale** :
  - Toutes saisies horaires
  - Toutes consommations matières
- 🚫 Bouton clôture désactivé tant que les conditions ne sont pas remplies.

> 📌 **Exemple** : Samia (équipe B, ligne L1, OF-00187, mode 3×8 créneau Matin 06h–14h).
> À 15h00 (créneau fermé depuis 14h, tolérance 1h), elle saisit pour 13h–14h : produit 1 480 u., rebut 12, lait 78,2 kg. Toast vert ✅, KPI mis à jour, dashboard responsable rafraîchi.

---

### 4.7 Consommations

**Route** : `/gpao/consommations`

- 📜 Historique des consommations matières premières.
- 🔍 Filtres : OF, article, shift, période. ⟲ Réinitialiser.

#### 🔧 Correction d'une consommation hors jour
- ⚠️ **Motif obligatoire**.
- 📜 Audit log auto : utilisateur, ancienne valeur, nouvelle valeur, motif, date.

---

### 4.8 Arrêts

**Route** : `/gpao/arrets`

#### 🏷️ Types d'arrêt

| Type | Icône | Usage |
|------|-------|-------|
| Panne | 🔴 | Défaillance machine |
| Changement format | 🔄 | Reconfiguration ligne |
| Nettoyage | 🧽 | Arrêt nettoyage planifié |
| Pause | ⏸️ | Pause équipe planifiée |
| Approvisionnement | 📦 | Attente matière première |
| Qualité | 🧪 | Contrôle qualité |
| Autre | ❓ | Motif libre |

#### 🧮 Calculs et liens
- ⏱️ **Durée** auto-calculée (`fin - début` en minutes).
- 🔗 Lien **optionnel** vers un ticket de maintenance (type "Panne").
- 🔍 Filtres : OF, ligne, machine, shift, période, type. ⟲ Réinitialiser.

---

### 4.9 Module Qualité

**Route racine** : `/qualite`

> 🧪 **À quoi ça sert** : contrôler la conformité des produits, déclarer les non-conformités, suivre les actions correctives.

#### 🗺️ Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard Qualité | `/qualite` | KPI qualité globaux |
| 🧪 Contrôles | `/qualite/controles` | Saisie et historique |
| ⚠️ Non-conformités | `/qualite/non-conformites` | Déclaration NC, catégories, gravité |
| 🔧 Actions correctives | `/qualite/actions` | Suivi par catégorie |
| 📊 Indicateurs | `/qualite/indicateurs` | Affectation et calcul |
| 📋 OF Qualité | `/qualite/of` | Liste des OF avec onglet qualité |
| 🔍 Traçabilité | `/qualite/tracabilite` | Lots / composants sensibles par OF |
| 🧬 Recettes & Nomenclatures | `/qualite/recettes-nomenclatures` | Vue qualité (composants sensibles, comparaison versions) |
| 📑 Rapports | `/qualite/rapports` | Exports Qualité |
| ⏱️ Shift Qualité | `/qualite/shift` | Quart contrôleur — voir §13.1 |

#### 📂 Onglet Qualité d'un OF (`OfQualityTab`)
- 🧬 Section **« Recette suivie »** : version verrouillée + composants `is_quality_sensitive`.
- 🧪 Saisie des contrôles aux **points de contrôle** rattachés à la ligne ou à l'OF.
- ⚠️ Déclaration NC (catégories, motifs, types de défauts paramétrables).

---

## 5. Workflows transverses (scénarios pas-à-pas)

> 🎯 Quatre scénarios complets de bout en bout pour comprendre l'app dans la vraie vie.

### 🎯 Scénario A — Démarrer un OF, déclarer 3 heures, clôturer le shift

```text
  1. Resp. prod   ─►  Crée OF (P-005 × 12000u, ligne L1, 3×8)
  2. Système      ─►  ensure_production_shift_session → sessions créées
  3. Opérateur    ─►  Ouvre /gpao/shift, équipe B, créneau Matin
  4. À 7h05       ─►  Saisit 06h–07h : prod, rebut, conso
  5. À 8h05       ─►  Saisit 07h–08h
  6. À 9h05       ─►  Saisit 08h–09h
  7. Fin de shift ─►  Toutes saisies vertes → ▶️ Clôturer
  8. Système      ─►  Bilan HTML imprimable, notifications resp.
```

### 🎯 Scénario B — Panne machine → ticket → intervention → réception PDR

```text
  1. Opérateur  ─► « Déclarer panne » depuis Shift → TKT-00187
  2. Machine    ─► bascule 🔴 En panne
  3. 🔔 Notif   ─► aux maintenanciers
  4. Maintenancier ─► « Prendre en charge » → 🟠
  5. Recherche PDR ─► stock insuffisant → bon de commande
  6. Magasinier ─► réception → mouvement « Entrée » + réf ERP
  7. Maintenancier ─► consomme PDR via résolution
  8. ✅ Résolution → machine 🟢, ticket → arrêt prod auto-clôturé
```

### 🎯 Scénario C — Contrôle qualité loupé → NC → action corrective

```text
  1. Contrôleur ─► Ouvre /qualite/shift
  2. Saisit contrôle « poids carton » au CCP CP-CART → 412 g (seuil 420–460)
  3. ⚠️ Hors tolérance → Non-conformité auto-suggérée
  4. Catégorie : Conditionnement · Gravité : Mineure · Défaut : Sous-poids
  5. Action corrective créée : « Recalibrer doseuse M-001 » assignée à maintenance
  6. Suivi dans /qualite/actions → statut En cours → Clôturée
```

### 🎯 Scénario D — Inventaire en double comptage avec arbitrage

```text
  1. Resp. inventaire ─► Crée campagne INV-202605-001, scope famille « Joints »
  2. Affecte Agent A (Karim) + Agent B (Salim) sur familles
  3. Agent A compte (saisie verrouillée à validation)
  4. Agent B compte indépendamment (aveugle)
  5. Système compare :
     ┌─ A == B ──► ✅ Conforme (qty = A)
     └─ A ≠ B  ──► Bascule en Arbitrage (Agent C)
  6. Agent C recompte ──► si == A ou == B ──► ✅ Conforme
                       ──► sinon ──► 🔄 Recompte A&B (round++)
```

### 5.1 Génération automatique de plan préventif depuis une PDR

▶️ Étapes :
1. Fiche PDR → onglet **Durée de vie** → **« Générer plan préventif »**.
2. Système crée plan pré-rempli : machine = dernière instance active · fréquence = `duree_vie_min` · PDR = courante (qty 1).
3. Utilisateur complète et **valide**.

### 5.2 Création de ticket depuis la production
Bouton **« Déclarer panne »** dans `ShiftScreen` → dialog → crée ticket lié à la machine + arrêt production lié (optionnel).

### 5.3 Lien ticket ↔ arrêt production
Un arrêt « Panne » peut être lié à un ticket existant → mesure l'**impact production** d'un ticket maintenance.

### 5.4 Image principale auto-affectée
Si une entité n'a aucune image et qu'une image est uploadée, elle devient automatiquement **principale**.

### 5.5 Cascade ligne → préventif
Trois entrées (MachineDetail · LineSynoptic · LinesList) → toutes redirigent vers `/preventif?line=<id>` avec **filtre Machine restreint** aux machines de la ligne.

### 5.6 Permissions documents (héritage par type d'entité)
Configurées par **rôle × type d'entité** — toute entité de ce type hérite des règles définies.

---

## 6. Administration & paramètres

**Route** : `/parametres`

> ⚙️ **À quoi ça sert** : tout ce qui se configure une fois pour faire vivre l'application.

L'administration est organisée en **4 pôles + Qualité** :

```text
   ┌──────────────────────────────────────────────────────┐
   │             ⚙️  PARAMÈTRES                            │
   ├──────────────┬──────────────┬───────────┬────────────┤
   │ 🔐 Sécurité  │ 📚 Référent. │ 🏭 Prod.  │ 🌐 Config. │
   │   & Accès    │ Classific.   │ & Organis.│ générale   │
   ├──────────────┴──────────────┴───────────┴────────────┤
   │              🧪 Paramétrage Qualité                  │
   └──────────────────────────────────────────────────────┘
```

### 6.1 Sécurité & Accès

| Page | Description | ⚠️ Cas particuliers |
|------|-------------|---------------------|
| 👥 **Utilisateurs** (`/parametres/users`) | Liste, recherche, ajout/retrait rôles, photo, actif/inactif | Création via signup ; impossible de se retirer admin si dernier admin |
| 🔐 **Matrice des rôles** (`/parametres/roles`) | Toggle CRUD (Voir/Créer/Modifier/Supprimer) par rôle × module | Logique OR pour utilisateur multi-rôles |
| 📄 **Permissions documents** (`/parametres/document-permissions`) | Droits par rôle × type d'entité | — |
| 🔩 **Permissions stock PDR** (`/parametres/pdr-stock-permissions`) | Droits opérations stock | Voir §9.5 |

### 6.2 Référentiels & Classification

| Page | Description | ⚠️ Cas |
|------|-------------|--------|
| **Familles machines** (`/parametres/familles`) | Arborescence hiérarchique | Suppression bloquée si enfants ou machines liées |
| **Familles produits** (`/parametres/product-families`) | Idem | Idem |
| **Familles PDR** (`/parametres/pdr-families`) | Avec **héritage** : approvisionnement, statut, fournisseurs | Modifier la famille met à jour les PDR héritées |
| **Types de pannes** (`/parametres/pannes`) | Référentiel libre | — |
| **Catégories documents** (`/parametres/document-categories`) | Classer les documents | — |

### 6.3 Production & Organisation

| Page | Description | Cas |
|------|-------------|-----|
| **Lignes** (`/parametres/lignes`) | Configuration des lignes | Suppression bloquée si machines / OF liés |
| **Shifts** (`/parametres/shifts`) | Plages horaires, équipes, modes, créneaux, **tolérance saisie** | **Édition inline** des heures début/fin |

### 6.4 Configuration générale

| Page | Description |
|------|-------------|
| **Paramètres généraux** (`/parametres/general`) | Clé/valeur — ex. `tolerance_saisie_heures` |
| **Media / Images** (`/parametres/images`) | Taille maximale d'image (Mo) |
| **Notifications** (`/parametres/notifications`) | Règles par module (sévérité, canaux, destinataires) |
| **SMTP & Emails** (`/parametres/smtp`) | Configuration serveur SMTP self-hosted, test d'envoi |
| **Contrôle d'accès** (`/parametres/access-control`) | Rôles, perms Qualité, audit, kill-switches, export JSON/SQL |
| **Historique des scans** (`/parametres/scan-history`) | Audit des scans QR/barres (réussis/échoués) |

### 6.5 Paramétrage Qualité

**Hub** : `/parametres/qualite`

| Page | Route | Description |
|------|-------|-------------|
| Hub Qualité | `/parametres/qualite` | Tuiles d'accès |
| Unités de mesure | `/parametres/qualite/units` | Contrôles/indicateurs |
| Points de contrôle | `/parametres/qualite/control-points` | Postes/étapes, **scope** (`global` / `line` / `of` / `mixed`) |
| Catégories NC | `/parametres/qualite/nc-categories` | Catégorisation NC |
| Types de défauts | `/parametres/qualite/defect-types` | Défauts |
| Motifs de décision | `/parametres/qualite/decision-reasons` | Justifications |
| Catégories actions | `/parametres/qualite/action-categories` | Actions correctives |

✅ **CRUD complet** : ajout / édition / suppression, activation/désactivation inline, réordonnancement, recherche.

**Points de contrôle — architecture Master/Detail** :
- Liste maîtresse avec compteurs (lignes, OF) et badges statut.
- Panneau détail : métadonnées + gestion associations.
- **Multi-lignes** via dropdown filtré ; **Multi-OF** avec recherche asynchrone + toggle OF clôturés.
- Tables : `quality_control_point_lines`, `quality_control_point_ofs`.
- 🔐 Mutation réservée à `admin`, `responsable_si` ou `manage_assignments`.

---

### 6.6 Rotations & Systèmes de Shift

**Route** : `/parametres/rotations`

> ⏰ **À quoi ça sert** : définir les systèmes de travail par employé, programmer automatiquement l'ouverture de session, et ne plus ouvrir manuellement les shifts.

Ce module remplace l'ancien `maintenance_shift_schedules` par un moteur de rotation **par employé**, couvrant les 3 domaines : maintenance, production, qualité.

#### 🏗️ Architecture

```text
   ┌──────────────────────┐
   │  work_shift_systems  │  ← 5 systèmes de base (3×8, 2×8, 1×8, 2×12, Surface)
   │  + leurs créneaux    │
   └──────────┬───────────┘
              │
   ┌──────────▼───────────┐
   │ employee_shift_assign│  ← par employé : système, motif, date d'ancrage,
   │ ments               │    équipe, lignes, scope (maint/prod/qual)
   └──────────┬───────────┘
              │
   ┌──────────▼───────────┐     ┌──────────────────┐
   │  compute_expected_   │────►│ open_my_work_    │
   │  shift() — SQL        │     │ session() — RPC   │
   │  (Africa/Algiers)     │     │ auto au login    │
   └──────────────────────┘     └──────────────────┘
```

#### 📋 Les 5 systèmes de base

| Code | Nom | Créneaux | Type |
|------|-----|----------|------|
| **3×8** | 3×8h | Matin (06h00–14h00) · Midi (14h00–22h00) · Nuit (22h00–06h00) | `rotation` |
| **2×8** | 2×8h | Matin (06h00–14h00) · Midi (14h00–22h00) | `rotation` |
| **1×8** | 1×8h | Matin (06h00–14h00) | `rotation` |
| **2×12** | 2×12h | Jour (06h00–18h00) · Nuit (18h00–06h00) | `rotation` |
| **Surface** | Journée normale | Jour (08h00–16h30) | `fixed_weekly` (5/7 Lun–Ven) |

#### 🔄 Motif de cycle (rotation)

Le manager construit un **motif cyclique** (ex: `Matin, Matin, Repos, Nuit, Nuit, Repos`).

La fonction `compute_expected_shift()` calcule :
1. **Indice du motif** : `(date_cible − date_ancrage) mod longueur(motif)`
2. **Token attendu** : matin / midi / nuit / jour / repos
3. **Vérification temps réel** : `heure_debut ≤ now() < heure_fin`
4. **Shift traversant minuit** (nuit 2×8, nuit 2×12) : fenêtre prolongée jusqu'à `heure_fin` du lendemain

> 📌 **Exemple** : Yacine a motif `Matin, Repos, Nuit, Repos` et ancrage `01/06/2026`.
> - 01/06 → Matin (06h00–14h00)
> - 02/06 → Repos
> - 03/06 → Nuit (22h00–06h00+1)
> - 04/06 → Repos
> - 05/06 → Matin (cycle recommence)

#### ⚙️ Système Surface (5/7 fixe)

Pas de motif à configurer. Logique calendaire automatique :
- **Lun–Ven** → token `jour` (08h00–16h30)
- **Sam–Dim** → repos (pas de shift)

#### 🔓 Autorisation Libre

Interrupteur par employé dans la grille. Quand actif :
- À la connexion, `open_my_work_session()` s'exécute automatiquement.
- Si `now()` tombe dans le créneau calculé → session ouverte avec marqueur `[Ouverture auto rotation]`.
- Si hors créneau → pas d'ouverture (message informatif).

#### 🛡️ Permissions

Accessible aux rôles : `admin`, `resp_maintenance`, `resp_production`, `responsable_controle_qualite`.

| Champ | Description |
|-------|-------------|
| **Employé** | Sélection du profil |
| **Système** | Un des 5 systèmes actifs |
| **Scope** | Maintenance / Production / Qualité |
| **Équipe** | Équipe shift (`A/B/C/D`) ou aucune |
| **Lignes couvertes** | Multi-sélection (pour maintenance/qualité) |
| **Motif** | Jetons cliquables : Matin, Midi, Nuit, Jour, Repos |
| **Date d'ancrage** | Date de référence du cycle (JJ/MM/AAAA) |
| **Autorisation Libre** | Active l'ouverture auto au login |
| **Affectation active** | On/off sans suppression |

> 💡 **Aperçu prochain shift** : bandeau en temps réel dans le dialog (`Prochain shift : 14/06/2026 → Matin`).

#### ⚠️ Règles & anti-duplication

- `open_my_work_session()` vérifie qu'**aucune session ouverte** n'existe déjà pour cet utilisateur avant d'insérer.
- Si session déjà ouverte → retourne son `id` sans nouvelle insertion.
- Audit log automatique sur chaque ouverture et chaque modification de configuration.

#### 🔗 Intégration avec les shifts existants

| Domaine | Table ouverte | Conditions |
|---------|---------------|------------|
| Maintenance | `maintenance_shifts` | `scope_kind = 'maintenance'` |
| Production | `shifts` (via `of_shift_assignments`) | `scope_kind = 'production'` |
| Qualité | `quality_shifts` | `scope_kind = 'quality'` |

> 🎯 **Cas d'usage** : Karim (maintenancier) a système 3×8, motif `Matin, Matin, Repos, Midi, Midi, Repos, Nuit, Nuit, Repos`. Il se connecte le 14/06/2026 à 07h30. `compute_expected_shift` retourne « Matin 06h00–14h00 » et `is_now=true`. Sa session `maintenance_shifts` s'ouvre automatiquement avec ses tickets curatifs et préventifs du jour.

---

## 6 bis. Notifications & Emails

> 🔔 **À quoi ça sert** : alerter la bonne personne au bon moment — in-app et/ou par email.

Système complet de notifications in-app + emails via SMTP **self-hosted** (aucune dépendance Resend/SendGrid).

### 6 bis.1 Architecture

```text
   Évènement métier
   (ticket créé,
    OF en retard…)
        │
        ▼
   triggerNotification()
        │
        ├──► 🔔 notifications (table)  ──► Bell + /notifications
        │
        └──► ✉️ si canal email :
              send-notification-email
                    │
                    ├─ dédup 24h (notification_email_log)
                    └─ SMTP (denomailer)
```

| Composant | Rôle |
|-----------|------|
| `notifications` | Table in-app + cloche `NotificationBell` |
| `notification_rules` | Règles configurables par évènement |
| `send-notification-email` | Edge function SMTP |
| `notification_email_log` | Déduplication 24 h |
| `check-deadlines` | Cron quotidien 06:00 UTC (échéances) |

### 6 bis.2 Configuration SMTP (`/parametres/smtp`)

🔐 Réservé à l'**Admin**. Tout dans `app_settings` (clé/valeur).

| Champ | Clé | Exemple |
|-------|-----|---------|
| Hôte SMTP | `smtp_host` | `mail.exemple.com` |
| Port | `smtp_port` | `587` (STARTTLS) ou `465` (SSL) |
| Sécurité | `smtp_secure` | `tls` / `ssl` / `none` |
| Utilisateur | `smtp_user` | `notifications@exemple.com` |
| Mot de passe | `smtp_password` | masqué `••••••••` après save |
| Email expéditeur | `smtp_from_email` | `no-reply@exemple.com` |
| Nom expéditeur | `smtp_from_name` | `PROD IN TIME` |
| Email support | `support_email` | pied d'email |
| Activer emails | `notif_email_enabled` | `true` / `false` |
| Délai rappel défaut (j) | `notif_rappel_jours_defaut` | `1` à `30` |

🧪 **Bouton "Envoyer un email de test"** : appelle `send-test-email` et affiche succès/erreur avec message SMTP exact.

### 6 bis.3 Règles de notification (`/parametres/notifications`)

Pour chaque règle :
- 🏷️ **Évènement** (ex. `ticket.created`, `of.late`, `pdr.below_min`)
- 🚦 **Sévérité** : `info` · `low` · `medium` · `high` · `critical`
- 📢 **Canaux** : `in_app` 🔔 et/ou `email` ✉️
- 👥 **Destinataires** : rôle (fan-out) ou utilisateur précis
- 🔘 **Activée** : on/off

### 6 bis.4 Workflow d'envoi

1. Évènement → `triggerNotification(...)` (`src/lib/notifications.ts`).
2. Règle lue ; ligne insérée dans `notifications`.
3. Si `email` dans canaux, `send-notification-email` invoquée.
4. Résolution destinataires → dédup 24 h → SMTP → log `notification_email_log` (`queued` → `sent` / `failed` / `skipped`).

### 6 bis.5 Cas d'erreur SMTP fréquents

| Symptôme | Cause | 💡 Action |
|----------|-------|-----------|
| `connection refused` | Hôte/port faux ou bloqué | Vérifier hôte, port, pare-feu |
| `authentication failed` | Login/mot de passe invalide | Re-saisir mdp (champ vide = inchangé) |
| `self signed certificate` | Certificat non fiable | Passer en `tls` ou `none` |
| Email non reçu | Filtré spam / SPF manquant | Configurer SPF/DKIM côté domaine |
| Emails globalement désactivés | `notif_email_enabled=false` | Activer dans `/parametres/smtp` |

---

## 7. Documents

> 📄 **À quoi ça sert** : attacher PDF/images (notices, schémas, certificats…) à n'importe quelle entité.

### 🗄️ Buckets

| Bucket | Usage | Public |
|--------|-------|--------|
| `entity-documents` | Documents génériques (PDR, équipements, produits, articles…) | Oui |
| `machine-documents` | Documents historiques machines | Oui |
| `entity-images` | Images d'entités | Oui |

### ▶️ Workflow upload
1. Onglet **Documents** d'une entité → **« Ajouter »**.
2. Sélection fichier (PDF, Word, Excel, image…).
3. Choix **catégorie** (référentiel `document_categories`).
4. Description (optionnel).
5. ✅ Upload → enregistré dans `entity_documents` avec audit.

### 🔐 Permissions par rôle
`view` · `upload` · `download` · `edit_metadata` · `delete` — granulaires par **type d'entité**.

### 👁️ Affichage
- Aperçu intégré pour PDF et images.
- ⬇️ Téléchargement direct.
- 📜 Historique des modifications.

---

## 8. Images

> 🖼️ **À quoi ça sert** : galerie multi-images par entité, image principale dans les listes/synoptiques.

### ✨ Fonctionnalités
- 🖼️ Galerie multi-images par entité.
- ⭐ **Image principale** affichée dans listes, vues détail, Shift et synoptique.
- 🖐️ **Drag** pour réordonner.
- 🔍 **Lightbox** plein écran (zoom).
- ⚙️ Taille maximale configurable dans `/parametres/images`.

### ⚠️ Cas particuliers
- Suppression de la principale → la suivante (`sort_order`) devient principale automatiquement.
- Formats : JPG, PNG, WebP.

---

## 9. Rôles & permissions

### 9.1 Rôles disponibles

| Rôle (code) | Icône | Périmètre |
|-------------|-------|-----------|
| `admin` | 🔐 | Accès total |
| `resp_maintenance` | 🛠️ | Maintenance + analytics |
| `maintenancier` | 🧑‍🔧 | Exécution interventions et préventifs |
| `resp_production` | 🏭 | Production complète |
| `chef_ligne` | 👨‍💼 | Supervision d'une ligne |
| `operateur` | 👷 | Saisies Shift Production |
| `gestionnaire_magasin` | 🛒 | Stocks PDR/articles, fournisseurs |
| `bureau_methode` | 📐 | Recettes, plans préventifs, ingénierie |
| `responsable_qualite` | 🧪 | Module Qualité complet |
| `controleur_qualite` | 🔬 | Saisies qualité |
| `responsable_inventaire` | 📊 | Campagnes d'inventaire |
| `agent_inventaire` | 🔢 | Comptage |

### 9.2 Matrice — modules couverts

Chaque rôle a 4 actions par module : **Voir** · **Créer** · **Modifier** · **Supprimer**.

```text
              │ Voir │ Créer │ Modif │ Suppr │
   ───────────┼──────┼───────┼───────┼───────┤
   Machines   │  ✅  │  ✅   │  ✅   │  ✅   │  ← admin
   Tickets    │  ✅  │  ✅   │  ✅   │  ❌   │  ← maintenancier
   Préventif  │  ✅  │  ❌   │  ❌   │  ❌   │  ← operateur
```

### 9.3 Logique multi-rôles

Un utilisateur peut cumuler **plusieurs rôles**. Permissions fusionnées en **OR** (le plus permissif s'applique).

> 📌 **Exemple** : Yacine a `maintenancier` + `chef_ligne` → il voit le Shift Maintenance ET la console responsable de sa ligne.

### 9.4 Fonctions de vérification (backend)

```sql
has_role(_user_id uuid, _role app_role) returns boolean
check_permission(_user_id, _module, _action) returns boolean
check_document_permission(_user_id, _entity_type, _action) returns boolean
```

Toutes en `SECURITY DEFINER` pour éviter la récursion RLS.

### 9.5 Permissions stock PDR (spéciales)

| Action | Description |
|--------|-------------|
| `pdr_stock.create_entry` | 📥 Créer une entrée |
| `pdr_stock.create_exit` | 📤 Créer une sortie |
| `pdr_stock.correction` | ✏️ Correction de stock |
| `pdr_stock.inventory` | 📊 Effectuer un inventaire |
| `pdr_stock.cancel_movement` | ❌ Annuler un mouvement |
| `pdr_stock.suppliers.*` | 🛒 Gestion fournisseurs (view/create/edit/delete) |

---

## 10. Export / Import CSV

### 10.1 📤 Export CSV

Disponible sur toutes les listes principales (GMAO, GPAO, Inventaire, Paramètres).

**Comportement** :
- ✅ **Filtres actifs appliqués** à l'export.
- 🔤 Encodage UTF-8 avec BOM (compatible Excel FR), séparateur `;`.
- 📁 Fichier nommé `<entité>_<date>.csv`.
- 🚫 Bouton désactivé si aucune ligne.
- 🟢 Toast `N ligne(s) exportée(s)`.

### 10.2 📥 Import CSV

Disponible pour : OF, Articles (et autres entités via `CsvImporter`).

▶️ Workflow :
1. ⬇️ Téléchargement du modèle (template).
2. 🔗 Mapping colonnes fichier → champs cibles.
3. ✅ **Validation ligne par ligne** : obligatoires, unicité, références.
4. 📋 **Rapport d'erreurs** avec motif par ligne.
5. ⚙️ Import partiel : valides importées, autres rejetées.

---

## 11. Cas d'erreur & dépannage

### 🚨 Tableau récapitulatif

| Situation | Message | 💡 Cause | ✅ Solution |
|-----------|---------|----------|-------------|
| Suppression machine | *« Suppression impossible — utilisée dans … »* | FK | Réassigner / mettre `hors_service` |
| Suppression produit | *« … utilisé dans : … »* | Recette/OF/déclar. | Garder le produit |
| Suppression article | *« … utilisé dans : … »* | Recette/conso | Idem |
| Sortie PDR | *« Stock insuffisant — Stock actuel : X »* | qty > stock | Entrée d'abord |
| Entrée PDR sans réf ERP | *« Réf document ERP obligatoire »* | Vide | Saisir réf |
| Quantité PDR ≤ 0 | *« Quantité invalide »* | Saisie | Saisir > 0 |
| PDR stratégique sans machine | *« PDR stratégique : au moins une machine … »* | Onglet vide | Lier ≥ 1 machine |
| Durée vie PDR | *« min ≤ max »* | Incohérent | Corriger |
| Stock PDR | *« min ≤ max »* | Incohérent | Corriger |
| Préventif création | *« Titre et machine obligatoires »* | Vide | Renseigner |
| Exécution préventif | *« Durée obligatoire »* | Vide | Saisir minutes |
| Résolution ticket | *« Cause racine et solution obligatoires »* | Vide | Renseigner |
| Saisie shift hors fenêtre | Bouton désactivé + tooltip | Hors tolérance | Saisir dans la fenêtre |
| Login | *« Invalid login credentials »* | Identifiants | Vérifier |
| Login | *« Email not confirmed »* | Email | Cliquer lien |
| Reset password vide | *« Saisissez votre adresse email… »* | Vide | Saisir email |
| Action refusée | *« Vous n'avez pas la permission »* | Rôle insuffisant | Contacter admin |

### ❓ FAQ dépannage rapide

| Question | Réponse |
|----------|---------|
| **« Je ne vois pas mon shift »** | Vérifier équipe assignée + date_shift + rôles actifs ; ouvrir `SelfOpenShiftDialog` si autorisé |
| **« Mon scan ne fonctionne pas »** | Vérifier permissions caméra navigateur ; fallback saisie manuelle toujours disponible |
| **« Erreur RLS / permission »** | Vérifier rôles avec un admin ; un seul rôle insuffisant = blocage |
| **« Mes données ont disparu »** | Vérifier filtres actifs et cliquer ⟲ Réinitialiser |
| **« Stock incohérent »** | Faire un mouvement **Inventaire** plutôt qu'entrées/sorties répétées |
| **« Plan préventif jamais déclenché »** | Statut **`Validé`** (pas brouillon) + au moins un maintenancier assigné |
| **« Bouton clôture shift grisé »** | Toutes saisies horaires + consommations doivent être complètes |
| **« Email pas reçu »** | Vérifier `notif_email_enabled=true`, règle de notif active, SPAM, SPF/DKIM |

### 🧰 Conseils généraux
- 🔁 **Toast persistant** : vérifier d'abord les **rôles** avec un admin.
- 🔍 **Données manquantes** : vérifier les **filtres actifs**, utiliser ⟲ Réinitialiser.
- 📊 **Stock incohérent** : préférer un mouvement **Inventaire**.
- 🛡️ **Préventif jamais déclenché** : statut **`Validé`** + maintenancier assigné.

---

## 12. Annexes

### 12.1 🗺️ Liste exhaustive des routes

#### 🔐 Authentification
- `/auth` — connexion / inscription
- `/reset-password` — réinitialisation

#### 🔧 GMAO
- `/` — Dashboard
- `/machines`, `/machines/new`, `/machines/:id`, `/machines/:id/edit`
- `/equipements`, `/equipements/new`, `/equipements/:id`, `/equipements/:id/edit`
- `/lignes`, `/lignes/:id`, `/lignes/:id/config`
- `/pdr`, `/pdr/new`, `/pdr/:id`, `/pdr/:id/edit`
- `/tickets`, `/tickets/:id`
- `/preventif`, `/preventif/new`, `/preventif/:id`, `/preventif/:id/edit`
- `/maintenance/shift`, `/maintenance/journal`
- `/analytics`

#### 📦 GPAO
- `/gpao` — Dashboard production
- `/gpao/of`, `/gpao/of/new`, `/gpao/of/:id`
- `/gpao/produits`, `/gpao/produits/:id`
- `/gpao/articles`, `/gpao/articles/:id`
- `/gpao/recettes`
- `/gpao/shift`
- `/gpao/consommations`
- `/gpao/arrets`

#### 🧪 Qualité
- `/qualite`, `/qualite/controles`, `/qualite/non-conformites`, `/qualite/actions`
- `/qualite/indicateurs`, `/qualite/of`, `/qualite/tracabilite`
- `/qualite/recettes-nomenclatures`, `/qualite/rapports`
- `/qualite/shift`

#### 📊 Inventaire
- `/inventaire`, `/inventaire/campagnes`, `/inventaire/campagnes/nouvelle`
- `/inventaire/campagnes/:id`, `/inventaire/campagnes/:id/compter`

#### ⚙️ Administration
- `/parametres` — hub
- `/parametres/users`, `/parametres/roles`, `/parametres/access-control`
- `/parametres/document-permissions`, `/parametres/pdr-stock-permissions`
- `/parametres/familles`, `/parametres/product-families`, `/parametres/pdr-families`
- `/parametres/pannes`, `/parametres/document-categories`
  - `/parametres/lignes`, `/parametres/shifts`
  - `/parametres/rotations`
  - `/parametres/general`, `/parametres/images`, `/parametres/scan-history`
  - `/parametres/notifications`, `/parametres/smtp`
  - `/parametres/qualite` + sous-pages
  - `/notifications` (boîte de réception)

### 12.2 🗃️ Tables principales (BDD)

| Table | Usage |
|-------|-------|
| `profiles` | Profils utilisateurs |
| `user_roles` | Affectation rôles |
| `role_permissions` | Matrice CRUD par rôle |
| `document_permissions` | Permissions documents par type |
| `pdr_stock_permissions` | Permissions stock PDR |
| `machines`, `equipements`, `production_lines` | Parc industriel |
| `machine_line_assignments` | Affectation machine ↔ ligne |
| `pdr`, `pdr_movements`, `pdr_suppliers`, `pdr_instances`, `pdr_machines` | PDR |
| `pdr_families` | Familles PDR (héritage) |
| `tickets`, `interventions`, `ticket_collaborators` | Maintenance curative |
| `plans_preventifs`, `preventif_executions` | Maintenance préventive |
| `ordres_fabrication`, `of_mode_history` | OF |
| `produits`, `articles`, `recipes`, `recipe_lines` | Référentiels production (recettes unifiées) |
| `declarations_production`, `consommations`, `arrets_production` | Déclarations |
| `shift_modes`, `shift_time_slots`, `shift_teams`, `shift_settings`, `shifts`, `quality_shifts`, `of_shift_assignments` | Shifts |
| `work_shift_systems`, `work_shift_system_slots`, `employee_shift_assignments` | Rotations & systèmes de shift par employé |
| `entity_documents`, `entity_images`, `document_categories` | GED + images |
| `notifications`, `notification_rules`, `notification_email_log` | Notifications/emails |
| `app_settings` | SMTP, flags globaux, secrets cron |
| `quality_units`, `quality_control_points`, `quality_nc_categories`, `quality_defect_types`, `quality_decision_reasons`, `quality_action_categories` | Référentiels Qualité |
| `quality_control_point_lines`, `quality_control_point_ofs` | Liaisons CCP |
| `quality_checks`, `quality_non_conformities`, `quality_actions`, `quality_indicators`, `quality_indicator_assignments` | Données qualité |
| `inventory_campaigns`, `inventory_assignments`, `inventory_assignment_scopes`, `inventory_targets`, `inventory_counts`, `inventory_results` | Inventaire double comptage |
| `scan_history` | Historique scans QR/barres |
| `audit_logs` | Journal d'audit complet |

### 12.3 ⚡ Triggers PostgreSQL clés

| Trigger | Effet |
|---------|-------|
| `handle_new_user` | Crée fiche `profiles` à l'inscription |
| `generate_ticket_numero` | Génère `TKT-00001`, `TKT-00002`… |
| `generate_of_numero` | Génère `OF-00001`, `OF-00002`… |
| `update_updated_at_column` | Met à jour `updated_at` |
| `audit_critical_event` | Crée auto notification in-app sur évènement critique |
| `notify_email_dispatch` | Sur insert dans `notifications`, invoque `send-notification-email` via `pg_net` |
| `shifts_fill_defaults` | Calcule `heure_fin` (start + 8h) et `date_shift` si non fournis |
| `tg_lock_inventory_counts` | Empêche `UPDATE`/`DELETE` sur un comptage validé |

### 12.4 ⚙️ Edge functions

| Function | Rôle |
|----------|------|
| `send-notification-email` | Envoi SMTP, déduplication, journalisation |
| `send-test-email` | Test SMTP depuis l'UI Admin |
| `check-deadlines` | Cron quotidien 06:00 UTC — échéances tickets/préventifs/OF |
| `auto-close-stale-shifts` | Cron 30 min — clôture sessions abandonnées |
| `admin-create-user` | Création utilisateur côté admin |
| `send-email` | Email transactionnel générique |

### 12.5 🆕 Changelog du manuel

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 05/04/2026 | Version initiale (descriptif) |
| 2.0 | 26/04/2026 | Réécriture exhaustive |
| 2.1 | 28/04/2026 | Notifications & Emails SMTP self-hosted |
| 2.2 | 30/04/2026 | Module Qualité, fusion Recettes ↔ BOM |
| 2.3 | 02/05/2026 | Shift Qualité, Vue Maintenancier, Scanner global, Inventaire double comptage |
| 2.4 | 07/05/2026 | « Voir comme », garde lecture seule, matrice stricte, export CSV universel |
| 2.5 | 18/05/2026 | Audit GMAO approfondi (tickets shift, KPI, PDR opt-in) |
| **3.0** | **26/05/2026** | Édition **Nouvel utilisateur** : icônes, schémas ASCII, parcours pas-à-pas, scénarios complets, FAQ |

---

## 13. Modifications récentes (v2.3)

> Évolutions ajoutées entre le 30/04/2026 et le 02/05/2026.

### 13.1 Shift Qualité (contrôleur)
- Nouveau **shift contrôleur qualité** (`/qualite/shift`) calqué sur le shift production.
- Administration : `/parametres/qualite/shift-plan`.
- Tous les contrôles et NC saisis pendant un shift sont **auto-liés** à `shift_id`, `team_id`, `quality_shift_id`.
- 🔔 Notifications auto d'ouverture/clôture via `audit_critical_event`.

### 13.2 Vue Maintenancier (shift maintenance enrichi)
- `MaintenancierShiftView.tsx` : dashboard temps réel.
- Onglets **Curatif** / **Préventif** + animations *pulse* + indicateurs overdue.
- Hook `useMaintenanceShiftWorkload` agrège la charge en cours.
- Tickets depuis shift production : conservent liens **OF / shift / équipe** et calculent **downtime** auto.

### 13.3 Scanner QR / Code-barres généralisé
- Composant **`ScanButton`** (caméra ZXing) + RPC `resolve_scanned_code` (URL, UUID, code exact, préfixe).
- **`ListScanButton`** : navigation directe après résolution.
- Boutons « Scanner » dans : PDR, Organes, Machines, Tickets.
- Règle : résolution automatique **uniquement sur correspondance forte** (UUID/exact). Faibles → liste, jamais bloquante.

### 13.4 Génération auto des sessions shift depuis OF
- Table `of_shift_assignments` + RPC `ensure_production_shift_session`.
- Ouverture OF → sessions shift créées automatiquement (selon mode 3×8, 2×8…).
- Clôture OF → sessions associées **clôturées en cascade**.
- Déclaration "Heure -1" : saisie pendant l'heure courante uniquement.

### 13.5 Isolation des applications Shift (mode kiosque)
- 3 apps shift (Production, Maintenance, Qualité) en **mode kiosque** piloté par responsables.
- 📊 KPIs en direct par session, 🖨️ bilan HTML imprimable en fin de shift.
- 🔔 Notifications auto ouverture/clôture.

### 13.6 Module Inventaire (NOUVEAU)

#### 13.6.1 Principe — double comptage avec arbitrage

| Étape | Acteur | Action |
|-------|--------|--------|
| 1 | Resp. inventaire | Crée campagne, définit périmètre (familles), affecte agents A/B + scopes |
| 2 | Agent A | Compte chaque article (saisie verrouillée à validation) |
| 3 | Agent B | Compte indépendamment (aveugle) |
| 4 | Système | A == B → **Conforme** (qty = A) |
| 5 | Système | A ≠ B → **Arbitrage** Agent C |
| 6 | Agent C | Recompte ; si C == A ou C == B → **Conforme** (qty = C) |
| 7 | Système | C ≠ A et C ≠ B → **Recompte A&B** (round++) |

#### 13.6.2 Routes

| Route | Rôle | Description |
|-------|------|-------------|
| `/inventaire` | resp/agent_inventaire/admin | Dashboard campagnes |
| `/inventaire/campagnes` | idem | Liste |
| `/inventaire/campagnes/nouvelle` | resp_inventaire | Création + matrice A/B |
| `/inventaire/campagnes/:id` | idem | Détail, écarts, arbitrage |
| `/inventaire/campagnes/:id/compter` | agent_inventaire | Écran comptage mobile |

#### 13.6.3 Tables
`inventory_campaigns` (auto `INV-YYYYMM-####`) · `inventory_assignments` · `inventory_assignment_scopes` · `inventory_targets` · `inventory_counts` (immuables) · `inventory_results`.

#### 13.6.4 Sécurité
- 🔒 **RLS** : agents restreints à leur scope via `inv_assignment_authorized_families`.
- 🔒 **RPC `inv_register_count`** : seul point d'écriture.
- 🔒 **Immuabilité** : trigger empêche `UPDATE`/`DELETE` sur comptage validé.

#### 13.6.5 Rôles dédiés et isolation
- Nouveaux rôles `responsable_inventaire` et `agent_inventaire`.
- Utilisateur "inventaire-only" → bascule auto sur **`InventoryLayout`** (kiosque, top-bar minimal).
- Routes autorisées : `/inventaire/*`, `/pdr/*` (RO), `/organes/*` (RO). Tout autre → `/inventaire`.

#### 13.6.6 Scanner intégré au comptage
- 📷 Bouton **Scanner** : résout `pdr` et `organe` uniquement.
- Article hors campagne / hors scope → toast d'erreur, jamais bloquant.
- Dans le scope → sélection auto pour saisie qty.

---

## 14. Modifications récentes (v2.4)

> Évolutions livrées entre le 03/05/2026 et le 07/05/2026.

### 14.1 « Voir comme » — Impersonation contrôlée (admin)
- `ImpersonationDialog` accessible depuis admin utilisateurs.
- `ImpersonationBanner` persistant : utilisateur ciblé, rôles effectifs, nombre de modules visibles, bouton « Quitter le mode aperçu ».
- État conservé dans `sessionStorage` (`impersonation_target_user_id`).
- `ImpersonationContext` + `AuthContext` exposent `roles`, `profile`, `hasRole` **effectifs** sans modifier la session Supabase réelle.

### 14.2 Garde lecture seule en mode aperçu
- `src/lib/impersonationGuard.ts` patch le client Supabase :
  - `from().insert / update / delete / upsert` → erreur + toast « Mode aperçu : action non enregistrée ».
  - `supabase.functions.invoke(...)` → bloqué.
  - `supabase.rpc(...)` → bloqué.
- Lectures intactes — prévisualisation reflète exactement la vue cible.
- Tests : `impersonation-guard.test.ts`, `impersonation-permissions.test.ts`.

### 14.3 Matrice de permissions stricte (admin inclus)
- Suppression des bypass `isAdmin` dans navigation et launchers.
- **Roles Matrix** = source unique de vérité **y compris pour admin**.
- `usePermissions` : reset immédiat, flag `cancelled`, **héritage parapluie** (`qualite`, `inventaire`).

### 14.4 Export CSV universel sur tous les tableaux
- **`<ExportCsvButton />`** au-dessus de `exportToCsv` (séparateur `;`, BOM UTF-8, suffixe `_YYYY-MM-DD.csv`).
- Exporte **les données filtrées affichées** ; toast `N ligne(s)`.
- Colonnes typées avec `format(value, row)`.
- Tests : `export-csv-button.test.tsx`, `gpao/export-csv.test.ts`.

### 14.5 Hub Contrôle d'accès consolidé
- `/parametres/access-control` regroupe : rôles standard + custom, perms Qualité, `audit_role_settings`, kill-switches, onglet **Portabilité**.
- Export **JSON complet** (`exportAccessControl`) + **migration SQL** (`generateMigrationSql`) pour rejouer sur Supabase auto-hébergé.

---

## 15. Modifications récentes (v2.5) — Audit GMAO approfondi

> Évolutions livrées entre le 08/05/2026 et le 18/05/2026. Cette version cible la **fiabilité du module GMAO** et ses liens avec GPAO, PDR et Notifications.

### 15.1 Création de tickets depuis le shift production
- **Bug corrigé** (`ProductionShiftTicket.tsx`) : insert utilisait `declared_by`/`line_id` au lieu de `declarant_id`/`ligne_id`. Tickets shift étaient silencieusement rejetés. Désormais alignés.
- Audit log automatique avec `shift_id`, `machine_id`, priorité.

### 15.2 KPI Shift Maintenance fiables
- **Statuts corrigés** (`useShiftSessionStats.ts`) : `statut='ferme'` inexistant. Remplacé par `IN ('resolu', 'cloture')`. MTTR/downtime ne renvoient plus 0.
- **Filtrage interventions parasites** : `transferee`, `liberee`, collaborations exclues du compteur.
- **Downtime complet** : `tickets.temps_arret_minutes` + `production_stops` agrégés, dédupliqués.

### 15.3 Préventif — consommation PDR sécurisée
- **PDR opt-in** (`PreventifDetail.tsx`) : toutes les PDR **OFF par défaut**. L'opérateur coche celles réellement consommées. Évite la déplétion massive.
- **Décrément robuste** : `maybeSingle` + gestion erreur par item. Mouvement `pdr_stock_movements` (sortie) tracé.

### 15.4 Workflow ticket → arrêt production synchronisé
- **Fermeture auto des `production_stops`** liés à la résolution. KPI GPAO ne « tournent » plus après résolution.
- **`assignment_status` réinitialisé** à `assigned`.
- **Garde anti-collision** : `handleTakeCharge` ajoute `.is("assignee_id", null)`.

### 15.5 Notifications transverses
- **Déclarant prévenu** automatiquement à `ticket_resolved` et `ticket_closed`.
- Transitions critiques gérées par `audit_critical_event` côté base.

### 15.6 Plans préventifs — assets multi-lignes
- `useMaintenanceShiftWorkload` : plan avec `line_id=null` inclus si la machine est rattachée à au moins une ligne du shift (via `machine_line_assignments`).

### 15.7 UI mobile & limites de requêtes
- `MaintenanceShiftIntervention.tsx` : avertissement si conso PDR requise en mobile rapide → renvoyer desktop.
- `.limit(5000)` ajouté sur `InterventionHistory`, `TicketsList`, `PreventifList`, `InterventionJournal` (contourne plafond 1000).
- `InterventionJournal.tsx` : map machines → lignes en multi-map, machines partagées correctement filtrées.

### 15.8 Lancher « Recherche globale » corrigé
- `Apps.tsx` : tuile pointait sur `/search` (404). Corrigée vers `/recherche`.

---

*Document généré pour **PROD IN TIME — GMAO · GPAO · Qualité · Inventaire** · Manuel v3.0 · 26/05/2026*
