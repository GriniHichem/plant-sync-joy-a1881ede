CREATE OR REPLACE VIEW public.v_reception_ticket_orientations_summary AS
SELECT
  t.id                    AS ticket_id,
  t.numero                AS ticket_numero,
  t.date_ticket           AS ticket_date,
  t.heure_debut,
  t.product_id,
  t.campaign_id,
  t.taux_abattement       AS taux_applique,
  p.designation           AS produit_nom,
  c.libelle               AS campagne_nom,
  w.poids_net_kg,
  COUNT(o.id)             AS orientations_count,
  ROUND(AVG(o.taux_recommande)::numeric, 2) AS taux_moyen,
  MAX(o.created_at)       AS last_orientation_at,
  jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'taux_recommande', o.taux_recommande,
      'explication', o.explication,
      'created_at', o.created_at,
      'user_id', o.user_id,
      'author_name', COALESCE(NULLIF(TRIM(CONCAT(pr.first_name, ' ', pr.last_name)), ''), 'Utilisateur')
    ) ORDER BY o.created_at DESC
  ) AS orientations
FROM public.reception_ticket_orientations o
JOIN public.reception_tickets t   ON t.id = o.ticket_id
LEFT JOIN public.reception_products p  ON p.id = t.product_id
LEFT JOIN public.reception_campaigns c ON c.id = t.campaign_id
LEFT JOIN public.profiles pr ON pr.user_id = o.user_id
LEFT JOIN LATERAL (
  SELECT poids_net_kg FROM public.reception_weighings w2
  WHERE w2.ticket_id = t.id ORDER BY w2.weighed_at DESC LIMIT 1
) w ON true
GROUP BY t.id, t.numero, t.date_ticket, t.heure_debut, t.product_id, t.campaign_id, t.taux_abattement, p.designation, c.libelle, w.poids_net_kg;

GRANT SELECT ON public.v_reception_ticket_orientations_summary TO authenticated;