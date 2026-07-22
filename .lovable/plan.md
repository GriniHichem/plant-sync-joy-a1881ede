## Objectif
Fiabiliser l'import CSV des tickets de pesée (module Réception → Consultation) pour absorber le format réel du fichier ERP fourni, corriger l'affichage des champs et l'analyse des dates/heures/poids.

## Constats sur le CSV fourni
19 colonnes ERP, exemple :
```
n_tick=1 ; Raison_cli=CLIENT DC-A ; Produit=DC-A
date_pesée_1=07/01/2026 ; heure_pesée_1=08:m47:12 ; Pesée_1=3 720 ; etat_pesée_1=M
date_pesée_2=09/07/2026 ; heure_pesée_2=10:m30:39 ; pesée_2=5 780 ; etat_pesée_2=A
net=1 340 ; Taux_abattement=0 ; abattement=0.000000
```
Particularités : dates `JJ/MM/AAAA`, heures avec `m` parasite (`08:m47:12`), poids avec espaces (`3 720`), pas de colonne "Date ticket" unique, poids brut = `Pesée_2` (camion chargé) ou `net` selon usage.

## Problèmes identifiés
1. UI import : les 9 champs affichés en `grid-cols-2` scrollent sous les mires ; utilisateur ne voit pas Date, Produit, Poids brut, Heure fin.
2. Bug mapping : l'UI envoie clés `date_ticket` et `poids_brut_kg`, la RPC lit `date` et `poids_brut` → obligatoires jamais reconnus.
3. Parsing SQL rigide : `::date` casse sur `07/01/2026`, `::time` casse sur `08:m47:12`, `::numeric` casse sur `3 720`.
4. Aliases automatiques absents pour les intitulés ERP (`n_tick`, `Raison_cli`, `Produit`, `Pesée_1/2`, `net`, `date_pesée_1/2`, `heure_pesée_1/2`, `Taux_abattement`).

## Plan de correction

### 1. Robustifier la RPC `import_reception_tickets` (migration SQL)
- Accepter les clés `date`/`date_ticket`, `poids_brut`/`poids_brut_kg` (alias serveur).
- Parsing date : tenter `to_date('DD/MM/YYYY')`, `to_date('YYYY-MM-DD')`, `::date` — le premier qui marche.
- Parsing heure : `regexp_replace(val, '[^0-9:]', '', 'g')` puis `::time`, tolérer `HH:MM` ou `HH:MM:SS`.
- Parsing numérique : `replace(replace(val,' ',''),',','.')` avant `::numeric` (poids et taux).
- Ajouter alias colonne `poids_net` optionnel : si `poids_brut` absent, utiliser `net` (déjà net) et forcer `taux_abattement=0` en interne (pesée déjà nette).
- Journaliser motif clair par ligne rejetée.

### 2. Corriger le mapping côté UI (`ReceptionGlobal.tsx`)
- Ré-uniformiser les clés envoyées : `numero`, `date`, `fournisseur`, `produit`, `taux_abattement`, `poids_brut`, `heure_debut`, `heure_fin`, `commentaire` (aligner sur la RPC).
- Étendre `aliases` :
  - `numero` : `n_tick`, `n_ticket`, `num_ticket`
  - `date` : `date_pesée_1`, `date_pesee_1`, `date_pesee`, `date_ticket`
  - `fournisseur` : `raison_cli`, `raison_sociale`, `client`
  - `produit` : `produit`, `code_produit`, `designation_produit`
  - `taux_abattement` : `taux_abattement`, `%abat`
  - `poids_brut` : `pesée_2`, `pesee_2`, `pesee2`, `poids_brut`, `brut`
  - `heure_debut` : `heure_pesée_1`, `heure_pesee_1`
  - `heure_fin` : `heure_pesée_2`, `heure_pesee_2`
- Ajouter champ optionnel `poids_net` (alias `net`, `pesée_net`) pour couvrir le cas ERP.

### 3. Améliorer la lisibilité de la modale (`CsvImportDialog.tsx`)
- Passer la grille de mapping en `grid-cols-1 md:grid-cols-3` compact (chip label + select étroit) pour rendre les 9 champs visibles sans scroll excessif.
- Ajouter un bandeau récap "X/Y champs obligatoires mappés" en haut avec liste rouge des manquants.
- Aperçu : conserver les 5 premières lignes, ajouter une colonne "état parsing" (✓ / motif) prévisualisant si les valeurs date/heure/poids seront acceptées (validation côté client sur les 5 lignes uniquement, pour éviter mauvaises surprises).

### 4. Auto-mapping renforcé (`receptionImport.ts`)
- `normalize()` : déjà retire accents/espaces — ajouter suppression du `°` et `.` en fin.
- Score de similarité : préférer match exact avant inclusion pour éviter que `date_pesée_2` batte `date_pesée_1` quand on cherche `date`.

## Non-objectifs
- Pas de refonte du modèle `reception_tickets`.
- Pas de gestion des lignes "Pesée_1 seule" (camion à vide sans sortie).
- Pas de rattachement automatique aux campagnes autre que la logique existante.

## Validation
- Test manuel sur les 5 premières lignes du fichier fourni : import doit passer avec `poids_brut = 5 780`, `date = 2026-01-07`, `heure_debut = 08:47:12`, `heure_fin = 10:30:39`.
- Rapport final doit distinguer : créés, remplacés, ignorés, rejetés (avec motif).
