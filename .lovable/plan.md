# Correction des droits par défaut (production / maintenance / qualité)

## Principe retenu (validé)
- **Bureau méthode** = autorité sur tout le **référentiel industriel** : schéma des lignes, liste des équipements, liste/​catalogue PDR, machines, organes.
- **Responsable qualité** = autorité sur **recettes et produits**.
- **Maintenance** = exécute les **interventions et la gestion de maintenance** (préventif, tickets, shift maintenance) **dans le cadre dessiné par la méthode** — donc lecture seule sur le référentiel industriel.
- **Atelier (chef de ligne / opérateur)** = **opérationnel uniquement** (OF, arrêts, consommations, shift, tickets) — lecture seule sur tout référentiel.
- **Méthode d'application : corrections ciblées** — on ne modifie QUE les cellules incohérentes ci-dessous, tout le reste (et vos personnalisations) est conservé.

## Modifications de `role_permissions` (V=voir, C=créer, E=éditer, D=supprimer)

### Production
- **chef_ligne** — retirer l'écriture sur le référentiel :
  - recettes : VCE → V
  - produits : VCE → V
  - articles : VCE → V
  - conservé : OF (VCE), arrêts (VCE), consommations (VCE), shift_production (VCE), tickets (VC), gpao_dashboard (VCE)
- **resp_production** — recettes/produits passent à la qualité :
  - recettes : VCED → V
  - produits : VCED → V
  - conservé : OF, arrêts, consommations, shift_production, gpao_dashboard, articles (référentiel d'exploitation conservé)
- **operateur** — déjà minimal, aucun changement.

### Maintenance (référentiel industriel → lecture seule)
- **maintenancier** :
  - lignes : VCE → V
  - machines : VCE → V
  - organes : VCE → V
  - equipements : VCE → V
  - pdr : VCE → V
  - conservé : préventif (VCE), tickets (VCED), shift_maintenance (VCE), dashboard/historique/journal
- **resp_maintenance** :
  - lignes : VCED → V
  - machines : VCED → V
  - organes : VCED → V
  - equipements : VCED → V
  - pdr : VCED → V
  - conservé (gestion maintenance) : préventif (VCED), tickets (VCED), shift_maintenance (VCED), historique, journal, analytiques, dashboard, validations

### Qualité (autorité recettes/produits)
- **responsable_controle_qualite** :
  - recettes : V → VCE
  - produits : V → VCE
  - conservé : tous les modules qualité (VCED)
- **directeur_qualite** :
  - recettes : V → VCED
  - produits : V → VCED
  - conservé : tous les modules qualité (VCED)
- **controleur_qualite** — inchangé (référentiel en lecture, contrôles/NC/shift en création-édition).

### Méthode (confirmer l'autorité référentiel)
- **bureau_methode** :
  - recettes : VCE → V (les recettes passent à la qualité)
  - conservé / confirmé comme autorité industrielle : lignes (VCE), machines (VCE), organes (VCE), equipements (VCE), pdr (VCE)

## Vérification UI
Après les mises à jour, contrôler que les pages concernées respectent bien `canEdit/canCreate/canDelete` du hook `usePermissions` (boutons masqués/désactivés) :
- éditeur de schéma de ligne (module `lignes`)
- pages recettes et produits
- pages machines / organes / équipements / PDR

Si une page n'effectue pas le contrôle (boutons visibles sans droit), ajouter la garde de permission côté frontend (présentation uniquement — pas de changement de logique métier). La sécurité réelle reste assurée par les RLS existantes.

## Détails techniques
- Appliqué via des `UPDATE` ciblés sur `public.role_permissions` (clé `role` + `module`), sans `DELETE`/recréation — aucune personnalisation existante touchée.
- Résolution multi-rôles inchangée (fusion logique OR dans `usePermissions`), donc un utilisateur cumulant plusieurs rôles garde l'union de ses droits.
- Aucun changement de schéma, d'enum `app_role`, ni de RLS.
