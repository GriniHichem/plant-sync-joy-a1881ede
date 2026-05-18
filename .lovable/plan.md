## Historique des scans QR / code-barres

Créer un journal persistant et consultable de tous les scans effectués via `ScannerDialog`, avec horodatage, utilisateur, type de code et résultat (succès / échec / ambigu).

### 1. Base de données

Nouvelle table `public.scan_history` :
- `id uuid pk`
- `user_id uuid` (auth.uid())
- `scanned_at timestamptz default now()`
- `raw_value text` — valeur brute lue
- `normalized_value text` — sortie de `normalizeScanInput`
- `source text` — `camera` | `manual` | `enroll`
- `code_format text` — format ZXing détecté (QR_CODE, EAN_13, CODE_128, URL, UUID…) ou `unknown`
- `outcome text` — `resolved` | `ambiguous` | `not_found` | `enrolled` | `error`
- `match_quality text` — `url`/`uuid`/`exact`/`prefix`/null
- `matches_count int`
- `entity_type text` (pdr/machine/organe/equipement) — null si non résolu
- `entity_id uuid` — null si non résolu
- `entity_code text`, `entity_label text` — snapshot lisible
- `context text` — page d'origine (ex: `pdr_list`, `enroll_external_ids`)
- `error_message text` — si outcome=error
- `search_vector tsvector` (trigger `fts_build`)

Index : `(user_id, scanned_at desc)`, `(outcome)`, `(entity_type, entity_id)`, GIN sur `search_vector`.

RLS :
- SELECT : utilisateur voit ses propres scans ; admin + `responsable_si` voient tout.
- INSERT : authentifié, `user_id = auth.uid()`.
- UPDATE/DELETE : interdit (immuable, comme `audit_logs`).

Rétention : pas de purge auto au début (table légère). Documenter une purge manuelle optionnelle plus tard.

### 2. Logging côté client

Nouveau helper `src/lib/scanHistory.ts` :
- `logScan(entry: ScanHistoryEntry)` — `insert` direct dans `scan_history`, fire-and-forget (try/catch silencieux pour ne jamais bloquer un scan).
- Détecte le format depuis le payload : UUID regex, URL regex, sinon laisse `unknown` (ZXing renvoie le format dans `BarcodeFormat` — on l'expose depuis `useScanner.onDetected` via un 2e argument).

Branchements :
- `ScannerDialog.handleResolve` : log à chaque résolution (success/ambiguous/not_found) avec snapshot du 1er match si auto-sélection.
- Mode enrôlement : log `outcome=enrolled`, `entity_*` = null.
- Erreur RPC : log `outcome=error` + message.
- Saisie manuelle : `source=manual`.

`useScanner.ts` : étendre `onDetected(text, format?)` pour propager `BarcodeFormat` ZXing.

### 3. Page UI consultable

Nouvelle route `/parametres/scan-history` (composant `ScanHistoryPage.tsx`) :
- Accessible aux titulaires de la permission `parametres` (admin/resp_si voient tout, autres voient uniquement leurs scans — filtre serveur via RLS).
- KPI cards : total 24h, taux de succès, ambigus, non trouvés.
- Filtres : période (DateRangeFilter existant), outcome (chips), type d'entité, source, recherche texte (FTS sur `search_vector`).
- Tableau (pattern `AuditTable`) : date, utilisateur, source, format, valeur brute (tronquée + copy), outcome (badge coloré), entité (lien cliquable si résolu), match_quality.
- Bouton `ExportCsvButton` (composant existant).
- Détail au clic → `Sheet` avec payload complet + bouton "Rescanner" (réinjecte la valeur brute dans `ScannerDialog`).

### 4. Intégrations annexes

- `ScannerDialog` : remplacer l'historique sessionStorage (`HISTORY_KEY`) par un fetch des 6 derniers scans **réussis** de l'utilisateur courant depuis `scan_history` (fallback session si offline). Garde l'UX "Récents".
- `Apps.tsx` : ajouter une carte rapide vers `/parametres/scan-history` dans la catégorie "Paramètres".
- Sidebar `Parametres` : nouvelle entrée "Historique des scans".

### 5. Tests

- `src/test/scanner/scan-history.test.ts` :
  - `logScan` ne lève jamais (mock supabase rejette → silencieux).
  - Détection format (UUID, URL, code numérique → code-barres).
  - Mapping outcome selon résultat RPC (0 / 1+exact / 1+prefix / 2+).
- `src/test/scanner/scan-history-rls.test.ts` (logique permissions client) : non-admin ne voit pas un scan d'autrui (filtre `.eq('user_id', uid)` appliqué côté hook).

### 6. Mémoire

Mettre à jour `mem://features/scanner-codes` pour mentionner la table `scan_history`, le logging fire-and-forget, et la page `/parametres/scan-history`.

### Détails techniques

- Migration SQL : table + RLS + trigger FTS + index. Aucune modification du RPC `resolve_scanned_code`.
- Le logging passe par `supabase.from('scan_history').insert(...)` sans `await` bloquant l'UI (Promise détachée + catch console.warn).
- `BarcodeFormat` ZXing → string via `BarcodeFormat[format]`.
- Le bouton "Rescanner" depuis le détail réouvre `ScannerDialog` avec `manual` pré-rempli.
- Pas d'impact sur le mode enrôlement existant : on log juste l'événement.
- Compatible self-hosting (RLS standard, pas de service role).