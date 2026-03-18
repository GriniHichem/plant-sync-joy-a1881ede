

# Plan : Taille max par entite + Lightbox + Correction UI photos

## 1. Parametrage taille max par entite

### 1.1 Donnees initiales dans `app_settings`

Inserer 6 lignes dans `app_settings` via l'outil d'insertion de donnees :

| key | value | label |
|---|---|---|
| `image_max_size_machine` | `5` | Taille max photo machine (Mo) |
| `image_max_size_pdr` | `2` | Taille max photo PDR (Mo) |
| `image_max_size_equipement` | `3` | Taille max photo equipement (Mo) |
| `image_max_size_produit` | `3` | Taille max photo produit (Mo) |
| `image_max_size_article` | `3` | Taille max photo article (Mo) |
| `image_max_size_user` | `1` | Taille max photo utilisateur (Mo) |

### 1.2 Ecran de parametrage

Ajouter une section dans `GeneralSettings.tsx` (ou creer une page dediee `src/pages/parametres/ImageSettings.tsx`) avec :
- Un champ numerique par entite (machine, PDR, equipement, produit, article, utilisateur)
- Affichage en Mo, sauvegarde dans `app_settings`
- Carte dans `Parametres.tsx` avec icone `ImageIcon` pointant vers `/parametres/images`

### 1.3 Hook `useImageMaxSize`

Creer `src/hooks/useImageMaxSize.ts` :
- Charge `app_settings` ou `image_max_size_{entityType}` est le filtre
- Retourne la taille en octets
- Fallback a 5 Mo si non configure

### 1.4 Integration dans `useEntityImages`

- Remplacer la constante `MAX_FILE_SIZE = 5 * 1024 * 1024` par la valeur dynamique du hook
- `useEntityImages` accepte un nouveau parametre optionnel `maxFileSizeMb` ou le charge via `useImageMaxSize`
- Le message d'erreur affiche la limite specifique : "Fichier trop volumineux (max 2 Mo pour les PDR)."

---

## 2. Lightbox / Vue agrandie

### 2.1 Composant `ImageLightbox`

Creer `src/components/images/ImageLightbox.tsx` :
- Dialog plein ecran (ou quasi) avec fond sombre
- Image centree avec `object-contain`, taille max viewport
- Navigation gauche/droite si plusieurs images (fleches + clavier)
- Bouton fermer (X)
- Responsive : fonctionne mobile/tablette/desktop
- Animation d'ouverture fluide

### 2.2 Integration dans `EntityImageUploader`

- Clic sur l'image principale (hors mode edit) ouvre le lightbox
- Clic sur une miniature secondaire ouvre le lightbox a cet index
- Ajout d'une icone "loupe" ou "expand" en overlay au hover pour indiquer l'action

### 2.3 Integration dans `EntityThumbnail`

- Ajouter une prop optionnelle `onClick` pour ouvrir le lightbox depuis les listes

---

## 3. Correction UI / affichage photos trop grandes

### 3.1 `EntityImageUploader` -- reduire la zone principale

- Changer `aspect-[4/3]` en `aspect-[16/9]` et ajouter `max-h-48` pour limiter la hauteur
- En mode formulaire (MachineForm, EquipmentForm), contraindre davantage avec `max-h-40`

### 3.2 Pages detail (MachineDetail, PdrDetail, EquipmentDetail)

- La carte "Photo" prend actuellement 1 colonne sur 3 avec un aspect-ratio 4/3 qui peut etre tres grand
- Reduire : `aspect-[3/2] max-h-56` pour la zone principale
- Dans PdrDetail et EquipmentDetail, la photo est dans une colonne entiere ; s'assurer que la carte photo reste compacte

### 3.3 MachineForm -- photo trop grande

- L'image uploader est dans une Card pleine largeur sans contrainte → ajouter `max-w-md` sur la Card ou passer le uploader en sidebar

### 3.4 Miniatures secondaires

- Augmenter legerement de `w-16 h-16` a `w-20 h-20` pour une meilleure lisibilite tout en restant compact

---

## 4. Fichiers a creer

| Fichier | Role |
|---|---|
| `src/components/images/ImageLightbox.tsx` | Lightbox plein ecran avec navigation multi-images |
| `src/pages/parametres/ImageSettings.tsx` | Ecran parametrage taille max par entite |
| `src/hooks/useImageMaxSize.ts` | Hook charge taille max depuis app_settings |

## 5. Fichiers a modifier

| Fichier | Modification |
|---|---|
| `src/hooks/useEntityImages.ts` | Taille max dynamique via param ou hook |
| `src/components/images/EntityImageUploader.tsx` | Lightbox, dimensions reduites, icone zoom, message taille dynamique |
| `src/components/images/EntityThumbnail.tsx` | Prop `onClick` optionnelle pour lightbox |
| `src/pages/MachineForm.tsx` | Contraindre largeur carte photo |
| `src/pages/MachineDetail.tsx` | Passer `maxSizeMb` a l'uploader |
| `src/pages/PdrDetail.tsx` | Idem |
| `src/pages/EquipmentDetail.tsx` | Idem |
| `src/pages/EquipmentForm.tsx` | Contraindre carte photo |
| `src/pages/gpao/ProductDetail.tsx` | Passer `maxSizeMb` |
| `src/pages/gpao/ArticleDetail.tsx` | Passer `maxSizeMb` |
| `src/pages/parametres/UsersAdmin.tsx` | Passer `maxSizeMb` |
| `src/pages/Parametres.tsx` | Ajouter carte "Photos & Images" |
| `src/App.tsx` | Route `/parametres/images` |

## 6. Resume

1. Inserer les parametres de taille max dans `app_settings`
2. Creer page `ImageSettings` + route + carte dans Parametres
3. Creer hook `useImageMaxSize` + integrer dans `useEntityImages`
4. Creer `ImageLightbox` avec navigation multi-images
5. Integrer lightbox dans `EntityImageUploader` et `EntityThumbnail`
6. Corriger les dimensions excessives dans toutes les pages (forms + details)

