## Plan : Manuel utilisateur exhaustif (MANUAL.md v2)

### Objectif
Transformer le `MANUAL.md` actuel (624 lignes, descriptif) en un manuel **exhaustif** documentant pour chaque module : workflows pas-à-pas, **règles de validation**, **cas particuliers**, **exceptions et messages d'erreur**, **comportements conditionnels**, et **interactions inter-modules**.

### Structure cible (~1500-1800 lignes)

#### 0. Glossaire & Conventions (NOUVEAU)
- Acronymes : GMAO, GPAO, OF, PDR, PMP, MTBF, MTTR, RBAC, RLS
- Conventions : champs obligatoires (*), badges de statut, codes couleur
- Format dates/heures, devise (DA)

#### 1. Présentation & Architecture (enrichi)
- Stack technique détaillée
- Modèle de données global (entités principales et leurs relations)
- Cycle de vie utilisateur type (login → dashboard → action)

#### 2. Authentification — cas exhaustifs
- Inscription (signup) : champs requis, validation email
- Connexion : **erreurs possibles** (email non vérifié, identifiants invalides, compte inactif)
- Reset password : flow complet, expiration du lien
- Première connexion : création automatique du profil via trigger `handle_new_user`
- Déconnexion et expiration de session

#### 3. GMAO — par sous-module avec sections normalisées
Pour **chaque** sous-module (Machines, Équipements, Lignes, PDR, Tickets, Préventif, Shift, Journal, Analytics) :
- **Routes** et permissions requises
- **Workflow création** (étapes, champs obligatoires/optionnels, valeurs par défaut)
- **Règles de validation** (unicité du code, formats, plages numériques)
- **Cas particuliers** :
  - PDR stratégique → lien machine **obligatoire**
  - PDR durée de vie : min ≤ max
  - Sortie PDR bloquée si quantité > stock
  - Inventaire = valeur absolue (remplace, n'ajoute pas)
  - Suppression machine bloquée si tickets/PDR/préventifs liés
  - Suppression produit/article bloquée si utilisé (recettes/OF/consommations)
- **Workflow ticket complet** : création → prise en charge → résolution (cause racine + PDR consommés obligatoires) → clôture
- **Workflow préventif complet** : brouillon → validé → exécution (calcul `prochaine_echeance` selon fréquence) → suspension/réactivation
- **Filtres et reset** : nouveau bouton "Réinitialiser" disponible sur PreventifList, InterventionJournal, TicketsList, MachinesList, PdrList, OfList
- **Filtre par ligne** dans Préventif : prend en compte `machine_line_assignments` (cascade ligne → machines)
- **Liens transverses** : MachineDetail → préventif filtré ligne, LineSynoptic → préventif, LinesList → action préventif

#### 4. GPAO — par sous-module
Pour OF, Produits, Articles, Recettes, Shift, Consommations, Arrêts :
- **Workflow OF** : création → démarrage → déclarations horaires → clôture
- **Changement de mode shift** en cours d'OF : motif obligatoire, traçabilité dans `of_mode_history`
- **Tolérance de saisie horaire** : paramètre `tolerance_saisie_heures`, blocage de saisie hors fenêtre
- **Consommations hors jour** : correction nécessite motif, audit log automatique
- **Arrêts** : durée auto-calculée, lien optionnel vers ticket
- **Suppression** : règles de blocage avec messages exacts
- **Prix articles** affichés en **DA** (Dinar Algérien)

#### 5. Workflows transverses (NOUVEAU section dédiée)
- **Génération auto de plan préventif** depuis PDR (instances actives + dead age)
- **Création ticket depuis Shift Production** (ouvre dialog dans `ShiftScreen`)
- **Lien ticket ↔ arrêt production**
- **Image principale** : auto-affectation si première image uploadée
- **Permissions documents** : héritage par type d'entité

#### 6. Administration — détails par page
Pour chaque page sous `/parametres` :
- Qui peut accéder (rôle requis)
- Actions disponibles
- Cas particuliers : impossibilité de supprimer un rôle attribué, gestion des familles avec enfants, etc.
- **UsersAdmin** : création utilisateur via signup, ajout/suppression rôle, photo profil
- **RolesMatrix** : toggle CRUD, "accès complet", merge OR multi-rôles
- **Shifts** : édition inline des plages horaires

#### 7. Documents & Images (enrichi)
- Buckets de stockage : `entity-documents`, `entity-images`, `machine-documents`
- Workflow upload : sélection → catégorie → description → upload
- Limites de taille (configurable via `useImageMaxSize`)
- Permissions granulaires par entité (machine, equipement, pdr, produit, article, user, intervention)
- Lightbox, ordre de tri, image principale

#### 8. Rôles & Permissions — exhaustif
- Tableau complet : 8 rôles × ~16 modules × 4 actions = matrice détaillée
- Logique OR pour utilisateurs multi-rôles
- Fonctions SQL : `has_role()`, `check_permission()`, `check_document_permission()`
- Rôles spéciaux pour PDR stock (entrée, sortie, correction, inventaire, annulation, fournisseurs)

#### 9. Export / Import CSV
- Pages avec export, format colonnes par entité
- Import OF : mapping colonnes, validations, rapport d'erreurs

#### 10. Cas d'erreur & Dépannage (NOUVEAU)
Tableau récapitulatif :
| Situation | Message affiché | Cause | Solution |
|---|---|---|---|
| Suppression machine | "Impossible de supprimer : utilisée dans X tickets" | Dépendances FK | Clôturer/réassigner d'abord |
| Sortie PDR | "Stock insuffisant" | qte > stock_actuel | Faire entrée d'abord |
| Préventif sans PDR | "Veuillez sélectionner au moins une opération" | Checklist vide | Ajouter opérations |
| Ticket résolution | "Cause racine obligatoire" | Champ vide | Renseigner |
| Email non vérifié | "Vérifiez votre email" | Compte non confirmé | Cliquer lien email |
| RLS denied | "Vous n'avez pas la permission" | Rôle insuffisant | Contacter admin |
| Saisie hors tolérance | Slot grisé | Hors fenêtre `tolerance_saisie_heures` | Déclarer dans la fenêtre |

#### 11. Annexes
- Liste exhaustive des routes (`/`, `/machines`, `/tickets/:id`, etc.)
- Liste des tables principales et leur usage
- Changelog du manuel (date de mise à jour, version)

### Méthode
1. Lire en complément les pages clés non encore inspectées en détail (`PdrDetail`, `MachineDetail`, `EquipmentDetail`, `Auth`, `LineSynoptic`, `LineConfig`, `RolesMatrix`, hooks de permissions) pour extraire les **messages exacts**, validations et cas conditionnels.
2. Réécrire `MANUAL.md` complet avec la structure ci-dessus en français, en conservant le ton du document actuel.
3. Pas de modification du code applicatif — uniquement le fichier `MANUAL.md`.

### Fichier modifié
- `MANUAL.md` (réécriture complète, ~1500-1800 lignes)
