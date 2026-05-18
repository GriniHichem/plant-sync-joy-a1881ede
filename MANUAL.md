# 📘 Manuel Utilisateur — PROD IN TIME (GMAO · GPAO)

> Application industrielle intégrée de **gestion de maintenance** (GMAO), **gestion de production** (GPAO), **qualité** et **inventaire**.
> Version manuel : **2.5** — Mise à jour : 18/05/2026

---

## Table des matières

0. [Glossaire & conventions](#0-glossaire--conventions)
1. [Présentation & architecture](#1-présentation--architecture)
2. [Authentification & sécurité](#2-authentification--sécurité)
3. [Module GMAO — Maintenance](#3-module-gmao--maintenance)
   - 3.1 [Dashboard](#31-dashboard)
   - 3.2 [Machines](#32-machines)
   - 3.3 [Équipements](#33-équipements)
   - 3.4 [Lignes de production](#34-lignes-de-production)
   - 3.5 [Pièces de rechange (PDR)](#35-pièces-de-rechange-pdr)
   - 3.6 [Tickets de maintenance](#36-tickets-de-maintenance)
   - 3.7 [Maintenance préventive](#37-maintenance-préventive)
   - 3.8 [Shift Maintenance](#38-shift-maintenance)
   - 3.9 [Journal des interventions](#39-journal-des-interventions)
   - 3.10 [Analyse & KPI](#310-analyse--kpi)
4. [Module GPAO — Production](#4-module-gpao--production)
   - 4.1 [Dashboard Production](#41-dashboard-production)
   - 4.2 [Ordres de fabrication (OF)](#42-ordres-de-fabrication)
   - 4.3 [Produits](#43-produits)
   - 4.4 [Articles (matières premières)](#44-articles-matières-premières)
   - 4.5 [Recettes](#45-recettes)
   - 4.6 [Shift Production](#46-shift-production)
   - 4.7 [Consommations](#47-consommations)
   - 4.8 [Arrêts](#48-arrêts)
   - 4.9 [Module Qualité](#49-module-qualité)
5. [Workflows transverses](#5-workflows-transverses)
6. [Administration & paramètres](#6-administration--paramètres)
7. [Documents](#7-documents)
8. [Images](#8-images)
9. [Rôles & permissions](#9-rôles--permissions)
10. [Export / Import CSV](#10-export--import-csv)
11. [Cas d'erreur & dépannage](#11-cas-derreur--dépannage)
12. [Annexes](#12-annexes)

---

## 0. Glossaire & conventions

### Acronymes

| Sigle | Signification |
|-------|---------------|
| **GMAO** | Gestion de Maintenance Assistée par Ordinateur |
| **GPAO** | Gestion de Production Assistée par Ordinateur |
| **OF** | Ordre de Fabrication |
| **PDR** | Pièce de Rechange |
| **PMP** | Prix Moyen Pondéré |
| **MTBF** | Mean Time Between Failures (temps moyen entre pannes) |
| **MTTR** | Mean Time To Repair (temps moyen de réparation) |
| **RBAC** | Role-Based Access Control |
| **RLS** | Row Level Security (sécurité au niveau de la ligne BDD) |
| **DA** | Dinar Algérien (devise par défaut) |

### Conventions du manuel

- Un astérisque **\*** signale un champ **obligatoire** au formulaire.
- Les **codes** d'entité (machine, PDR, équipement, produit, article…) sont **uniques** dans la base.
- Les dates sont au format **JJ/MM/AAAA** ; les heures au format **24h** (`HH:mm`).
- Tous les **prix et montants** sont en **DA (Dinar Algérien)**.
- Les actions destructrices (suppression) sont précédées d'une **boîte de confirmation**.
- Les notifications **toast** confirment les actions ou affichent les erreurs.
- Les **badges de statut** utilisent un code couleur cohérent : vert = OK / actif, rouge = critique / panne, orange = attention, gris = inactif.

### Codes couleur des statuts

| Couleur | Signification |
|---------|---------------|
| 🟢 Vert | En service, validé, terminé, OK |
| 🟠 Orange | En maintenance, en cours, attention |
| 🔴 Rouge | En panne, critique, en retard, rupture |
| ⚫ Gris | Hors service, inactif, brouillon |
| 🔵 Bleu | Information, planifié |

---

## 1. Présentation & architecture

**PROD IN TIME** est une application web industrielle qui combine deux modules opérationnels :

- **GMAO** — suivi du parc machines, tickets curatifs, plans préventifs, gestion des pièces de rechange et fournisseurs.
- **GPAO** — ordres de fabrication, recettes, déclarations horaires de production, suivi des arrêts et consommations matières.

### Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| UI | Tailwind CSS v3 + shadcn/ui + design tokens HSL |
| Backend | Lovable Cloud (PostgreSQL, Auth, Storage, Edge Functions) |
| Sécurité | RLS PostgreSQL + RBAC applicatif |
| Temps réel | Mises à jour live sur tickets, stocks et déclarations |

### Modèle de données — entités principales

```
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

### Cycle de vie utilisateur type

1. Inscription → vérification email → connexion
2. Affectation de **rôle(s)** par un administrateur
3. Accès aux modules autorisés (sidebar dynamique selon permissions)
4. Exécution d'actions (créer, consulter, modifier, supprimer) — bornées par la matrice RBAC

---

## 2. Authentification & sécurité

**Routes** : `/auth`, `/reset-password`

### 2.1 Inscription (signup)

Champs requis : **prénom\***, **nom\***, **email\***, **mot de passe\*** (min. 6 caractères).

À la création :
- Un trigger PostgreSQL `handle_new_user` crée automatiquement la fiche `profiles` associée.
- Aucun rôle n'est attribué par défaut → l'utilisateur **ne peut accéder à rien** tant qu'un administrateur ne lui en assigne au moins un.
- Un **email de vérification** est envoyé. La connexion échoue tant que l'email n'est pas confirmé.

Toast affiché : *« Compte créé — Vérifiez votre email pour confirmer votre compte. »*

### 2.2 Connexion

Champs : email, mot de passe.

**Cas d'erreur** :

| Cause | Message affiché |
|-------|-----------------|
| Identifiants invalides | *« Invalid login credentials »* |
| Email non vérifié | *« Email not confirmed »* |
| Compte introuvable | *« User not found »* |
| Mot de passe trop court | *« Password should be at least 6 characters »* |

### 2.3 Réinitialisation du mot de passe

1. Sur `/auth`, saisir l'email puis cliquer **« Mot de passe oublié ? »**.
2. Si l'email est vide, un toast d'erreur s'affiche : *« Saisissez votre adresse email puis cliquez… »*.
3. Un email contenant un lien temporaire est envoyé.
4. Le lien redirige vers `/reset-password` où l'utilisateur saisit un nouveau mot de passe.
5. Le lien expire au bout d'une période courte (sécurité Lovable Cloud).

### 2.4 Déconnexion

Bouton dans la sidebar (icône Logout). Vide la session et redirige vers `/auth`.

### 2.5 Sécurité des données

- Mots de passe **hachés** côté serveur — jamais accessibles en clair.
- **RLS activée** sur toutes les tables sensibles.
- Fonctions SQL `SECURITY DEFINER` pour les vérifications de rôle (`has_role`, `check_permission`, `check_document_permission`).
- Aucun rôle stocké sur `profiles` — uniquement dans la table `user_roles` (prévention de l'escalade de privilèges).

---

## 3. Module GMAO — Maintenance

### 3.1 Dashboard

**Route** : `/`

Tableau de bord en temps réel. Tous les KPI sont **filtrables par période** via le sélecteur en haut à droite, avec **comparaison à la période précédente** (variation en %).

| KPI | Source de données | Calcul |
|-----|-------------------|--------|
| Tickets ouverts | `tickets.statut = 'ouvert'` | Count |
| Interventions en cours | `interventions.statut = 'en_cours'` | Count |
| Machines en panne | `machines.statut = 'en_panne'` | Count |
| Taux de disponibilité | machines opérationnelles / total | % |
| PDR en stock critique | `stock_actuel ≤ stock_min` | Count |
| PDR en rupture | `stock_actuel = 0` | Count |
| Plans préventifs actifs | `plans_preventifs.statut_plan = 'valide'` | Count |
| Préventifs en retard | `prochaine_echeance < now()` AND `statut = 'valide'` | Count |
| MTBF / MTTR | Voir [Analyse](#310-analyse--kpi) | Moyenne |

---

### 3.2 Machines

**Routes** : `/machines`, `/machines/new`, `/machines/:id`, `/machines/:id/edit`

#### Liste
- Colonnes : Code, Désignation, Statut, Criticité, Localisation.
- **Recherche** textuelle (code ou désignation).
- **Filtres** : statut, criticité.
- **Bouton "Réinitialiser les filtres"** pour remettre tous les filtres à zéro.
- **Export CSV** des données filtrées.

#### Fiche machine — onglets
1. **Informations générales** : code, désignation, marque, modèle, n° série, date de mise en service.
2. **Classification** : famille (arborescence), criticité globale, criticité maintenance, rôle fonctionnel, impact ligne, disponibilité PDR.
3. **Localisation** : zone, atelier, position.
4. **Documents** : voir [§7](#7-documents).
5. **Images** : voir [§8](#8-images).
6. **PDR** : pièces associées avec quantité recommandée par machine.
7. **Lignes** : lignes de production où la machine est affectée (table `machine_line_assignments`).
8. **Préventif** : plans préventifs liés à la machine + bouton **« Voir tous les plans de cette ligne »** (cascade vers `/preventif?line=<id>`).

#### Création / édition

| Champ | Obligatoire | Règle |
|-------|-------------|-------|
| Code | ✅ | **Unique** dans la base |
| Désignation | ✅ | — |
| Marque, modèle, n° série, description, localisation, date MES | ❌ | — |
| Famille | ❌ | Sélecteur arborescent |
| Statut | ✅ | Défaut : `en_service` |
| Criticité, criticité maintenance, rôle fonctionnel, impact ligne, disponibilité PDR | ❌ | Voir tableau ci-dessous |

#### Métadonnées industrielles

| Champ | Valeurs |
|-------|---------|
| Criticité | Critique, Importante, Normale |
| Criticité maintenance | Haute, Moyenne, Basse |
| Rôle fonctionnel | Dosage, Convoyage, Remplissage, Bouchage, Étiquetage, Emballage, Palettisation, Contrôle, Nettoyage, Stockage |
| Impact ligne | Arrêt complet, Arrêt partiel, Dégradation performance |
| Disponibilité PDR | Disponible, Partielle, Indisponible |
| Statut | En service, En panne, En maintenance, Hors service |

#### Cas particuliers & exceptions

- **Suppression bloquée** si la machine est référencée par : tickets, plans préventifs, PDR, équipements, lignes, déclarations de production. Toast : *« Suppression impossible — utilisée dans : … »*.
- Le **changement de statut** « En panne » est généralement issu d'un ticket et non d'une édition manuelle (traçabilité).

---

### 3.3 Équipements

**Routes** : `/equipements`, `/equipements/new`, `/equipements/:id`, `/equipements/:id/edit`

Sous-ensembles fonctionnels rattachés à une machine.

#### Champs obligatoires
- Code\* (unique), Désignation\*, Type\*, Statut\*.

#### Types
Mécanique, Électrique, Pneumatique, Hydraulique, Électronique, Instrumentation.

#### Cas particuliers
- Un équipement **doit** être rattaché à une machine **ou** à une ligne (sinon il devient orphelin).
- Suppression bloquée si tickets, préventif ou documents liés.

---

### 3.4 Lignes de production

**Routes** : `/lignes`, `/lignes/:id`, `/lignes/:id/config`

#### Liste
Colonnes : Code, Désignation, Atelier, Statut, Actions.
- Action **"Préventif"** ouvre `/preventif?line=<id>` (filtre pré-rempli).
- Action **"Synoptique"** ouvre la vue `/lignes/:id`.

#### Synoptique (`/lignes/:id`)
- Représentation visuelle séquentielle des machines (`sort_order`).
- Blocs interactifs (240 px) cliquables → fiche machine.
- Indicateurs temps réel : marche, arrêt, maintenance.
- Affichage de criticité, rôle fonctionnel, disponibilité PDR.
- Équipements auxiliaires regroupés sous leur machine parente.
- Bouton header **« Plans préventifs »** → `/preventif?line=<id>`.
- Légende industrielle intégrée.

#### Configuration (`/lignes/:id/config`)
- Drag & drop des machines pour définir l'ordre séquentiel (`sort_order`).
- Ajout / retrait de machines.
- Définition de la **vitesse théorique** (cadence cible).

---

### 3.5 Pièces de rechange (PDR)

**Routes** : `/pdr`, `/pdr/new`, `/pdr/:id`, `/pdr/:id/edit`

#### Liste
- Colonnes : Référence, Désignation, Stock actuel, Min, Max, Statut, Famille.
- **Filtres** : statut (stratégique/commun), famille, état stock (normal/critique/rupture).
- Indicateurs visuels : badge rouge si **rupture**, orange si **critique**.
- **Bouton "Réinitialiser les filtres"**.

#### Onglet Informations
- **Référence\*** (unique), **Désignation\***.
- Description, **Famille** (avec **héritage** : approvisionnement, statut, fournisseurs hérités automatiquement).
- Fournisseur principal, emplacement de stockage.
- Type d'approvisionnement : Achat local, Import, Fabrication interne.
- **Statut** : Stratégique ou Commun.

#### Onglet Stock
- Stock actuel, **Stock min**, **Stock max**, stock de sécurité, point de commande.
- Délai d'approvisionnement (jours).
- **Prix unitaire (DA)**, **PMP (DA)** — calculé automatiquement à chaque entrée.
- Devise : **DA** (Dinar Algérien) sur tous les montants.

#### Onglet Mouvements de stock

Trois types de mouvement, chacun avec ses règles :

| Type | Effet sur stock | Règle / blocage |
|------|-----------------|-----------------|
| **Entrée** | `stock_actuel + quantité` | **Réf document ERP\*** obligatoire |
| **Sortie** | `stock_actuel - quantité` | Bloquée si `quantité > stock_actuel` → toast *« Stock insuffisant — Stock actuel : X »* |
| **Inventaire** | Remplace par **valeur absolue** | Quantité saisie devient le nouveau stock total |

Chaque mouvement enregistre : stock avant, stock après, utilisateur, date, motif, référence ERP.

**Validations communes** :
- Quantité ≤ 0 → toast *« Quantité invalide »*.
- L'historique est **immuable** (pas de modification après enregistrement, uniquement annulation par mouvement compensatoire avec permission dédiée).

#### Onglet Durée de vie
- Durée de vie min/max (jours). **Validation** : `min ≤ max` sinon toast *« Durée de vie min doit être ≤ durée de vie max »*.
- **Instances actives** : suivi de chaque pièce installée (date pose, machine).
- Alerte **"dead age"** lorsqu'une instance dépasse sa durée max.
- Bouton **« Générer plan préventif »** → crée un plan préventif pré-rempli avec la PDR et la machine concernée.

#### Onglet Fournisseurs
- Fournisseurs **propres** à la PDR + fournisseurs **hérités** de la famille (lecture seule, modifiables au niveau famille).
- Champs : nom\*, référence fournisseur, prix (DA), délai (jours), email, téléphone, adresse, URLs.
- Marquage **fournisseur principal** (un seul à la fois).
- Permissions PDR stock dédiées : voir, créer, modifier, supprimer fournisseur.

#### Onglet Machines
- Machines associées + quantité recommandée par machine.
- Si la PDR est **stratégique**, au moins **une machine\*** doit être liée → toast bloquant *« PDR stratégique : au moins une machine doit être liée »*.

#### Validations à l'enregistrement (formulaire PDR)

| Règle | Message d'erreur |
|-------|------------------|
| Référence + désignation requises | *« Référence et désignation obligatoires »* |
| PDR stratégique sans machine | *« PDR stratégique : au moins une machine doit être liée »* |
| `duree_vie_min > duree_vie_max` | *« Durée de vie min doit être ≤ durée de vie max »* |
| `stock_min > stock_max` | *« Stock min doit être ≤ stock max »* |

#### Permissions stock PDR
Voir [§9](#9-rôles--permissions). Actions contrôlées :
- Créer entrée / créer sortie
- Correction / inventaire
- Annulation de mouvement
- Gestion fournisseurs (CRUD)

---

### 3.6 Tickets de maintenance

**Routes** : `/tickets`, `/tickets/:id`

#### Liste
- Colonnes : Numéro, Titre, Machine, Priorité, Statut, Date.
- Numéro auto-généré : **`TKT-00001`** (trigger PostgreSQL `generate_ticket_numero`).
- Filtres : statut, priorité, machine.
- **Bouton "Réinitialiser les filtres"**.

#### Cycle de vie

```text
   Ouvert ──► En cours ──► Résolu ──► Clôturé
     │           │            │
     └───── (réouverture si nécessaire) ─┘
```

| Statut | Action déclenchée |
|--------|-------------------|
| Ouvert | Création initiale |
| En cours | Bouton **« Prendre en charge »** → crée une `intervention` `en_cours` |
| Résolu | Bouton **« Résoudre »** → ouvre dialog avec champs obligatoires |
| Clôturé | Bouton **« Clôturer »** → ticket fermé définitivement |

#### Résolution — champs obligatoires

| Champ | Validation |
|-------|------------|
| **Cause racine\*** | Non vide |
| **Solution appliquée\*** | Non vide |
| Pièces consommées (PDR + quantité) | Décrémente automatiquement le stock |
| Notes de clôture | Optionnel |

Si un champ obligatoire manque → toast *« Cause racine et solution obligatoires »*.

#### Collaboration multi-maintenanciers — « Avec l'aide de »
Un ticket peut être résolu par plusieurs techniciens (2 ou 3 intervenants). Depuis la carte de résolution, l'assigné principal peut ajouter des **collaborateurs** :

| Élément | Comportement |
|---------|--------------|
| Sélecteur maintenancier | Liste les profils `maintenancier` et `resp_maintenance` (hors assigné principal et hors collaborateurs déjà ajoutés) |
| Rôle de collaboration | **Aide** (assistance ponctuelle) ou **Co-intervenant** (intervention conjointe) — bascule sur chaque ligne |
| Suppression | Bouton X retire le collaborateur (soft-delete via `removed_at`) |
| Carte d'information | Affiche l'assigné principal (badge **Lead**) et tous les collaborateurs actifs avec leur rôle |

À la résolution du ticket, une **`intervention` distincte** est créée pour chaque collaborateur actif (en plus de celle de l'assigné principal), garantissant la traçabilité KPI individuelle (temps passé, participation, journal).

**Permissions** : seuls l'assigné principal du ticket, `resp_maintenance` ou `admin` peuvent gérer les collaborateurs (RLS sur `ticket_collaborators`).

#### Passation / Libération de ticket (fin de shift)
Quand le maintenancier en charge ne peut pas résoudre le ticket avant la fin de son poste, deux actions sont disponibles dans la carte **« Passation / Libération »** (visible pour l'assigné, `resp_maintenance` ou `admin`) :

| Action | Effet métier | Effet base |
|--------|--------------|------------|
| **Transférer à** | Passation nominative à un autre maintenancier (sélecteur). Le statut du ticket reste `pris_en_charge`. | Intervention sortante clôturée avec `statut = transferee` ; nouvelle intervention `en_cours` créée pour le repreneur ; `tickets.assignee_id` mis à jour ; collaborateurs conservés |
| **Libérer le ticket** | Remet le ticket dans le pool, prenable par n'importe quel maintenancier. | `tickets.assignee_id = null`, `statut = ouvert`, `heure_prise_en_charge = null` ; intervention en cours clôturée avec `statut = liberee` |

**Champ Motif obligatoire** dans les deux cas (raison fin de shift, blocage technique, manque de PDR…). Sans motif → toast d'erreur, action bloquée.

**Traçabilité** :
- Entrée `audit_logs` (`action_type = transfer` ou `release`) avec ancien/nouveau assigné et motif.
- Notification in-app : `ticket.transferred` au repreneur, `ticket.released` aux rôles `maintenancier` et `resp_maintenance`.

#### Mobile
La résolution, la passation et la libération sont **optimisées mobile** (formulaire vertical, gros boutons, actions secondaires dans la `StickyActionBar`, scan rapide PDR).

---

### 3.7 Maintenance préventive

**Routes** : `/preventif`, `/preventif/new`, `/preventif/:id`, `/preventif/:id/edit`

#### Liste
- Colonnes : Titre, Machine, Ligne, Fréquence, Statut plan, Prochaine échéance, Actions.
- Badge **« En retard »** si `prochaine_echeance < now()` ET statut `valide`.
- **Filtres cumulables** :
  - Statut plan (brouillon, validé, suspendu)
  - **Ligne** (depuis `production_lines`) — sélectionner une ligne restreint le filtre Machine aux machines de cette ligne (jointure `machine_line_assignments`)
  - Machine
  - Fréquence
  - Recherche textuelle (titre ou code/désignation machine)
- **Bouton "Réinitialiser les filtres"**.
- **KPIs contextuels** mis à jour selon les filtres : Validés, En retard, Brouillons, Suspendus.
- Lecture des **query params** `?line=<id>` et `?machine=<id>` au chargement (depuis MachineDetail, LineSynoptic, LinesList).

#### Formulaire — workflow en cascade

1. **Machine\*** → sélection de la machine cible.
2. **Ligne** → auto-détectée si la machine est affectée à une seule ligne.
3. **Titre\*** + description.
4. **Fréquence** : quotidien, hebdomadaire, bimensuel, mensuel, trimestriel, semestriel, annuel.
5. **Type de maintenance** : mécanique, électrique, lubrification, nettoyage, inspection, calibration.
6. **Checklist** : opérations à réaliser (ajout dynamique).
7. **PDR nécessaires** : pièces + quantités prévisionnelles.
8. **Maintenanciers assignés** : techniciens responsables.
9. **Prochaine échéance** : date initiale.

#### Validations
- **Titre + machine obligatoires** sinon toast *« Titre et machine obligatoires »*.

#### Statuts du plan

| Statut | Effet |
|--------|-------|
| Brouillon | Plan en rédaction, non actif |
| Validé | Plan actif → génère échéances et apparaît en Shift |
| Suspendu | Désactivé temporairement, n'apparaît plus en Shift |

Toast au changement : *« Plan validé / suspendu / remis en brouillon »*.

#### Exécution d'un plan

Accessible depuis le détail du plan ou la vue **Shift Maintenance**.

Champs du formulaire d'exécution :
- **Date d'exécution\***
- **Durée d'intervention\*** (en minutes) — sinon toast *« Durée obligatoire — Veuillez saisir la durée de l'intervention »*
- **Checklist** : validation point par point (OK / NOK)
- **PDR utilisées** : pré-remplies depuis le plan, modifiables ; décrémentent le stock
- **Notes** : observations du technicien

À l'enregistrement :
- Mise à jour de `derniere_execution` et calcul automatique de `prochaine_echeance` selon la fréquence.
- Toast : *« Exécution enregistrée — Prochaine échéance : JJ/MM/AAAA »*.
- Historique conservé dans la table `preventif_executions`.

---

### 3.8 Shift Maintenance

**Route** : `/maintenance/shift`

Vue dédiée au maintenancier connecté pour son quart de travail.

#### Onglets

| Onglet | Contenu |
|--------|---------|
| **Curatif** | Tickets ouverts ou en cours assignés au maintenancier |
| **Préventif** | Plans préventifs assignés (échéances du jour / semaine) |

#### Affichage par carte
- **Image** de la machine ou équipement concerné (image principale).
- Badges : priorité, urgence, type de panne.
- Bouton d'**accès rapide** au détail (ticket ou plan).
- Compteur dans chaque onglet.

#### Filtres
- Filtre par **ligne de production**.
- **Bouton "Réinitialiser les filtres"**.

---

### 3.9 Journal des interventions

**Route** : `/maintenance/journal`

Vue centralisée et auditable de toutes les interventions (curatives + préventives).

#### Filtres

| Filtre | Description |
|--------|-------------|
| **Période** | Date de début (Du) + date de fin (Au) |
| **Type** | Onglets : Tous / Curative / Préventive (avec compteurs) |
| **Ligne** | Restreint aux machines de la ligne |
| **Machine** | Machine spécifique |
| **Maintenancier** | Technicien |

**Bouton "Réinitialiser les filtres"** pour tout remettre à zéro.

#### Colonnes affichées
- Type d'intervention (badge curative / préventive)
- Machine et ligne
- Technicien responsable
- Date et **durée** de l'intervention
- Statut (en cours / terminée)
- **Lien direct** vers le document source (ticket ou plan préventif)

---

### 3.10 Analyse & KPI

**Route** : `/analytics`

Tableau de bord analytique.

#### Filtres
- **Période personnalisable** (date début / date fin).
- **Comparaison automatique** avec la période précédente (% de variation).
- **Bouton "Réinitialiser les filtres"**.

#### KPI
- **MTBF** (Mean Time Between Failures) : temps moyen entre deux pannes par machine
- **MTTR** (Mean Time To Repair) : temps moyen de résolution
- **Taux de disponibilité** par machine et global
- **Curatives vs préventives** (ratio)
- **Coût de maintenance** : valorisation des PDR consommées (PMP × quantité)
- **Tendances** : graphiques temporels par jour / semaine / mois

---

## 4. Module GPAO — Production

### 4.1 Dashboard Production

**Route** : `/gpao`

KPIs production temps réel : OF en cours / terminés / planifiés, taux de rendement, quantités produites vs prévues, taux de rebut.

---

### 4.2 Ordres de fabrication (OF)

**Routes** : `/gpao/of`, `/gpao/of/new`, `/gpao/of/:id`

#### Liste
- Numéro auto-généré **`OF-00001`** (trigger `generate_of_numero`).
- Colonnes : Numéro, Produit, Ligne, Statut, Quantités, Dates.
- Filtres : statut, ligne, produit.
- **Bouton "Réinitialiser les filtres"**.
- **Import / Export CSV** disponibles.

#### Statuts

| Statut | Description |
|--------|-------------|
| Planifié | Créé, pas encore démarré |
| En cours | Production active |
| Terminé | Production achevée |
| Annulé | OF annulé |

#### Détail OF — onglets
- Produit fabriqué + recette utilisée
- Quantités : prévue, produite, rebut, écart
- Ligne de production assignée
- **Mode shift** : 3×8 (défaut), 2×8, 1×8, Surface
- **Déclarations de production** par shift
- **Consommations matières premières**
- **Arrêts de production**
- **Historique des modes** (`of_mode_history`)

#### Changement de mode shift en cours d'OF

- Bouton **« Changer le mode »** dans le détail.
- **Motif obligatoire** à saisir.
- Trace dans `of_mode_history` : ancien mode, nouveau mode, motif, utilisateur, date.
- Audit visible dans l'onglet Historique.

#### Validations
- Quantité prévue > 0.
- Date de début ≤ date de fin prévisionnelle.
- Une recette doit exister pour le produit avant le démarrage.

---

### 4.3 Produits

**Routes** : `/gpao/produits`, `/gpao/produits/:id`

- Code\* (unique), Désignation\*, Famille, Unité, Poids unitaire.
- Code ERP (référence externe).
- Familles **hiérarchiques**.
- **Configuration de conditionnement** : niveaux multiples (unité, carton, palette…), coefficients de conversion, poids par niveau.

#### Suppression
- **Bloquée** si le produit est utilisé dans une recette, un OF ou une déclaration.
- Toast : *« Suppression impossible — Ce produit est utilisé dans : recettes, OF, … »*.
- Permet la suppression uniquement si le produit n'a **jamais** été utilisé.

---

### 4.4 Articles (matières premières)

**Routes** : `/gpao/articles`, `/gpao/articles/:id`

- Code\* (unique), Désignation\*, Famille, Unité.
- Stock actuel, stock minimum.
- **Prix unitaire en DA**.
- Fournisseur, Code ERP.

#### Suppression
- **Bloquée** si l'article est utilisé dans une recette ou une consommation.
- Toast : *« Suppression impossible — Cet article est utilisé dans : recettes, consommations »*.

---

### 4.5 Recettes (unifiées avec la nomenclature BOM Qualité)

**Route** : `/gpao/recettes`

Depuis la version 2.2 du manuel, **les recettes de production et les nomenclatures (BOM) du module Qualité sont fusionnées** : une recette porte à la fois la composition matière (ex-BOM) et le procédé.

- Association produit → liste de **lignes de recette** avec :
  - Article, quantité, unité.
  - **Type d'article** (`raw_material`, `packaging`, `label`, `carton`, `pallet`, `consumable`).
  - **% de perte** (`waste_percent`).
  - Drapeaux **obligatoire** et **sensible qualité** (`is_quality_sensitive`).
- **Versioning hiérarchique** : plusieurs versions actives possibles (Brouillon / Active / Archivée). La duplication crée une nouvelle version éditable.
- **Sélection obligatoire de la version** lors de la création d'un OF (`/gpao/of/new`). La version reste **verrouillée** sur l'OF pour traçabilité.
- RPC `get_recipe_for_of(of_id)` : renvoie le snapshot complet (composants, étapes, CCP, composants sensibles) suivi par l'OF.
- Compatibilité ascendante : un trigger renseigne automatiquement `bom_id` dans `ordres_fabrication` pour les anciens rapports.

> Voir aussi [§4.9 Module Qualité](#49-module-qualité) pour les onglets Qualité de l'OF.

---

### 4.6 Shift Production

**Route** : `/gpao/shift`

Écran opérateur pour la déclaration en temps réel.

#### Initialisation du shift
- Sélection de l'**équipe** (A, B, C, D) et du **créneau** (dynamique selon le mode de l'OF : 3×8 → Matin/Après-midi/Nuit ; 2×8 → Matin/Après-midi ; 1×8 → Journée ; Surface → Surface).

#### Règle de saisie horaire — fenêtre de tolérance

> **Un créneau horaire ne devient saisissable qu'APRÈS sa fin**, et reste ouvert pendant **`tolerance_saisie_heures`** (défaut : **1 heure**).

| Heure actuelle | Créneau 22h–23h | Créneau 23h–00h |
|----------------|-----------------|-----------------|
| 22h30 | ❌ Verrouillé (en cours) | ❌ Pas commencé |
| 23h30 | ✅ Ouvert (tolérance 1h) | ❌ En cours |
| 00h30 | ❌ Fermé (au-delà tolérance) | ✅ Ouvert |

- Le paramètre `tolerance_saisie_heures` est **modifiable** par un admin dans `/parametres/shifts`.
- Tentative de saisie hors fenêtre → bouton **désactivé** (grisé) avec tooltip explicatif.

#### Saisies par créneau
- **Quantité produite** (unité)
- **Rebut** (unité)
- **Consommations matières** (article + quantité réelle)
- Les consommations sont **comparées à la recette théorique** → écart en % affiché.

#### Création de ticket maintenance depuis Shift
- Bouton **« Déclarer une panne »** ouvre un dialog → crée un ticket lié à la machine de la ligne courante.
- Le ticket apparaît immédiatement en **Shift Maintenance** côté curatif.

#### Clôture du shift
- Exige la **complétion totale** :
  - Toutes les saisies horaires renseignées
  - Toutes les consommations matières déclarées
- Bouton de clôture désactivé tant que les conditions ne sont pas remplies.

---

### 4.7 Consommations

**Route** : `/gpao/consommations`

- Historique des consommations matières premières.
- Filtres : OF, article, shift, période.
- **Bouton "Réinitialiser les filtres"**.

#### Correction d'une consommation hors jour
- **Motif obligatoire** à saisir.
- Audit log automatique : utilisateur, ancienne valeur, nouvelle valeur, motif, date.

---

### 4.8 Arrêts

**Route** : `/gpao/arrets`

#### Types d'arrêt

| Type | Usage |
|------|-------|
| Panne | Défaillance machine |
| Changement de format | Reconfiguration ligne |
| Nettoyage | Arrêt nettoyage planifié |
| Pause | Pause équipe (planifiée) |
| Approvisionnement | Attente matière première |
| Qualité | Contrôle qualité |
| Autre | Motif libre |

#### Calculs et liens
- **Durée** auto-calculée si heure de fin renseignée (`fin - début` en minutes).
- Lien **optionnel** vers un ticket de maintenance (cas type "Panne").
- Filtres : OF, ligne, machine, shift, période, type.
- **Bouton "Réinitialiser les filtres"**.

---

### 4.9 Module Qualité

**Route racine** : `/qualite`

Module additif intégré aux OF et aux recettes unifiées.

| Page | Route | Description |
|------|-------|-------------|
| Dashboard Qualité | `/qualite` | Vue d'ensemble KPI qualité |
| Contrôles | `/qualite/controles` | Saisie et historique des contrôles |
| Non-conformités | `/qualite/non-conformites` | Déclaration NC, catégories, gravité |
| Actions correctives | `/qualite/actions` | Suivi des actions par catégorie |
| Indicateurs | `/qualite/indicateurs` | Affectation et calcul des indicateurs |
| OF Qualité | `/qualite/of` | Liste des OF avec onglet qualité |
| Traçabilité | `/qualite/tracabilite` | Lots / composants sensibles par OF |
| Recettes & Nomenclatures | `/qualite/recettes-nomenclatures` | Vue qualité (composants sensibles, comparaison versions) |
| Rapports | `/qualite/rapports` | Exports Qualité |

**Onglet Qualité d'un OF** (`OfQualityTab`) :
- Section **« Recette suivie »** : version verrouillée + liste des composants `is_quality_sensitive`.
- Saisie des contrôles aux **points de contrôle** rattachés à la ligne ou à l'OF.
- Déclaration de non-conformités (catégories, motifs de décision, types de défauts paramétrables).

---

## 5. Workflows transverses


### 5.1 Génération automatique de plan préventif depuis une PDR

1. Dans la fiche PDR → onglet **Durée de vie** → bouton **« Générer plan préventif »**.
2. Le système crée un plan pré-rempli :
   - Machine = celle de la dernière instance active
   - Fréquence = calculée à partir de `duree_vie_min`
   - PDR nécessaire = la PDR courante avec quantité 1
3. L'utilisateur complète et **valide** le plan.

### 5.2 Création de ticket depuis la production

Bouton **« Déclarer panne »** dans `ShiftScreen` (production) → ouvre un dialog → crée :
- Un ticket lié à la machine
- Optionnellement un arrêt de production lié

Le ticket apparaît instantanément dans le **Shift Maintenance** des techniciens assignés.

### 5.3 Lien ticket ↔ arrêt production

- Un arrêt de type "Panne" peut être lié à un ticket existant (sélecteur).
- Permet de mesurer l'**impact production** d'un ticket maintenance.

### 5.4 Image principale auto-affectée

- Si une entité (machine, équipement, PDR, produit, article) n'a aucune image et qu'une image est uploadée, elle devient automatiquement **image principale**.
- Affichée dans les listes, vues détail, Shift et synoptique.

### 5.5 Cascade ligne → préventif

Trois entrées :
- `MachineDetail` → bouton **« Voir tous les plans de cette ligne »**
- `LineSynoptic` → bouton header **« Plans préventifs »**
- `LinesList` → action **« Préventif »** par ligne

→ Tous redirigent vers `/preventif?line=<id>` avec **filtre pré-rempli** et **filtre Machine restreint** aux machines de la ligne (via `machine_line_assignments`).

### 5.6 Permissions documents (héritage par type d'entité)

Les permissions documentaires sont configurées par **rôle × type d'entité** (machine, équipement, PDR, produit, article, intervention, user). Toute entité de ce type hérite des règles définies.

---

## 6. Administration & paramètres

**Route** : `/parametres`

L'administration est organisée en **4 pôles** :

### 6.1 Sécurité & Accès

| Page | Description | Cas particuliers |
|------|-------------|------------------|
| **Utilisateurs** (`/parametres/users`) | Liste, recherche, ajout/retrait de rôles, photo de profil, statut actif/inactif | Création via signup ; impossibilité de se retirer le rôle admin si dernier admin |
| **Matrice des rôles** (`/parametres/roles`) | Toggle CRUD (Voir/Créer/Modifier/Supprimer) par rôle × module ; bouton "Accès complet" par rôle | Logique OR pour utilisateur multi-rôles |
| **Permissions documents** (`/parametres/document-permissions`) | Droits par rôle × type d'entité (view/upload/download/edit_metadata/delete) | — |
| **Permissions stock PDR** (`/parametres/pdr-stock-permissions`) | Droits spécifiques opérations stock | Voir [§3.5](#35-pièces-de-rechange-pdr) |

### 6.2 Référentiels & Classification

| Page | Description | Cas particuliers |
|------|-------------|------------------|
| **Familles machines** (`/parametres/familles`) | Arborescence hiérarchique | Suppression bloquée si famille a des enfants ou des machines liées |
| **Familles produits** (`/parametres/product-families`) | Idem | Idem |
| **Familles PDR** (`/parametres/pdr-families`) | Avec **héritage** : approvisionnement, statut, fournisseurs | Modifier la famille met à jour les PDR héritées |
| **Types de pannes** (`/parametres/pannes`) | Référentiel libre | — |
| **Catégories documents** (`/parametres/document-categories`) | Catégories pour classer les documents | — |

### 6.3 Production & Organisation

| Page | Description | Cas particuliers |
|------|-------------|------------------|
| **Lignes** (`/parametres/lignes`) | Configuration des lignes | Suppression bloquée si machines / OF liés |
| **Shifts** (`/parametres/shifts`) | Plages horaires, équipes, modes, créneaux, tolérance saisie | **Édition inline** des heures début/fin |

### 6.4 Configuration générale

| Page | Description |
|------|-------------|
| **Paramètres généraux** (`/parametres/general`) | Paramètres système (clé/valeur) — ex. `tolerance_saisie_heures` |
| **Media / Images** (`/parametres/images`) | Taille maximale d'image (Mo) |
| **Notifications** (`/parametres/notifications`) | Règles de notifications par module (sévérité, canaux, destinataires) |
| **SMTP & Emails** (`/parametres/smtp`) | Configuration du serveur SMTP self-hosted, test d'envoi, paramètres globaux email |
| **Contrôle d'accès** (`/parametres/access-control`) | Hub : rôles, permissions Qualité, audit, kill-switches, export portabilité (JSON / migration SQL) |

### 6.5 Paramétrage Qualité

**Route hub** : `/parametres/qualite` — centralise tous les référentiels du module Qualité.

| Page | Route | Description |
|------|-------|-------------|
| **Hub Qualité** | `/parametres/qualite` | Tuiles d'accès aux référentiels qualité |
| **Unités de mesure** | `/parametres/qualite/units` | Unités utilisées pour contrôles et indicateurs |
| **Points de contrôle** | `/parametres/qualite/control-points` | Postes/étapes de contrôle, **scope** (`global` / `line` / `of` / `mixed`), liaisons multi-lignes et multi-OF |
| **Catégories de NC** | `/parametres/qualite/nc-categories` | Catégorisation des non-conformités |
| **Types de défauts** | `/parametres/qualite/defect-types` | Référentiel des défauts |
| **Motifs de décision** | `/parametres/qualite/decision-reasons` | Justifications des décisions qualité |
| **Catégories d'actions** | `/parametres/qualite/action-categories` | Catégories pour les actions correctives |

**CRUD complet** sur chaque référentiel : ajout / édition / suppression, activation/désactivation inline, réordonnancement (sort_order), recherche.

**Points de contrôle — architecture Master/Detail** :
- Liste maîtresse avec compteurs de liaisons (lignes, OF) et badges de statut.
- Panneau détail : métadonnées (code, libellé, ordre) + gestion des associations.
- **Multi-lignes** : ajout via dropdown filtré.
- **Multi-OF** : barre de recherche asynchrone avec toggle pour inclure les OF clôturés.
- Tables de jointure : `quality_control_point_lines`, `quality_control_point_ofs`.
- Permissions : mutation réservée à `admin`, `responsable_si` ou détenteurs de `manage_assignments` (Qualité).

---


## 6 bis. Notifications & Emails

Système complet de notifications in-app + emails via SMTP **self-hosted** (aucune dépendance à un service tiers type Resend/SendGrid).

### 6 bis.1 Architecture

- **Notifications in-app** : table `notifications` + cloche temps-réel (`NotificationBell`) + page `/notifications`.
- **Règles configurables** (`notification_rules`) : pour chaque évènement métier (ticket créé, OF en retard, PDR sous min…), on définit la sévérité, les canaux (`in_app`, `email`) et les destinataires (rôle ou utilisateur).
- **Emails** : envoyés par l'edge function `send-notification-email` via SMTP (denomailer), uniquement si la règle inclut le canal `email` et que `notif_email_enabled = true`.
- **Déduplication** : table `notification_email_log` empêche le ré-envoi du même email (même `dedup_key` + destinataire) sous 24 h.
- **Cron quotidien** (06:00 UTC) : edge function `check-deadlines` scanne tickets, plans préventifs et OF pour générer les notifications d'échéance/retard.

### 6 bis.2 Configuration SMTP (`/parametres/smtp`)

Réservé à l'**Admin**. Tous les paramètres sont stockés dans `app_settings` (clé/valeur) — aucune variable d'environnement à éditer.

| Champ | Clé `app_settings` | Exemple |
|-------|--------------------|---------|
| Hôte SMTP | `smtp_host` | `mail.exemple.com` |
| Port | `smtp_port` | `587` (STARTTLS) ou `465` (SSL) |
| Sécurité | `smtp_secure` | `tls` / `ssl` / `none` |
| Utilisateur | `smtp_user` | `notifications@exemple.com` |
| Mot de passe | `smtp_password` | masqué `••••••••` après sauvegarde |
| Email expéditeur | `smtp_from_email` | `no-reply@exemple.com` |
| Nom expéditeur | `smtp_from_name` | `PROD IN TIME` |
| Email support | `support_email` | affiché en pied d'email |
| Activer emails | `notif_email_enabled` | `true` / `false` |
| Délai rappel défaut (j) | `notif_rappel_jours_defaut` | `1` à `30` |

**Bouton "Envoyer un email de test"** : appelle `send-test-email` avec une adresse cible et affiche un toast succès/erreur avec le message technique exact retourné par le serveur SMTP.

### 6 bis.3 Règles de notification (`/parametres/notifications`)

Pour chaque règle :
- **Évènement** (clé technique, ex. `ticket.created`, `of.late`, `pdr.below_min`)
- **Sévérité** : `info`, `low`, `medium`, `high`, `critical` (couleur du bandeau email)
- **Canaux** : `in_app` ✅ et/ou `email` ✉️
- **Destinataires** : rôle (fan-out vers tous les utilisateurs du rôle) ou utilisateur précis
- **Activée** : on/off

### 6 bis.4 Workflow d'envoi

1. Un évènement métier appelle `triggerNotification(...)` (`src/lib/notifications.ts`).
2. La règle correspondante est lue ; une ligne est insérée dans `notifications`.
3. Si la règle contient `email`, `send-notification-email` est invoquée.
4. La fonction résout les destinataires, vérifie la déduplication 24 h, envoie via SMTP, et journalise dans `notification_email_log` (`queued` → `sent` / `failed` / `skipped`).

### 6 bis.5 Cas d'erreur SMTP fréquents

| Symptôme | Cause | Action |
|----------|-------|--------|
| `connection refused` | Hôte/port faux ou bloqué | Vérifier hôte, port, ouverture pare-feu |
| `authentication failed` | Login/mot de passe invalide | Re-saisir le mot de passe (champ vide = inchangé) |
| `self signed certificate` | Certificat non fiable | Passer en `tls` strict ou `none` selon politique |
| Email envoyé non reçu | Filtré spam / SPF manquant | Configurer SPF/DKIM côté domaine expéditeur |
| `notif_email_enabled=false` | Emails globalement désactivés | Activer le toggle dans `/parametres/smtp` |

---

## 7. Documents

Système intégré de gestion documentaire attachable à toute entité.

### Buckets de stockage

| Bucket | Usage | Public |
|--------|-------|--------|
| `entity-documents` | Documents génériques (PDR, équipements, produits, articles…) | Oui |
| `machine-documents` | Documents historiques machines | Oui |
| `entity-images` | Images d'entités | Oui |

### Workflow d'upload
1. Onglet **Documents** d'une entité → bouton **« Ajouter »**.
2. Sélection du fichier (PDF, Word, Excel, image, etc.).
3. Choix de la **catégorie** (référentiel `document_categories`).
4. Description (optionnel).
5. Upload → enregistrement dans `entity_documents` avec audit (uploadé par, date).

### Permissions par rôle
- view, upload, download, edit_metadata, delete — granulaires par **type d'entité**.

### Affichage
- Aperçu intégré pour PDF et images.
- Téléchargement direct.
- Historique des modifications.

---

## 8. Images

### Fonctionnalités
- Galerie multi-images par entité.
- **Image principale** affichée dans listes, vues détail, Shift et synoptique.
- **Ordre de tri** personnalisable (drag).
- **Lightbox** plein écran (zoom).
- **Taille maximale** configurable dans `/parametres/images`.

### Cas particuliers
- Suppression de l'image principale → la suivante (par sort_order) devient principale automatiquement.
- Format autorisés : JPG, PNG, WebP.

---

## 9. Rôles & permissions

### 9.1 Rôles disponibles

| Rôle (code) | Périmètre |
|-------------|-----------|
| `admin` | Accès total à tous les modules |
| `resp_maintenance` | Gestion complète maintenance + analytics |
| `maintenancier` | Exécution interventions et plans préventifs |
| `resp_production` | Gestion production complète |
| `chef_ligne` | Supervision d'une ligne (shift, OF, déclarations) |
| `operateur` | Saisies en Shift Production |
| `gestionnaire_magasin` | Gestion stocks PDR et articles, fournisseurs |
| `bureau_methode` | Configuration recettes, plans préventifs, ingénierie |

### 9.2 Matrice — modules couverts

Chaque rôle peut avoir 4 actions par module : **Voir**, **Créer**, **Modifier**, **Supprimer**.

Modules : Machines, Équipements, Lignes, PDR, Tickets, Préventif, Interventions, OF, Produits, Articles, Recettes, Consommations, Arrêts, Shifts, Paramètres, Utilisateurs.

### 9.3 Logique multi-rôles

Un utilisateur peut cumuler **plusieurs rôles**. Les permissions sont fusionnées avec une logique **OR** (le droit le plus permissif s'applique pour chaque action).

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
| `pdr_stock.create_entry` | Créer une entrée |
| `pdr_stock.create_exit` | Créer une sortie |
| `pdr_stock.correction` | Correction de stock |
| `pdr_stock.inventory` | Effectuer un inventaire |
| `pdr_stock.cancel_movement` | Annuler un mouvement |
| `pdr_stock.suppliers.*` | Gestion fournisseurs (view/create/edit/delete) |

---

## 10. Export / Import CSV

### 10.1 Export CSV

Disponible sur les listes principales :
- Machines, Équipements, Lignes, PDR
- Tickets, Préventif, Journal interventions
- OF, Produits, Articles, Consommations, Arrêts

**Comportement** :
- Les **filtres actifs sont appliqués** à l'export.
- Encodage UTF-8 avec BOM (compatible Excel FR).
- Colonnes auto-configurées selon le contexte.
- Fichier nommé `<entité>_<date>.csv`.

### 10.2 Import CSV

Disponible pour : OF, Articles (et autres entités via `CsvImporter`).

**Workflow** :
1. Téléchargement du modèle (template).
2. Mapping des colonnes du fichier vers les champs cibles.
3. **Validation ligne par ligne** :
   - Champs obligatoires renseignés
   - Codes uniques (pas de doublon)
   - Références valides (familles, lignes…)
4. **Rapport d'erreurs** affichant les lignes en échec avec motif.
5. Import partiel possible (les lignes valides sont importées, les autres rejetées).

---

## 11. Cas d'erreur & dépannage

### Tableau récapitulatif

| Situation | Message affiché | Cause | Solution |
|-----------|----------------|-------|----------|
| Suppression machine | *« Suppression impossible — utilisée dans … »* | Dépendances FK (tickets, PDR, préventif…) | Clôturer ou réassigner d'abord |
| Suppression produit | *« Suppression impossible — Ce produit est utilisé dans : … »* | Recette, OF, déclaration | Garder le produit (l'historique l'exige) |
| Suppression article | *« Suppression impossible — Cet article est utilisé dans : … »* | Recette, consommation | Idem |
| Sortie PDR | *« Stock insuffisant — Stock actuel : X »* | quantité > stock | Faire une entrée d'abord ou ajuster qte |
| Entrée PDR sans réf ERP | *« Réf document ERP obligatoire »* | Champ vide | Saisir la référence ERP |
| Quantité PDR ≤ 0 | *« Quantité invalide »* | Saisie incorrecte | Saisir > 0 |
| PDR stratégique sans machine | *« PDR stratégique : au moins une machine doit être liée »* | Onglet Machines vide | Lier au moins une machine |
| Durée de vie PDR | *« Durée de vie min doit être ≤ durée de vie max »* | min > max | Corriger les valeurs |
| Stock PDR | *« Stock min doit être ≤ stock max »* | min > max | Corriger les valeurs |
| Création préventif | *« Titre et machine obligatoires »* | Champ vide | Renseigner les deux |
| Exécution préventif | *« Durée obligatoire »* | Durée vide | Saisir la durée en minutes |
| Résolution ticket | *« Cause racine et solution obligatoires »* | Champ vide | Renseigner les deux |
| Saisie shift hors fenêtre | Bouton désactivé + tooltip | Hors `tolerance_saisie_heures` | Saisir dans la fenêtre |
| Login | *« Invalid login credentials »* | Identifiants faux | Vérifier email/mot de passe |
| Login | *« Email not confirmed »* | Email non vérifié | Cliquer le lien de confirmation |
| Reset password sans email | *« Saisissez votre adresse email… »* | Champ email vide | Saisir l'email puis cliquer "Mot de passe oublié" |
| Action refusée | *« Vous n'avez pas la permission »* | Rôle insuffisant (RLS) | Contacter un administrateur |

### Conseils généraux

- **Toast persistant** : si un toast d'erreur revient à chaque action, vérifier d'abord ses **rôles** avec un administrateur.
- **Données manquantes** : vérifier les **filtres actifs** et utiliser le bouton **"Réinitialiser les filtres"** disponible sur toutes les pages de liste.
- **Stock incohérent** : utiliser un mouvement **Inventaire** plutôt que des entrées/sorties répétées.
- **Plan préventif jamais déclenché** : vérifier qu'il est en statut **`Validé`** (pas brouillon ou suspendu) et qu'au moins un maintenancier est assigné.

---

## 12. Annexes

### 12.1 Liste exhaustive des routes

#### Authentification
- `/auth` — connexion / inscription
- `/reset-password` — réinitialisation du mot de passe

#### GMAO
- `/` — Dashboard
- `/machines`, `/machines/new`, `/machines/:id`, `/machines/:id/edit`
- `/equipements`, `/equipements/new`, `/equipements/:id`, `/equipements/:id/edit`
- `/lignes`, `/lignes/:id`, `/lignes/:id/config`
- `/pdr`, `/pdr/new`, `/pdr/:id`, `/pdr/:id/edit`
- `/tickets`, `/tickets/:id`
- `/preventif`, `/preventif/new`, `/preventif/:id`, `/preventif/:id/edit`
- `/maintenance/shift`
- `/maintenance/journal`
- `/analytics`

#### GPAO
- `/gpao` — Dashboard production
- `/gpao/of`, `/gpao/of/new`, `/gpao/of/:id`
- `/gpao/produits`, `/gpao/produits/:id`
- `/gpao/articles`, `/gpao/articles/:id`
- `/gpao/recettes`
- `/gpao/shift`
- `/gpao/consommations`
- `/gpao/arrets`

#### Qualité
- `/qualite` — Dashboard
- `/qualite/controles`, `/qualite/non-conformites`, `/qualite/actions`
- `/qualite/indicateurs`, `/qualite/of`, `/qualite/tracabilite`
- `/qualite/recettes-nomenclatures`, `/qualite/rapports`

#### Administration
- `/parametres`
- `/parametres/users`, `/parametres/roles`, `/parametres/access-control`
- `/parametres/document-permissions`, `/parametres/pdr-stock-permissions`
- `/parametres/familles`, `/parametres/product-families`, `/parametres/pdr-families`
- `/parametres/pannes`, `/parametres/document-categories`
- `/parametres/lignes`, `/parametres/shifts`
- `/parametres/general`, `/parametres/images`
- `/parametres/notifications`, `/parametres/smtp`
- `/parametres/qualite` (hub) + `/parametres/qualite/units`, `/control-points`, `/nc-categories`, `/defect-types`, `/decision-reasons`, `/action-categories`
- `/notifications` (boîte de réception utilisateur)


### 12.2 Tables principales (BDD)

| Table | Usage |
|-------|-------|
| `profiles` | Profils utilisateurs |
| `user_roles` | Affectation rôles |
| `role_permissions` | Matrice CRUD par rôle |
| `document_permissions` | Permissions documents par type |
| `pdr_stock_permissions` | Permissions stock PDR |
| `machines`, `equipements`, `production_lines` | Parc industriel |
| `machine_line_assignments` | Affectation machine ↔ ligne |
| `pdr`, `pdr_movements`, `pdr_suppliers`, `pdr_instances`, `pdr_machines` | Pièces de rechange |
| `pdr_families` | Familles PDR (héritage) |
| `tickets`, `interventions` | Maintenance curative |
| `plans_preventifs`, `preventif_executions` | Maintenance préventive |
| `ordres_fabrication`, `of_mode_history` | OF |
| `produits`, `articles`, `recettes` | Référentiels production |
| `declarations_production`, `consommations`, `arrets_production` | Déclarations |
| `shift_modes`, `shift_time_slots`, `shift_teams`, `shift_settings` | Référentiel shifts |
| `entity_documents`, `entity_images` | GED + galeries |
| `document_categories` | Catégorisation documents |
| `notifications` | Notifications in-app (titre, message, sévérité, destinataire, lu/non-lu) |
| `notification_rules` | Règles configurables par évènement (canaux, sévérité, destinataires) |
| `notification_email_log` | Journal des envois email (queued/sent/failed/skipped, déduplication 24 h) |
| `app_settings` | Stockage clé/valeur (SMTP, flags globaux, secrets cron) |
| `recipes`, `recipe_lines` | Recettes versionnées **unifiées** (composition matière + procédé, ex-BOM fusionnée) — colonnes `item_type`, `waste_percent`, `is_mandatory`, `is_quality_sensitive` |
| `quality_units`, `quality_control_points`, `quality_nc_categories`, `quality_defect_types`, `quality_decision_reasons`, `quality_action_categories` | Référentiels Qualité paramétrables |
| `quality_control_point_lines`, `quality_control_point_ofs` | Liaisons multi-lignes / multi-OF des points de contrôle |
| `quality_checks`, `quality_non_conformities`, `quality_actions`, `quality_indicators`, `quality_indicator_assignments` | Données opérationnelles Qualité |

### 12.3 Triggers PostgreSQL clés

| Trigger | Effet |
|---------|-------|
| `handle_new_user` | Crée auto la fiche `profiles` à l'inscription |
| `generate_ticket_numero` | Génère `TKT-00001`, `TKT-00002`… |
| `generate_of_numero` | Génère `OF-00001`, `OF-00002`… |
| `update_updated_at_column` | Met à jour `updated_at` à chaque modification |
| `audit_critical_event` | Crée auto une notification in-app sur évènement critique |
| `notify_email_dispatch` | Sur insert dans `notifications`, invoque `send-notification-email` via `pg_net` si la règle inclut le canal email |

### 12.4 Edge functions

| Function | Rôle |
|----------|------|
| `send-notification-email` | Envoi SMTP (par `notification_id` ou destinataire direct), déduplication, journalisation |
| `send-test-email` | Test de configuration SMTP depuis l'UI Admin |
| `check-deadlines` | Cron quotidien (06:00 UTC) : scanne tickets, préventifs et OF pour générer les notifications d'échéance |

### 12.5 Changelog du manuel

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 05/04/2026 | Version initiale (descriptif) |
| 2.0 | 26/04/2026 | Réécriture exhaustive : workflows pas-à-pas, validations, exceptions, messages d'erreur exacts, cas particuliers, workflows transverses, annexes routes/tables/triggers |
| 2.1 | 28/04/2026 | Notifications & Emails (SMTP self-hosted) — règles `/parametres/notifications`, edge functions, cron quotidien |
| 2.2 | 30/04/2026 | Module Qualité (§4.9), paramétrage Qualité, fusion Recettes ↔ BOM, hub Contrôle d'accès, export portabilité |
| 2.3 | 02/05/2026 | Voir §13 — Modifications récentes (Shift Qualité, Vue Maintenancier, Scanner global, Inventaire double comptage, isolation kiosques shift, génération auto sessions shift depuis OF) |
| **2.4** | **07/05/2026** | Voir §14 — « Voir comme » (impersonation), garde lecture seule en mode aperçu, matrice de permissions stricte (admin inclus), export CSV universel sur tous les tableaux, hub Contrôle d'accès consolidé |

---

## 13. Modifications récentes (v2.3)

> Cette section consolide toutes les évolutions ajoutées entre le 30/04/2026 et le 02/05/2026.

### 13.1 Shift Qualité (contrôleur)

- Nouveau **shift contrôleur qualité** (`/qualite/shift`) calqué sur le shift production : équipes A/B/C, créneaux horaires, ouverture/clôture par responsable.
- Administration : `/parametres/qualite/shift-plan` — affecte les contrôleurs aux équipes/créneaux.
- Tous les contrôles qualité et NC saisis pendant un shift sont **automatiquement liés** à `shift_id`, `team_id`, `quality_shift_id`.
- Notifications automatiques d'ouverture/clôture de shift via `audit_critical_event`.

### 13.2 Vue Maintenancier (shift maintenance enrichi)

- `MaintenancierShiftView.tsx` : tableau de bord temps réel pour le maintenancier en poste.
  - Onglets **Curatif** (tickets) / **Préventif** (plans dûs).
  - Animations *pulse* sur tickets neufs et indicateurs de retard (overdue).
  - Hook `useMaintenanceShiftWorkload` agrège la charge en cours.
- Création de tickets depuis le shift production : conserve les liens **OF / shift / équipe** et calcule automatiquement la **durée d'arrêt** entre déclaration et clôture.

### 13.3 Scanner QR / Code-barres généralisé

- Composant **`ScanButton`** (caméra ZXing) + RPC `resolve_scanned_code` (URL, UUID, code exact, préfixe).
- Composant **`ListScanButton`** : navigation directe vers la fiche après résolution.
- Boutons "Scanner" disponibles dans les listes :
  - **PDR** (à côté de la recherche) — résout uniquement les PDR.
  - **Organes**, **Machines**, **Tickets** (header de page) — résout l'entité concernée et redirige.
- Règle : la résolution **automatique** ne se déclenche que sur correspondance forte (UUID/exact). Les correspondances faibles affichent une liste, jamais bloquantes.

### 13.4 Génération automatique des sessions shift depuis les OF

- Table `of_shift_assignments` + RPC `ensure_production_shift_session` :
  - À l'ouverture d'un OF, les sessions shift correspondantes sont générées automatiquement selon le mode (3x8, 2x8, 1x8…).
  - À la clôture d'un OF, les sessions associées sont **clôturées en cascade**.
- Permet la déclaration de production "Heure -1" (saisie de l'heure écoulée pendant l'heure courante uniquement).

### 13.5 Isolation des applications Shift (mode kiosque)

- 3 applications shift (Production, Maintenance, Qualité) accessibles en **mode kiosque** piloté par les responsables.
- KPIs en direct par session, **bilan HTML imprimable** en fin de shift.
- Notifications automatiques d'ouverture/clôture.

### 13.6 Module Inventaire (NOUVEAU)

#### 13.6.1 Principe — double comptage avec arbitrage

| Étape | Acteur | Action |
|-------|--------|--------|
| 1 | Responsable inventaire | Crée une campagne, définit le périmètre (familles/sous-familles PDR), affecte agents A et B avec scopes autorisés |
| 2 | Agent A | Compte chaque article de son périmètre (saisie verrouillée à validation) |
| 3 | Agent B | Compte indépendamment (comptage aveugle) |
| 4 | Système | Si **A == B** → résultat **Conforme** (qty finale = A) |
| 5 | Système | Si **A ≠ B** → bascule en **Arbitrage** pour Agent C |
| 6 | Agent C | Recompte ; si C == A ou C == B → **Conforme** (qty finale = C) |
| 7 | Système | Si C ≠ A et C ≠ B → **Recompte A&B** (incrémente `current_round`) |

#### 13.6.2 Routes

| Route | Rôle requis | Description |
|-------|-------------|-------------|
| `/inventaire` | responsable_inventaire / agent_inventaire / admin | Dashboard campagnes |
| `/inventaire/campagnes` | idem | Liste des campagnes |
| `/inventaire/campagnes/nouvelle` | responsable_inventaire | Création + matrice d'affectation A/B |
| `/inventaire/campagnes/:id` | idem | Détail, suivi des écarts, arbitrage |
| `/inventaire/campagnes/:id/compter` | agent_inventaire | Écran de comptage mobile (kiosque) |

#### 13.6.3 Tables

| Table | Description |
|-------|-------------|
| `inventory_campaigns` | Campagnes (auto-numérotées `INV-YYYYMM-####`) |
| `inventory_assignments` | Affectations agents A/B/C par campagne |
| `inventory_assignment_scopes` | Familles autorisées pour chaque agent |
| `inventory_targets` | Snapshot des articles (PDR/organes) à compter avec qty système |
| `inventory_counts` | Saisies individuelles (immuables après validation via trigger `tg_lock_inventory_counts`) |
| `inventory_results` | Consolidation A/B/C avec statut (conforme, arbitrage, recompte) |

#### 13.6.4 Sécurité

- **RLS** : agents restreints à leur scope via `inv_assignment_authorized_families`.
- **RPC `inv_register_count`** : seul point d'écriture, valide scope + statut campagne.
- **Immuabilité** : trigger empêche tout `UPDATE`/`DELETE` sur un comptage validé.

#### 13.6.5 Rôles dédiés et isolation

- Nouveaux rôles `responsable_inventaire` et `agent_inventaire`.
- Utilisateur "inventaire-only" (sans autre rôle GMAO/GPAO/Qualité) :
  - Bascule automatique sur **`InventoryLayout`** (kiosque, top-bar minimal).
  - Routes autorisées : `/inventaire/*`, `/pdr/*` (lecture seule), `/organes/*` (lecture seule).
  - Toute autre URL redirige vers `/inventaire`.
- Bouton **Fiche** sur chaque article en cours de comptage : ouvre la fiche PDR (image, fournisseur, équivalences) dans un nouvel onglet pour aider à l'identification visuelle.

#### 13.6.6 Scanner intégré au comptage

- Bouton **Scanner** sur l'écran de comptage : résout uniquement `pdr` et `organe`.
- Si l'article scanné est **hors campagne** ou **hors scope agent** → toast d'erreur, jamais bloquant.
- Si l'article est dans le scope → sélection automatique pour saisie de quantité.

---

## 14. Modifications récentes (v2.4)

> Évolutions livrées entre le 03/05/2026 et le 07/05/2026.

### 14.1 « Voir comme » — Impersonation contrôlée (admin)

- Nouveau composant `ImpersonationDialog` (accessible depuis l'admin utilisateurs) : permet à un administrateur de **prévisualiser l'application avec les rôles d'un autre utilisateur**.
- Bandeau persistant `ImpersonationBanner` en haut de l'écran : affiche l'utilisateur ciblé, ses rôles effectifs et le **nombre de modules actuellement visibles**. Bouton « Quitter le mode aperçu ».
- L'état d'impersonation est conservé dans `sessionStorage` (clé `impersonation_target_user_id`) et restauré au rechargement.
- **Contexte dédié** `ImpersonationContext` : charge le profil et les rôles de la cible ; `AuthContext` expose ensuite `roles`, `profile` et `hasRole` **effectifs** (memoïsés) sans modifier la session Supabase réelle.

### 14.2 Garde lecture seule en mode aperçu

- Module `src/lib/impersonationGuard.ts` : patch du client Supabase qui **bloque toutes les écritures** tant que l'impersonation est active.
  - `from().insert / update / delete / upsert` → renvoient une erreur contrôlée + toast « Mode aperçu : action non enregistrée ».
  - `supabase.functions.invoke(...)` → bloqué.
  - `supabase.rpc(...)` → bloqué (les RPC peuvent muter l'état).
- Les **lectures restent intactes** : la prévisualisation reflète exactement ce que verrait l'utilisateur ciblé.
- Tests automatisés : `src/test/parametres/impersonation-guard.test.ts` et `impersonation-permissions.test.ts`.

### 14.3 Matrice de permissions stricte (admin inclus)

- Suppression de tous les **bypass `isAdmin`** dans la navigation et les launchers (`AppSidebar`, `AppTopBar`, `Apps`).
- La **Roles Matrix** (`/parametres/roles-matrix`) est désormais l'**unique source de vérité** pour la visibilité de chaque écran, **y compris pour les administrateurs**.
- `usePermissions` :
  - Reset immédiat (`permissions = []`, `loading = true`) à chaque changement de rôle effectif pour éviter les fuites entre profils pendant un switch d'impersonation.
  - Flag `cancelled` dans le `useEffect` pour ignorer les fetchs obsolètes.
  - **Héritage parapluie** (`UMBRELLAS`) : `qualite` couvre `qualite_dashboard / of / indicateurs / controles / nc / actions / recettes / tracabilite / rapports / shift` ; `inventaire` couvre `inventaire_campagnes` — sauf si une sous-permission est explicitement configurée.
- Tests : `permissions-umbrella.test.ts`, `roles-matrix-logic.test.ts`, `roles-quality-additive.test.ts`.

### 14.4 Export CSV universel sur tous les tableaux

- Nouveau composant réutilisable **`<ExportCsvButton />`** (`src/components/common/ExportCsvButton.tsx`) au-dessus de l'utilitaire `exportToCsv` (séparateur `;`, BOM UTF-8 pour Excel, nom de fichier suffixé `_YYYY-MM-DD.csv`).
- **Règle d'export** : exporte **les données filtrées affichées** (respecte recherche + filtres actifs). Bouton désactivé si aucune ligne ; toast de confirmation `N ligne(s) exportée(s)`.
- Colonnes typées : option `format(value, row)` pour rendre les libellés humains (ex. `is_active` → `Oui/Non`, types d'arrêt traduits, références jointes via `parent.code`).
- **Pages équipées** (en plus des 9 préexistantes) :
  - **GMAO** : Lignes, Équipements, Organes, Plans préventifs, Notifications, Historique d'interventions, Journal d'interventions, Validations, Recherche globale.
  - **GPAO** : Arrêts, Consommations, Recettes.
  - **Inventaire** : Liste des campagnes.
  - **Paramètres** : Lignes admin, Pannes admin, Familles (machines), Familles produits, Familles PDR.
- Permissions : bouton visible pour tout utilisateur ayant accès à la page (pas de gating supplémentaire).
- Tests : `src/test/common/export-csv-button.test.tsx`, `src/test/gpao/export-csv.test.ts`.

### 14.5 Hub Contrôle d'accès consolidé

- `/parametres/access-control` regroupe : rôles standard + custom, permissions Qualité, `audit_role_settings`, **kill-switches** de contrôle, et onglet **Portabilité** (`PortabilityTab`).
- Onglet Portabilité : export **JSON complet** (`exportAccessControl`) + génération de **migration SQL** (`generateMigrationSql`) pour rejouer la configuration sur une instance Supabase auto-hébergée.

---

*Document généré pour **PROD IN TIME — GMAO · GPAO · Qualité · Inventaire** · Version manuel 2.4 · 07/05/2026*

