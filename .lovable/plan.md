# Export CSV universel — tous les tableaux

## Objectif

Couvrir 100% des listes/tableaux de l'application avec un bouton **Exporter CSV** standardisé, respectant les filtres actifs et les permissions de l'utilisateur.

## État actuel

Déjà équipées (9 pages) :
- MachinesList, TicketsList, PdrList
- gpao/OfList, ProductsList, ArticlesList
- qualite/QualiteControles, Actions, NonConformites, Indicateurs, Rapports

À ajouter (≈28 pages/composants).

## Composant réutilisable

Créer `src/components/common/ExportCsvButton.tsx` :
- Props : `data`, `columns`, `filename`, `disabled?`, `variant?`, `size?`
- Wrappe `exportToCsv` (déjà existant dans `src/lib/exportCsv.ts`)
- Icône `Download`, libellé "Exporter CSV", désactivé si `data.length === 0`
- Toast de confirmation ("X lignes exportées")

Avantages : un seul point de maintenance, cohérence UI, testable.

## Pages à équiper

### GMAO — Listes principales
1. `LinesList.tsx`
2. `EquipmentsList.tsx`
3. `OrganesList.tsx`
4. `PreventifList.tsx`
5. `NotificationsPage.tsx`
6. `InterventionHistory.tsx`
7. `InterventionJournal.tsx`
8. `AuditPage.tsx` (si pas déjà via `auditExport`)
9. `ValidationsPage.tsx`
10. `SearchPage.tsx` (résultats)

### GPAO
11. `gpao/StopsPage.tsx`
12. `gpao/ConsumptionPage.tsx`
13. `gpao/RecipesPage.tsx`

### Qualité
14. `qualite/QualiteOf.tsx`
15. `qualite/QualiteTracabilite.tsx` (si pas déjà via `TracabiliteCsv`)
16. `qualite/QualiteRecettesNomenclatures.tsx`

### Inventaire
17. `inventaire/InventoryCampaignsList.tsx`
18. `inventaire/InventoryCampaignDetail.tsx` (table de comptage)

### Détails (sous-tableaux significatifs)
19. `MachineDetail.tsx` — onglets Organes / PDR / Historique
20. `EquipmentDetail.tsx` — sous-tableaux
21. `OrganeDetail.tsx` — PDR liés
22. `PdrDetail.tsx` — mouvements / positions / équivalences
23. `PreventifDetail.tsx` — historique
24. `gpao/OfDetail.tsx` — déclarations / arrêts / consommations
25. `gpao/ProductDetail.tsx`, `ArticleDetail.tsx`

### Paramètres (admin)
26. `parametres/UsersAdmin.tsx`
27. `parametres/LignesAdmin.tsx`, `ShiftsAdmin.tsx`
28. `parametres/FamillesAdmin.tsx`, `ProductFamiliesAdmin.tsx`, `PdrFamiliesAdmin.tsx`
29. `parametres/PannesAdmin.tsx`, `NotificationRulesAdmin.tsx`, `DocumentPermissionsAdmin.tsx`
30. `parametres/ValidationRulesAdmin.tsx`

## Règles d'implémentation

- **Données exportées = données filtrées** affichées (respect recherche + filtres actifs).
- **Colonnes** : reprendre celles du tableau visible + champs cachés utiles (id, dates ISO, codes parents).
- **Format** : conserver le séparateur `;` (Excel FR) et BOM UTF-8 déjà gérés.
- **Nom de fichier** : `<entité>_YYYY-MM-DD.csv` (date ajoutée par le helper).
- **Placement UI** : bouton à côté de "Nouveau" / actions principales, variant `outline`.
- **Permissions** : afficher le bouton à tous les utilisateurs ayant accès à la page (lecture = export). Pas de gating supplémentaire.

## Tests

Étendre `src/test/gpao/export-csv.test.ts` ou créer `src/test/common/export-csv-button.test.tsx` :
- Rend bouton désactivé si data vide.
- Appelle `exportToCsv` avec colonnes et filename corrects.
- Respecte les données filtrées (pas le dataset complet).

## Détails techniques

```tsx
// src/components/common/ExportCsvButton.tsx
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { toast } from "@/hooks/use-toast";

type Col<T> = { key: string; label: string; format?: (v: any, r: T) => string };

export function ExportCsvButton<T extends Record<string, any>>({
  data, columns, filename, variant = "outline", size = "default",
}: { data: T[]; columns: Col<T>[]; filename: string; variant?: any; size?: any }) {
  const handle = () => {
    exportToCsv(data, columns, filename);
    toast({ title: `${data.length} ligne(s) exportée(s)` });
  };
  return (
    <Button variant={variant} size={size} onClick={handle} disabled={data.length === 0}>
      <Download className="h-4 w-4 mr-2" /> Exporter CSV
    </Button>
  );
}
```

Usage type sur une liste :
```tsx
<ExportCsvButton
  data={filtered}
  columns={[
    { key: "code", label: "Code" },
    { key: "designation", label: "Désignation" },
    { key: "statut", label: "Statut", format: (v) => STATUT_LABELS[v] ?? v },
    { key: "machines.code", label: "Machine parent" },
  ]}
  filename="organes"
/>
```

## Livrables

- 1 nouveau composant `ExportCsvButton`.
- Boutons d'export ajoutés sur ~28 pages.
- 1 suite de tests dédiée.
- Aucune modification de `exportCsv.ts` (déjà solide).
