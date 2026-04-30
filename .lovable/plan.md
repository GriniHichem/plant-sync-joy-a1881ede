## Objectif

1. Garantir que **Code ERP** est disponible (et **optionnel**) pour Machines, Équipements, Organes et PDR.
2. Ajouter un **scanner caméra (QR + code-barres)** réutilisable qui résout un code scanné vers une entité (PDR, organe, machine, équipement) en interrogeant `code_erp`, `qr_code`, `code_barres`, `code` et `reference`.
3. Brancher le scanner comme **aide à la sélection** (jamais bloquante) sur les écrans clés : consommation, ticket maintenance, intervention shift, plan préventif, sortie/entrée PDR, fiches détail.

## État actuel constaté

| Table | `code_erp` | `qr_code` | `code_barres` |
|---|---|---|---|
| machines | ✅ | ✅ | — |
| organes | ✅ | — | — |
| pdr | ✅ | ✅ | ✅ |
| equipements | ❌ | ❌ | — |

Aucune librairie de scan n'est installée. Les formulaires Machine/Organe/PDR/Équipement n'exposent pas non plus les champs ERP/QR dans l'UI (colonnes DB existantes mais "orphelines").

## Plan d'implémentation

### 1. Migration DB
- Ajouter sur `equipements` : `code_erp text`, `qr_code text` (nullable, non-unique).
- Ajouter sur `organes` : `qr_code text` et `code_barres text` (nullable) pour homogénéiser.
- Index `btree` partiels (WHERE NOT NULL) sur `code_erp`, `qr_code`, `code_barres` des 4 tables pour accélérer la résolution scan.
- Étendre les triggers `*_search_refresh` correspondants pour inclure les nouveaux champs dans le FTS.

### 2. RPC de résolution scan
Créer `resolve_scanned_code(p_code text)` qui retourne `(entity_type, entity_id, code, label, url)` en cherchant dans cet ordre, sur les 4 tables :
`code_erp` → `qr_code` → `code_barres` → `reference` (PDR) → `code` (autres).
Insensible à la casse, trim, retourne plusieurs lignes si ambiguïté (l'UI proposera un choix).

### 3. Champs ERP/QR dans les formulaires
Ajouter une section "Identifiants externes" (collapsible) dans :
- `MachineForm.tsx` — `code_erp`, `qr_code`
- `EquipmentForm.tsx` — `code_erp`, `qr_code` (nouveaux)
- `OrganeForm.tsx` — `code_erp`, `qr_code`, `code_barres`
- `PdrForm.tsx` — `code_erp`, `qr_code`, `code_barres`

Tous **optionnels**, avec un bouton "Scanner" inline qui remplit le champ depuis la caméra (utile pour enrôler le code QR collé sur une pièce).

### 4. Composant scanner réutilisable
Installer **`@zxing/browser`** (ZXing, MIT, supporte QR + EAN/Code128/Code39 — couvre 99% des étiquettes industrielles).

Créer :
- `src/lib/scanResolver.ts` — wrapper du RPC `resolve_scanned_code` + fallback recherche locale.
- `src/components/scanner/ScannerDialog.tsx` — dialog plein écran : preview vidéo, sélection caméra (préférence "environment"), torche si supportée, saisie manuelle de secours, beep + vibration sur match, debounce anti-doublon.
- `src/components/scanner/ScanButton.tsx` — bouton icône `<ScanLine />` qui ouvre le dialog et renvoie le résultat via callback `onResolved(entity)`.
- `src/hooks/useScanner.ts` — encapsule lifecycle ZXing (start/stop, gestion permissions, erreurs).

Comportement :
- Si **0 résultat** → toast "Code non reconnu" + champ pré-rempli avec la valeur scannée (l'utilisateur peut continuer manuellement, **jamais bloquant**).
- Si **1 résultat** → sélection automatique.
- Si **N résultats** → liste de désambiguïsation dans le dialog.
- Filtre optionnel `allowedTypes: ('pdr'|'machine'|'organe'|'equipement')[]` pour restreindre par contexte.

### 5. Branchement dans l'app
Ajouter un `ScanButton` à côté des `Select` PDR/machine/organe sur :
- `ConsumptionPage.tsx` (sélection article/PDR consommé)
- `ProductionShiftStop.tsx`, `ProductionShiftTicket.tsx`, `MaintenanceShiftIntervention.tsx` (sélection machine)
- `PreventifForm.tsx` (sélection PDR de la liste préventive)
- `TicketDetail.tsx` (ajout PDR consommé pendant intervention)
- `PdrList.tsx`, `MachinesList.tsx`, `OrganesList.tsx`, `EquipmentsList.tsx` : bouton "Scanner" dans la barre d'actions → ouvre la fiche détail si match unique, sinon filtre la liste.
- `GlobalSearchPalette.tsx` : icône scan dans l'input pour scanner et router vers la fiche.

### 6. Affichage Code ERP
Afficher `code_erp` (si renseigné) sous forme de badge discret sur :
- `MachineDetail.tsx`, `EquipmentDetail.tsx`, `OrganeDetail.tsx`, `PdrDetail.tsx`
- Listes correspondantes (colonne ERP triable).
- Recherche globale : `code_erp` est déjà dans les `search_vector` des tables existantes ; ajout pour équipement via le trigger refresh.

### 7. Permissions & audit
- Pas de nouveau droit : la résolution scan reste limitée par les RLS existants (le RPC est `STABLE SECURITY DEFINER` mais retourne uniquement id/code/label, info déjà visible).
- Aucune écriture déclenchée par le scan → pas d'audit dédié. La sélection résultante (consommation, ticket…) est auditée comme aujourd'hui.

### 8. Tests
- `src/test/scanner/resolve.test.ts` : mock du RPC, vérifie priorité ERP > QR > barres > code, gestion 0/1/N résultats, filtre `allowedTypes`.
- `src/test/scanner/scan-button.test.tsx` : ouvre dialog, simule callback `onDetected`, valide qu'aucun résultat n'empêche la saisie manuelle.

### 9. Mémoire
Sauvegarder une note `mem://features/scanner-codes` : "Scanner QR/barres via ZXing, RPC `resolve_scanned_code`, jamais bloquant, fallback saisie manuelle, code_erp partout optionnel."

## Hors scope (à confirmer si voulu plus tard)
- Génération/impression d'étiquettes QR (PDF planches).
- Scan continu en mode inventaire (saisie en rafale).
- App mobile native Capacitor (le scanner web ZXing fonctionne déjà très bien sur Chrome/Safari mobile via la caméra).
