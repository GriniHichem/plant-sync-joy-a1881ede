# 📘 Manuel Utilisateur — PROD IN TIME (GMAO · GPAO)

> Application industrielle de gestion de maintenance assistée par ordinateur (GMAO) et de gestion de production assistée par ordinateur (GPAO).

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Authentification & Sécurité](#2-authentification--sécurité)
3. [Module GMAO — Maintenance](#3-module-gmao--maintenance)
   - [Dashboard](#31-dashboard)
   - [Machines](#32-machines)
   - [Équipements](#33-équipements)
   - [Lignes de production](#34-lignes-de-production)
   - [Pièces de rechange (PDR)](#35-pièces-de-rechange-pdr)
   - [Tickets de maintenance](#36-tickets-de-maintenance)
   - [Préventif](#37-maintenance-préventive)
   - [Shift Maintenance](#38-shift-maintenance)
   - [Journal des interventions](#39-journal-des-interventions)
   - [Analyse & KPI](#310-analyse--kpi)
4. [Module GPAO — Production](#4-module-gpao--production)
   - [Dashboard Production](#41-dashboard-production)
   - [Ordres de fabrication (OF)](#42-ordres-de-fabrication)
   - [Produits](#43-produits)
   - [Articles](#44-articles)
   - [Recettes](#45-recettes)
   - [Shift Production](#46-shift-production)
   - [Consommations](#47-consommations)
   - [Arrêts](#48-arrêts)
5. [Administration & Paramètres](#5-administration--paramètres)
6. [Gestion documentaire](#6-gestion-documentaire)
7. [Gestion des images](#7-gestion-des-images)
8. [Rôles & Permissions](#8-rôles--permissions)
9. [Export de données](#9-export-de-données)

---

## 1. Présentation générale

**PROD IN TIME** est une application web industrielle intégrée qui combine :

- **GMAO** : Gestion de Maintenance Assistée par Ordinateur — suivi du parc machines, tickets d'intervention, maintenance préventive, gestion des pièces de rechange.
- **GPAO** : Gestion de Production Assistée par Ordinateur — ordres de fabrication, recettes, déclarations de production, suivi des arrêts et consommations.

### Architecture

- **Frontend** : React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend** : Lovable Cloud (base de données, authentification, stockage, fonctions serverless)
- **Temps réel** : Mises à jour en temps réel sur les données critiques

---

## 2. Authentification & Sécurité

### Connexion

- Accès via email + mot de passe
- Vérification obligatoire de l'adresse email avant la première connexion
- Page de connexion : `/auth`

### Réinitialisation du mot de passe

- Lien **"Mot de passe oublié ?"** sur la page de connexion
- Un email de récupération est envoyé à l'adresse saisie
- Page de réinitialisation : `/reset-password`

### Sécurité des données

- Les mots de passe sont chiffrés et hachés côté serveur (jamais accessibles en clair)
- Politiques de sécurité au niveau des lignes (RLS) sur toutes les tables
- Contrôle d'accès basé sur les rôles (RBAC)
- Journal d'audit pour les actions sensibles

---

## 3. Module GMAO — Maintenance

### 3.1 Dashboard

**Route** : `/`

Le tableau de bord principal affiche des indicateurs clés en temps réel :

| KPI | Description |
|-----|-------------|
| Tickets ouverts | Nombre de tickets en cours |
| Interventions en cours | Interventions actives |
| Machines en panne | Machines avec statut "en panne" |
| Taux de disponibilité | % de machines opérationnelles |
| PDR en stock critique | Pièces sous le seuil minimum |
| PDR en rupture | Pièces avec stock à zéro |
| Plans préventifs actifs | Nombre de plans validés actifs |
| Préventifs en retard | Plans dont l'échéance est dépassée |

Les KPI incluent des comparaisons temporelles (variation par rapport à la période précédente).

---

### 3.2 Machines

**Routes** : `/machines`, `/machines/new`, `/machines/:id`, `/machines/:id/edit`

#### Liste des machines
- Tableau avec colonnes : Code, Désignation, Statut, Criticité, Localisation
- Recherche textuelle par code ou désignation
- Filtres par statut et criticité
- Badge de statut coloré (En service, En panne, En maintenance, Hors service)

#### Fiche machine (détail)
- **Informations générales** : code, désignation, marque, modèle, n° série, date de mise en service
- **Classification** : famille, criticité, criticité maintenance, rôle fonctionnel, impact ligne, disponibilité PDR
- **Localisation**
- **Onglet Documents** : documents techniques attachés
- **Onglet Images** : galerie photo avec image principale
- **Onglet PDR** : pièces de rechange associées avec quantité recommandée
- **Onglet Lignes** : lignes de production auxquelles la machine est affectée

#### Formulaire machine
- Champs obligatoires : code (unique), désignation
- Champs optionnels : marque, modèle, n° série, description, localisation, date de mise en service
- Sélecteurs : famille, statut, criticité, criticité maintenance, rôle fonctionnel, impact ligne, disponibilité PDR

#### Métadonnées industrielles

| Champ | Valeurs possibles |
|-------|-------------------|
| Criticité | Critique, Importante, Normale |
| Criticité maintenance | Haute, Moyenne, Basse |
| Rôle fonctionnel | Dosage, Convoyage, Remplissage, Bouchage, Étiquetage, Emballage, Palettisation, Contrôle, Nettoyage, Stockage |
| Impact ligne | Arrêt complet, Arrêt partiel, Dégradation performance |
| Disponibilité PDR | Disponible, Partielle, Indisponible |

---

### 3.3 Équipements

**Routes** : `/equipements`, `/equipements/new`, `/equipements/:id`, `/equipements/:id/edit`

Les équipements sont des sous-ensembles rattachés aux machines.

#### Liste des équipements
- Recherche et filtrage par statut, type, criticité
- Affichage de la machine parente

#### Fiche équipement
- Informations : code, désignation, type, statut, criticité
- Rattachement à une machine et/ou une ligne
- Documents et images associés

#### Types d'équipement
- Mécanique, Électrique, Pneumatique, Hydraulique, Électronique, Instrumentation

#### Statuts
- En service, En panne, En maintenance, Hors service

---

### 3.4 Lignes de production

**Routes** : `/lignes`, `/lignes/:id`

#### Liste des lignes
- Code, désignation, atelier, statut actif/inactif

#### Synoptique de ligne (`/lignes/:id`)
- Représentation visuelle du flux de production
- Machines affichées en blocs interactifs (240px) selon l'ordre séquentiel (`sort_order`)
- Indicateurs d'état en temps réel (marche, arrêt, maintenance)
- Affichage de la criticité, rôle fonctionnel et disponibilité PDR
- Équipements auxiliaires regroupés sous leurs machines parentes
- Légende industrielle intégrée

#### Configuration de ligne (`/lignes/:id/config`)
- Ordonnancement des machines dans le flux
- Gestion des priorités (drag & drop ou numérotation)
- Ajout/retrait de machines

---

### 3.5 Pièces de rechange (PDR)

**Routes** : `/pdr`, `/pdr/new`, `/pdr/:id`, `/pdr/:id/edit`

#### Liste des PDR
- Tableau : référence, désignation, stock actuel, stock min, stock max, statut, famille
- Recherche textuelle
- Filtres par statut (stratégique, commun), famille, état de stock
- Indicateurs visuels pour stock critique et rupture

#### Fiche PDR (détail)

**Onglet Informations** :
- Référence (unique), désignation, description
- Famille (avec héritage de propriétés : approvisionnement, statut, fournisseurs)
- Fournisseur, emplacement de stockage
- Type d'approvisionnement : Achat local, Import, Fabrication interne
- Statut : Stratégique (lien machine obligatoire), Commun

**Onglet Stock** :
- Stock actuel, stock minimum, stock maximum, stock de sécurité, point de commande
- Délai d'approvisionnement (jours)
- Prix unitaire, PMP (Prix Moyen Pondéré) — calculé automatiquement
- Devise : DA (Dinar Algérien)

**Onglet Mouvements de stock** :
- Journal chronologique de tous les mouvements
- Types de mouvement :
  - **Entrée** : approvisionnement (référence ERP obligatoire)
  - **Sortie** : consommation (bloquée si quantité > stock disponible)
  - **Inventaire** : définit le nouveau stock total (valeur absolue)
- Chaque mouvement enregistre : stock avant, stock après, utilisateur, date, motif, référence ERP

**Onglet Durée de vie** :
- Durée de vie min/max (en jours) — validation : min ≤ max
- Instances actives : suivi du cycle de vie de chaque pièce installée
- Alertes "dead age" quand une pièce dépasse sa durée de vie maximale
- Bouton de génération automatique de plan préventif

**Onglet Fournisseurs** :
- Liste des fournisseurs spécifiques à la pièce
- Fournisseurs hérités de la famille
- Informations : nom, référence fournisseur, prix, délai, email, téléphone, adresse, URLs
- Marquage fournisseur principal

**Onglet Machines** :
- Machines associées avec quantité recommandée

#### Permissions stock PDR
Les opérations de stock sont contrôlées par des permissions spécifiques par rôle :
- Créer entrée / Créer sortie
- Correction de stock / Inventaire
- Annulation de mouvement
- Gestion fournisseurs (voir, créer, modifier, supprimer)

---

### 3.6 Tickets de maintenance

**Routes** : `/tickets`, `/tickets/:id`

#### Liste des tickets
- Tableau : numéro, titre, machine, priorité, statut, date de création
- Recherche et filtres par statut, priorité, machine

#### Statuts du ticket
| Statut | Description |
|--------|-------------|
| Ouvert | Ticket créé, en attente de prise en charge |
| En cours | Intervention démarrée |
| Résolu | Intervention terminée |
| Clôturé | Ticket validé et fermé |

#### Détail du ticket
- Informations du ticket : titre, description, machine, priorité, type de panne
- Historique des interventions
- Pièces consommées (PDR)

#### Clôture du ticket
- Optimisée pour usage mobile
- Saisie obligatoire :
  - Cause racine de la panne
  - Pièces consommées (avec quantités)
  - Notes de clôture

---

### 3.7 Maintenance préventive

**Routes** : `/preventif`, `/preventif/new`, `/preventif/:id`, `/preventif/:id/edit`

#### Liste des plans préventifs
- Tableau avec filtres : statut du plan (brouillon, validé, suspendu), machine, ligne
- Badge de statut coloré
- Alerte "En retard" si l'échéance est dépassée
- Indicateur de prochaine échéance

#### Formulaire de plan préventif
Workflow en cascade :
1. **Machine** → sélection de la machine cible
2. **Ligne** → ligne de production associée (auto-détectée si la machine est affectée)
3. **Fréquence** → quotidien, hebdomadaire, bimensuel, mensuel, trimestriel, semestriel, annuel
4. **Type de maintenance** → mécanique, électrique, lubrification, nettoyage, inspection, calibration
5. **Checklist** → liste d'opérations à réaliser (ajout dynamique)
6. **PDR nécessaires** → sélection des pièces avec quantités
7. **Maintenanciers assignés** → affectation des techniciens responsables

#### Statuts du plan
| Statut | Description |
|--------|-------------|
| Brouillon | Plan en cours de rédaction |
| Validé | Plan actif, génère des échéances |
| Suspendu | Plan temporairement désactivé |

#### Exécution d'un plan préventif
- Accessible depuis le détail du plan ou la vue Shift
- Formulaire d'exécution :
  - **Date d'exécution**
  - **Temps d'intervention** (durée réelle)
  - **Checklist** : validation point par point (OK / NOK)
  - **PDR utilisées** : confirmation des pièces consommées (pré-remplies depuis le plan)
  - **Notes** : observations du technicien
- Historique des exécutions avec colonnes : date, exécutant, PDR utilisées, résultats checklist

---

### 3.8 Shift Maintenance

**Route** : `/maintenance/shift`

Vue dédiée au maintenancier pour son quart de travail.

#### Organisation
- **Onglet Curatif** : tickets de maintenance assignés au maintenancier
  - Liste des tickets ouverts et en cours
  - Accès rapide au détail du ticket
  - Image de la machine/équipement concerné
- **Onglet Préventif** : plans préventifs assignés au maintenancier
  - Liste des plans à exécuter (échéances du jour/semaine)
  - Bouton d'exécution rapide
  - Image de la machine concernée
- Indicateurs visuels : compteurs par onglet, badges de priorité/urgence
- Filtres par ligne de production

---

### 3.9 Journal des interventions

**Route** : `/maintenance/journal`

Journal centralisé de toutes les activités de maintenance.

#### Filtres disponibles
| Filtre | Description |
|--------|-------------|
| Période | Date de début et date de fin (Du / Au) |
| Type | Onglets : Tous, Curative, Préventive (avec compteurs) |
| Ligne | Ligne de production |
| Machine | Machine spécifique |
| Maintenancier | Technicien ayant réalisé l'intervention |

#### Informations affichées
- Type d'intervention (curative / préventive)
- Machine et ligne concernées
- Technicien responsable
- Date et durée de l'intervention
- Statut (en cours, terminée)
- Lien direct vers le document source (ticket ou plan préventif)

---

### 3.10 Analyse & KPI

**Route** : `/analytics`

Tableau de bord analytique avec indicateurs de performance.

#### Filtres
- Période personnalisable (date début / date fin)
- Comparaison avec la période précédente

#### KPI disponibles
- MTBF (Mean Time Between Failures)
- MTTR (Mean Time To Repair)
- Taux de disponibilité des machines
- Nombre d'interventions curatives vs préventives
- Coût de maintenance (consommation PDR)
- Tendances temporelles (graphiques)

---

## 4. Module GPAO — Production

### 4.1 Dashboard Production

**Route** : `/gpao`

Indicateurs de production en temps réel :
- OF en cours / terminés / planifiés
- Taux de rendement
- Quantités produites vs prévues
- Taux de rebut

---

### 4.2 Ordres de fabrication

**Routes** : `/gpao/of`, `/gpao/of/:id`

#### Liste des OF
- Numéro, produit, ligne, statut, quantités, dates
- Filtres par statut, ligne, produit

#### Statuts de l'OF
| Statut | Description |
|--------|-------------|
| Planifié | OF créé, pas encore démarré |
| En cours | Production active |
| Terminé | Production achevée |
| Annulé | OF annulé |

#### Détail de l'OF
- Produit fabriqué, recette utilisée
- Quantités : prévue, produite, rebut
- Ligne de production assignée
- Mode de fonctionnement : 3×8 (par défaut), 2×8, 1×8, Surface
- Changement de mode en cours d'exécution (tracé dans l'historique `of_mode_history`)
- Déclarations de production par shift
- Consommations matières premières
- Arrêts de production

---

### 4.3 Produits

**Routes** : `/gpao/produits`, `/gpao/produits/:id`

- Code, désignation, famille, unité, poids unitaire
- Code ERP (référence externe)
- Familles de produits hiérarchiques
- Configuration des niveaux de conditionnement (packaging) :
  - Niveaux multiples (unité, carton, palette…)
  - Coefficients de conversion
  - Poids par niveau

---

### 4.4 Articles (Matières premières)

**Routes** : `/gpao/articles`, `/gpao/articles/:id`

- Code, désignation, famille, unité
- Stock actuel, stock minimum
- Prix unitaire, fournisseur
- Code ERP

---

### 4.5 Recettes

**Route** : `/gpao/recettes`

- Association produit → liste d'articles (matières premières)
- Quantités et unités par ligne de recette
- Versioning des recettes
- Statut actif/inactif

---

### 4.6 Shift Production

**Route** : `/gpao/shift`

Écran opérateur pour les déclarations en temps réel :
- Sélection du shift actif
- Déclaration de production horaire (quantité produite, rebut)
- Déclaration des consommations matières
- Déclaration des arrêts

---

### 4.7 Consommations

**Route** : `/gpao/consommations`

- Historique des consommations de matières premières
- Filtre par OF, article, shift
- Quantités et unités consommées

---

### 4.8 Arrêts

**Route** : `/gpao/arrets`

#### Types d'arrêt
| Type | Description |
|------|-------------|
| Panne | Arrêt suite à une défaillance |
| Changement de format | Reconfiguration de la ligne |
| Nettoyage | Arrêt pour nettoyage |
| Pause | Arrêt planifié (pause équipe) |
| Approvisionnement | Attente de matière première |
| Qualité | Arrêt pour contrôle qualité |
| Autre | Autre motif |

- Durée en minutes (calculée automatiquement si heure de fin renseignée)
- Lien vers ticket de maintenance si applicable
- Filtre par OF, ligne, machine, shift

---

## 5. Administration & Paramètres

**Route** : `/parametres`

L'administration est organisée en 4 pôles :

### 5.1 Sécurité & Accès

| Page | Description |
|------|-------------|
| **Utilisateurs** | Gestion des comptes : prénom, nom, poste, statut actif/inactif |
| **Matrice des rôles** | Attribution des permissions par module et par rôle (Voir, Créer, Modifier, Supprimer) |
| **Permissions documents** | Droits d'accès aux documents par rôle et type d'entité |
| **Permissions stock PDR** | Droits spécifiques aux opérations de stock |

### 5.2 Référentiels & Classification

| Page | Description |
|------|-------------|
| **Familles machines** | Arborescence hiérarchique des familles de machines |
| **Familles produits** | Classification des produits |
| **Familles PDR** | Classification des pièces de rechange (avec héritage de propriétés) |
| **Types de pannes** | Référentiel des types de pannes |
| **Catégories documents** | Catégories pour classer les documents |

### 5.3 Production & Organisation

| Page | Description |
|------|-------------|
| **Lignes** | Configuration des lignes de production |
| **Shifts** | Définition des plages horaires par équipe |

### 5.4 Configuration générale

| Page | Description |
|------|-------------|
| **Paramètres généraux** | Paramètres système de l'application |
| **Media / Images** | Configuration de la taille maximale des images |

---

## 6. Gestion documentaire

Système de gestion documentaire intégré à toutes les entités (machines, équipements, PDR…).

### Fonctionnalités
- Upload de fichiers (PDF, Word, Excel, images…)
- Catégorisation par type de document
- Description et métadonnées
- Téléchargement et prévisualisation
- Historique d'audit (qui a uploadé, quand, modifications)

### Permissions par rôle
- Voir les documents
- Uploader des documents
- Modifier les métadonnées
- Télécharger
- Supprimer

---

## 7. Gestion des images

### Fonctionnalités
- Galerie d'images pour chaque entité (machine, équipement, produit…)
- Image principale (thumbnail) affichée dans les listes et vues détail
- Ordre de tri personnalisable
- Taille maximale configurable dans les paramètres
- Lightbox pour visualisation en plein écran

---

## 8. Rôles & Permissions

### Rôles disponibles

| Rôle | Code | Description |
|------|------|-------------|
| Administrateur | `admin` | Accès total à tous les modules |
| Responsable maintenance | `resp_maintenance` | Gestion complète de la maintenance |
| Maintenancier | `maintenancier` | Exécution des interventions et plans préventifs |
| Responsable production | `resp_production` | Gestion de la production |
| Chef de ligne | `chef_ligne` | Supervision d'une ligne de production |
| Opérateur | `operateur` | Déclarations de production |
| Gestionnaire magasin | `gestionnaire_magasin` | Gestion des stocks PDR et articles |
| Bureau méthode | `bureau_methode` | Configuration et ingénierie |

### Matrice des permissions

La matrice couvre les modules suivants avec 4 actions (Voir, Créer, Modifier, Supprimer) :
- Machines, Équipements, Lignes, PDR
- Tickets, Préventif, Interventions
- OF, Produits, Articles, Recettes
- Consommations, Arrêts, Shifts
- Paramètres, Utilisateurs

Un utilisateur peut avoir **plusieurs rôles** — les permissions sont fusionnées avec une logique **OU** (le droit le plus permissif s'applique).

---

## 9. Export de données

### Export CSV
- Disponible sur les listes principales (machines, tickets, PDR, OF…)
- Exporte les données filtrées (les filtres actifs sont appliqués à l'export)
- Colonnes configurées automatiquement selon le contexte

### Import CSV
- Disponible pour certaines entités (OF, articles…)
- Composant d'import avec mapping des colonnes
- Validation des données avant insertion
- Rapport d'erreurs en cas de données invalides

---

## 📝 Notes techniques

### Navigation
- Barre latérale (sidebar) rétractable avec deux sections : Maintenance et Production
- Breadcrumb sur les pages de détail
- Responsive : adapté desktop et mobile

### Notifications
- Toasts (notifications temporaires) pour les actions réussies ou erreurs
- Alertes visuelles pour les stocks critiques et plans en retard

### Devise
- L'application utilise le **Dinar Algérien (DA)** comme devise par défaut pour tous les montants (PMP, prix unitaire, coûts).

---

*Document généré pour PROD IN TIME — Version actuelle au 05/04/2026*
