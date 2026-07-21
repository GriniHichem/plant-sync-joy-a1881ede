## Objectif

Interdire strictement la sélection d'une photo depuis la galerie/fichiers. La prise de vue se fait **uniquement depuis l'application** via un capteur intégré qui utilise la caméra arrière par défaut, avec bascule automatique sur la caméra frontale (ou toute caméra disponible) si l'arrière est absente.

## Comportement attendu

1. Clic sur « Prendre la photo » → ouverture d'une **fenêtre caméra plein écran** intégrée à l'app.
2. Démarrage automatique du flux vidéo :
   - Tentative 1 : `facingMode: { exact: "environment" }` (caméra arrière tablette).
   - Tentative 2 (fallback) : `facingMode: "user"` (caméra frontale).
   - Tentative 3 (fallback ultime) : première caméra retournée par `enumerateDevices()`.
3. Bouton **capture** (déclencheur) → snapshot dans un `<canvas>` → compression JPEG (`compressImage` déjà en place) → upload vers `reception-photos`.
4. Boutons secondaires : **Reprendre** (nouveau snapshot) et **Basculer caméra** (si plusieurs caméras détectées).
5. Arrêt propre du `MediaStream` à la fermeture (tracks stoppés) pour libérer la caméra.
6. Aucune possibilité d'importer un fichier existant : les `<input type="file">` sont supprimés.

## Gestion des erreurs

- Permission refusée → message clair « Autorisez l'accès à la caméra dans les réglages du navigateur ».
- Aucune caméra détectée → message « Aucune caméra disponible sur cet appareil ».
- HTTPS requis rappelé si `getUserMedia` indisponible (contexte non sécurisé).

## Détails techniques

- Nouveau composant `CameraCaptureDialog.tsx` sous `src/pages/qualite/reception/` :
  - `Dialog` shadcn plein écran mobile-first.
  - Refs : `videoRef`, `streamRef`, `canvasRef`.
  - État : `devices`, `activeDeviceId`, `error`, `busy`.
  - `useEffect` d'initialisation qui tente `environment` puis `user` puis `enumerateDevices()`.
  - `capture()` : dessin `videoRef → canvas` à la résolution native, `canvas.toBlob('image/jpeg', 0.92)`, puis `new File([blob], 'photo.jpg')` passé au parent.
  - Cleanup : `stream.getTracks().forEach(t => t.stop())` au démontage et avant chaque nouveau `getUserMedia`.
- Refonte de `PhotoSlot.tsx` :
  - Suppression des deux `<input type="file" capture>`.
  - Un seul bouton « Prendre la photo » qui ouvre `CameraCaptureDialog`.
  - Reçoit le `File` capturé et passe par `handleFile` (compression + upload) déjà présent.
- Aucun changement de schéma DB ni de storage bucket.

## Fichiers touchés

- `src/pages/qualite/reception/CameraCaptureDialog.tsx` (nouveau).
- `src/pages/qualite/reception/PhotoSlot.tsx` (refonte de la zone de capture).