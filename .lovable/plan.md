# Consommation PDR robuste en préventif (clôture)

## Objectif
Permettre au maintenancier, à la clôture d'un plan préventif en cours, de :
1. **Confirmer** la consommation prévue des pièces déjà prises en main (holdings) — quantité ajustable, reliquat retourné au magasin (déjà en place, on le fiabilise).
2. **Ajouter des pièces non prévues (ad-hoc)** directement depuis le stock magasin pour gérer les imprévus, sans demande préalable.
3. **Garder la remarque** d'exécution (déjà présente).

Le tout en gardant la logique simple, rapide, et sans bloquer l'opération.

## État actuel
- Backend déjà en place et vérifié : RPC `consume_maintenance_holding_preventive` (pièces prises) et `consume_adhoc_pdr_preventive` (pièces non prévues, type `pdr_adhoc`, garde-fou backend OK).
- Frontend `PreventifDetail.tsx` : le dialogue « Terminer l'intervention » consomme seulement les holdings. Pas de saisie ad-hoc.
- Le wrapper `consumeAdhocPdrPreventive` n'existe pas encore dans `usePdrRequests.ts`.

## Changements

### 1. `src/hooks/usePdrRequests.ts`
Ajouter le wrapper :
```text
consumeAdhocPdrPreventive({ execution_id, pdr_id, qte_consomme, position_id?, cause?, commentaire? })
  -> supabase.rpc("consume_adhoc_pdr_preventive", { ... })
```

### 2. `src/pages/PreventifDetail.tsx` — dialogue de clôture
- Charger la liste PDR disponible (référence, désignation, stock_actuel) pour la recherche ad-hoc (réutiliser un simple `supabase.from("pdr").select(...)`, filtré par recherche, limité).
- Nouvelle section **« Ajouter une pièce non prévue »** dans le dialogue :
  - Champ recherche (réf / désignation) + sélection pièce + quantité.
  - Liste locale des pièces ad-hoc ajoutées (avec suppression ligne), affichage du stock dispo et alerte si quantité > stock.
- État local : `adhocLines: { pdr_id, reference, designation, quantite, stock }[]`.
- À la validation `submitExecution` (séquentiel, après les holdings) :
  - Pour chaque ligne ad-hoc avec qte > 0 : `consumeAdhocPdrPreventive(...)` (try/catch tolérant, log si échec, ne bloque pas la clôture).
  - Inclure les pièces ad-hoc dans `consumedList` (`pdr_used`) et dans le log d'audit.
- Réinitialiser `adhocLines` à l'ouverture du dialogue (`openExecDialog`).
- L'historique PDR (onglet) reprend automatiquement ces consommations via `intervention_pdr` (déjà branché sur `preventive_execution_id`), aucune modif supplémentaire.

## Garde-fous (sécurité / non-régression)
- On ne touche ni aux triggers ni aux RPC (déjà validés).
- Consommations toujours via RPC métier (jamais d'écriture directe stock).
- La clôture reste possible même sans pièce ; les erreurs sur une ligne n'empêchent pas la clôture des autres et de l'exécution.
- Validation UI : quantité > 0 et ≤ stock dispo avant envoi (alerte visuelle, non bloquante au sens où on n'envoie pas une ligne invalide).

## Détails techniques
Fichiers modifiés : `src/hooks/usePdrRequests.ts`, `src/pages/PreventifDetail.tsx`. Aucune migration nécessaire (backend prêt). Réutilisation des composants UI existants (Input, Select/Command, Button, Badge).
