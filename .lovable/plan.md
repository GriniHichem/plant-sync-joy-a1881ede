# Inventaire — Deux types de campagne : PDR et Investissement

## Objectif
Aujourd'hui une campagne d'inventaire ne génère des articles à compter que pour les **PDR** (pièces de rechange), filtrés par famille PDR, avec double comptage Agent A/B + arbitrage C.

On ajoute un **deuxième type exclusif** : **Investissement**, qui couvre **machines, équipements et organes**, filtré **par famille de machine**, avec choix des catégories à inclure. Le comptage se fait en **présence** (présent = 1 / absent = 0). Toute la mécanique double comptage A/B/C, écarts, arbitrage et clôture est réutilisée telle quelle.

Choix validés :
- Type **exclusif** choisi à la création (PDR **ou** Investissement, jamais mélangé).
- Investissement : filtrage **par famille de machine** + cases pour inclure **machine / équipement / organe**.
- Comptage **présence** (présent/absent).
- Affectation agents : **même logique par famille** que les PDR.

## Comportement attendu

### Création de campagne
- En haut du formulaire : un choix **Type de campagne** (PDR / Investissement).
- **PDR** → inchangé : familles PDR + agents par famille PDR (les cases « PDR / Organes » actuelles sont remplacées par ce sélecteur).
- **Investissement** →
  - Cases à cocher des catégories : **Machines**, **Équipements**, **Organes** (au moins une requise).
  - Périmètre : liste des **familles de machine** (avec sous-familles).
  - Affectations Agent A/B/(C) : familles autorisées = sous-ensemble des familles de machine du périmètre (même UI que PDR).

### Lancement (génération des articles)
- PDR : inchangé.
- Investissement : pour chaque catégorie cochée, on crée un article à compter pour chaque actif **actif** dont la famille de machine est dans le périmètre :
  - Machine → famille = sa propre `family_id`.
  - Équipement → famille = sa propre `family_id`.
  - Organe → famille = celle de sa machine (ou de son équipement) parente. Un organe sans famille rattachable est **ignoré** (impossible à affecter à un agent).
  - `quantité système = 1` pour chaque actif.

### Écran de comptage agent
- Pour une campagne Investissement, l'agent voit ses familles de machine, scanne machine/équipement/organe.
- Saisie en **présence** : deux boutons **Présent (1)** / **Absent (0)** au lieu du champ quantité libre. (PDR garde la saisie quantité décimale.)
- Le bouton « Fiche » ouvre la bonne page selon le type (`/machines/:id`, `/equipements/:id`, `/organes/:id`, ou `/pdr/:id`).

### Suivi / détail campagne
- Badge du type de campagne.
- Le tableau écarts / A / B / C / décision reste identique (générique). Pour l'investissement, A et B valent 1 ou 0, l'écart révèle un actif vu par l'un et pas par l'autre.
- Liste des campagnes : afficher le type.

## Détails techniques

### Migrations base de données
1. **Enum type de campagne** : `CREATE TYPE inventory_campaign_type AS ENUM ('pdr','investissement')`.
2. **Valeurs enum entités** : `ALTER TYPE inventory_entity_type ADD VALUE 'machine'` et `'equipement'` (`organe` existe déjà). À faire dans une migration distincte/préalable car PG interdit d'utiliser une valeur d'enum ajoutée dans la même transaction.
3. **Colonnes `inventory_campaigns`** :
   - `campaign_type inventory_campaign_type NOT NULL DEFAULT 'pdr'` (les campagnes existantes restent PDR).
   - `scope_machines boolean NOT NULL DEFAULT false`, `scope_equipements boolean NOT NULL DEFAULT false` (réutilise `scope_organes` existant ; `scope_pdr` reste pour le type PDR).
4. **`inv_family_descendants(uuid)`** : réécrire pour recurser sur l'union de `pdr_families` **et** `machine_families` (les UUID sont uniques par table, donc la résolution est correcte selon la table qui contient l'id). Ainsi `inv_campaign_authorized_families` et `inv_assignment_authorized_families` fonctionnent sans changement pour les deux types.
5. **`inv_ensure_targets(uuid)`** : ajouter une branche selon `campaign_type` :
   - `pdr` : logique actuelle inchangée.
   - `investissement` : insertions conditionnelles selon `scope_machines/scope_equipements/scope_organes`, `qty_systeme = 1`, `family_id` résolue comme décrit, filtrées par `inv_campaign_authorized_families`, `ON CONFLICT DO NOTHING`. Organes : `family_id = COALESCE(machine.family_id, equipement.family_id)` et exclure ceux sans famille dans le périmètre.
   - L'insertion des `inventory_results` reste générique.
- `inv_register_count` / `inv_recompute_result` : **aucun changement** (déjà agnostiques au type, exigent juste un `family_id` non nul et autorisé → garanti par la résolution ci-dessus).

### Frontend
- `src/hooks/useInventoryCampaigns.ts` : ajouter `campaign_type`, `scope_machines`, `scope_equipements` au type.
- `src/pages/inventaire/InventoryCampaignNew.tsx` :
  - Sélecteur de type ; chargement conditionnel des familles (`pdr_families` vs `machine_families`).
  - Cases catégories pour l'investissement.
  - À l'enregistrement : poser `campaign_type` et les `scope_*` adéquats ; `scope_pdr=false` pour investissement.
- `src/pages/inventaire/InventoryCampaignDetail.tsx` : badge type ; libellés inchangés.
- `src/pages/inventaire/InventoryCountScreen.tsx` :
  - Charger les familles depuis `machine_families` si investissement.
  - `ScanButton allowedTypes` selon le type (`["machine","equipement","organe"]` vs `["pdr","organe"]`).
  - Mode présence : boutons Présent/Absent (envoient 1/0 via `inv_register_count`).
  - Lien « Fiche » routé par `entity_type`.
- `src/pages/inventaire/InventoryCampaignsList.tsx` : afficher le type.

### Vérifications
- Compatibilité ascendante : campagnes existantes → `campaign_type='pdr'`, comportement identique.
- `bun run build` + tests Vitest existants ; vérifier qu'une campagne investissement génère bien des cibles et que le comptage présence calcule les écarts.
