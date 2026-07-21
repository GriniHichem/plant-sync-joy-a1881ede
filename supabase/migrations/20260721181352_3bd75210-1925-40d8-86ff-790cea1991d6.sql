DROP VIEW IF EXISTS public.v_reception_global;
CREATE VIEW public.v_reception_global AS
SELECT t.id,
    t.numero,
    t.date_ticket,
    t.heure_debut,
    t.heure_fin,
    t.taux_abattement,
    t.commentaire,
    t.statut,
    t.cloture_at,
    t.cloture_by,
    t.created_at,
    t.created_by,
    (cp.first_name || ' ' || cp.last_name) AS created_by_name,
    (kp.first_name || ' ' || kp.last_name) AS cloture_by_name,
    c.id AS campaign_id,
    c.libelle AS campagne,
    c.objectif_kg,
    p.id AS product_id,
    p.designation AS produit,
    p.code AS produit_code,
    s.id AS supplier_id,
    s.nom AS fournisseur,
    s.region,
    s.wilaya,
    w.id AS weighing_id,
    w.code_pesee,
    w.poids_brut_kg,
    w.poids_abattement_kg,
    w.poids_net_kg,
    w.weighed_at,
    CASE
      WHEN t.heure_debut IS NULL OR t.heure_fin IS NULL THEN NULL::numeric
      WHEN t.heure_fin >= t.heure_debut THEN EXTRACT(epoch FROM t.heure_fin - t.heure_debut) / 60::numeric
      ELSE EXTRACT(epoch FROM t.heure_fin + '24:00:00'::interval - t.heure_debut) / 60::numeric
    END::integer AS duree_minutes,
    CASE WHEN w.id IS NOT NULL THEN 'pese'::text ELSE 'a_peser'::text END AS etat_pesee,
    (SELECT count(*) FROM reception_ticket_photos rp WHERE rp.ticket_id = t.id) AS nb_photos
  FROM reception_tickets t
    JOIN reception_campaigns c ON c.id = t.campaign_id
    JOIN reception_products p ON p.id = t.product_id
    JOIN reception_suppliers s ON s.id = t.supplier_id
    LEFT JOIN reception_weighings w ON w.ticket_id = t.id
    LEFT JOIN profiles cp ON cp.user_id = t.created_by
    LEFT JOIN profiles kp ON kp.user_id = t.cloture_by;

GRANT SELECT ON public.v_reception_global TO authenticated;