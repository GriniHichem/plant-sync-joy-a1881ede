

## Plan : Matrice des Roles (Permissions detaillees)

### Objectif
Creer une page "Matrice des roles" dans les parametres qui affiche un tableau croise **roles x permissions** sous forme de grille de checkboxes. L'admin pourra voir et modifier exactement ce que chaque role peut faire, module par module.

### Architecture

**Nouvelle table `role_permissions`** pour stocker les permissions granulaires :

```text
role_permissions
├── id (uuid, PK)
├── role (app_role enum)
├── module (text) — ex: "machines", "tickets", "of", "articles", "recettes", "pdr", "preventif", "users"
├── can_view (boolean, default false)
├── can_create (boolean, default false)
├── can_edit (boolean, default false)
├── can_delete (boolean, default false)
├── created_at (timestamptz)
├── updated_at (timestamptz)
└── UNIQUE(role, module)
```

**Modules couverts** (lignes de la matrice) :
- Machines, Tickets, Pieces de rechange, Preventif, Ordres de fabrication, Produits, Articles, Recettes, Arrets, Consommations, Utilisateurs, Parametres

**Roles** (colonnes) : Les 7 roles existants de l'enum `app_role`.

### Composants

1. **`src/pages/parametres/RolesMatrix.tsx`** — Page principale
   - Grille scrollable horizontalement : lignes = modules, colonnes = roles
   - Chaque cellule = 4 checkboxes (Voir / Creer / Modifier / Supprimer)
   - Bouton "Sauvegarder" pour persister les changements en batch (upsert)
   - Bouton "Reinitialiser" pour revenir aux valeurs par defaut
   - Acces restreint aux admins uniquement

2. **Hook `usePermissions`** — Verification cote client
   - Charge les permissions depuis `role_permissions` pour les roles de l'utilisateur connecte
   - Expose `canView(module)`, `canCreate(module)`, `canEdit(module)`, `canDelete(module)`
   - Utilise en complement (pas en remplacement) des RLS existantes cote serveur

3. **Fonction SQL `check_permission`** — Verification cote serveur
   - `check_permission(_user_id uuid, _module text, _action text) RETURNS boolean`
   - Security definer, interroge `role_permissions` via les roles de l'utilisateur
   - Peut etre utilisee dans les RLS futures pour un controle plus fin

### Donnees par defaut

Migration qui insere les permissions par defaut pour chaque role :
- **admin** : tout active partout
- **resp_maintenance** : CRUD sur machines, tickets, pdr, preventif ; lecture sur le reste
- **maintenancier** : voir/creer/modifier sur tickets, pdr, preventif ; lecture machines
- **resp_production** : CRUD sur OF, produits, articles, recettes, arrets, consommations ; lecture maintenance
- **chef_ligne** : voir/creer sur OF, declarations, arrets ; lecture reste
- **operateur** : voir/creer sur declarations, consommations ; lecture reste
- **gestionnaire_magasin** : CRUD sur articles, pdr ; lecture reste

### Integration

- Ajouter une carte "Matrice des roles" dans `Parametres.tsx` avec icone `ShieldCheck`
- Ajouter la route `/parametres/roles` dans `App.tsx`
- RLS sur `role_permissions` : lecture pour tous les authentifies, ecriture admin uniquement

### UI de la matrice

```text
                  | Admin | Resp.Maint | Mainten. | Resp.Prod | Chef ligne | Operateur | Gest.Mag |
Machines          | VCMS  |   VCMS     |   V      |    V      |     V      |    V      |    V     |
Tickets           | VCMS  |   VCMS     |   VCM    |    V      |     VC     |    VC     |    V     |
Pieces rechange   | VCMS  |   VCMS     |   VCM    |    V      |     V      |    V      |   VCMS   |
...               |       |            |          |           |            |           |          |

V=Voir  C=Creer  M=Modifier  S=Supprimer  (checkboxes individuelles)
```

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Creer table `role_permissions` + seed par defaut + fonction `check_permission` |
| `src/pages/parametres/RolesMatrix.tsx` | Nouvelle page matrice |
| `src/hooks/usePermissions.ts` | Hook client pour verifier les permissions |
| `src/pages/Parametres.tsx` | Ajouter carte "Matrice des roles" |
| `src/App.tsx` | Ajouter route `/parametres/roles` |

