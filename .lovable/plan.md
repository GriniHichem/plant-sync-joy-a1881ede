
# Phase 1 — Forge & Flow : Fondation + Module GMAO

## Vue d'ensemble
Construire la base de données relationnelle, l'authentification avec rôles, et le module GMAO complet (gestion du parc machine, maintenance préventive et corrective, pièces de rechange). Interface optimisée tablette, design industriel "Matte Ceramic".

---

## Étape 1 : Fondation technique
- **Authentification** : Login/signup avec session individuelle par utilisateur
- **Table des rôles** : `user_roles` séparée avec enum (`admin`, `resp_maintenance`, `maintenancier`, `resp_production`, `chef_ligne`, `operateur`, `gestionnaire_magasin`)
- **Fonction `has_role()`** : Security definer pour les policies RLS
- **Table `profiles`** : Nom, prénom, poste, avatar, lié à `auth.users`
- **Table `app_settings`** : Configuration SMTP et paramètres applicatifs
- **Table `audit_logs`** : Traçabilité complète (user, action, table, old/new values, timestamp)
- **Règles self-hosting** : Migrations idempotentes, `verify_jwt = false`, CORS complet

## Étape 2 : Schéma BDD GMAO
- **`machine_families`** : Familles et sous-familles (arborescence parent_id)
- **`machines`** : Code, désignation, famille, criticité (A/B/C), statut (En marche / Arrêt / Maintenance), localisation, date mise en service
- **`machine_documents`** : Plans, photos, manuels liés à une machine (storage bucket)
- **`pdr`** (Pièces de rechange) : Référence, désignation, stock actuel, stock min, prix unitaire, fournisseur, fiche technique
- **`machine_pdr`** : Liaison machines ↔ pièces de rechange
- **`panne_types`** : Types de panne paramétrables
- **`tickets`** : Machine, type de panne, priorité (Critique/Haute/Normale/Basse), statut (Ouvert/Pris en charge/En cours/Résolu/Clôturé), heure déclaration, heure prise en charge, description
- **`interventions`** : Ticket, maintenancier, date début/fin, description travaux, statut
- **`intervention_pdr`** : PDR consommées par intervention avec quantité
- **`preventive_plans`** : Machine, fréquence, dernière exécution, prochaine échéance, checklist
- **`preventive_executions`** : Historique d'exécution du préventif
- **Données démo** : 10+ machines, 3 familles, 20+ PDR, quelques tickets et interventions

## Étape 3 : Layout & Navigation
- **Rail vertical gauche** (`w-20`) avec icônes 32px : Dashboard, Machines, PDR, Tickets, Préventif, Paramètres
- **Header** : Nom utilisateur, rôle, déconnexion
- **Design tokens** : Palette industrielle (bleu `oklch(55% 0.18 260)`), surfaces matte `bg-slate-50`, boutons 48px minimum, `font-sans` (IBM Plex Sans ou Geist), `tabular-nums` sur toutes les valeurs
- **Responsive** : Tablette prioritaire (`md:` breakpoint principal)

## Étape 4 : Dashboard GMAO
- **KPI Cards** : Tickets ouverts, MTTR moyen, MTBF, Taux respect préventif
- **Liste tickets récents** avec badges de statut colorés (point pulsant pour "En cours")
- **Prochaines maintenances préventives** à venir
- **Machines en arrêt** actuellement

## Étape 5 : Gestion du Parc Machine
- **Liste machines** : Tableau filtrable/cherchable avec statut, famille, criticité
- **Fiche machine** : Onglets (Infos, Documents, PDR associées, Historique interventions, Préventif)
- **Ajout/modification machine** via formulaire (drawer latéral)
- **Upload documents et photos** (storage bucket Supabase)

## Étape 6 : Gestion PDR
- **Liste PDR** : Référence, désignation, stock actuel vs stock min (alerte visuelle si stock < min), prix
- **Fiche PDR** : Infos techniques, machines compatibles, historique de consommation
- **Ajout/modification PDR**
- **Liaison machine ↔ PDR**

## Étape 7 : Tickets Maintenance Corrective
- **Liste tickets** : Filtres par statut, priorité, machine, date
- **Écran ticket** : Timeline complète (déclaration → prise en charge → intervention → résolution → clôture)
- **Prise en charge** : Le maintenancier s'assigne le ticket, horodatage automatique
- **Clôture** : Champs obligatoires (description, PDR utilisées, cause racine)
- **Calculs automatiques** : Temps d'arrêt, temps d'intervention, temps de réponse

## Étape 8 : Maintenance Préventive
- **Planning calendrier** : Vue mensuelle des maintenances planifiées par machine
- **Création plan préventif** : Machine, fréquence, checklist de tâches
- **Exécution** : Validation checklist, notes, PDR utilisées
- **Alertes** : Préventifs en retard mis en évidence

## Étape 9 : Paramétrage & Administration
- **Gestion utilisateurs** : Liste, création, attribution de rôles
- **Référentiels** : Familles machines, types de panne, niveaux de criticité, statuts
- **Import/Export CSV** des machines et PDR
- **Journal d'audit** consultable

---

## Règles techniques appliquées (fichier self-hosting)
- Toutes les migrations SQL idempotentes (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- Edge Functions avec `verify_jwt = false` + auth manuelle dans le code
- Appels frontend via `supabase.functions.invoke()` uniquement
- Storage buckets créés avec `ON CONFLICT DO NOTHING`
- Aucune URL hardcodée, variables d'environnement partout
- CORS complet sur toutes les Edge Functions
- Rôles dans table séparée `user_roles` avec `has_role()` security definer
