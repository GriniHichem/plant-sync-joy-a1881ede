-- =============================================================================
-- Prod-in-Time — BASELINE de schéma (déploiement auto-hébergé)
-- Généré par scripts/generate-baseline.sh — NE PAS éditer à la main.
--
-- Ce fichier crée 100% du schéma applicatif sur une base Supabase VIERGE.
-- Il NE contient AUCUNE donnée métier ni utilisateur de test.
-- Toute l'autorisation repose sur auth.uid() + la table public.user_roles.
--
-- Application :  psql "$DATABASE_URL" -f 00000000000000_baseline.sql
-- =============================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;
SET row_security = off;

-- 0) Extensions requises (idempotentes, tolérantes en auto-hébergement).
DO $ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE EXTENSION IF NOT EXISTS unaccent;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Extension non installée: %', SQLERRM;
END
$ext$;

-- =============================================================================
-- 1) SCHÉMA PUBLIC (types, tables, fonctions, triggers, RLS, GRANT)
-- =============================================================================
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'SQL_ASCII';
SET standard_conforming_strings = off;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET escape_string_warning = off;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'resp_maintenance',
    'maintenancier',
    'resp_production',
    'chef_ligne',
    'operateur',
    'gestionnaire_magasin',
    'bureau_methode',
    'responsable_si',
    'auditeur',
    'controleur_qualite',
    'responsable_controle_qualite',
    'directeur_qualite',
    'responsable_inventaire',
    'agent_inventaire'
);


--
-- Name: approvisionnement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approvisionnement_type AS ENUM (
    'local',
    'importation',
    'mixte'
);


--
-- Name: arret_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.arret_type AS ENUM (
    'panne',
    'changement_serie',
    'pause',
    'nettoyage',
    'attente_matiere',
    'qualite',
    'autre'
);


--
-- Name: criticite; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.criticite AS ENUM (
    'A',
    'B',
    'C'
);


--
-- Name: criticite_maintenance; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.criticite_maintenance AS ENUM (
    'faible',
    'moyenne',
    'elevee',
    'critique'
);


--
-- Name: disponibilite_pdr; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.disponibilite_pdr AS ENUM (
    'disponible',
    'partiel',
    'indisponible'
);


--
-- Name: energie_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.energie_type AS ENUM (
    'electrique',
    'pneumatique',
    'hydraulique',
    'vapeur',
    'gaz',
    'mixte',
    'autre'
);


--
-- Name: equipement_statut; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.equipement_statut AS ENUM (
    'en_service',
    'hors_service',
    'en_maintenance',
    'reforme'
);


--
-- Name: equipement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.equipement_type AS ENUM (
    'capteur',
    'actionneur',
    'convoyeur',
    'peripherique',
    'utilite',
    'sous_ensemble',
    'instrument',
    'autre'
);


--
-- Name: frequence_preventif; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.frequence_preventif AS ENUM (
    'quotidien',
    'hebdomadaire',
    'mensuel',
    'trimestriel',
    'semestriel',
    'annuel'
);


--
-- Name: impact_ligne; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.impact_ligne AS ENUM (
    'arret_complet',
    'arret_partiel',
    'degradation',
    'aucun'
);


--
-- Name: intervention_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.intervention_role AS ENUM (
    'lead',
    'aide',
    'co_intervenant'
);


--
-- Name: intervention_statut; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.intervention_statut AS ENUM (
    'en_cours',
    'terminee',
    'annulee',
    'transferee',
    'liberee'
);


--
-- Name: inventory_assignment_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_assignment_role AS ENUM (
    'agent_a',
    'agent_b',
    'agent_c'
);


--
-- Name: inventory_campaign_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_campaign_status AS ENUM (
    'draft',
    'en_cours',
    'arbitrage',
    'cloturee',
    'annulee'
);


--
-- Name: inventory_decision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_decision AS ENUM (
    'en_attente',
    'conforme_ab',
    'conforme_c_eq_a',
    'conforme_c_eq_b',
    'recompte_ab'
);


--
-- Name: inventory_entity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_entity_type AS ENUM (
    'pdr',
    'organe'
);


--
-- Name: inventory_target_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_target_status AS ENUM (
    'a_compter',
    'en_arbitrage',
    'conforme',
    'a_recompter',
    'cloture'
);


--
-- Name: machine_statut; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.machine_statut AS ENUM (
    'en_marche',
    'arret',
    'maintenance'
);


--
-- Name: mouvement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.mouvement_type AS ENUM (
    'entree',
    'sortie',
    'correction',
    'inventaire'
);


--
-- Name: nc_decision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nc_decision AS ENUM (
    'bloquer_lot',
    'liberer',
    'liberer_sous_derogation',
    'retraiter',
    'trier',
    'rebuter',
    'retour_fournisseur',
    'quarantaine',
    'autre'
);


--
-- Name: nc_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nc_severity AS ENUM (
    'minor',
    'major',
    'critical'
);


--
-- Name: nc_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nc_status AS ENUM (
    'draft',
    'declared',
    'under_review',
    'blocked',
    'decision_pending',
    'action_in_progress',
    'verified',
    'closed',
    'cancelled'
);


--
-- Name: nc_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nc_type AS ENUM (
    'produit_fini',
    'emballage',
    'matiere_premiere',
    'process',
    'hygiene',
    'etiquetage',
    'poids',
    'aspect',
    'securite_alimentaire',
    'autre'
);


--
-- Name: notification_frequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_frequency AS ENUM (
    'immediate',
    'grouped_hourly',
    'grouped_daily'
);


--
-- Name: notification_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_severity AS ENUM (
    'info',
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: notification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_status AS ENUM (
    'unread',
    'read',
    'archived'
);


--
-- Name: of_quality_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.of_quality_status AS ENUM (
    'non_demarre',
    'en_controle',
    'conforme',
    'conforme_sous_reserve',
    'non_conforme',
    'bloque',
    'libere',
    'rebute',
    'a_retraiter'
);


--
-- Name: of_statut; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.of_statut AS ENUM (
    'planifie',
    'en_cours',
    'termine',
    'annule'
);


--
-- Name: organe_impact_panne; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.organe_impact_panne AS ENUM (
    'arret_complet',
    'arret_partiel',
    'degradation',
    'aucun'
);


--
-- Name: organe_statut; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.organe_statut AS ENUM (
    'en_service',
    'en_panne',
    'en_maintenance',
    'hors_service'
);


--
-- Name: organe_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.organe_type AS ENUM (
    'mecanique',
    'electrique',
    'pneumatique',
    'hydraulique',
    'electronique',
    'automatisme',
    'instrumentation',
    'autre'
);


--
-- Name: quality_action_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quality_action_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: quality_action_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quality_action_status AS ENUM (
    'open',
    'in_progress',
    'done',
    'verified',
    'closed',
    'cancelled'
);


--
-- Name: quality_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quality_action_type AS ENUM (
    'curative',
    'corrective',
    'preventive'
);


--
-- Name: quality_frequency_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quality_frequency_type AS ENUM (
    'hourly',
    'shift',
    'daily',
    'per_of',
    'per_lot',
    'manual'
);


--
-- Name: quality_indicator_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quality_indicator_category AS ENUM (
    'produit_fini',
    'emballage',
    'process',
    'hygiene',
    'poids',
    'controle_visuel',
    'autre'
);


--
-- Name: quality_indicator_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quality_indicator_type AS ENUM (
    'numeric',
    'boolean',
    'text',
    'select'
);


--
-- Name: role_fonctionnel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role_fonctionnel AS ENUM (
    'alimentation',
    'transformation',
    'dosage',
    'melange',
    'convoyage',
    'conditionnement',
    'controle',
    'evacuation',
    'utilite',
    'autre'
);


--
-- Name: shift_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shift_type AS ENUM (
    'matin',
    'apres_midi',
    'nuit'
);


--
-- Name: statut_pdr; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.statut_pdr AS ENUM (
    'strategique',
    'commune'
);


--
-- Name: ticket_assignment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_assignment_status AS ENUM (
    'unassigned',
    'assigned',
    'transferred',
    'released'
);


--
-- Name: ticket_priorite; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_priorite AS ENUM (
    'critique',
    'haute',
    'normale',
    'basse'
);


--
-- Name: ticket_statut; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_statut AS ENUM (
    'ouvert',
    'pris_en_charge',
    'en_cours',
    'resolu',
    'cloture'
);


--
-- Name: validation_enforcement; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.validation_enforcement AS ENUM (
    'post_hoc',
    'blocking'
);


--
-- Name: validation_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.validation_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: validation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.validation_status_enum AS ENUM (
    'draft',
    'submitted',
    'pending_post_hoc',
    'approved',
    'rejected',
    'cancelled',
    'applied',
    'archived'
);


--
-- Name: apply_maintenance_shift_schedules(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_maintenance_shift_schedules() RETURNS SETOF uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  sched record;
  v_today date := CURRENT_DATE;
  v_dow smallint := EXTRACT(DOW FROM now())::smallint;
  v_now_t time := (now())::time;
  v_slot_start time;
  v_existing uuid;
  v_new_id uuid;
BEGIN
  FOR sched IN
    SELECT * FROM public.maintenance_shift_schedules
    WHERE is_active = true
      AND auto_open = true
      AND date_debut <= v_today
      AND (date_fin IS NULL OR date_fin >= v_today)
      AND (array_length(weekdays, 1) IS NULL OR v_dow = ANY(weekdays))
  LOOP
    SELECT heure_debut INTO v_slot_start
    FROM public.shift_time_slots
    WHERE code = sched.shift_type AND is_active = true
    LIMIT 1;

    IF v_slot_start IS NULL THEN
      v_slot_start := CASE sched.shift_type
        WHEN 'matin' THEN TIME '06:00'
        WHEN 'apres_midi' THEN TIME '14:00'
        ELSE TIME '22:00'
      END;
    END IF;

    IF sched.shift_type <> 'nuit' AND v_now_t < v_slot_start THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_existing
    FROM public.maintenance_shifts
    WHERE maintenancier_id = sched.maintenancier_id
      AND date_shift = v_today
      AND shift_type = sched.shift_type
      AND is_active = true
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.maintenance_shifts (
      date_shift, shift_type, shift_team_id, maintenancier_id,
      line_ids, heure_debut, is_active, opened_by, observations
    ) VALUES (
      v_today, sched.shift_type, sched.shift_team_id, sched.maintenancier_id,
      sched.line_ids, now(), true, NULL, '[Ouverture automatique - programmation]'
    )
    RETURNING id INTO v_new_id;

    RETURN NEXT v_new_id;
  END LOOP;
END;
$$;


--
-- Name: articles_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.articles_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.code, NEW.designation, NEW.description, NEW.code_erp, NEW.fournisseur); RETURN NEW; END$$;


--
-- Name: audit_logs_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_logs_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.action, NEW.action_label, NEW.description, NEW.entity_label, NEW.entity_code, NEW.user_full_name, NEW.user_email); RETURN NEW; END$$;


--
-- Name: auto_close_stale_shifts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_close_stale_shifts() RETURNS TABLE(kind text, closed_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH p AS (
    UPDATE public.shifts
    SET is_active = false,
        heure_fin = LEAST(now(), heure_fin),
        observations = COALESCE(observations,'') || ' [Auto-clôturé : session abandonnée]'
    WHERE is_active = true
      AND heure_fin + interval '2 hours' < now()
    RETURNING id
  )
  SELECT 'production'::text, id FROM p;

  RETURN QUERY
  WITH m AS (
    UPDATE public.maintenance_shifts
    SET is_active = false,
        heure_fin = now(),
        observations = COALESCE(observations,'') || ' [Auto-clôturé : session abandonnée]'
    WHERE is_active = true
      AND heure_debut + interval '12 hours' < now()
    RETURNING id
  )
  SELECT 'maintenance'::text, id FROM m;

  RETURN QUERY
  WITH q AS (
    UPDATE public.quality_shifts
    SET is_active = false,
        heure_fin = now(),
        observations = COALESCE(observations,'') || ' [Auto-clôturé : session abandonnée]'
    WHERE is_active = true
      AND heure_debut + interval '12 hours' < now()
    RETURNING id
  )
  SELECT 'quality'::text, id FROM q;
END;
$$;


--
-- Name: can_manage_notification_rule(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_manage_notification_rule(_user_id uuid, _module text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'responsable_si'::app_role)
    OR (
      public.has_role(_user_id, 'resp_maintenance'::app_role)
      AND _module IN ('machines','equipements','organes','tickets','interventions','preventif','pdr','pdr_stock','lignes')
    )
    OR (
      public.has_role(_user_id, 'resp_production'::app_role)
      AND _module IN ('gpao','of','produits','articles','recettes','consommations','arrets')
    )
$$;


--
-- Name: can_manage_shifts(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_manage_shifts(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'resp_maintenance'::app_role)
    OR public.has_role(_user_id, 'resp_production'::app_role)
    OR public.has_role(_user_id, 'responsable_si'::app_role)
    OR public.has_role(_user_id, 'directeur_qualite'::app_role)
    OR public.has_role(_user_id, 'responsable_controle_qualite'::app_role)
$$;


--
-- Name: can_manage_validation_rule(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_manage_validation_rule(_user_id uuid, _module text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'responsable_si'::app_role)
$$;


--
-- Name: can_validate_request(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_validate_request(_user_id uuid, _request_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_role JSONB;
  v_user JSONB;
  v_assigned UUID;
  v_validator_user UUID;
BEGIN
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN TRUE; END IF;
  IF public.has_role(_user_id, 'responsable_si'::app_role) THEN RETURN TRUE; END IF;

  SELECT vr.assigned_validator_user_id, r.validator_roles, r.validator_users
    INTO v_assigned, v_role, v_user
  FROM public.validation_requests vr
  LEFT JOIN public.validation_rules r ON r.id = vr.rule_id
  WHERE vr.id = _request_id;

  IF v_assigned = _user_id THEN RETURN TRUE; END IF;

  IF v_user IS NOT NULL THEN
    FOR v_validator_user IN SELECT (jsonb_array_elements_text(v_user))::UUID LOOP
      IF v_validator_user = _user_id THEN RETURN TRUE; END IF;
    END LOOP;
  END IF;

  IF v_role IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(v_role) AS rname
      JOIN public.user_roles ur ON ur.role::text = rname.value
      WHERE ur.user_id = _user_id
    ) THEN RETURN TRUE; END IF;
  END IF;

  RETURN FALSE;
END;
$$;


--
-- Name: check_document_permission(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_document_permission(_user_id uuid, _entity_type text, _action text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.document_permissions dp ON dp.role = ur.role::text
    WHERE ur.user_id = _user_id
      AND dp.entity_type = _entity_type
      AND (
        (_action = 'view' AND dp.can_view) OR
        (_action = 'upload' AND dp.can_upload) OR
        (_action = 'download' AND dp.can_download) OR
        (_action = 'delete' AND dp.can_delete) OR
        (_action = 'edit_metadata' AND dp.can_edit_metadata)
      )
  )
$$;


--
-- Name: check_permission(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_permission(_user_id uuid, _module text, _action text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.module = _module
      AND (
        (_action = 'view' AND rp.can_view) OR
        (_action = 'create' AND rp.can_create) OR
        (_action = 'edit' AND rp.can_edit) OR
        (_action = 'delete' AND rp.can_delete)
      )
  )
$$;


--
-- Name: consumptions_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consumptions_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.notes); RETURN NEW; END$$;


--
-- Name: derive_shift_type_from_now(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.derive_shift_type_from_now() RETURNS public.shift_type
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN extract(hour from (now() AT TIME ZONE 'Africa/Algiers'))::int BETWEEN 5 AND 12 THEN 'matin'::public.shift_type
    WHEN extract(hour from (now() AT TIME ZONE 'Africa/Algiers'))::int BETWEEN 13 AND 20 THEN 'apres_midi'::public.shift_type
    ELSE 'nuit'::public.shift_type
  END;
$$;


--
-- Name: ensure_my_production_shift_session(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_my_production_shift_session() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_first uuid;
BEGIN
  SELECT id INTO v_first FROM public.ensure_my_production_shifts() AS id LIMIT 1;
  RETURN v_first;
END;
$$;


--
-- Name: ensure_my_production_shifts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_my_production_shifts() RETURNS SETOF uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shift_type public.shift_type;
  v_of_id uuid;
  v_session_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  v_shift_type := public.derive_shift_type_from_now();

  FOR v_of_id IN
    SELECT a.of_id
    FROM public.of_shift_assignments a
    JOIN public.ordres_fabrication o ON o.id = a.of_id
    WHERE a.chef_ligne_id = v_uid
      AND a.shift_type = v_shift_type
      AND o.statut = 'en_cours'
      AND COALESCE(o.auto_generate_shifts, true) = true
  LOOP
    v_session_id := public.ensure_production_shift_session(v_of_id);
    IF v_session_id IS NOT NULL THEN
      RETURN NEXT v_session_id;
    END IF;
  END LOOP;
  RETURN;
END;
$$;


--
-- Name: ensure_my_quality_shifts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_my_quality_shifts() RETURNS SETOF uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shift_type public.shift_type;
  v_today date := (now() AT TIME ZONE 'Africa/Algiers')::date;
  v_qs_id uuid;
  v_assign record;
  v_start timestamptz;
  v_end timestamptz;
  v_line_id uuid;
  v_of_id uuid;
  v_resolved_lines uuid[];
  v_resolved_ofs uuid[];
  v_prod_shift uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  v_shift_type := public.derive_shift_type_from_now();

  FOR v_assign IN
    SELECT * FROM public.quality_shift_assignments
    WHERE controller_id = v_uid AND shift_type = v_shift_type
  LOOP
    -- Résolution des OFs pertinents (en_cours uniquement)
    IF v_assign.all_open_ofs THEN
      SELECT array_agg(DISTINCT id), array_agg(DISTINCT ligne_id)
        INTO v_resolved_ofs, v_resolved_lines
      FROM public.ordres_fabrication
      WHERE statut = 'en_cours' AND ligne_id IS NOT NULL;
    ELSIF v_assign.of_ids IS NOT NULL AND array_length(v_assign.of_ids, 1) > 0 THEN
      SELECT array_agg(DISTINCT id), array_agg(DISTINCT ligne_id)
        INTO v_resolved_ofs, v_resolved_lines
      FROM public.ordres_fabrication
      WHERE id = ANY(v_assign.of_ids) AND statut = 'en_cours' AND ligne_id IS NOT NULL;
    ELSE
      -- Fallback rétrocompat sur line_ids
      v_resolved_lines := v_assign.line_ids;
      v_resolved_ofs := NULL;
    END IF;

    -- Skip si aucun travail à couvrir actuellement
    IF v_resolved_lines IS NULL OR array_length(v_resolved_lines, 1) IS NULL THEN
      CONTINUE;
    END IF;

    -- Cherche/crée la session qualité du jour
    SELECT id INTO v_qs_id
    FROM public.quality_shifts
    WHERE controller_id = v_uid
      AND date_shift = v_today
      AND shift_type = v_shift_type
      AND is_active = true
    LIMIT 1;

    IF v_qs_id IS NULL THEN
      v_start := CASE v_shift_type
        WHEN 'matin' THEN (v_today::timestamp + interval '5 hours')
        WHEN 'apres_midi' THEN (v_today::timestamp + interval '13 hours')
        ELSE (v_today::timestamp + interval '21 hours')
      END AT TIME ZONE 'Africa/Algiers';
      v_end := v_start + interval '8 hours';

      INSERT INTO public.quality_shifts (
        controller_id, shift_type, date_shift, shift_team_id,
        heure_debut, heure_fin, is_active, observations, opened_by
      ) VALUES (
        v_uid, v_shift_type, v_today, v_assign.shift_team_id,
        v_start, v_end, true,
        '[Auto-généré OF-based — heure serveur Africa/Algiers]', v_uid
      )
      RETURNING id INTO v_qs_id;
    END IF;

    -- Lignes couvertes (résolues dynamiquement)
    FOREACH v_line_id IN ARRAY v_resolved_lines LOOP
      INSERT INTO public.quality_shift_lines (quality_shift_id, production_line_id)
      VALUES (v_qs_id, v_line_id)
      ON CONFLICT (quality_shift_id, production_line_id) DO NOTHING;

      FOR v_prod_shift IN
        SELECT id FROM public.shifts
        WHERE line_id = v_line_id
          AND date_shift = v_today
          AND is_active = true
      LOOP
        INSERT INTO public.quality_shift_production_links (quality_shift_id, production_shift_id)
        VALUES (v_qs_id, v_prod_shift)
        ON CONFLICT (quality_shift_id, production_shift_id) DO NOTHING;
      END LOOP;
    END LOOP;

    RETURN NEXT v_qs_id;
  END LOOP;
  RETURN;
END;
$$;


--
-- Name: ensure_production_shift_session(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_production_shift_session(p_of_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_of public.ordres_fabrication%ROWTYPE;
  v_assignment public.of_shift_assignments%ROWTYPE;
  v_shift_type public.shift_type;
  v_today date := (now() AT TIME ZONE 'Africa/Algiers')::date;
  v_session_id uuid;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  SELECT * INTO v_of FROM public.ordres_fabrication WHERE id = p_of_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OF introuvable'; END IF;
  -- Garantie que l'OF est toujours actif au moment précis du déclenchement (heure serveur)
  IF v_of.statut <> 'en_cours' THEN RETURN NULL; END IF;
  IF COALESCE(v_of.auto_generate_shifts, true) IS DISTINCT FROM true THEN RETURN NULL; END IF;
  IF v_of.line_id IS NULL THEN RETURN NULL; END IF;

  v_shift_type := public.derive_shift_type_from_now();

  -- Session déjà active pour (of, line, jour, créneau) ?
  SELECT id INTO v_session_id
  FROM public.shifts
  WHERE of_id = p_of_id
    AND line_id = v_of.line_id
    AND date_shift = v_today
    AND shift_type = v_shift_type
    AND is_active = true
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    RETURN v_session_id;
  END IF;

  -- Affectation pour ce créneau ?
  SELECT * INTO v_assignment
  FROM public.of_shift_assignments
  WHERE of_id = p_of_id AND shift_type = v_shift_type
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Horaires standards calculés en TZ Algérie puis convertis en timestamptz
  v_start := CASE v_shift_type
    WHEN 'matin' THEN (v_today::timestamp + interval '5 hours')
    WHEN 'apres_midi' THEN (v_today::timestamp + interval '13 hours')
    ELSE (v_today::timestamp + interval '21 hours')
  END AT TIME ZONE 'Africa/Algiers';
  v_end := v_start + interval '8 hours';

  INSERT INTO public.shifts (
    of_id, line_id, shift_type, date_shift, chef_ligne_id,
    heure_debut, heure_fin, shift_team_id, is_active, statut,
    heure_debut_reelle, opened_by, observations
  )
  VALUES (
    p_of_id, v_of.line_id, v_shift_type, v_today, v_assignment.chef_ligne_id,
    v_start, v_end, v_assignment.shift_team_id, true, 'en_cours',
    now(), auth.uid(), '[Auto-généré depuis plan OF — heure serveur Africa/Algiers]'
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;


--
-- Name: entity_documents_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.entity_documents_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.file_name, NEW.description, NEW.entity_type); RETURN NEW; END$$;


--
-- Name: equipements_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.equipements_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.search_vector := public.fts_build(
    NEW.code, NEW.designation, NEW.description, NEW.localisation,
    NEW.marque, NEW.modele, NEW.numero_serie, NEW.code_erp, NEW.qr_code
  );
  RETURN NEW;
END$$;


--
-- Name: fts_build(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fts_build(VARIADIC parts text[]) RETURNS tsvector
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    SET search_path TO 'public'
    AS $$
  SELECT to_tsvector('public.french_unaccent', coalesce(array_to_string(parts, ' '), ''));
$$;


--
-- Name: generate_nc_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_nc_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE n int;
BEGIN
  IF NEW.nc_number IS NULL OR NEW.nc_number = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(nc_number FROM 4) AS integer)), 0) + 1
      INTO n FROM public.quality_non_conformities
     WHERE nc_number ~ '^NC-[0-9]+$';
    NEW.nc_number := 'NC-' || LPAD(n::text, 5, '0');
  END IF;
  RETURN NEW;
END $_$;


--
-- Name: generate_of_numero(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_of_numero() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM public.ordres_fabrication;
  NEW.numero := 'OF-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;


--
-- Name: generate_ticket_numero(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_ticket_numero() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 5) AS INTEGER)), 0) + 1
  INTO next_num FROM public.tickets;
  NEW.numero := 'TKT-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;


--
-- Name: get_active_shift_context(uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_shift_context(_user_id uuid, _at timestamp with time zone DEFAULT now()) RETURNS TABLE(team_id uuid, team_name text, template_id uuid, template_code text, heure_debut timestamp with time zone, heure_fin timestamp with time zone, is_on_shift boolean, autorisation_libre boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_today date := (_at AT TIME ZONE 'Africa/Algiers')::date;
BEGIN
  RETURN QUERY
  WITH candidate_dates AS (SELECT v_today AS d UNION ALL SELECT v_today - 1),
  member AS (
    SELECT stm.team_id, t.name AS team_name, stm.autorisation_libre, stm.cycle_pattern, stm.anchor_date,
           m.id AS mode_id, m.code AS mode_code
    FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    JOIN public.shift_modes m ON m.id = stm.shift_mode_id AND m.is_active
    WHERE stm.user_id = _user_id AND stm.is_active
  ),
  slot_for_day AS (
    SELECT mb.team_id, mb.team_name, mb.autorisation_libre, mb.mode_id, mb.mode_code, cd.d AS d,
      CASE WHEN mb.mode_code = 'surface'
        THEN CASE WHEN EXTRACT(ISODOW FROM cd.d) IN (6,7) THEN NULL
             ELSE (SELECT lower(s.label) FROM public.shift_mode_slots s WHERE s.shift_mode_id = mb.mode_id ORDER BY s.sort_order LIMIT 1) END
        ELSE lower(public.shift_cycle_slot(mb.cycle_pattern, mb.anchor_date, cd.d)) END AS slot_label
    FROM member mb CROSS JOIN candidate_dates cd
  ),
  rows AS (
    SELECT sf.team_id, sf.team_name, sl.id AS template_id, lower(sl.label) AS template_code,
      ((sf.d + sl.heure_debut) AT TIME ZONE 'Africa/Algiers') AS h_debut,
      ((CASE WHEN sl.heure_fin <= sl.heure_debut THEN sf.d + 1 ELSE sf.d END + sl.heure_fin) AT TIME ZONE 'Africa/Algiers') AS h_fin,
      sf.autorisation_libre
    FROM slot_for_day sf
    JOIN public.shift_mode_slots sl ON sl.shift_mode_id = sf.mode_id AND lower(sl.label) = sf.slot_label
    WHERE sf.slot_label IS NOT NULL
  )
  SELECT r.team_id, r.team_name, r.template_id, r.template_code, r.h_debut, r.h_fin,
    (_at >= r.h_debut AND _at < r.h_fin), r.autorisation_libre
  FROM rows r
  ORDER BY (_at >= r.h_debut AND _at < r.h_fin) DESC,
    CASE WHEN r.h_debut >= _at THEN r.h_debut END ASC NULLS LAST, r.h_debut DESC
  LIMIT 1;
END;
$$;


--
-- Name: get_position_counter(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_position_counter(p_position_id uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_pos public.pdr_install_positions%ROWTYPE;
  v_link public.pdr_entity_links%ROWTYPE;
  v_line_id uuid;
  v_date_pose timestamptz;
  v_total_prod numeric := 0;
  v_active_count int := 1;
BEGIN
  SELECT * INTO v_pos FROM public.pdr_install_positions WHERE id = p_position_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF v_pos.lifespan_mode = 'none' THEN RETURN 0; END IF;
  IF v_pos.production_rule = 'manuel' THEN RETURN COALESCE(v_pos.compteur_manuel, 0); END IF;
  IF v_pos.lifespan_mode = 'time' THEN
    SELECT MAX(date_installation) INTO v_date_pose
    FROM public.pdr_instances
    WHERE position_id = p_position_id AND statut = 'active';
    v_date_pose := COALESCE(v_date_pose, v_pos.created_at);
    RETURN EXTRACT(EPOCH FROM (now() - v_date_pose)) / 86400.0;
  END IF;
  SELECT * INTO v_link FROM public.pdr_entity_links WHERE id = v_pos.link_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF v_link.entity_type = 'machine' THEN
    SELECT ligne_id INTO v_line_id FROM public.machines WHERE id = v_link.entity_id;
  ELSIF v_link.entity_type = 'equipement' THEN
    SELECT line_id INTO v_line_id FROM public.equipements WHERE id = v_link.entity_id;
  ELSIF v_link.entity_type = 'organe' THEN
    SELECT e.line_id INTO v_line_id
      FROM public.organes o JOIN public.equipements e ON e.id = o.equipement_id
     WHERE o.id = v_link.entity_id;
  END IF;
  IF v_line_id IS NULL THEN RETURN COALESCE(v_pos.compteur_manuel, 0); END IF;
  SELECT MAX(date_installation) INTO v_date_pose
    FROM public.pdr_instances WHERE position_id = p_position_id AND statut = 'active';
  v_date_pose := COALESCE(v_date_pose, v_pos.created_at);
  SELECT COALESCE(SUM(pd.quantite_produite), 0) INTO v_total_prod
    FROM public.production_declarations pd
    JOIN public.shifts s ON s.id = pd.shift_id
   WHERE s.line_id = v_line_id
     AND pd.heure_production >= v_date_pose;
  IF v_pos.production_rule = 'complete' THEN RETURN v_total_prod;
  ELSIF v_pos.production_rule = 'reparti' THEN
    SELECT COUNT(*) INTO v_active_count
      FROM public.pdr_install_positions
     WHERE link_id = v_pos.link_id AND statut = 'active';
    IF v_active_count < 1 THEN v_active_count := 1; END IF;
    RETURN v_total_prod / v_active_count;
  ELSIF v_pos.production_rule = 'coefficient' THEN
    RETURN v_total_prod * COALESCE(v_pos.production_coefficient, 1);
  END IF;
  RETURN COALESCE(v_pos.compteur_manuel, 0);
END;
$$;


--
-- Name: get_quality_indicators_for_of(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_quality_indicators_for_of(p_of_id uuid) RETURNS TABLE(indicator_id uuid, code text, name text, description text, indicator_type text, category text, unit text, target_value numeric, min_value numeric, max_value numeric, tolerance_minus numeric, tolerance_plus numeric, select_options jsonb, effective_frequency_type text, effective_is_required boolean, effective_is_blocking boolean, match_scope text, assignment_id uuid)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  WITH of_ctx AS (
    SELECT
      o.id              AS of_id,
      o.product_id      AS product_id,
      o.recipe_id       AS recipe_id,
      o.line_id         AS line_id,
      p.family_id       AS family_id
    FROM public.ordres_fabrication o
    LEFT JOIN public.products p ON p.id = o.product_id
    WHERE o.id = p_of_id
  ),
  candidates AS (
    -- 1) Explicit assignments matching any scope of the OF
    SELECT
      qi.id                 AS indicator_id,
      qi.code, qi.name, qi.description,
      qi.indicator_type::text, qi.category::text,
      qi.unit, qi.target_value, qi.min_value, qi.max_value,
      qi.tolerance_minus, qi.tolerance_plus,
      to_jsonb(qi.select_options) AS select_options,
      COALESCE(a.frequency_type::text, qi.frequency_type::text) AS effective_frequency_type,
      (a.is_required OR qi.is_required) AS effective_is_required,
      (a.is_blocking OR qi.is_blocking) AS effective_is_blocking,
      CASE
        WHEN a.recipe_id IS NOT NULL THEN 'recipe'
        WHEN a.product_id IS NOT NULL THEN 'product'
        WHEN a.product_family_id IS NOT NULL THEN 'family'
        WHEN a.production_line_id IS NOT NULL THEN 'line'
        ELSE 'global'
      END AS match_scope,
      CASE
        WHEN a.recipe_id IS NOT NULL THEN 5
        WHEN a.product_id IS NOT NULL THEN 4
        WHEN a.product_family_id IS NOT NULL THEN 3
        WHEN a.production_line_id IS NOT NULL THEN 2
        ELSE 1
      END AS scope_priority,
      a.id AS assignment_id
    FROM public.quality_indicator_assignments a
    JOIN public.quality_indicators qi ON qi.id = a.indicator_id
    CROSS JOIN of_ctx ctx
    WHERE qi.is_active = true
      AND (
        (a.product_id IS NOT NULL AND a.product_id = ctx.product_id)
        OR (a.product_family_id IS NOT NULL AND a.product_family_id = ctx.family_id)
        OR (a.production_line_id IS NOT NULL AND a.production_line_id = ctx.line_id)
        OR (a.recipe_id IS NOT NULL AND a.recipe_id = ctx.recipe_id)
        OR (
          a.product_id IS NULL
          AND a.product_family_id IS NULL
          AND a.production_line_id IS NULL
          AND a.recipe_id IS NULL
        )
      )

    UNION ALL

    -- 2) Indicators with NO assignment row at all → considered global
    SELECT
      qi.id, qi.code, qi.name, qi.description,
      qi.indicator_type::text, qi.category::text,
      qi.unit, qi.target_value, qi.min_value, qi.max_value,
      qi.tolerance_minus, qi.tolerance_plus,
      to_jsonb(qi.select_options),
      qi.frequency_type::text,
      qi.is_required, qi.is_blocking,
      'global'::text, 1,
      NULL::uuid
    FROM public.quality_indicators qi
    WHERE qi.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.quality_indicator_assignments a WHERE a.indicator_id = qi.id
      )
  ),
  ranked AS (
    SELECT c.*,
      ROW_NUMBER() OVER (PARTITION BY c.indicator_id ORDER BY c.scope_priority DESC, c.assignment_id NULLS LAST) AS rn
    FROM candidates c
  )
  SELECT
    indicator_id, code, name, description,
    indicator_type, category, unit,
    target_value, min_value, max_value,
    tolerance_minus, tolerance_plus, select_options,
    effective_frequency_type, effective_is_required, effective_is_blocking,
    match_scope, assignment_id
  FROM ranked
  WHERE rn = 1
  ORDER BY category, code;
$$;


--
-- Name: get_recipe_for_of(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_recipe_for_of(p_of_id uuid) RETURNS TABLE(recipe_id uuid, recipe_name text, version integer, status text, product_id uuid, components jsonb, steps jsonb, quality_sensitive_components jsonb)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_recipe_id uuid;
BEGIN
  SELECT o.recipe_id INTO v_recipe_id
    FROM public.ordres_fabrication o
   WHERE o.id = p_of_id;

  IF v_recipe_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.version,
    COALESCE(r.status, CASE WHEN r.is_active THEN 'active' ELSE 'archived' END),
    r.product_id,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'article_id', rl.article_id,
        'code', a.code,
        'designation', a.designation,
        'quantity', rl.quantite,
        'unit', rl.unite,
        'item_type', rl.item_type,
        'waste_percent', rl.waste_percent,
        'is_mandatory', rl.is_mandatory,
        'is_quality_sensitive', rl.is_quality_sensitive
      ) ORDER BY a.code)
        FROM public.recipe_lines rl
        LEFT JOIN public.articles a ON a.id = rl.article_id
       WHERE rl.recipe_id = r.id
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', rs.id,
        'order', rs.step_order,
        'title', rs.title,
        'description', rs.description,
        'duration', rs.expected_duration_minutes,
        'ccp', rs.critical_control_point,
        'indicator_id', rs.quality_indicator_id
      ) ORDER BY rs.step_order)
        FROM public.recipe_steps rs
       WHERE rs.recipe_id = r.id
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'article_id', rl.article_id,
        'code', a.code,
        'designation', a.designation,
        'quantity', rl.quantite,
        'unit', rl.unite,
        'item_type', rl.item_type
      ) ORDER BY a.code)
        FROM public.recipe_lines rl
        LEFT JOIN public.articles a ON a.id = rl.article_id
       WHERE rl.recipe_id = r.id AND rl.is_quality_sensitive = true
    ), '[]'::jsonb)
  FROM public.recipes r
  WHERE r.id = v_recipe_id;
END;
$$;


--
-- Name: get_scope_shift_context(uuid, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_scope_shift_context(_user_id uuid, _scope text, _at timestamp with time zone DEFAULT now()) RETURNS TABLE(team_id uuid, template_id uuid, template_code text, heure_debut timestamp with time zone, heure_fin timestamp with time zone, line_ids uuid[], is_on_shift boolean, autorisation_libre boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_today date := (_at AT TIME ZONE 'Africa/Algiers')::date;
BEGIN
  RETURN QUERY
  WITH candidate_dates AS (SELECT v_today AS d UNION ALL SELECT v_today - 1),
  member AS (
    SELECT stm.team_id, stm.autorisation_libre, stm.cycle_pattern, stm.anchor_date,
           m.id AS mode_id, m.code AS mode_code
    FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    JOIN public.shift_modes m ON m.id = stm.shift_mode_id AND m.is_active
    WHERE stm.user_id = _user_id AND stm.is_active
      AND (stm.scope_kind = _scope OR stm.scope_kind = 'all' OR _scope = 'all')
  ),
  slot_for_day AS (
    SELECT mb.team_id, mb.autorisation_libre, mb.mode_id, mb.mode_code, cd.d AS d,
      CASE WHEN mb.mode_code = 'surface'
        THEN CASE WHEN EXTRACT(ISODOW FROM cd.d) IN (6,7) THEN NULL
             ELSE (SELECT lower(s.label) FROM public.shift_mode_slots s WHERE s.shift_mode_id = mb.mode_id ORDER BY s.sort_order LIMIT 1) END
        ELSE lower(public.shift_cycle_slot(mb.cycle_pattern, mb.anchor_date, cd.d)) END AS slot_label
    FROM member mb CROSS JOIN candidate_dates cd
  ),
  rows AS (
    SELECT sf.team_id, sl.id AS template_id, lower(sl.label) AS template_code,
      ((sf.d + sl.heure_debut) AT TIME ZONE 'Africa/Algiers') AS h_debut,
      ((CASE WHEN sl.heure_fin <= sl.heure_debut THEN sf.d + 1 ELSE sf.d END + sl.heure_fin) AT TIME ZONE 'Africa/Algiers') AS h_fin,
      '{}'::uuid[] AS line_ids, sf.autorisation_libre
    FROM slot_for_day sf
    JOIN public.shift_mode_slots sl ON sl.shift_mode_id = sf.mode_id AND lower(sl.label) = sf.slot_label
    WHERE sf.slot_label IS NOT NULL
  )
  SELECT r.team_id, r.template_id, r.template_code, r.h_debut, r.h_fin, r.line_ids,
    (_at >= r.h_debut AND _at < r.h_fin) AS is_on_shift, r.autorisation_libre
  FROM rows r
  ORDER BY (_at >= r.h_debut AND _at < r.h_fin) DESC,
    CASE WHEN r.h_debut >= _at THEN r.h_debut END ASC NULLS LAST, r.h_debut DESC
  LIMIT 1;
END;
$$;


--
-- Name: global_search(text, text[], timestamp with time zone, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.global_search(q text, modules text[] DEFAULT NULL::text[], date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, limit_per_module integer DEFAULT 10) RETURNS TABLE(module text, entity_id uuid, code text, label text, snippet text, severity text, url text, updated_at timestamp with time zone, score real)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  ts_q tsquery;
  trgm_q text;
  want   text[];
BEGIN
  IF q IS NULL OR length(btrim(q)) = 0 THEN RETURN; END IF;

  trgm_q := lower(unaccent(btrim(q)));
  ts_q := websearch_to_tsquery('public.french_unaccent', q);

  want := COALESCE(modules, ARRAY[
    'machines','equipements','organes','lignes','pdr','tickets','interventions',
    'of','products','articles','recipes','preventif','arrets','consommations',
    'audit','notifications','validations','documents','pdr_movements','fournisseurs'
  ]);

  IF 'machines' = ANY(want) THEN
    RETURN QUERY
    SELECT 'machines'::text, m.id, m.code, m.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', m.designation, m.description, m.localisation), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22,MinWords=5'),
           m.criticite::text, '/machines/'||m.id::text, m.updated_at,
           (ts_rank_cd(m.search_vector, ts_q) + similarity(coalesce(m.code,''), trgm_q))::real
    FROM public.machines m
    WHERE (m.search_vector @@ ts_q OR m.code ILIKE '%'||trgm_q||'%' OR m.designation % trgm_q)
      AND (date_from IS NULL OR m.updated_at >= date_from)
      AND (date_to IS NULL OR m.updated_at <= date_to)
    ORDER BY 9 DESC, m.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'equipements' = ANY(want) THEN
    RETURN QUERY
    SELECT 'equipements'::text, e.id, e.code, e.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', e.designation, e.description), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22,MinWords=5'),
           e.criticite::text, '/equipements/'||e.id::text, e.updated_at,
           (ts_rank_cd(e.search_vector, ts_q) + similarity(coalesce(e.code,''), trgm_q))::real
    FROM public.equipements e
    WHERE (e.search_vector @@ ts_q OR e.code ILIKE '%'||trgm_q||'%' OR e.designation % trgm_q)
      AND (date_from IS NULL OR e.updated_at >= date_from)
      AND (date_to IS NULL OR e.updated_at <= date_to)
    ORDER BY 9 DESC, e.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'organes' = ANY(want) THEN
    RETURN QUERY
    SELECT 'organes'::text, o.id, o.code, o.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', o.designation, o.description), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22,MinWords=5'),
           o.criticite::text, '/organes/'||o.id::text, o.updated_at,
           (ts_rank_cd(o.search_vector, ts_q) + similarity(coalesce(o.code,''), trgm_q))::real
    FROM public.organes o
    WHERE (o.search_vector @@ ts_q OR o.code ILIKE '%'||trgm_q||'%' OR o.designation % trgm_q)
      AND (date_from IS NULL OR o.updated_at >= date_from)
      AND (date_to IS NULL OR o.updated_at <= date_to)
    ORDER BY 9 DESC, o.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'lignes' = ANY(want) THEN
    RETURN QUERY
    SELECT 'lignes'::text, l.id, l.code, l.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', l.designation, l.description, l.atelier), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           NULL::text, '/lignes/'||l.id::text, l.updated_at,
           (ts_rank_cd(l.search_vector, ts_q))::real
    FROM public.production_lines l
    WHERE l.search_vector @@ ts_q
      AND (date_from IS NULL OR l.updated_at >= date_from)
      AND (date_to IS NULL OR l.updated_at <= date_to)
    ORDER BY 9 DESC, l.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'pdr' = ANY(want) THEN
    RETURN QUERY
    SELECT 'pdr'::text, p.id, p.reference, p.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', p.designation, p.description, p.fournisseur, p.emplacement), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22,MinWords=5'),
           p.statut_pdr::text, '/pdr/'||p.id::text, p.updated_at,
           (ts_rank_cd(p.search_vector, ts_q) + similarity(coalesce(p.reference,''), trgm_q))::real
    FROM public.pdr p
    WHERE (p.search_vector @@ ts_q OR p.reference ILIKE '%'||trgm_q||'%' OR p.designation % trgm_q)
      AND (date_from IS NULL OR p.updated_at >= date_from)
      AND (date_to IS NULL OR p.updated_at <= date_to)
    ORDER BY 9 DESC, p.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'tickets' = ANY(want) THEN
    RETURN QUERY
    SELECT 'tickets'::text, t.id, t.numero, left(coalesce(t.description,''),80),
           ts_headline('public.french_unaccent', concat_ws(' • ', t.description, t.cause_racine, t.solution), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=24,MinWords=6'),
           t.statut::text, '/tickets/'||t.id::text, t.updated_at,
           (ts_rank_cd(t.search_vector, ts_q) + similarity(coalesce(t.numero,''), trgm_q))::real
    FROM public.tickets t
    WHERE (t.search_vector @@ ts_q OR t.numero ILIKE '%'||trgm_q||'%')
      AND (date_from IS NULL OR t.updated_at >= date_from)
      AND (date_to IS NULL OR t.updated_at <= date_to)
    ORDER BY 9 DESC, t.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'interventions' = ANY(want) THEN
    RETURN QUERY
    SELECT 'interventions'::text, i.id, NULL::text, left(coalesce(i.description,''),80),
           ts_headline('public.french_unaccent', concat_ws(' • ', i.description, i.notes), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=24'),
           i.statut::text, '/tickets/'||i.ticket_id::text, i.updated_at,
           (ts_rank_cd(i.search_vector, ts_q))::real
    FROM public.interventions i
    WHERE i.search_vector @@ ts_q
      AND (date_from IS NULL OR i.updated_at >= date_from)
      AND (date_to IS NULL OR i.updated_at <= date_to)
    ORDER BY 9 DESC, i.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'of' = ANY(want) THEN
    RETURN QUERY
    SELECT 'of'::text, of.id, of.numero, NULL::text,
           ts_headline('public.french_unaccent', of.numero, ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=10'),
           of.statut::text, '/gpao/of/'||of.id::text, of.updated_at,
           (ts_rank_cd(of.search_vector, ts_q) + similarity(coalesce(of.numero,''), trgm_q))::real
    FROM public.ordres_fabrication of
    WHERE (of.search_vector @@ ts_q OR of.numero ILIKE '%'||trgm_q||'%')
      AND (date_from IS NULL OR of.updated_at >= date_from)
      AND (date_to IS NULL OR of.updated_at <= date_to)
    ORDER BY 9 DESC, of.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'products' = ANY(want) THEN
    RETURN QUERY
    SELECT 'products'::text, p.id, p.code, p.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', p.designation, p.description), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           NULL::text, '/gpao/produits/'||p.id::text, p.updated_at,
           (ts_rank_cd(p.search_vector, ts_q) + similarity(coalesce(p.code,''), trgm_q))::real
    FROM public.products p
    WHERE (p.search_vector @@ ts_q OR p.code ILIKE '%'||trgm_q||'%' OR p.designation % trgm_q)
      AND (date_from IS NULL OR p.updated_at >= date_from)
      AND (date_to IS NULL OR p.updated_at <= date_to)
    ORDER BY 9 DESC, p.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'articles' = ANY(want) THEN
    RETURN QUERY
    SELECT 'articles'::text, a.id, a.code, a.designation,
           ts_headline('public.french_unaccent', concat_ws(' • ', a.designation, a.description, a.fournisseur), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           NULL::text, '/gpao/articles/'||a.id::text, a.updated_at,
           (ts_rank_cd(a.search_vector, ts_q) + similarity(coalesce(a.code,''), trgm_q))::real
    FROM public.articles a
    WHERE (a.search_vector @@ ts_q OR a.code ILIKE '%'||trgm_q||'%' OR a.designation % trgm_q)
      AND (date_from IS NULL OR a.updated_at >= date_from)
      AND (date_to IS NULL OR a.updated_at <= date_to)
    ORDER BY 9 DESC, a.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'preventif' = ANY(want) THEN
    RETURN QUERY
    SELECT 'preventif'::text, pp.id, NULL::text, pp.title,
           ts_headline('public.french_unaccent', concat_ws(' • ', pp.title, pp.description), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22'),
           pp.statut_plan::text, '/preventif/'||pp.id::text, pp.updated_at,
           (ts_rank_cd(pp.search_vector, ts_q))::real
    FROM public.preventive_plans pp
    WHERE pp.search_vector @@ ts_q
      AND (date_from IS NULL OR pp.updated_at >= date_from)
      AND (date_to IS NULL OR pp.updated_at <= date_to)
    ORDER BY 9 DESC, pp.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'arrets' = ANY(want) THEN
    RETURN QUERY
    SELECT 'arrets'::text, s.id, NULL::text, left(coalesce(s.description,''),80),
           ts_headline('public.french_unaccent', s.description, ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           s.type::text, '/gpao/arrets', s.updated_at,
           (ts_rank_cd(s.search_vector, ts_q))::real
    FROM public.production_stops s
    WHERE s.search_vector @@ ts_q
      AND (date_from IS NULL OR s.updated_at >= date_from)
      AND (date_to IS NULL OR s.updated_at <= date_to)
    ORDER BY 9 DESC, s.updated_at DESC LIMIT limit_per_module;
  END IF;

  IF 'consommations' = ANY(want) THEN
    RETURN QUERY
    SELECT 'consommations'::text, c.id, NULL::text, left(coalesce(c.notes,''),80),
           ts_headline('public.french_unaccent', c.notes, ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           NULL::text, '/gpao/consommations', c.created_at,
           (ts_rank_cd(c.search_vector, ts_q))::real
    FROM public.consumptions c
    WHERE c.search_vector @@ ts_q
      AND (date_from IS NULL OR c.created_at >= date_from)
      AND (date_to IS NULL OR c.created_at <= date_to)
    ORDER BY 9 DESC, c.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'audit' = ANY(want) THEN
    RETURN QUERY
    SELECT 'audit'::text, a.id, a.entity_code, coalesce(a.action_label, a.action),
           ts_headline('public.french_unaccent', concat_ws(' • ', a.description, a.entity_label, a.user_full_name), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=24'),
           a.severity, '/audit', a.created_at,
           (ts_rank_cd(a.search_vector, ts_q))::real
    FROM public.audit_logs a
    WHERE a.search_vector @@ ts_q
      AND (date_from IS NULL OR a.created_at >= date_from)
      AND (date_to IS NULL OR a.created_at <= date_to)
    ORDER BY 9 DESC, a.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'notifications' = ANY(want) THEN
    RETURN QUERY
    SELECT 'notifications'::text, n.id, n.entity_code, n.title,
           ts_headline('public.french_unaccent', concat_ws(' • ', n.message, n.entity_label), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22'),
           n.severity::text, coalesce(n.action_url, '/notifications'), n.created_at,
           (ts_rank_cd(n.search_vector, ts_q))::real
    FROM public.notifications n
    WHERE n.search_vector @@ ts_q
      AND (date_from IS NULL OR n.created_at >= date_from)
      AND (date_to IS NULL OR n.created_at <= date_to)
    ORDER BY 9 DESC, n.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'validations' = ANY(want) THEN
    RETURN QUERY
    SELECT 'validations'::text, vr.id, vr.entity_code, vr.title,
           ts_headline('public.french_unaccent', concat_ws(' • ', vr.description, vr.justification, vr.validation_comment, vr.entity_label), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22'),
           vr.status::text, '/validations', vr.created_at,
           (ts_rank_cd(vr.search_vector, ts_q))::real
    FROM public.validation_requests vr
    WHERE vr.search_vector @@ ts_q
      AND (date_from IS NULL OR vr.created_at >= date_from)
      AND (date_to IS NULL OR vr.created_at <= date_to)
    ORDER BY 9 DESC, vr.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'documents' = ANY(want) THEN
    RETURN QUERY
    SELECT 'documents'::text, d.id, NULL::text, d.file_name,
           ts_headline('public.french_unaccent', concat_ws(' • ', d.file_name, d.description), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           d.entity_type, d.file_url, d.created_at,
           (ts_rank_cd(d.search_vector, ts_q))::real
    FROM public.entity_documents d
    WHERE d.search_vector @@ ts_q
      AND (date_from IS NULL OR d.created_at >= date_from)
      AND (date_to IS NULL OR d.created_at <= date_to)
    ORDER BY 9 DESC, d.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'pdr_movements' = ANY(want) THEN
    RETURN QUERY
    SELECT 'pdr_movements'::text, m.id, m.ref_document_erp, coalesce(m.motif, m.type::text),
           ts_headline('public.french_unaccent', concat_ws(' • ', m.motif, m.reference_source, m.ref_document_erp), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=20'),
           m.type::text, '/pdr/'||m.pdr_id::text, m.created_at,
           (ts_rank_cd(m.search_vector, ts_q))::real
    FROM public.pdr_stock_movements m
    WHERE m.search_vector @@ ts_q
      AND (date_from IS NULL OR m.created_at >= date_from)
      AND (date_to IS NULL OR m.created_at <= date_to)
    ORDER BY 9 DESC, m.created_at DESC LIMIT limit_per_module;
  END IF;

  IF 'fournisseurs' = ANY(want) THEN
    RETURN QUERY
    SELECT 'fournisseurs'::text, s.id, s.reference_fournisseur, s.nom,
           ts_headline('public.french_unaccent', concat_ws(' • ', s.nom, s.adresse, s.email, s.notes), ts_q, 'StartSel=<mark>,StopSel=</mark>,MaxWords=22'),
           NULL::text, '/parametres', s.updated_at,
           (ts_rank_cd(s.search_vector, ts_q))::real
    FROM public.pdr_family_suppliers s
    WHERE s.search_vector @@ ts_q
      AND (date_from IS NULL OR s.updated_at >= date_from)
      AND (date_to IS NULL OR s.updated_at <= date_to)
    ORDER BY 9 DESC, s.updated_at DESC LIMIT limit_per_module;
  END IF;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, poste, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'poste', ''),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: has_audit_access(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_audit_access(_user_id uuid, _module text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'responsable_si'::app_role)
    OR public.has_role(_user_id, 'auditeur'::app_role)
    OR (
      public.has_role(_user_id, 'resp_maintenance'::app_role)
      AND _module IN (
        'auth','machines','equipements','organes','tickets','interventions',
        'preventif','pdr','pdr_stock','lignes','documents','images'
      )
    )
    OR (
      public.has_role(_user_id, 'resp_production'::app_role)
      AND _module IN (
        'auth','gpao','of','produits','articles','recettes',
        'consommations','arrets','lignes','documents','images'
      )
    )
$$;


--
-- Name: has_quality_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_quality_permission(_user_id uuid, _action text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.quality_permissions qp ON qp.role = ur.role::text
    WHERE ur.user_id = _user_id
      AND CASE _action
        WHEN 'create_check' THEN qp.can_create_check
        WHEN 'validate_check' THEN qp.can_validate_check
        WHEN 'reject_check' THEN qp.can_reject_check
        WHEN 'create_nc' THEN qp.can_create_nc
        WHEN 'close_nc' THEN qp.can_close_nc
        WHEN 'decide_nc' THEN qp.can_decide_nc
        WHEN 'create_action' THEN qp.can_create_action
        WHEN 'verify_action' THEN qp.can_verify_action
        WHEN 'close_action' THEN qp.can_close_action
        WHEN 'manage_indicators' THEN qp.can_manage_indicators
        WHEN 'manage_assignments' THEN qp.can_manage_assignments
        WHEN 'publish_recipe' THEN qp.can_publish_recipe
        WHEN 'publish_bom' THEN qp.can_publish_bom
        WHEN 'export_tracability' THEN qp.can_export_tracability
        WHEN 'view_reports' THEN qp.can_view_reports
        ELSE false
      END
  )
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: interventions_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.interventions_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.description, NEW.notes); RETURN NEW; END$$;


--
-- Name: inv_assignment_authorized_families(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inv_assignment_authorized_families(p_assignment_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT s.family_id FROM public.inventory_assignment_scopes s
   WHERE s.assignment_id = p_assignment_id AND s.include_children = false
  UNION
  SELECT d FROM public.inventory_assignment_scopes s
    CROSS JOIN LATERAL public.inv_family_descendants(s.family_id) AS d
   WHERE s.assignment_id = p_assignment_id AND s.include_children = true;
$$;


--
-- Name: inv_campaign_authorized_families(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inv_campaign_authorized_families(p_campaign_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT s.family_id FROM public.inventory_campaign_scopes s
   WHERE s.campaign_id = p_campaign_id AND s.include_children = false
  UNION
  SELECT d FROM public.inventory_campaign_scopes s
    CROSS JOIN LATERAL public.inv_family_descendants(s.family_id) AS d
   WHERE s.campaign_id = p_campaign_id AND s.include_children = true;
$$;


--
-- Name: inv_close_campaign(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inv_close_campaign(p_campaign_id uuid, p_motif text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_pending int;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'responsable_inventaire'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT count(*) INTO v_pending FROM public.inventory_targets
   WHERE campaign_id = p_campaign_id AND status NOT IN ('conforme','cloture');
  IF v_pending > 0 THEN
    RAISE EXCEPTION 'Impossible de clôturer : % articles encore non conformes', v_pending;
  END IF;
  UPDATE public.inventory_targets SET status = 'cloture'
   WHERE campaign_id = p_campaign_id AND status = 'conforme';
  UPDATE public.inventory_campaigns
     SET status = 'cloturee', date_cloture = now(), motif = COALESCE(p_motif, motif), updated_by = auth.uid()
   WHERE id = p_campaign_id;
END $$;


--
-- Name: inv_ensure_targets(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inv_ensure_targets(p_campaign_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_camp public.inventory_campaigns%ROWTYPE; v_count int := 0;
BEGIN
  SELECT * INTO v_camp FROM public.inventory_campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'responsable_inventaire'::app_role)
       OR v_camp.responsable_id = auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF v_camp.scope_pdr THEN
    INSERT INTO public.inventory_targets (campaign_id, entity_type, entity_id, entity_code, entity_label, family_id, qty_systeme)
    SELECT v_camp.id, 'pdr'::public.inventory_entity_type, p.id, p.reference, p.designation, p.famille_id, COALESCE(p.stock_actuel,0)
    FROM public.pdr p
    WHERE p.famille_id IN (SELECT public.inv_campaign_authorized_families(v_camp.id))
    ON CONFLICT (campaign_id, entity_type, entity_id) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  INSERT INTO public.inventory_results (target_id, campaign_id, round)
  SELECT t.id, t.campaign_id, t.current_round
  FROM public.inventory_targets t
  WHERE t.campaign_id = v_camp.id
  ON CONFLICT (target_id) DO NOTHING;

  RETURN v_count;
END $$;


--
-- Name: inv_family_descendants(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inv_family_descendants(p_family_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  WITH RECURSIVE t AS (
    SELECT id FROM public.pdr_families WHERE id = p_family_id
    UNION ALL
    SELECT f.id FROM public.pdr_families f JOIN t ON f.parent_id = t.id
  ) SELECT id FROM t;
$$;


--
-- Name: inv_open_campaign(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inv_open_campaign(p_campaign_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'responsable_inventaire'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  PERFORM public.inv_ensure_targets(p_campaign_id);
  UPDATE public.inventory_campaigns
     SET status = 'en_cours', date_debut = COALESCE(date_debut, current_date), updated_by = auth.uid()
   WHERE id = p_campaign_id;
END $$;


--
-- Name: inv_recompute_result(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inv_recompute_result(p_target_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_target public.inventory_targets%ROWTYPE;
  v_a numeric; v_b numeric; v_c numeric;
  v_decision public.inventory_decision := 'en_attente';
  v_qty_finale numeric := NULL;
  v_status public.inventory_target_status;
BEGIN
  SELECT * INTO v_target FROM public.inventory_targets WHERE id = p_target_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT qty_comptee INTO v_a FROM public.inventory_counts WHERE target_id = p_target_id AND role = 'agent_a' AND round = v_target.current_round;
  SELECT qty_comptee INTO v_b FROM public.inventory_counts WHERE target_id = p_target_id AND role = 'agent_b' AND round = v_target.current_round;
  SELECT qty_comptee INTO v_c FROM public.inventory_counts WHERE target_id = p_target_id AND role = 'agent_c' AND round = v_target.current_round;

  IF v_a IS NOT NULL AND v_b IS NOT NULL THEN
    IF v_a = v_b THEN
      v_decision := 'conforme_ab'; v_qty_finale := v_a; v_status := 'conforme';
    ELSE
      IF v_c IS NULL THEN
        v_decision := 'en_attente'; v_status := 'en_arbitrage';
      ELSIF v_c = v_a THEN
        v_decision := 'conforme_c_eq_a'; v_qty_finale := v_c; v_status := 'conforme';
      ELSIF v_c = v_b THEN
        v_decision := 'conforme_c_eq_b'; v_qty_finale := v_c; v_status := 'conforme';
      ELSE
        v_decision := 'recompte_ab'; v_status := 'a_recompter';
        UPDATE public.inventory_targets SET current_round = current_round + 1, status = 'a_recompter'
         WHERE id = p_target_id;
      END IF;
    END IF;
  ELSE
    v_status := 'a_compter';
  END IF;

  INSERT INTO public.inventory_results (target_id, campaign_id, round, qty_a, qty_b, qty_c,
       ecart_ab, ecart_ac, ecart_bc, qty_finale, decision, decided_at)
  VALUES (p_target_id, v_target.campaign_id, v_target.current_round, v_a, v_b, v_c,
          CASE WHEN v_a IS NOT NULL AND v_b IS NOT NULL THEN abs(v_a - v_b) END,
          CASE WHEN v_a IS NOT NULL AND v_c IS NOT NULL THEN abs(v_a - v_c) END,
          CASE WHEN v_b IS NOT NULL AND v_c IS NOT NULL THEN abs(v_b - v_c) END,
          v_qty_finale, v_decision,
          CASE WHEN v_decision IN ('conforme_ab','conforme_c_eq_a','conforme_c_eq_b') THEN now() END)
  ON CONFLICT (target_id) DO UPDATE SET
    round = EXCLUDED.round, qty_a = EXCLUDED.qty_a, qty_b = EXCLUDED.qty_b, qty_c = EXCLUDED.qty_c,
    ecart_ab = EXCLUDED.ecart_ab, ecart_ac = EXCLUDED.ecart_ac, ecart_bc = EXCLUDED.ecart_bc,
    qty_finale = EXCLUDED.qty_finale, decision = EXCLUDED.decision,
    decided_at = EXCLUDED.decided_at, updated_at = now();

  IF v_status IS NOT NULL AND v_status <> 'a_recompter' THEN
    UPDATE public.inventory_targets SET status = v_status WHERE id = p_target_id;
  END IF;
END $$;


--
-- Name: inv_register_count(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inv_register_count(p_target_id uuid, p_qty numeric, p_notes text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_target public.inventory_targets%ROWTYPE;
  v_campaign public.inventory_campaigns%ROWTYPE;
  v_assignment public.inventory_assignments%ROWTYPE;
  v_count_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF p_qty IS NULL OR p_qty < 0 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;

  SELECT * INTO v_target FROM public.inventory_targets WHERE id = p_target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target introuvable'; END IF;

  SELECT * INTO v_campaign FROM public.inventory_campaigns WHERE id = v_target.campaign_id;
  IF v_campaign.status NOT IN ('en_cours','arbitrage') THEN
    RAISE EXCEPTION 'Campagne non ouverte au comptage';
  END IF;

  SELECT * INTO v_assignment FROM public.inventory_assignments
   WHERE campaign_id = v_target.campaign_id AND agent_id = v_uid AND is_active = true
   ORDER BY CASE role WHEN 'agent_c' THEN 0 WHEN 'agent_a' THEN 1 ELSE 2 END
   LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vous n''êtes pas affecté à cette campagne'; END IF;

  IF v_assignment.role <> 'agent_c' THEN
    IF v_target.family_id IS NULL OR
       v_target.family_id NOT IN (SELECT public.inv_assignment_authorized_families(v_assignment.id)) THEN
      RAISE EXCEPTION 'Article hors de votre périmètre autorisé';
    END IF;
  END IF;

  IF v_target.status IN ('cloture','conforme') THEN
    RAISE EXCEPTION 'Article déjà clôturé / conforme';
  END IF;

  IF EXISTS (SELECT 1 FROM public.inventory_counts
              WHERE target_id = p_target_id AND assignment_id = v_assignment.id
                AND round = v_target.current_round) THEN
    RAISE EXCEPTION 'Vous avez déjà validé ce comptage (verrouillé)';
  END IF;

  INSERT INTO public.inventory_counts (target_id, assignment_id, agent_id, role, round, qty_comptee, notes)
  VALUES (p_target_id, v_assignment.id, v_uid, v_assignment.role, v_target.current_round, p_qty, p_notes)
  RETURNING id INTO v_count_id;

  PERFORM public.inv_recompute_result(p_target_id);
  RETURN v_count_id;
END $$;


--
-- Name: is_audit_enabled(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_audit_enabled(_role text, _module text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT audit_enabled FROM public.audit_role_settings
      WHERE role = _role AND module = _module LIMIT 1),
    true
  )
$$;


--
-- Name: is_user_on_shift(uuid, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_on_shift(_user_id uuid, _scope text DEFAULT 'all'::text, _at timestamp with time zone DEFAULT now()) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_today date := (_at AT TIME ZONE 'Africa/Algiers')::date;
  v_free boolean := false;
  v_found boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    WHERE stm.user_id = _user_id AND stm.is_active AND stm.autorisation_libre
  ) INTO v_free;
  IF v_free THEN RETURN true; END IF;

  WITH candidate_dates AS (SELECT v_today AS d UNION ALL SELECT v_today - 1),
  member AS (
    SELECT stm.cycle_pattern, stm.anchor_date, m.id AS mode_id, m.code AS mode_code
    FROM public.shift_team_members stm
    JOIN public.shift_teams t ON t.id = stm.team_id AND t.is_active
    JOIN public.shift_modes m ON m.id = stm.shift_mode_id AND m.is_active
    WHERE stm.user_id = _user_id AND stm.is_active
      AND (stm.scope_kind = _scope OR stm.scope_kind = 'all' OR _scope = 'all')
  ),
  slot_for_day AS (
    SELECT mb.mode_id, cd.d AS d,
      CASE WHEN mb.mode_code = 'surface'
        THEN CASE WHEN EXTRACT(ISODOW FROM cd.d) IN (6,7) THEN NULL
             ELSE (SELECT lower(s.label) FROM public.shift_mode_slots s WHERE s.shift_mode_id = mb.mode_id ORDER BY s.sort_order LIMIT 1) END
        ELSE lower(public.shift_cycle_slot(mb.cycle_pattern, mb.anchor_date, cd.d)) END AS slot_label
    FROM member mb CROSS JOIN candidate_dates cd
  )
  SELECT EXISTS(
    SELECT 1 FROM slot_for_day sf
    JOIN public.shift_mode_slots sl ON sl.shift_mode_id = sf.mode_id AND lower(sl.label) = sf.slot_label
    WHERE sf.slot_label IS NOT NULL
      AND _at >= ((sf.d + sl.heure_debut) AT TIME ZONE 'Africa/Algiers')
      AND _at <  ((CASE WHEN sl.heure_fin <= sl.heure_debut THEN sf.d + 1 ELSE sf.d END + sl.heure_fin) AT TIME ZONE 'Africa/Algiers')
  ) INTO v_found;
  RETURN v_found;
END;
$$;


--
-- Name: machines_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.machines_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.search_vector := public.fts_build(NEW.code, NEW.designation, NEW.description, NEW.localisation, NEW.marque, NEW.modele, NEW.numero_serie);
  RETURN NEW;
END$$;


--
-- Name: notifications_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notifications_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.title, NEW.message, NEW.entity_label, NEW.entity_code); RETURN NEW; END$$;


--
-- Name: notify_shift_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_shift_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_kind text;
  v_module text;
  v_resp_role text;
  v_operator_id uuid;
  v_entity_label text;
  v_force_close boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'shifts' THEN
    v_kind := 'production'; v_module := 'gpao'; v_resp_role := 'resp_production';
    v_operator_id := COALESCE(NEW.chef_ligne_id, OLD.chef_ligne_id);
  ELSIF TG_TABLE_NAME = 'maintenance_shifts' THEN
    v_kind := 'maintenance'; v_module := 'interventions'; v_resp_role := 'resp_maintenance';
    v_operator_id := COALESCE(NEW.maintenancier_id, OLD.maintenancier_id);
  ELSIF TG_TABLE_NAME = 'quality_shifts' THEN
    v_kind := 'quality'; v_module := 'qualite'; v_resp_role := 'responsable_controle_qualite';
    v_operator_id := COALESCE(NEW.controller_id, OLD.controller_id);
  ELSE
    RETURN NEW;
  END IF;

  v_entity_label := 'Shift ' || v_kind || ' du ' || COALESCE(NEW.date_shift, OLD.date_shift)::text;

  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    INSERT INTO public.notifications (
      title, message, notification_type, module, entity_type, entity_id, entity_label,
      severity, recipient_user_id, source, action_url, deduplication_key
    ) VALUES (
      'Session shift ouverte',
      'Votre session de shift ' || v_kind || ' a été ouverte par votre responsable.',
      'shift_opened', v_module, TG_TABLE_NAME, NEW.id, v_entity_label,
      'info'::notification_severity, v_operator_id, 'system',
      CASE v_kind
        WHEN 'production' THEN '/gpao/shift/live'
        WHEN 'maintenance' THEN '/maintenance/shift/live'
        ELSE '/qualite/shift/live'
      END,
      'shift_opened:' || NEW.id::text
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    v_force_close := COALESCE(NEW.observations, '') LIKE '[Forcée par responsable]%';

    INSERT INTO public.notifications (
      title, message, notification_type, module, entity_type, entity_id, entity_label,
      severity, recipient_role, source, action_url, deduplication_key
    ) VALUES (
      CASE WHEN v_force_close THEN 'Shift clôturé (forcé)' ELSE 'Shift clôturé' END,
      'Une session de shift ' || v_kind || ' vient d''être clôturée.',
      CASE WHEN v_force_close THEN 'shift_force_closed' ELSE 'shift_closed' END,
      v_module, TG_TABLE_NAME, NEW.id, v_entity_label,
      CASE WHEN v_force_close THEN 'high'::notification_severity ELSE 'info'::notification_severity END,
      v_resp_role, 'system',
      CASE v_kind
        WHEN 'production' THEN '/gpao/shift'
        WHEN 'maintenance' THEN '/maintenance/shift'
        ELSE '/qualite/shift'
      END,
      'shift_closed:' || NEW.id::text
    );

    IF v_force_close AND v_operator_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        title, message, notification_type, module, entity_type, entity_id, entity_label,
        severity, recipient_user_id, source, action_url, deduplication_key
      ) VALUES (
        'Votre shift a été clôturé par le responsable',
        COALESCE(NEW.observations, 'Clôture forcée'),
        'shift_force_closed', v_module, TG_TABLE_NAME, NEW.id, v_entity_label,
        'high'::notification_severity, v_operator_id, 'system',
        '/apps',
        'shift_force_closed_op:' || NEW.id::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: of_backfill_bom_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.of_backfill_bom_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.bom_id IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT id INTO NEW.bom_id
      FROM public.bill_of_materials
     WHERE product_id = NEW.product_id
       AND status = 'active'
     ORDER BY version DESC
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: of_close_cascade_shifts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.of_close_cascade_shifts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.statut IN ('termine', 'annule') AND OLD.statut <> NEW.statut THEN
    UPDATE public.shifts
       SET is_active = false,
           heure_fin_reelle = COALESCE(heure_fin_reelle, now()),
           statut = 'cloture',
           observations = COALESCE(NULLIF(observations,''),'') ||
                          E'\n[Clôture automatique : OF ' || NEW.statut || ']'
     WHERE of_id = NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: of_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.of_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.numero); RETURN NEW; END$$;


--
-- Name: open_my_work_session(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.open_my_work_session() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ctx record;
  v_today date := (now() AT TIME ZONE 'Africa/Algiers')::date;
  v_session_id uuid;
  v_shift_type public.shift_type;
  v_lid uuid;
  v_result jsonb := jsonb_build_object('maintenance', NULL, 'quality', NULL);
BEGIN
  IF v_uid IS NULL THEN RETURN v_result; END IF;

  -- ============ MAINTENANCE ============
  IF public.has_role(v_uid, 'maintenancier') THEN
    SELECT * INTO v_ctx FROM public.get_scope_shift_context(v_uid, 'maintenance', now()) LIMIT 1;
    IF v_ctx.team_id IS NOT NULL AND (v_ctx.is_on_shift OR v_ctx.autorisation_libre) THEN
      -- anti-duplicate
      SELECT id INTO v_session_id
      FROM public.maintenance_shifts
      WHERE maintenancier_id = v_uid AND is_active = true
      LIMIT 1;
      IF v_session_id IS NULL THEN
        v_shift_type := CASE v_ctx.template_code
          WHEN 'matin' THEN 'matin'::public.shift_type
          WHEN 'soir' THEN 'apres_midi'::public.shift_type
          WHEN 'midi' THEN 'apres_midi'::public.shift_type
          WHEN 'nuit' THEN 'nuit'::public.shift_type
          ELSE 'matin'::public.shift_type
        END;
        INSERT INTO public.maintenance_shifts (
          maintenancier_id, shift_type, date_shift, shift_team_id, line_ids,
          heure_debut, heure_fin, is_active, observations, opened_by
        ) VALUES (
          v_uid, v_shift_type, v_today, v_ctx.team_id, COALESCE(v_ctx.line_ids, '{}'),
          v_ctx.heure_debut, v_ctx.heure_fin, true,
          '[Ouverture auto rotation équipe]', v_uid
        )
        RETURNING id INTO v_session_id;

        INSERT INTO public.audit_logs (action, action_label, description, user_id, entity_type, entity_id)
        VALUES (
          'shift_auto_open', 'Ouverture auto session',
          'Session maintenance ouverte automatiquement via rotation équipe (' || COALESCE(v_ctx.template_code, '?') || ')',
          v_uid, 'maintenance_shift', v_session_id
        );
      END IF;
      v_result := jsonb_set(v_result, '{maintenance}', to_jsonb(v_session_id));
    END IF;
  END IF;

  -- ============ QUALITY ============
  IF public.has_role(v_uid, 'controleur_qualite') THEN
    SELECT * INTO v_ctx FROM public.get_scope_shift_context(v_uid, 'quality', now()) LIMIT 1;
    IF v_ctx.team_id IS NOT NULL AND (v_ctx.is_on_shift OR v_ctx.autorisation_libre) THEN
      SELECT id INTO v_session_id
      FROM public.quality_shifts
      WHERE controller_id = v_uid AND is_active = true
      LIMIT 1;
      IF v_session_id IS NULL THEN
        v_shift_type := CASE v_ctx.template_code
          WHEN 'matin' THEN 'matin'::public.shift_type
          WHEN 'soir' THEN 'apres_midi'::public.shift_type
          WHEN 'midi' THEN 'apres_midi'::public.shift_type
          WHEN 'nuit' THEN 'nuit'::public.shift_type
          ELSE 'matin'::public.shift_type
        END;
        INSERT INTO public.quality_shifts (
          controller_id, shift_type, date_shift, shift_team_id,
          heure_debut, heure_fin, is_active, observations, opened_by
        ) VALUES (
          v_uid, v_shift_type, v_today, v_ctx.team_id,
          v_ctx.heure_debut, v_ctx.heure_fin, true,
          '[Ouverture auto rotation équipe]', v_uid
        )
        RETURNING id INTO v_session_id;

        -- attach scheduled lines
        IF v_ctx.line_ids IS NOT NULL THEN
          FOREACH v_lid IN ARRAY v_ctx.line_ids LOOP
            INSERT INTO public.quality_shift_lines (quality_shift_id, production_line_id)
            VALUES (v_session_id, v_lid)
            ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;

        INSERT INTO public.audit_logs (action, action_label, description, user_id, entity_type, entity_id)
        VALUES (
          'shift_auto_open', 'Ouverture auto session',
          'Session qualité ouverte automatiquement via rotation équipe (' || COALESCE(v_ctx.template_code, '?') || ')',
          v_uid, 'quality_shift', v_session_id
        );
      END IF;
      v_result := jsonb_set(v_result, '{quality}', to_jsonb(v_session_id));
    END IF;
  END IF;

  RETURN v_result;
END;
$$;


--
-- Name: organes_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.organes_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.search_vector := public.fts_build(
    NEW.code, NEW.designation, NEW.description,
    NEW.marque, NEW.modele, NEW.fabricant,
    NEW.reference_constructeur, NEW.numero_serie, NEW.code_erp,
    NEW.qr_code, NEW.code_barres
  );
  RETURN NEW;
END$$;


--
-- Name: pdr_equivalences_enforce_proposal(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pdr_equivalences_enforce_proposal() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'resp_maintenance'::app_role)
    OR has_role(auth.uid(), 'gestionnaire_magasin'::app_role)
    OR has_role(auth.uid(), 'bureau_methode'::app_role)
  ) THEN
    NEW.validation_status := 'non_valide';
    NEW.validated_by := NULL;
    NEW.validated_at := NULL;
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END$$;


--
-- Name: pdr_family_suppliers_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pdr_family_suppliers_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.nom, NEW.reference_fournisseur, NEW.email, NEW.tel, NEW.adresse, NEW.notes); RETURN NEW; END$$;


--
-- Name: pdr_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pdr_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.search_vector := public.fts_build(
    NEW.reference, NEW.designation, NEW.description,
    NEW.fournisseur, NEW.emplacement,
    NEW.marque, NEW.modele, NEW.fabricant,
    NEW.reference_constructeur, NEW.code_erp, NEW.code_barres,
    NEW.sous_famille, NEW.matiere
  );
  RETURN NEW;
END$$;


--
-- Name: pdr_stock_movements_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pdr_stock_movements_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.motif, NEW.reference_source, NEW.ref_document_erp, NEW.source_type, NEW.type::text); RETURN NEW; END$$;


--
-- Name: pdr_suppliers_unique_principal(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pdr_suppliers_unique_principal() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.is_principal IS TRUE THEN
    UPDATE public.pdr_suppliers
       SET is_principal = false, updated_at = now()
     WHERE pdr_id = NEW.pdr_id
       AND id <> NEW.id
       AND is_principal = true;
  END IF;
  RETURN NEW;
END$$;


--
-- Name: preventive_plans_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.preventive_plans_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.title, NEW.description, COALESCE(NEW.checklist::text,'')); RETURN NEW; END$$;


--
-- Name: production_lines_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.production_lines_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.code, NEW.designation, NEW.description, NEW.atelier); RETURN NEW; END$$;


--
-- Name: production_stops_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.production_stops_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.description, NEW.type::text); RETURN NEW; END$$;


--
-- Name: products_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.products_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.code, NEW.designation, NEW.description, NEW.code_erp); RETURN NEW; END$$;


--
-- Name: qshift_unlink_closed_production(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.qshift_unlink_closed_production() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    DELETE FROM public.quality_shift_production_links
    WHERE production_shift_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: quality_actions_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quality_actions_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.search_vector := public.fts_build(NEW.title, NEW.description, NEW.verification_comment);
  RETURN NEW;
END $$;


--
-- Name: quality_actions_validate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quality_actions_validate() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'closed' THEN
    IF NEW.verification_comment IS NULL OR length(btrim(NEW.verification_comment)) = 0 THEN
      RAISE EXCEPTION 'verification_comment requis pour clôturer une action qualité';
    END IF;
    IF NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
    IF NEW.closed_by IS NULL THEN NEW.closed_by := auth.uid(); END IF;
  END IF;
  IF NEW.status = 'verified' THEN
    IF NEW.verified_at IS NULL THEN NEW.verified_at := now(); END IF;
    IF NEW.verified_by IS NULL THEN NEW.verified_by := auth.uid(); END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;


--
-- Name: quality_checks_compute_conformity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quality_checks_compute_conformity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_type text;
BEGIN
  -- Whitelist statuses
  IF NEW.status NOT IN ('draft','submitted','validated','rejected') THEN
    RAISE EXCEPTION 'Statut invalide: %', NEW.status;
  END IF;
  IF NEW.validation_status NOT IN ('not_required','pending','approved','rejected') THEN
    RAISE EXCEPTION 'Statut de validation invalide: %', NEW.validation_status;
  END IF;

  SELECT indicator_type::text INTO v_type FROM public.quality_indicators WHERE id = NEW.indicator_id;

  IF v_type = 'numeric' AND NEW.measured_value_numeric IS NOT NULL THEN
    NEW.is_conform := (NEW.min_value IS NULL OR NEW.measured_value_numeric >= NEW.min_value)
                  AND (NEW.max_value IS NULL OR NEW.measured_value_numeric <= NEW.max_value);
    IF NEW.target_value IS NOT NULL THEN
      NEW.deviation_value := NEW.measured_value_numeric - NEW.target_value;
      IF NEW.target_value <> 0 THEN
        NEW.deviation_percent := (NEW.measured_value_numeric - NEW.target_value) / NEW.target_value * 100.0;
      ELSE
        NEW.deviation_percent := NULL;
      END IF;
    ELSE
      NEW.deviation_value := NULL;
      NEW.deviation_percent := NULL;
    END IF;
  ELSIF v_type = 'boolean' AND NEW.measured_value_boolean IS NOT NULL THEN
    NEW.is_conform := NEW.measured_value_boolean;
    NEW.deviation_value := NULL;
    NEW.deviation_percent := NULL;
  ELSE
    -- text / select / no value: leave is_conform NULL (no automatic verdict)
    NEW.is_conform := NULL;
    NEW.deviation_value := NULL;
    NEW.deviation_percent := NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: quality_indicator_assignments_validate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quality_indicator_assignments_validate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.quality_indicator_assignments a
    WHERE a.indicator_id = NEW.indicator_id
      AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(a.product_id::text,'') = COALESCE(NEW.product_id::text,'')
      AND COALESCE(a.product_family_id::text,'') = COALESCE(NEW.product_family_id::text,'')
      AND COALESCE(a.production_line_id::text,'') = COALESCE(NEW.production_line_id::text,'')
      AND COALESCE(a.recipe_id::text,'') = COALESCE(NEW.recipe_id::text,'')
  ) THEN
    RAISE EXCEPTION 'Affectation déjà existante pour cet indicateur et ce périmètre';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: quality_indicators_validate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quality_indicators_validate() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.indicator_type = 'numeric' THEN
    IF NEW.min_value IS NOT NULL AND NEW.max_value IS NOT NULL AND NEW.min_value > NEW.max_value THEN
      RAISE EXCEPTION 'min_value (%) must be <= max_value (%)', NEW.min_value, NEW.max_value;
    END IF;
  END IF;
  IF NEW.tolerance_minus IS NOT NULL AND NEW.tolerance_minus < 0 THEN
    RAISE EXCEPTION 'tolerance_minus must be >= 0';
  END IF;
  IF NEW.tolerance_plus IS NOT NULL AND NEW.tolerance_plus < 0 THEN
    RAISE EXCEPTION 'tolerance_plus must be >= 0';
  END IF;
  RETURN NEW;
END$$;


--
-- Name: quality_nc_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quality_nc_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.search_vector := public.fts_build(NEW.nc_number, NEW.title, NEW.description, NEW.closure_comment, NEW.batch_number, NEW.lot_number);
  RETURN NEW;
END $$;


--
-- Name: quality_nc_validate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quality_nc_validate() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.validation_status NOT IN ('not_required','pending','approved','rejected') THEN
    RAISE EXCEPTION 'validation_status invalide: %', NEW.validation_status;
  END IF;
  IF NEW.status = 'closed' THEN
    IF NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
    IF NEW.closed_by IS NULL THEN NEW.closed_by := auth.uid(); END IF;
    IF NEW.closure_comment IS NULL OR length(btrim(NEW.closure_comment)) = 0 THEN
      RAISE EXCEPTION 'closure_comment requis pour clôturer une NC';
    END IF;
  END IF;
  IF NEW.decision IS NOT NULL THEN
    IF NEW.decision_at IS NULL THEN NEW.decision_at := now(); END IF;
    IF NEW.decision_by IS NULL THEN NEW.decision_by := auth.uid(); END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;


--
-- Name: quality_shift_lines_attach_links(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quality_shift_lines_attach_links() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_date date;
BEGIN
  SELECT date_shift INTO v_date
    FROM public.quality_shifts
   WHERE id = NEW.quality_shift_id;

  IF v_date IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.quality_shift_production_links (quality_shift_id, production_shift_id)
  SELECT NEW.quality_shift_id, s.id
    FROM public.shifts s
   WHERE s.line_id = NEW.production_line_id
     AND s.date_shift = v_date
     AND s.is_active = true
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;


--
-- Name: quality_shift_refresh_links(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quality_shift_refresh_links(p_quality_shift_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_date date;
  v_count integer := 0;
BEGIN
  SELECT date_shift INTO v_date
    FROM public.quality_shifts
   WHERE id = p_quality_shift_id;

  IF v_date IS NULL THEN RETURN 0; END IF;

  INSERT INTO public.quality_shift_production_links (quality_shift_id, production_shift_id)
  SELECT p_quality_shift_id, s.id
    FROM public.shifts s
    JOIN public.quality_shift_lines qsl
      ON qsl.production_line_id = s.line_id
   WHERE qsl.quality_shift_id = p_quality_shift_id
     AND s.date_shift = v_date
     AND s.is_active = true
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;


--
-- Name: quality_shifts_close_validate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quality_shifts_close_validate() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    IF NEW.heure_fin IS NULL THEN NEW.heure_fin := now(); END IF;
    IF NEW.observations IS NULL OR length(btrim(NEW.observations)) = 0 THEN
      RAISE EXCEPTION 'Les observations de fin de shift qualité sont obligatoires';
    END IF;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: recipes_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recipes_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
    BEGIN NEW.search_vector := public.fts_build(NEW.name); RETURN NEW; END
    $$;


--
-- Name: recipes_sync_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recipes_sync_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If status changed, align is_active
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.is_active := (NEW.status = 'active');
  -- Else if is_active toggled, align status
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.status := CASE WHEN NEW.is_active THEN 'active' ELSE 'archived' END;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;


--
-- Name: resolve_scanned_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_scanned_code(p_code text) RETURNS TABLE(entity_type text, entity_id uuid, code text, label text, matched_field text, match_quality text, url text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  raw text;
  q text;
  qn text;
  uuid_val uuid;
  url_seg text;
  url_id uuid;
  rc integer := 0;
  total_found integer := 0;
BEGIN
  IF p_code IS NULL OR length(btrim(p_code)) = 0 THEN RETURN; END IF;
  raw := btrim(p_code);
  q := lower(raw);
  qn := regexp_replace(lower(unaccent(raw)), '[\s\-_/\\]+', '', 'g');

  -- 1) URL pattern in QR payload
  url_seg := substring(q from '/(pdr|machines|equipements|organes)/[0-9a-f-]{36}');
  IF url_seg IS NOT NULL THEN
    BEGIN
      url_id := substring(q from '/(?:pdr|machines|equipements|organes)/([0-9a-f-]{36})')::uuid;
    EXCEPTION WHEN others THEN url_id := NULL; END;
    IF url_id IS NOT NULL THEN
      IF url_seg LIKE '/pdr/%' THEN
        RETURN QUERY SELECT 'pdr'::text, p.id, p.reference, p.designation, 'qr_code'::text, 'url'::text, '/pdr/'||p.id::text FROM public.pdr p WHERE p.id = url_id;
      ELSIF url_seg LIKE '/machines/%' THEN
        RETURN QUERY SELECT 'machine'::text, x.id, x.code, x.designation, 'qr_code'::text, 'url'::text, '/machines/'||x.id::text FROM public.machines x WHERE x.id = url_id;
      ELSIF url_seg LIKE '/equipements/%' THEN
        RETURN QUERY SELECT 'equipement'::text, x.id, x.code, x.designation, 'qr_code'::text, 'url'::text, '/equipements/'||x.id::text FROM public.equipements x WHERE x.id = url_id;
      ELSIF url_seg LIKE '/organes/%' THEN
        RETURN QUERY SELECT 'organe'::text, x.id, x.code, x.designation, 'qr_code'::text, 'url'::text, '/organes/'||x.id::text FROM public.organes x WHERE x.id = url_id;
      END IF;
      GET DIAGNOSTICS rc = ROW_COUNT;
      IF rc > 0 THEN RETURN; END IF;
    END IF;
  END IF;

  -- 2) Raw UUID
  IF raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    uuid_val := raw::uuid;
    RETURN QUERY SELECT 'pdr'::text, p.id, p.reference, p.designation, 'id'::text, 'uuid'::text, '/pdr/'||p.id::text FROM public.pdr p WHERE p.id = uuid_val;
    RETURN QUERY SELECT 'machine'::text, x.id, x.code, x.designation, 'id'::text, 'uuid'::text, '/machines/'||x.id::text FROM public.machines x WHERE x.id = uuid_val;
    RETURN QUERY SELECT 'equipement'::text, x.id, x.code, x.designation, 'id'::text, 'uuid'::text, '/equipements/'||x.id::text FROM public.equipements x WHERE x.id = uuid_val;
    RETURN QUERY SELECT 'organe'::text, x.id, x.code, x.designation, 'id'::text, 'uuid'::text, '/organes/'||x.id::text FROM public.organes x WHERE x.id = uuid_val;
  END IF;

  -- 3) Exact match (case + accent + separators insensitive)
  RETURN QUERY
  SELECT 'pdr'::text, p.id, p.reference, p.designation,
         CASE
           WHEN lower(p.code_erp) = q OR regexp_replace(lower(unaccent(coalesce(p.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_erp'
           WHEN lower(p.qr_code) = q OR regexp_replace(lower(unaccent(coalesce(p.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'qr_code'
           WHEN lower(p.code_barres) = q OR regexp_replace(lower(unaccent(coalesce(p.code_barres,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_barres'
           ELSE 'reference'
         END,
         'exact'::text,
         '/pdr/'||p.id::text
  FROM public.pdr p
  WHERE lower(p.code_erp) = q OR lower(p.qr_code) = q OR lower(p.code_barres) = q OR lower(p.reference) = q
     OR regexp_replace(lower(unaccent(coalesce(p.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(p.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(p.code_barres,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(p.reference,''))), '[\s\-_/\\]+', '', 'g') = qn;
  GET DIAGNOSTICS rc = ROW_COUNT; total_found := total_found + rc;

  RETURN QUERY
  SELECT 'machine'::text, x.id, x.code, x.designation,
         CASE
           WHEN lower(x.code_erp) = q OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_erp'
           WHEN lower(x.qr_code) = q OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'qr_code'
           ELSE 'code'
         END,
         'exact'::text,
         '/machines/'||x.id::text
  FROM public.machines x
  WHERE lower(x.code_erp) = q OR lower(x.qr_code) = q OR lower(x.code) = q
     OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.code,''))), '[\s\-_/\\]+', '', 'g') = qn;
  GET DIAGNOSTICS rc = ROW_COUNT; total_found := total_found + rc;

  RETURN QUERY
  SELECT 'equipement'::text, x.id, x.code, x.designation,
         CASE
           WHEN lower(x.code_erp) = q OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_erp'
           WHEN lower(x.qr_code) = q OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'qr_code'
           ELSE 'code'
         END,
         'exact'::text,
         '/equipements/'||x.id::text
  FROM public.equipements x
  WHERE lower(x.code_erp) = q OR lower(x.qr_code) = q OR lower(x.code) = q
     OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.code,''))), '[\s\-_/\\]+', '', 'g') = qn;
  GET DIAGNOSTICS rc = ROW_COUNT; total_found := total_found + rc;

  RETURN QUERY
  SELECT 'organe'::text, x.id, x.code, x.designation,
         CASE
           WHEN lower(x.code_erp) = q OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_erp'
           WHEN lower(x.qr_code) = q OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'qr_code'
           WHEN lower(x.code_barres) = q OR regexp_replace(lower(unaccent(coalesce(x.code_barres,''))), '[\s\-_/\\]+', '', 'g') = qn THEN 'code_barres'
           ELSE 'code'
         END,
         'exact'::text,
         '/organes/'||x.id::text
  FROM public.organes x
  WHERE lower(x.code_erp) = q OR lower(x.qr_code) = q OR lower(x.code_barres) = q OR lower(x.code) = q
     OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.qr_code,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.code_barres,''))), '[\s\-_/\\]+', '', 'g') = qn
     OR regexp_replace(lower(unaccent(coalesce(x.code,''))), '[\s\-_/\\]+', '', 'g') = qn;
  GET DIAGNOSTICS rc = ROW_COUNT; total_found := total_found + rc;

  IF total_found > 0 THEN RETURN; END IF;

  -- 4) Prefix fallback (>= 4 chars), with normalized variant
  IF length(q) >= 4 THEN
    RETURN QUERY
    SELECT 'pdr'::text, p.id, p.reference, p.designation, 'reference'::text, 'prefix'::text, '/pdr/'||p.id::text
    FROM public.pdr p
    WHERE lower(p.reference) LIKE q || '%' OR lower(coalesce(p.code_erp,'')) LIKE q || '%' OR lower(coalesce(p.code_barres,'')) LIKE q || '%'
       OR regexp_replace(lower(unaccent(coalesce(p.reference,''))), '[\s\-_/\\]+', '', 'g') LIKE qn || '%'
       OR regexp_replace(lower(unaccent(coalesce(p.code_erp,''))), '[\s\-_/\\]+', '', 'g') LIKE qn || '%'
       OR regexp_replace(lower(unaccent(coalesce(p.code_barres,''))), '[\s\-_/\\]+', '', 'g') LIKE qn || '%'
    LIMIT 5;

    RETURN QUERY
    SELECT 'machine'::text, x.id, x.code, x.designation, 'code'::text, 'prefix'::text, '/machines/'||x.id::text
    FROM public.machines x
    WHERE lower(x.code) LIKE q || '%' OR lower(coalesce(x.code_erp,'')) LIKE q || '%'
       OR regexp_replace(lower(unaccent(coalesce(x.code,''))), '[\s\-_/\\]+', '', 'g') LIKE qn || '%'
       OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') LIKE qn || '%'
    LIMIT 5;

    RETURN QUERY
    SELECT 'equipement'::text, x.id, x.code, x.designation, 'code'::text, 'prefix'::text, '/equipements/'||x.id::text
    FROM public.equipements x
    WHERE lower(x.code) LIKE q || '%' OR lower(coalesce(x.code_erp,'')) LIKE q || '%'
       OR regexp_replace(lower(unaccent(coalesce(x.code,''))), '[\s\-_/\\]+', '', 'g') LIKE qn || '%'
       OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') LIKE qn || '%'
    LIMIT 5;

    RETURN QUERY
    SELECT 'organe'::text, x.id, x.code, x.designation, 'code'::text, 'prefix'::text, '/organes/'||x.id::text
    FROM public.organes x
    WHERE lower(x.code) LIKE q || '%' OR lower(coalesce(x.code_erp,'')) LIKE q || '%' OR lower(coalesce(x.code_barres,'')) LIKE q || '%'
       OR regexp_replace(lower(unaccent(coalesce(x.code,''))), '[\s\-_/\\]+', '', 'g') LIKE qn || '%'
       OR regexp_replace(lower(unaccent(coalesce(x.code_erp,''))), '[\s\-_/\\]+', '', 'g') LIKE qn || '%'
       OR regexp_replace(lower(unaccent(coalesce(x.code_barres,''))), '[\s\-_/\\]+', '', 'g') LIKE qn || '%'
    LIMIT 5;
  END IF;
END;
$_$;


--
-- Name: scan_history_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.scan_history_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.search_vector := public.fts_build(
    NEW.raw_value, NEW.normalized_value, NEW.code_format,
    NEW.outcome, NEW.entity_code, NEW.entity_label, NEW.context, NEW.error_message
  );
  RETURN NEW;
END $$;


--
-- Name: search_suggest(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_suggest(q text, max_results integer DEFAULT 8) RETURNS TABLE(module text, label text, code text, url text, score real)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  WITH qq AS (SELECT lower(unaccent(btrim(q))) AS s)
  SELECT * FROM (
    SELECT 'machines'::text, m.designation, m.code, '/machines/'||m.id::text,
           GREATEST(similarity(lower(unaccent(m.code)), (SELECT s FROM qq)),
                    similarity(lower(unaccent(m.designation)), (SELECT s FROM qq)))::real AS sc
    FROM public.machines m
    WHERE (SELECT s FROM qq) <> '' AND (m.code ILIKE '%'||(SELECT s FROM qq)||'%' OR m.designation % (SELECT s FROM qq))
    UNION ALL
    SELECT 'pdr', p.designation, p.reference, '/pdr/'||p.id::text,
           GREATEST(similarity(lower(unaccent(p.reference)), (SELECT s FROM qq)),
                    similarity(lower(unaccent(p.designation)), (SELECT s FROM qq)))::real
    FROM public.pdr p
    WHERE (SELECT s FROM qq) <> '' AND (p.reference ILIKE '%'||(SELECT s FROM qq)||'%' OR p.designation % (SELECT s FROM qq))
    UNION ALL
    SELECT 'tickets', left(coalesce(t.description,''),60), t.numero, '/tickets/'||t.id::text,
           similarity(lower(unaccent(t.numero)), (SELECT s FROM qq))::real
    FROM public.tickets t
    WHERE (SELECT s FROM qq) <> '' AND t.numero ILIKE '%'||(SELECT s FROM qq)||'%'
    UNION ALL
    SELECT 'of', NULL, of.numero, '/gpao/of/'||of.id::text,
           similarity(lower(unaccent(of.numero)), (SELECT s FROM qq))::real
    FROM public.ordres_fabrication of
    WHERE (SELECT s FROM qq) <> '' AND of.numero ILIKE '%'||(SELECT s FROM qq)||'%'
    UNION ALL
    SELECT 'products', p.designation, p.code, '/gpao/produits/'||p.id::text,
           GREATEST(similarity(lower(unaccent(p.code)), (SELECT s FROM qq)),
                    similarity(lower(unaccent(p.designation)), (SELECT s FROM qq)))::real
    FROM public.products p
    WHERE (SELECT s FROM qq) <> '' AND (p.code ILIKE '%'||(SELECT s FROM qq)||'%' OR p.designation % (SELECT s FROM qq))
    UNION ALL
    SELECT 'articles', a.designation, a.code, '/gpao/articles/'||a.id::text,
           GREATEST(similarity(lower(unaccent(a.code)), (SELECT s FROM qq)),
                    similarity(lower(unaccent(a.designation)), (SELECT s FROM qq)))::real
    FROM public.articles a
    WHERE (SELECT s FROM qq) <> '' AND (a.code ILIKE '%'||(SELECT s FROM qq)||'%' OR a.designation % (SELECT s FROM qq))
  ) sub
  ORDER BY sc DESC NULLS LAST
  LIMIT max_results;
$$;


--
-- Name: set_bom_status(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_bom_status(p_bom_id uuid, p_status text, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old text;
  v_product uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_status NOT IN ('draft','active','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  IF NOT (
    has_role(v_uid,'admin'::app_role)
    OR has_role(v_uid,'resp_production'::app_role)
    OR has_role(v_uid,'bureau_methode'::app_role)
    OR has_role(v_uid,'controleur_qualite'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to change BOM status';
  END IF;

  SELECT status, product_id INTO v_old, v_product FROM public.bill_of_materials WHERE id = p_bom_id;
  IF v_product IS NULL THEN RAISE EXCEPTION 'BOM not found'; END IF;

  IF p_status = 'active' THEN
    UPDATE public.bill_of_materials
       SET status='active',
           valid_from = COALESCE(valid_from, now()),
           valid_to = NULL,
           approved_by = v_uid,
           approved_at = now()
     WHERE id = p_bom_id;
  ELSIF p_status = 'archived' THEN
    UPDATE public.bill_of_materials
       SET status='archived', valid_to = now()
     WHERE id = p_bom_id;
  ELSE
    UPDATE public.bill_of_materials SET status='draft' WHERE id = p_bom_id;
  END IF;

  INSERT INTO public.audit_logs(
    user_id, action, table_name, record_id, module, entity_type, entity_id,
    action_label, action_type, description, old_values, new_values, severity
  ) VALUES (
    v_uid, 'update_bom_status', 'bill_of_materials', p_bom_id, 'gpao', 'bom', p_bom_id,
    'Changement de statut nomenclature', 'update', COALESCE(p_reason,''),
    jsonb_build_object('status', v_old),
    jsonb_build_object('status', p_status),
    'info'
  );
END $$;


--
-- Name: set_of_quality_status(uuid, public.of_quality_status, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_of_quality_status(p_of_id uuid, p_status public.of_quality_status, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old public.of_quality_status;
  v_numero text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'resp_production'::app_role)
    OR public.has_role(v_uid, 'chef_ligne'::app_role)
    OR public.has_role(v_uid, 'controleur_qualite'::app_role)
    OR public.has_role(v_uid, 'bureau_methode'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to update quality status';
  END IF;

  SELECT quality_status, numero INTO v_old, v_numero
  FROM public.ordres_fabrication WHERE id = p_of_id;

  IF v_numero IS NULL THEN
    RAISE EXCEPTION 'OF not found';
  END IF;

  UPDATE public.ordres_fabrication
    SET quality_status = p_status, updated_at = now()
    WHERE id = p_of_id;

  INSERT INTO public.audit_logs(
    user_id, action, table_name, record_id, module, entity_type, entity_id, entity_code,
    action_label, action_type, description, old_values, new_values, severity
  ) VALUES (
    v_uid, 'update_quality_status', 'ordres_fabrication', p_of_id, 'qualite', 'ordre_fabrication', p_of_id, v_numero,
    'Mise à jour statut qualité OF', 'update',
    COALESCE(p_reason, ''),
    jsonb_build_object('quality_status', v_old),
    jsonb_build_object('quality_status', p_status),
    'info'
  );
END;
$$;


--
-- Name: set_recipe_status(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_recipe_status(p_recipe_id uuid, p_status text, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old text;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_status NOT IN ('draft','active','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  IF NOT (
    public.has_role(v_uid,'admin'::app_role)
    OR public.has_role(v_uid,'resp_production'::app_role)
    OR public.has_role(v_uid,'bureau_methode'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to change recipe status';
  END IF;

  SELECT status, name INTO v_old, v_name FROM public.recipes WHERE id = p_recipe_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Recipe not found';
  END IF;

  IF p_status = 'active' THEN
    UPDATE public.recipes
       SET status = 'active',
           is_active = true,
           valid_from = COALESCE(valid_from, now()),
           valid_to = NULL,
           approved_by = v_uid,
           approved_at = now(),
           updated_by = v_uid
     WHERE id = p_recipe_id;
  ELSIF p_status = 'archived' THEN
    UPDATE public.recipes
       SET status = 'archived',
           is_active = false,
           valid_to = now(),
           updated_by = v_uid
     WHERE id = p_recipe_id;
  ELSE
    UPDATE public.recipes
       SET status = 'draft',
           is_active = false,
           updated_by = v_uid
     WHERE id = p_recipe_id;
  END IF;

  INSERT INTO public.audit_logs(
    user_id, action, table_name, record_id, module, entity_type, entity_id, entity_code,
    action_label, action_type, description, old_values, new_values, severity
  ) VALUES (
    v_uid, 'update_recipe_status', 'recipes', p_recipe_id, 'gpao', 'recipe', p_recipe_id, v_name,
    'Changement de statut recette', 'update',
    COALESCE(p_reason,''),
    jsonb_build_object('status', v_old),
    jsonb_build_object('status', p_status),
    'info'
  );
END $$;


--
-- Name: shift_cycle_slot(text[], date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.shift_cycle_slot(_pattern text[], _anchor date, _d date) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN _pattern IS NULL OR array_length(_pattern,1) IS NULL OR _anchor IS NULL THEN NULL
    ELSE _pattern[ ((((_d - _anchor) % array_length(_pattern,1)) + array_length(_pattern,1)) % array_length(_pattern,1)) + 1 ]
  END
$$;


--
-- Name: shifts_fill_defaults(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.shifts_fill_defaults() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.heure_debut IS NULL THEN
    NEW.heure_debut := now();
  END IF;
  IF NEW.heure_fin IS NULL THEN
    NEW.heure_fin := NEW.heure_debut + interval '8 hours';
  END IF;
  IF NEW.heure_debut_reelle IS NULL THEN
    NEW.heure_debut_reelle := NEW.heure_debut;
  END IF;
  IF NEW.date_shift IS NULL THEN
    NEW.date_shift := (NEW.heure_debut AT TIME ZONE 'Africa/Algiers')::date;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: tg_intervention_pdr_lifecycle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_intervention_pdr_lifecycle() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_link public.pdr_entity_links%ROWTYPE;
  v_pos  public.pdr_install_positions%ROWTYPE;
  v_machine_id uuid;
  v_equipement_id uuid;
  v_ticket_id uuid;
  v_intv public.interventions%ROWTYPE;
BEGIN
  IF NEW.position_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_pos FROM public.pdr_install_positions WHERE id = NEW.position_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT * INTO v_link FROM public.pdr_entity_links WHERE id = v_pos.link_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_link.entity_type = 'machine' THEN
    v_machine_id := v_link.entity_id;
  ELSIF v_link.entity_type = 'equipement' THEN
    v_equipement_id := v_link.entity_id;
  ELSIF v_link.entity_type = 'organe' THEN
    SELECT equipement_id INTO v_equipement_id FROM public.organes WHERE id = v_link.entity_id;
  END IF;

  SELECT * INTO v_intv FROM public.interventions WHERE id = NEW.intervention_id;
  IF FOUND THEN v_ticket_id := v_intv.ticket_id; END IF;

  -- Close any active instance on this position
  UPDATE public.pdr_instances
     SET statut = 'replaced',
         date_remplacement = now(),
         notes = COALESCE(notes, '') ||
                 E'\n[Remplacé via intervention] cause=' || COALESCE(NEW.cause_remplacement, 'non_specifiee') ||
                 CASE WHEN NEW.compteur_fin IS NOT NULL THEN ' compteur_fin=' || NEW.compteur_fin::text ELSE '' END ||
                 CASE WHEN NEW.commentaire_technique IS NOT NULL THEN ' note=' || NEW.commentaire_technique ELSE '' END
   WHERE position_id = NEW.position_id AND statut = 'active';

  -- Open a new active instance with optional initial counter
  INSERT INTO public.pdr_instances (
    pdr_id, machine_id, equipement_id, position_id,
    intervention_id, ticket_id, installed_by,
    date_installation, statut, compteur_pose_at, notes
  ) VALUES (
    NEW.pdr_id, v_machine_id, v_equipement_id, NEW.position_id,
    NEW.intervention_id, v_ticket_id, COALESCE(v_intv.technicien_id, auth.uid()),
    now(), 'active', COALESCE(NEW.compteur_initial_new, 0),
    COALESCE('[Pose initiale via intervention] ' || COALESCE(NEW.commentaire_technique,''), '')
  );

  RETURN NEW;
END;
$$;


--
-- Name: tg_inventory_campaign_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_inventory_campaign_code() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE v_prefix text; v_seq int;
BEGIN
  IF NEW.code IS NOT NULL AND length(btrim(NEW.code)) > 0 THEN RETURN NEW; END IF;
  v_prefix := 'INV-' || to_char(now() AT TIME ZONE 'Africa/Algiers','YYYYMM') || '-';
  SELECT COALESCE(MAX(CAST(substring(code from length(v_prefix)+1) AS int)), 0) + 1
    INTO v_seq FROM public.inventory_campaigns WHERE code LIKE v_prefix || '%';
  NEW.code := v_prefix || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END $$;


--
-- Name: tg_lock_inventory_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_lock_inventory_counts() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN COALESCE(NEW, OLD); END IF;
  RAISE EXCEPTION 'Comptage verrouillé : modification/suppression interdite après validation';
END $$;


--
-- Name: tg_pdr_position_block_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_pdr_position_block_delete() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pdr_instances WHERE position_id = OLD.id) THEN
    RAISE EXCEPTION 'Impossible de supprimer une position avec historique. Utilisez statut = supprimee.';
  END IF;
  RETURN OLD;
END;
$$;


--
-- Name: tg_pdr_position_validate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_pdr_position_validate() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- min <= max
  IF NEW.seuil_min IS NOT NULL AND NEW.seuil_max IS NOT NULL AND NEW.seuil_min > NEW.seuil_max THEN
    RAISE EXCEPTION 'seuil_min (%) doit être <= seuil_max (%)', NEW.seuil_min, NEW.seuil_max;
  END IF;
  -- production rule required when lifespan involves production
  IF NEW.lifespan_mode IN ('production','mixte') AND NEW.production_rule IS NULL THEN
    RAISE EXCEPTION 'Une règle de calcul (production_rule) est requise quand lifespan_mode = %', NEW.lifespan_mode;
  END IF;
  -- active position must have a designation
  IF NEW.statut = 'active' AND (NEW.designation IS NULL OR length(btrim(NEW.designation)) = 0) THEN
    RAISE EXCEPTION 'Une position active doit avoir une désignation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: tg_preventive_execution_pdr_lifecycle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_preventive_execution_pdr_lifecycle() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_item jsonb;
  v_pos public.pdr_install_positions%ROWTYPE;
  v_link public.pdr_entity_links%ROWTYPE;
  v_machine_id uuid;
  v_equipement_id uuid;
  v_pdr_id uuid;
  v_position_id uuid;
  v_compteur_initial numeric;
  v_compteur_fin numeric;
  v_cause text;
  v_commentaire text;
BEGIN
  IF NEW.pdr_used IS NULL OR jsonb_typeof(NEW.pdr_used) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.pdr_used) LOOP
    v_position_id := NULLIF(v_item->>'position_id','')::uuid;
    v_pdr_id := NULLIF(v_item->>'pdr_id','')::uuid;
    IF v_position_id IS NULL OR v_pdr_id IS NULL THEN CONTINUE; END IF;

    v_compteur_initial := COALESCE((v_item->>'compteur_initial_new')::numeric, 0);
    v_compteur_fin := NULLIF(v_item->>'compteur_fin','')::numeric;
    v_cause := COALESCE(v_item->>'cause_remplacement', 'preventif');
    v_commentaire := v_item->>'commentaire_technique';

    SELECT * INTO v_pos FROM public.pdr_install_positions WHERE id = v_position_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT * INTO v_link FROM public.pdr_entity_links WHERE id = v_pos.link_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_machine_id := NULL; v_equipement_id := NULL;
    IF v_link.entity_type = 'machine' THEN
      v_machine_id := v_link.entity_id;
    ELSIF v_link.entity_type = 'equipement' THEN
      v_equipement_id := v_link.entity_id;
    ELSIF v_link.entity_type = 'organe' THEN
      SELECT equipement_id INTO v_equipement_id FROM public.organes WHERE id = v_link.entity_id;
    END IF;

    UPDATE public.pdr_instances
       SET statut = 'replaced',
           date_remplacement = now(),
           notes = COALESCE(notes,'') ||
                   E'\n[Remplacé via préventif] cause=' || v_cause ||
                   CASE WHEN v_compteur_fin IS NOT NULL THEN ' compteur_fin=' || v_compteur_fin::text ELSE '' END ||
                   CASE WHEN v_commentaire IS NOT NULL THEN ' note=' || v_commentaire ELSE '' END
     WHERE position_id = v_position_id AND statut = 'active';

    INSERT INTO public.pdr_instances (
      pdr_id, machine_id, equipement_id, position_id,
      installed_by, date_installation, statut, compteur_pose_at, notes
    ) VALUES (
      v_pdr_id, v_machine_id, v_equipement_id, v_position_id,
      COALESCE(NEW.executed_by, auth.uid()),
      now(), 'active', v_compteur_initial,
      '[Pose préventive] ' || COALESCE(v_commentaire, '')
    );
  END LOOP;

  RETURN NEW;
END;
$$;


--
-- Name: tg_production_declarations_hour_minus_1(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_production_declarations_hour_minus_1() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_now timestamptz := now();
  v_now_local timestamptz := now() AT TIME ZONE 'Africa/Algiers';
  v_slot_local timestamp;
  v_shift_start timestamptz;
  v_shift_end timestamptz;
BEGIN
  IF NEW.heure_production IS NULL THEN
    RAISE EXCEPTION 'heure_production requise';
  END IF;

  -- L'heure déclarée doit être strictement < heure courante (heure entièrement écoulée)
  IF NEW.heure_production + interval '1 hour' > v_now THEN
    RAISE EXCEPTION 'Règle Heure-1 : on ne peut déclarer qu''une heure complètement écoulée (créneau %)',
      to_char(NEW.heure_production AT TIME ZONE 'Africa/Algiers', 'HH24"h"');
  END IF;

  -- L'heure déclarée doit appartenir à la fenêtre du shift
  IF NEW.shift_id IS NOT NULL THEN
    SELECT heure_debut, COALESCE(heure_fin, heure_debut + interval '8 hours')
      INTO v_shift_start, v_shift_end
    FROM public.shifts WHERE id = NEW.shift_id;

    IF v_shift_start IS NOT NULL AND
       (NEW.heure_production < v_shift_start OR NEW.heure_production >= v_shift_end) THEN
      RAISE EXCEPTION 'L''heure déclarée doit être dans la fenêtre du shift (% → %)',
        v_shift_start, v_shift_end;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: tg_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;


--
-- Name: tickets_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tickets_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.search_vector := public.fts_build(NEW.numero, NEW.description, NEW.cause_racine, NEW.solution); RETURN NEW; END$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_has_role_text(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_role_text(_user_id uuid, _role_text text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role_text
  )
$$;


--
-- Name: validation_requests_search_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validation_requests_search_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.search_vector := public.fts_build(
    NEW.title, NEW.description, NEW.justification, NEW.validation_comment,
    NEW.entity_type, NEW.entity_label, NEW.entity_code, NEW.module, NEW.requested_action
  );
  RETURN NEW;
END$$;


--
-- Name: french_unaccent; Type: TEXT SEARCH CONFIGURATION; Schema: public; Owner: -
--

CREATE TEXT SEARCH CONFIGURATION public.french_unaccent (
    PARSER = pg_catalog."default" );

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR asciiword WITH french_stem;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR word WITH public.unaccent, french_stem;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR numword WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR email WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR url WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR host WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR sfloat WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR version WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR hword_numpart WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR hword_part WITH public.unaccent, french_stem;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR hword_asciipart WITH french_stem;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR numhword WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR asciihword WITH french_stem;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR hword WITH public.unaccent, french_stem;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR url_path WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR file WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR "float" WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR "int" WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
    ADD MAPPING FOR uint WITH simple;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text,
    is_secret boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    designation text NOT NULL,
    unite text DEFAULT 'g'::text NOT NULL,
    stock_actuel numeric(12,3) DEFAULT 0 NOT NULL,
    stock_min numeric(12,3) DEFAULT 0 NOT NULL,
    prix_unitaire numeric(12,2) DEFAULT 0,
    fournisseur text DEFAULT ''::text,
    description text DEFAULT ''::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    family_id uuid,
    code_erp text DEFAULT ''::text,
    search_vector tsvector
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_email text,
    user_full_name text,
    action_type text,
    module text,
    entity_type text,
    entity_id uuid,
    entity_code text,
    entity_label text,
    action_label text,
    description text,
    changed_fields jsonb,
    ip_address inet,
    user_agent text,
    status text DEFAULT 'success'::text NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    source text DEFAULT 'app'::text NOT NULL,
    metadata jsonb,
    archived_at timestamp with time zone,
    search_vector tsvector,
    CONSTRAINT audit_logs_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT audit_logs_source_check CHECK ((source = ANY (ARRAY['app'::text, 'auth'::text, 'database'::text, 'edge_function'::text, 'system'::text]))),
    CONSTRAINT audit_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text, 'denied'::text, 'warning'::text])))
);


--
-- Name: audit_role_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_role_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    module text NOT NULL,
    audit_enabled boolean DEFAULT true NOT NULL,
    severity_threshold text DEFAULT 'info'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_settings_severity_check CHECK ((severity_threshold = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])))
);


--
-- Name: bill_of_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_of_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    description text DEFAULT ''::text,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    created_by uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bill_of_materials_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))
);


--
-- Name: bom_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bom_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bom_id uuid NOT NULL,
    article_id uuid NOT NULL,
    item_type text NOT NULL,
    quantity_per_unit numeric DEFAULT 0 NOT NULL,
    unit text DEFAULT 'g'::text NOT NULL,
    waste_percent numeric,
    is_mandatory boolean DEFAULT true NOT NULL,
    is_quality_sensitive boolean DEFAULT false NOT NULL,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bom_items_item_type_check CHECK ((item_type = ANY (ARRAY['raw_material'::text, 'packaging'::text, 'label'::text, 'carton'::text, 'pallet'::text, 'consumable'::text])))
);


--
-- Name: consumptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    of_id uuid NOT NULL,
    shift_id uuid,
    article_id uuid NOT NULL,
    quantite numeric(12,3) DEFAULT 0 NOT NULL,
    unite text DEFAULT 'kg'::text NOT NULL,
    declared_by uuid,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    validation_status text,
    validation_request_id uuid,
    search_vector tsvector,
    lot_number text,
    batch_number text,
    supplier_lot text,
    expiry_date date
);


--
-- Name: custom_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    color text DEFAULT '#64748b'::text,
    inherits_from public.app_role,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    document_id uuid,
    document_name text DEFAULT ''::text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    entity_type text NOT NULL,
    can_view boolean DEFAULT false NOT NULL,
    can_upload boolean DEFAULT false NOT NULL,
    can_download boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    can_edit_metadata boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: entity_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    category_id uuid NOT NULL,
    file_name text DEFAULT ''::text NOT NULL,
    file_url text NOT NULL,
    storage_path text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    file_type text DEFAULT ''::text,
    description text DEFAULT ''::text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector
);


--
-- Name: entity_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    image_url text NOT NULL,
    storage_path text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    file_name text DEFAULT ''::text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_by uuid
);


--
-- Name: equipements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    designation text NOT NULL,
    description text DEFAULT ''::text,
    type public.equipement_type DEFAULT 'autre'::public.equipement_type NOT NULL,
    statut public.equipement_statut DEFAULT 'en_service'::public.equipement_statut NOT NULL,
    family_id uuid,
    machine_id uuid,
    line_id uuid,
    marque text DEFAULT ''::text,
    modele text DEFAULT ''::text,
    numero_serie text DEFAULT ''::text,
    localisation text DEFAULT ''::text,
    date_mise_en_service date,
    criticite public.criticite DEFAULT 'C'::public.criticite NOT NULL,
    criticite_maintenance public.criticite_maintenance DEFAULT 'moyenne'::public.criticite_maintenance,
    role_fonctionnel public.role_fonctionnel DEFAULT 'autre'::public.role_fonctionnel,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector,
    code_erp text,
    qr_code text
);


--
-- Name: intervention_pdr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intervention_pdr (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    intervention_id uuid NOT NULL,
    pdr_id uuid NOT NULL,
    quantite integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    position_id uuid,
    compteur_fin numeric,
    cause_remplacement text,
    commentaire_technique text,
    photo_avant_path text,
    photo_apres_path text,
    compteur_initial_new numeric DEFAULT 0,
    CONSTRAINT intervention_pdr_cause_check CHECK (((cause_remplacement IS NULL) OR (cause_remplacement = ANY (ARRAY['usure_normale'::text, 'casse'::text, 'fuite'::text, 'preventif'::text, 'amelioration'::text, 'non_conformite'::text, 'autre'::text]))))
);


--
-- Name: interventions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interventions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    technicien_id uuid NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    statut public.intervention_statut DEFAULT 'en_cours'::public.intervention_statut NOT NULL,
    date_debut timestamp with time zone DEFAULT now() NOT NULL,
    date_fin timestamp with time zone,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    validation_status text,
    validation_request_id uuid,
    search_vector tsvector,
    role public.intervention_role DEFAULT 'lead'::public.intervention_role NOT NULL
);


--
-- Name: inventory_assignment_scopes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_assignment_scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    family_id uuid NOT NULL,
    include_children boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    role public.inventory_assignment_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_campaign_scopes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_campaign_scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    family_id uuid NOT NULL,
    include_children boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text,
    label text NOT NULL,
    description text,
    status public.inventory_campaign_status DEFAULT 'draft'::public.inventory_campaign_status NOT NULL,
    scope_pdr boolean DEFAULT true NOT NULL,
    scope_organes boolean DEFAULT false NOT NULL,
    date_debut date,
    date_fin_prevue date,
    date_cloture timestamp with time zone,
    responsable_id uuid,
    created_by uuid,
    updated_by uuid,
    motif text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_counts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_counts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id uuid NOT NULL,
    assignment_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    role public.inventory_assignment_role NOT NULL,
    round integer DEFAULT 1 NOT NULL,
    qty_comptee numeric(18,4) NOT NULL,
    notes text,
    validated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_results (
    target_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    round integer DEFAULT 1 NOT NULL,
    qty_a numeric(18,4),
    qty_b numeric(18,4),
    qty_c numeric(18,4),
    ecart_ab numeric(18,4),
    ecart_ac numeric(18,4),
    ecart_bc numeric(18,4),
    qty_finale numeric(18,4),
    decision public.inventory_decision DEFAULT 'en_attente'::public.inventory_decision NOT NULL,
    decided_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    entity_type public.inventory_entity_type NOT NULL,
    entity_id uuid NOT NULL,
    entity_code text,
    entity_label text,
    family_id uuid,
    qty_systeme numeric(18,4) DEFAULT 0 NOT NULL,
    current_round integer DEFAULT 1 NOT NULL,
    status public.inventory_target_status DEFAULT 'a_compter'::public.inventory_target_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: line_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.line_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    line_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: machine_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    machine_id uuid NOT NULL,
    name text NOT NULL,
    file_url text NOT NULL,
    file_type text DEFAULT ''::text,
    description text DEFAULT ''::text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: machine_families; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_families (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: machine_line_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_line_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    machine_id uuid NOT NULL,
    line_id uuid NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT machine_line_assignments_priority_check CHECK (((priority >= 1) AND (priority <= 3)))
);


--
-- Name: machine_pdr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_pdr (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    machine_id uuid NOT NULL,
    pdr_id uuid NOT NULL,
    quantite_recommandee integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: machines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    designation text NOT NULL,
    family_id uuid,
    criticite public.criticite DEFAULT 'C'::public.criticite NOT NULL,
    statut public.machine_statut DEFAULT 'en_marche'::public.machine_statut NOT NULL,
    localisation text DEFAULT ''::text,
    date_mise_en_service date,
    description text DEFAULT ''::text,
    marque text DEFAULT ''::text,
    modele text DEFAULT ''::text,
    numero_serie text DEFAULT ''::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role_fonctionnel public.role_fonctionnel DEFAULT 'autre'::public.role_fonctionnel,
    criticite_maintenance public.criticite_maintenance DEFAULT 'moyenne'::public.criticite_maintenance,
    impact_ligne public.impact_ligne DEFAULT 'aucun'::public.impact_ligne,
    disponibilite_pdr public.disponibilite_pdr DEFAULT 'disponible'::public.disponibilite_pdr,
    search_vector tsvector,
    fabricant text,
    reference_constructeur text,
    code_erp text,
    code_immobilisation text,
    qr_code text,
    annee_fabrication integer,
    puissance_kw numeric,
    tension_v numeric,
    frequence_hz numeric,
    pression_service_bar numeric,
    cadence_nominale numeric,
    unite_cadence text,
    capacite_nominale numeric,
    unite_capacite text,
    longueur_mm numeric,
    largeur_mm numeric,
    hauteur_mm numeric,
    poids_kg numeric,
    matiere_principale text,
    energie_utilisee public.energie_type,
    niveau_risque text,
    conditions_utilisation text,
    consignes_securite text,
    zone_installation text,
    commentaire_technique text,
    caracteristiques_techniques jsonb DEFAULT '{}'::jsonb
);


--
-- Name: maintenance_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date_shift date DEFAULT CURRENT_DATE NOT NULL,
    shift_type text DEFAULT 'matin'::text NOT NULL,
    shift_team_id uuid,
    maintenancier_id uuid NOT NULL,
    line_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    heure_debut timestamp with time zone DEFAULT now() NOT NULL,
    heure_fin timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    observations text,
    opened_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_email_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_email_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid,
    recipient_email text NOT NULL,
    recipient_user_id uuid,
    subject text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    error text,
    dedup_key text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    is_active boolean DEFAULT true NOT NULL,
    module text NOT NULL,
    event_type text NOT NULL,
    severity public.notification_severity DEFAULT 'info'::public.notification_severity NOT NULL,
    target_roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    target_users jsonb DEFAULT '[]'::jsonb,
    excluded_users jsonb DEFAULT '[]'::jsonb,
    conditions jsonb,
    channels jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
    frequency public.notification_frequency DEFAULT 'immediate'::public.notification_frequency NOT NULL,
    quiet_hours_enabled boolean DEFAULT false NOT NULL,
    quiet_hours_start time without time zone,
    quiet_hours_end time without time zone,
    is_critical boolean DEFAULT false NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    notification_type text NOT NULL,
    module text NOT NULL,
    entity_type text,
    entity_id uuid,
    entity_code text,
    entity_label text,
    severity public.notification_severity DEFAULT 'info'::public.notification_severity NOT NULL,
    status public.notification_status DEFAULT 'unread'::public.notification_status NOT NULL,
    recipient_user_id uuid,
    recipient_role text,
    triggered_by_user_id uuid,
    source text DEFAULT 'app'::text NOT NULL,
    action_url text,
    metadata jsonb,
    read_at timestamp with time zone,
    archived_at timestamp with time zone,
    deduplication_key text,
    group_key text,
    rule_id uuid,
    is_critical boolean DEFAULT false NOT NULL,
    search_vector tsvector,
    CONSTRAINT notifications_recipient_chk CHECK (((recipient_user_id IS NOT NULL) OR (recipient_role IS NOT NULL)))
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;


--
-- Name: of_mode_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.of_mode_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    of_id uuid NOT NULL,
    old_mode_id uuid,
    new_mode_id uuid NOT NULL,
    changed_by uuid,
    reason text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: of_shift_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.of_shift_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    of_id uuid NOT NULL,
    shift_type public.shift_type NOT NULL,
    shift_team_id uuid NOT NULL,
    chef_ligne_id uuid NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ordres_fabrication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ordres_fabrication (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text NOT NULL,
    product_id uuid NOT NULL,
    recipe_id uuid,
    line_id uuid,
    quantite_prevue numeric(12,3) DEFAULT 0 NOT NULL,
    quantite_produite numeric(12,3) DEFAULT 0 NOT NULL,
    quantite_rebut numeric(12,3) DEFAULT 0 NOT NULL,
    unite text DEFAULT 'kg'::text NOT NULL,
    statut public.of_statut DEFAULT 'planifie'::public.of_statut NOT NULL,
    date_debut_prevue date,
    date_fin_prevue date,
    date_debut_reelle timestamp with time zone,
    date_fin_reelle timestamp with time zone,
    created_by uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shift_mode_id uuid,
    search_vector tsvector,
    quality_status public.of_quality_status,
    bom_id uuid,
    auto_generate_shifts boolean DEFAULT true NOT NULL
);

ALTER TABLE ONLY public.ordres_fabrication REPLICA IDENTITY FULL;


--
-- Name: organes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    designation text NOT NULL,
    description text DEFAULT ''::text,
    type public.organe_type DEFAULT 'autre'::public.organe_type NOT NULL,
    statut public.organe_statut DEFAULT 'en_service'::public.organe_statut NOT NULL,
    criticite public.criticite DEFAULT 'C'::public.criticite NOT NULL,
    machine_id uuid,
    equipement_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector,
    fabricant text,
    marque text,
    modele text,
    reference_constructeur text,
    numero_serie text,
    code_erp text,
    code_immobilisation text,
    longueur numeric,
    largeur numeric,
    hauteur numeric,
    diametre_ext numeric,
    diametre_int numeric,
    epaisseur numeric,
    poids numeric,
    unite_dimension text DEFAULT 'mm'::text,
    unite_poids text DEFAULT 'kg'::text,
    puissance numeric,
    tension numeric,
    intensite numeric,
    frequence numeric,
    pression numeric,
    debit numeric,
    vitesse_rotation numeric,
    temperature_min numeric,
    temperature_max numeric,
    matiere text,
    type_connexion text,
    filetage text,
    impact_panne public.organe_impact_panne,
    duree_vie_estimee_jours integer,
    frequence_inspection_jours integer,
    consignes_securite text,
    commentaire_technique text,
    caracteristiques_techniques jsonb DEFAULT '{}'::jsonb,
    qr_code text,
    code_barres text,
    CONSTRAINT organes_parent_xor CHECK ((((machine_id IS NOT NULL) AND (equipement_id IS NULL)) OR ((machine_id IS NULL) AND (equipement_id IS NOT NULL))))
);


--
-- Name: packaging_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packaging_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    level_order integer DEFAULT 0 NOT NULL,
    unite_name text NOT NULL,
    coefficient numeric DEFAULT 1 NOT NULL,
    poids numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT packaging_levels_entity_type_check CHECK ((entity_type = ANY (ARRAY['product'::text, 'article'::text])))
);


--
-- Name: panne_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.panne_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pdr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdr (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference text NOT NULL,
    designation text NOT NULL,
    stock_actuel integer DEFAULT 0 NOT NULL,
    stock_min integer DEFAULT 0 NOT NULL,
    prix_unitaire numeric(12,2) DEFAULT 0,
    fournisseur text DEFAULT ''::text,
    emplacement text DEFAULT ''::text,
    description text DEFAULT ''::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    family_id uuid,
    statut_pdr public.statut_pdr DEFAULT 'commune'::public.statut_pdr NOT NULL,
    approvisionnement public.approvisionnement_type DEFAULT 'local'::public.approvisionnement_type NOT NULL,
    stock_max integer DEFAULT 0 NOT NULL,
    stock_securite integer DEFAULT 0 NOT NULL,
    point_commande integer DEFAULT 0 NOT NULL,
    delai_approvisionnement integer DEFAULT 0 NOT NULL,
    pmp numeric DEFAULT 0 NOT NULL,
    devise text DEFAULT 'DA'::text NOT NULL,
    duree_vie_min_jours integer,
    duree_vie_max_jours integer,
    search_vector tsvector,
    fabricant text,
    marque text,
    modele text,
    reference_constructeur text,
    code_erp text,
    code_barres text,
    qr_code text,
    sous_famille text,
    unite_stock text DEFAULT 'unité'::text,
    criticite public.criticite DEFAULT 'C'::public.criticite,
    longueur numeric,
    largeur numeric,
    hauteur numeric,
    diametre_ext numeric,
    diametre_int numeric,
    epaisseur numeric,
    poids numeric,
    unite_dimension text DEFAULT 'mm'::text,
    unite_poids text DEFAULT 'kg'::text,
    matiere text,
    couleur text,
    tension numeric,
    puissance numeric,
    intensite numeric,
    frequence numeric,
    pression numeric,
    debit numeric,
    temperature_min numeric,
    temperature_max numeric,
    vitesse_rotation numeric,
    nombre_dents integer,
    pas numeric,
    filetage text,
    type_connexion text,
    type_signal text,
    commentaire_technique text,
    caracteristiques_techniques jsonb DEFAULT '{}'::jsonb
);


--
-- Name: pdr_entity_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdr_entity_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pdr_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    quantite_recommandee integer DEFAULT 1 NOT NULL,
    commentaire text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    criticite_sur_actif public.criticite,
    position_installation text,
    CONSTRAINT pdr_entity_links_entity_type_check CHECK ((entity_type = ANY (ARRAY['machine'::text, 'equipement'::text, 'organe'::text])))
);


--
-- Name: pdr_equivalences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdr_equivalences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pdr_id uuid NOT NULL,
    equivalent_pdr_id uuid,
    external_reference text,
    manufacturer text,
    brand text,
    equivalence_type text DEFAULT 'equivalent'::text NOT NULL,
    validation_status text DEFAULT 'non_valide'::text NOT NULL,
    validated_by uuid,
    validated_at timestamp with time zone,
    notes text DEFAULT ''::text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pdr_equivalences_equivalence_type_check CHECK ((equivalence_type = ANY (ARRAY['equivalent'::text, 'compatible'::text, 'remplacement'::text, 'depannage'::text]))),
    CONSTRAINT pdr_equivalences_no_self CHECK (((equivalent_pdr_id IS NULL) OR (equivalent_pdr_id <> pdr_id))),
    CONSTRAINT pdr_equivalences_target_xor CHECK (((equivalent_pdr_id IS NOT NULL) OR ((external_reference IS NOT NULL) AND (length(btrim(external_reference)) > 0)))),
    CONSTRAINT pdr_equivalences_validation_status_check CHECK ((validation_status = ANY (ARRAY['non_valide'::text, 'valide'::text, 'rejete'::text])))
);


--
-- Name: pdr_families; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdr_families (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    parent_id uuid,
    approvisionnement public.approvisionnement_type DEFAULT 'local'::public.approvisionnement_type NOT NULL,
    statut_default public.statut_pdr DEFAULT 'commune'::public.statut_pdr NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pdr_family_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdr_family_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    family_id uuid NOT NULL,
    nom text NOT NULL,
    reference_fournisseur text DEFAULT ''::text,
    prix numeric,
    delai_jours integer DEFAULT 0,
    notes text DEFAULT ''::text,
    is_principal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text DEFAULT ''::text,
    tel text DEFAULT ''::text,
    adresse text DEFAULT ''::text,
    url1 text DEFAULT ''::text,
    url2 text DEFAULT ''::text,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    search_vector tsvector
);


--
-- Name: pdr_install_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdr_install_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    link_id uuid NOT NULL,
    position_index integer NOT NULL,
    designation text NOT NULL,
    description text,
    marker_x numeric,
    marker_y numeric,
    statut text DEFAULT 'active'::text NOT NULL,
    lifespan_mode text DEFAULT 'time'::text NOT NULL,
    seuil_min numeric,
    seuil_max numeric,
    seuil_alerte_pct numeric DEFAULT 80,
    unite_mesure text,
    production_rule text,
    production_coefficient numeric DEFAULT 1,
    compteur_manuel numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT pdr_pos_lifespan_chk CHECK ((lifespan_mode = ANY (ARRAY['time'::text, 'production'::text, 'mixte'::text, 'none'::text]))),
    CONSTRAINT pdr_pos_manual_nonneg CHECK (((compteur_manuel IS NULL) OR (compteur_manuel >= (0)::numeric))),
    CONSTRAINT pdr_pos_marker_x_range CHECK (((marker_x IS NULL) OR ((marker_x >= (0)::numeric) AND (marker_x <= (100)::numeric)))),
    CONSTRAINT pdr_pos_marker_y_range CHECK (((marker_y IS NULL) OR ((marker_y >= (0)::numeric) AND (marker_y <= (100)::numeric)))),
    CONSTRAINT pdr_pos_max_nonneg CHECK (((seuil_max IS NULL) OR (seuil_max >= (0)::numeric))),
    CONSTRAINT pdr_pos_min_nonneg CHECK (((seuil_min IS NULL) OR (seuil_min >= (0)::numeric))),
    CONSTRAINT pdr_pos_prod_rule_chk CHECK (((production_rule IS NULL) OR (production_rule = ANY (ARRAY['complete'::text, 'reparti'::text, 'coefficient'::text, 'manuel'::text])))),
    CONSTRAINT pdr_pos_statut_chk CHECK ((statut = ANY (ARRAY['active'::text, 'inactive'::text, 'supprimee'::text])))
);


--
-- Name: pdr_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdr_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pdr_id uuid NOT NULL,
    machine_id uuid,
    equipement_id uuid,
    date_installation timestamp with time zone DEFAULT now() NOT NULL,
    date_remplacement timestamp with time zone,
    statut text DEFAULT 'active'::text NOT NULL,
    intervention_id uuid,
    ticket_id uuid,
    installed_by uuid,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    organe_id uuid,
    position_id uuid,
    compteur_pose_at numeric
);


--
-- Name: pdr_position_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pdr_position_status WITH (security_invoker='true') AS
 SELECT p.id AS position_id,
    p.link_id,
    l.pdr_id,
    l.entity_type,
    l.entity_id,
    p.designation,
    p.statut,
    p.lifespan_mode,
    p.seuil_min,
    p.seuil_max,
    p.seuil_alerte_pct,
    p.unite_mesure,
    p.production_rule,
    p.production_coefficient,
    ( SELECT pi.id
           FROM public.pdr_instances pi
          WHERE ((pi.position_id = p.id) AND (pi.statut = 'active'::text))
          ORDER BY pi.date_installation DESC
         LIMIT 1) AS current_instance_id,
    ( SELECT pi.date_installation
           FROM public.pdr_instances pi
          WHERE ((pi.position_id = p.id) AND (pi.statut = 'active'::text))
          ORDER BY pi.date_installation DESC
         LIMIT 1) AS date_pose,
    ( SELECT pi.date_installation
           FROM public.pdr_instances pi
          WHERE (pi.position_id = p.id)
          ORDER BY pi.date_installation DESC
         LIMIT 1) AS date_dernier_changement,
    ( SELECT pi.ticket_id
           FROM public.pdr_instances pi
          WHERE ((pi.position_id = p.id) AND (pi.ticket_id IS NOT NULL))
          ORDER BY pi.date_installation DESC
         LIMIT 1) AS last_ticket_id,
    public.get_position_counter(p.id) AS compteur_actuel,
    p.seuil_max AS compteur_max,
        CASE
            WHEN ((p.seuil_max IS NULL) OR (p.seuil_max = (0)::numeric)) THEN (0)::numeric
            ELSE LEAST((100)::numeric, GREATEST((0)::numeric, ((public.get_position_counter(p.id) / p.seuil_max) * (100)::numeric)))
        END AS pct_consomme,
        CASE
            WHEN ((p.seuil_max IS NULL) OR (p.seuil_max = (0)::numeric)) THEN NULL::numeric
            ELSE GREATEST((0)::numeric, (p.seuil_max - public.get_position_counter(p.id)))
        END AS compteur_restant,
        CASE
            WHEN ((p.seuil_max IS NULL) OR (p.seuil_max = (0)::numeric)) THEN 'vert'::text
            WHEN (public.get_position_counter(p.id) >= p.seuil_max) THEN 'rouge'::text
            WHEN (((public.get_position_counter(p.id) / p.seuil_max) * (100)::numeric) >= COALESCE(p.seuil_alerte_pct, (80)::numeric)) THEN 'orange'::text
            ELSE 'vert'::text
        END AS niveau
   FROM (public.pdr_install_positions p
     JOIN public.pdr_entity_links l ON ((l.id = p.link_id)));


--
-- Name: pdr_stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdr_stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pdr_id uuid NOT NULL,
    type public.mouvement_type NOT NULL,
    quantite integer NOT NULL,
    stock_avant integer DEFAULT 0 NOT NULL,
    stock_apres integer DEFAULT 0 NOT NULL,
    prix_unitaire numeric DEFAULT 0,
    reference_source text DEFAULT ''::text,
    source_type text DEFAULT ''::text,
    source_id uuid,
    motif text DEFAULT ''::text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ref_document_erp text DEFAULT ''::text,
    modified_by uuid,
    modified_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    validation_status text,
    validation_request_id uuid,
    applied boolean DEFAULT true NOT NULL,
    search_vector tsvector
);


--
-- Name: pdr_stock_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdr_stock_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    can_view_suppliers boolean DEFAULT false NOT NULL,
    can_create_supplier boolean DEFAULT false NOT NULL,
    can_edit_supplier boolean DEFAULT false NOT NULL,
    can_delete_supplier boolean DEFAULT false NOT NULL,
    can_create_entry boolean DEFAULT false NOT NULL,
    can_create_exit boolean DEFAULT false NOT NULL,
    can_correct_stock boolean DEFAULT false NOT NULL,
    can_inventory boolean DEFAULT false NOT NULL,
    can_cancel_movement boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pdr_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdr_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pdr_id uuid NOT NULL,
    nom text NOT NULL,
    reference_fournisseur text DEFAULT ''::text,
    prix numeric DEFAULT 0,
    delai_jours integer DEFAULT 0,
    is_principal boolean DEFAULT false NOT NULL,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text DEFAULT ''::text,
    tel text DEFAULT ''::text,
    adresse text DEFAULT ''::text,
    url1 text DEFAULT ''::text,
    url2 text DEFAULT ''::text,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    supplier_designation text,
    manufacturer_reference text,
    brand text,
    currency text DEFAULT 'DA'::text,
    moq numeric,
    packaging_unit text,
    last_purchase_price numeric,
    last_purchase_date date,
    supplier_url text,
    contact_email text,
    contact_phone text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: preventive_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preventive_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    executed_by uuid NOT NULL,
    date_execution timestamp with time zone DEFAULT now() NOT NULL,
    checklist_results jsonb DEFAULT '[]'::jsonb,
    notes text DEFAULT ''::text,
    pdr_used jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: preventive_plan_assignees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preventive_plan_assignees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: preventive_plan_pdr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preventive_plan_pdr (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    pdr_id uuid NOT NULL,
    quantite integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: preventive_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preventive_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    machine_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text,
    frequence public.frequence_preventif DEFAULT 'mensuel'::public.frequence_preventif NOT NULL,
    checklist jsonb DEFAULT '[]'::jsonb,
    derniere_execution timestamp with time zone,
    prochaine_echeance timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    line_id uuid,
    statut_plan text DEFAULT 'valide'::text NOT NULL,
    type_maintenance text DEFAULT ''::text,
    source text DEFAULT 'manuel'::text,
    source_pdr_id uuid,
    equipement_id uuid,
    organe_id uuid,
    search_vector tsvector
);


--
-- Name: product_families; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_families (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_declarations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_declarations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shift_id uuid NOT NULL,
    of_id uuid NOT NULL,
    heure_production timestamp with time zone NOT NULL,
    quantite_produite numeric(12,3) DEFAULT 0 NOT NULL,
    quantite_rebut numeric(12,3) DEFAULT 0 NOT NULL,
    declared_by uuid,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.production_declarations REPLICA IDENTITY FULL;


--
-- Name: production_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    designation text NOT NULL,
    machine_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    description text DEFAULT ''::text,
    atelier text DEFAULT ''::text,
    search_vector tsvector
);


--
-- Name: production_stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_stops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shift_id uuid NOT NULL,
    of_id uuid NOT NULL,
    line_id uuid,
    machine_id uuid,
    ticket_id uuid,
    type public.arret_type DEFAULT 'autre'::public.arret_type NOT NULL,
    description text DEFAULT ''::text,
    heure_debut timestamp with time zone DEFAULT now() NOT NULL,
    heure_fin timestamp with time zone,
    duree_minutes integer,
    declared_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    designation text NOT NULL,
    unite text DEFAULT 'g'::text NOT NULL,
    description text DEFAULT ''::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    family_id uuid,
    code_erp text DEFAULT ''::text,
    poids_unitaire numeric DEFAULT 0,
    unite_base text DEFAULT 'g'::text,
    search_vector tsvector
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name text DEFAULT ''::text NOT NULL,
    last_name text DEFAULT ''::text NOT NULL,
    poste text DEFAULT ''::text,
    avatar_url text DEFAULT ''::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quality_action_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_action_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    color text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: quality_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nc_id uuid,
    of_id uuid,
    title text NOT NULL,
    description text,
    action_type public.quality_action_type NOT NULL,
    priority public.quality_action_priority DEFAULT 'medium'::public.quality_action_priority NOT NULL,
    status public.quality_action_status DEFAULT 'open'::public.quality_action_status NOT NULL,
    responsible_user_id uuid,
    due_date date,
    verification_comment text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    closed_by uuid,
    verified_at timestamp with time zone,
    verified_by uuid,
    search_vector tsvector
);


--
-- Name: quality_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    of_id uuid NOT NULL,
    product_id uuid,
    production_line_id uuid,
    shift_id uuid,
    team_id uuid,
    indicator_id uuid NOT NULL,
    measured_value_numeric numeric,
    measured_value_text text,
    measured_value_boolean boolean,
    selected_value text,
    unit text,
    target_value numeric,
    min_value numeric,
    max_value numeric,
    is_conform boolean,
    deviation_value numeric,
    deviation_percent numeric,
    control_time timestamp with time zone DEFAULT now() NOT NULL,
    controlled_by uuid,
    comment text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    validation_status text DEFAULT 'not_required'::text NOT NULL,
    validated_by uuid,
    validated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    quality_shift_id uuid
);


--
-- Name: quality_control_point_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_control_point_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    control_point_id uuid NOT NULL,
    production_line_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: quality_control_point_ofs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_control_point_ofs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    control_point_id uuid NOT NULL,
    of_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: quality_control_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_control_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    production_line_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    scope text DEFAULT 'global'::text NOT NULL,
    CONSTRAINT quality_control_points_scope_check CHECK ((scope = ANY (ARRAY['global'::text, 'line'::text, 'of'::text, 'mixed'::text])))
);


--
-- Name: quality_decision_reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_decision_reasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    decision_type text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: quality_defect_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_defect_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    default_severity text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: quality_indicator_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_indicator_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    indicator_id uuid NOT NULL,
    product_id uuid,
    product_family_id uuid,
    production_line_id uuid,
    recipe_id uuid,
    is_required boolean DEFAULT false NOT NULL,
    is_blocking boolean DEFAULT false NOT NULL,
    frequency_type public.quality_frequency_type,
    notes text DEFAULT ''::text NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quality_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_indicators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    indicator_type public.quality_indicator_type NOT NULL,
    unit text,
    target_value numeric,
    min_value numeric,
    max_value numeric,
    tolerance_minus numeric,
    tolerance_plus numeric,
    frequency_type public.quality_frequency_type DEFAULT 'manual'::public.quality_frequency_type NOT NULL,
    category public.quality_indicator_category DEFAULT 'autre'::public.quality_indicator_category NOT NULL,
    select_options jsonb,
    is_required boolean DEFAULT false NOT NULL,
    is_blocking boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: quality_nc_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_nc_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    color text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: quality_non_conformities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_non_conformities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nc_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    declared_by uuid,
    of_id uuid,
    quality_check_id uuid,
    product_id uuid,
    production_line_id uuid,
    shift_id uuid,
    team_id uuid,
    article_id uuid,
    packaging_article_id uuid,
    batch_number text,
    lot_number text,
    nc_type public.nc_type NOT NULL,
    nc_category text,
    severity public.nc_severity DEFAULT 'minor'::public.nc_severity NOT NULL,
    status public.nc_status DEFAULT 'draft'::public.nc_status NOT NULL,
    title text NOT NULL,
    description text,
    detected_quantity numeric,
    affected_quantity numeric,
    unit text,
    immediate_action text,
    root_cause text,
    decision public.nc_decision,
    decision_by uuid,
    decision_at timestamp with time zone,
    closure_comment text,
    closed_by uuid,
    closed_at timestamp with time zone,
    validation_status text DEFAULT 'not_required'::text NOT NULL,
    metadata jsonb,
    search_vector tsvector,
    quality_shift_id uuid
);


--
-- Name: quality_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    can_create_check boolean DEFAULT false NOT NULL,
    can_validate_check boolean DEFAULT false NOT NULL,
    can_reject_check boolean DEFAULT false NOT NULL,
    can_create_nc boolean DEFAULT false NOT NULL,
    can_close_nc boolean DEFAULT false NOT NULL,
    can_decide_nc boolean DEFAULT false NOT NULL,
    can_create_action boolean DEFAULT false NOT NULL,
    can_verify_action boolean DEFAULT false NOT NULL,
    can_close_action boolean DEFAULT false NOT NULL,
    can_manage_indicators boolean DEFAULT false NOT NULL,
    can_manage_assignments boolean DEFAULT false NOT NULL,
    can_publish_recipe boolean DEFAULT false NOT NULL,
    can_publish_bom boolean DEFAULT false NOT NULL,
    can_export_tracability boolean DEFAULT false NOT NULL,
    can_view_reports boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quality_shift_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_shift_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    controller_id uuid NOT NULL,
    shift_type public.shift_type NOT NULL,
    shift_team_id uuid,
    line_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    of_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    all_open_ofs boolean DEFAULT false NOT NULL
);


--
-- Name: quality_shift_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_shift_lines (
    quality_shift_id uuid NOT NULL,
    production_line_id uuid NOT NULL
);


--
-- Name: quality_shift_production_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_shift_production_links (
    quality_shift_id uuid NOT NULL,
    production_shift_id uuid NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quality_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date_shift date DEFAULT CURRENT_DATE NOT NULL,
    shift_type public.shift_type NOT NULL,
    shift_team_id uuid,
    controller_id uuid NOT NULL,
    heure_debut timestamp with time zone DEFAULT now() NOT NULL,
    heure_fin timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    observations text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    opened_by uuid
);

ALTER TABLE ONLY public.quality_shifts REPLICA IDENTITY FULL;


--
-- Name: quality_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    symbol text NOT NULL,
    label text NOT NULL,
    category text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: recipe_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    article_id uuid NOT NULL,
    quantite numeric(12,3) DEFAULT 0 NOT NULL,
    unite text DEFAULT 'kg'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    item_type text DEFAULT 'raw_material'::text NOT NULL,
    waste_percent numeric(8,4),
    is_mandatory boolean DEFAULT true NOT NULL,
    is_quality_sensitive boolean DEFAULT false NOT NULL,
    CONSTRAINT recipe_lines_item_type_check CHECK ((item_type = ANY (ARRAY['raw_material'::text, 'packaging'::text, 'label'::text, 'carton'::text, 'pallet'::text, 'consumable'::text])))
);


--
-- Name: recipe_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    step_order integer NOT NULL,
    title text NOT NULL,
    description text,
    process_parameter jsonb,
    expected_duration_minutes numeric,
    critical_control_point boolean DEFAULT false NOT NULL,
    quality_indicator_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    name text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector,
    status text DEFAULT 'active'::text NOT NULL,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    notes text,
    CONSTRAINT recipes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.app_role NOT NULL,
    module text NOT NULL,
    can_view boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scan_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scan_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_value text NOT NULL,
    normalized_value text,
    source text DEFAULT 'camera'::text NOT NULL,
    code_format text,
    outcome text NOT NULL,
    match_quality text,
    matches_count integer DEFAULT 0 NOT NULL,
    entity_type text,
    entity_id uuid,
    entity_code text,
    entity_label text,
    context text,
    error_message text,
    search_vector tsvector
);


--
-- Name: shift_mode_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_mode_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shift_mode_id uuid NOT NULL,
    label text NOT NULL,
    heure_debut time without time zone NOT NULL,
    heure_fin time without time zone NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shift_modes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_modes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text DEFAULT ''::text,
    nb_shifts integer DEFAULT 3 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shift_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shift_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_in_team text DEFAULT 'membre'::text NOT NULL,
    autorisation_libre boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shift_mode_id uuid,
    cycle_pattern text[] DEFAULT '{}'::text[] NOT NULL,
    anchor_date date,
    scope_kind text DEFAULT 'all'::text NOT NULL
);


--
-- Name: shift_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    color text DEFAULT '#3b82f6'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shift_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    heure_debut time without time zone NOT NULL,
    heure_fin time without time zone NOT NULL,
    crosses_midnight boolean DEFAULT false NOT NULL,
    couleur text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shift_mode_id uuid
);


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    of_id uuid NOT NULL,
    line_id uuid NOT NULL,
    shift_type public.shift_type NOT NULL,
    date_shift date NOT NULL,
    chef_ligne_id uuid,
    heure_debut timestamp with time zone NOT NULL,
    heure_fin timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shift_team_id uuid,
    statut text DEFAULT 'en_cours'::text NOT NULL,
    observations text DEFAULT ''::text,
    heure_debut_reelle timestamp with time zone,
    heure_fin_reelle timestamp with time zone,
    opened_by uuid
);

ALTER TABLE ONLY public.shifts REPLICA IDENTITY FULL;


--
-- Name: ticket_collaborators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_collaborators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_label text DEFAULT 'aide'::text NOT NULL,
    added_by uuid,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    removed_at timestamp with time zone,
    removed_by uuid,
    CONSTRAINT ticket_collaborators_role_chk CHECK ((role_label = ANY (ARRAY['aide'::text, 'co_intervenant'::text])))
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text NOT NULL,
    machine_id uuid NOT NULL,
    panne_type_id uuid,
    priorite public.ticket_priorite DEFAULT 'normale'::public.ticket_priorite NOT NULL,
    statut public.ticket_statut DEFAULT 'ouvert'::public.ticket_statut NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    cause_racine text DEFAULT ''::text,
    solution text DEFAULT ''::text,
    declarant_id uuid,
    assignee_id uuid,
    heure_declaration timestamp with time zone DEFAULT now() NOT NULL,
    heure_prise_en_charge timestamp with time zone,
    heure_resolution timestamp with time zone,
    heure_cloture timestamp with time zone,
    temps_arret_minutes integer,
    temps_intervention_minutes integer,
    of_id uuid,
    shift_id uuid,
    ligne_id uuid,
    is_from_gpao boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    equipement_id uuid,
    organe_id uuid,
    validation_status text,
    validation_request_id uuid,
    search_vector tsvector,
    assignment_status public.ticket_assignment_status
);

ALTER TABLE ONLY public.tickets REPLICA IDENTITY FULL;


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    module text,
    notification_type text,
    in_app_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT false NOT NULL,
    push_enabled boolean DEFAULT false,
    minimum_severity public.notification_severity DEFAULT 'info'::public.notification_severity NOT NULL,
    muted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: validation_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.validation_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    view_own boolean DEFAULT false NOT NULL,
    view_all boolean DEFAULT false NOT NULL,
    submit boolean DEFAULT false NOT NULL,
    approve boolean DEFAULT false NOT NULL,
    reject boolean DEFAULT false NOT NULL,
    cancel boolean DEFAULT false NOT NULL,
    configure_rules boolean DEFAULT false NOT NULL,
    view_technical_details boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: validation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.validation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid,
    request_type text NOT NULL,
    module text NOT NULL,
    entity_type text,
    entity_id uuid,
    entity_code text,
    entity_label text,
    target_record_id uuid,
    requested_action text NOT NULL,
    status public.validation_status_enum DEFAULT 'submitted'::public.validation_status_enum NOT NULL,
    enforcement public.validation_enforcement DEFAULT 'post_hoc'::public.validation_enforcement NOT NULL,
    priority public.validation_priority DEFAULT 'medium'::public.validation_priority NOT NULL,
    source text DEFAULT 'app'::text NOT NULL,
    is_blocking boolean DEFAULT false NOT NULL,
    submitted_by_user_id uuid,
    submitted_by_name text,
    submitted_by_email text,
    assigned_validator_role text,
    assigned_validator_user_id uuid,
    validated_by_user_id uuid,
    rejected_by_user_id uuid,
    title text NOT NULL,
    description text DEFAULT ''::text,
    justification text,
    rejection_reason text,
    validation_comment text,
    old_values jsonb,
    proposed_values jsonb,
    changed_fields jsonb,
    metadata jsonb,
    action_url text,
    submitted_at timestamp with time zone DEFAULT now(),
    validated_at timestamp with time zone,
    rejected_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    applied_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector
);


--
-- Name: validation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.validation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    module text NOT NULL,
    entity_type text,
    action_type text NOT NULL,
    enforcement public.validation_enforcement DEFAULT 'post_hoc'::public.validation_enforcement NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    priority public.validation_priority DEFAULT 'medium'::public.validation_priority NOT NULL,
    validator_roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    validator_users jsonb DEFAULT '[]'::jsonb,
    conditions jsonb,
    auto_approve_if_low_risk boolean DEFAULT false NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_settings app_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_key_key UNIQUE (key);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: articles articles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_code_key UNIQUE (code);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_role_settings audit_role_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_role_settings
    ADD CONSTRAINT audit_role_settings_pkey PRIMARY KEY (id);


--
-- Name: audit_role_settings audit_role_settings_role_module_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_role_settings
    ADD CONSTRAINT audit_role_settings_role_module_key UNIQUE (role, module);


--
-- Name: bill_of_materials bill_of_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_pkey PRIMARY KEY (id);


--
-- Name: bill_of_materials bill_of_materials_product_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_product_id_version_key UNIQUE (product_id, version);


--
-- Name: bom_items bom_items_bom_id_article_id_item_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_bom_id_article_id_item_type_key UNIQUE (bom_id, article_id, item_type);


--
-- Name: bom_items bom_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);


--
-- Name: consumptions consumptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumptions
    ADD CONSTRAINT consumptions_pkey PRIMARY KEY (id);


--
-- Name: custom_roles custom_roles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_roles
    ADD CONSTRAINT custom_roles_code_key UNIQUE (code);


--
-- Name: custom_roles custom_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_roles
    ADD CONSTRAINT custom_roles_pkey PRIMARY KEY (id);


--
-- Name: document_audit_logs document_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_audit_logs
    ADD CONSTRAINT document_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: document_categories document_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_categories
    ADD CONSTRAINT document_categories_pkey PRIMARY KEY (id);


--
-- Name: document_permissions document_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_pkey PRIMARY KEY (id);


--
-- Name: document_permissions document_permissions_role_entity_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_permissions
    ADD CONSTRAINT document_permissions_role_entity_type_key UNIQUE (role, entity_type);


--
-- Name: entity_documents entity_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_documents
    ADD CONSTRAINT entity_documents_pkey PRIMARY KEY (id);


--
-- Name: entity_images entity_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_images
    ADD CONSTRAINT entity_images_pkey PRIMARY KEY (id);


--
-- Name: equipements equipements_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipements
    ADD CONSTRAINT equipements_code_key UNIQUE (code);


--
-- Name: equipements equipements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipements
    ADD CONSTRAINT equipements_pkey PRIMARY KEY (id);


--
-- Name: intervention_pdr intervention_pdr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervention_pdr
    ADD CONSTRAINT intervention_pdr_pkey PRIMARY KEY (id);


--
-- Name: interventions interventions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_pkey PRIMARY KEY (id);


--
-- Name: inventory_assignment_scopes inventory_assignment_scopes_assignment_id_family_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_assignment_scopes
    ADD CONSTRAINT inventory_assignment_scopes_assignment_id_family_id_key UNIQUE (assignment_id, family_id);


--
-- Name: inventory_assignment_scopes inventory_assignment_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_assignment_scopes
    ADD CONSTRAINT inventory_assignment_scopes_pkey PRIMARY KEY (id);


--
-- Name: inventory_assignments inventory_assignments_campaign_id_agent_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_assignments
    ADD CONSTRAINT inventory_assignments_campaign_id_agent_id_role_key UNIQUE (campaign_id, agent_id, role);


--
-- Name: inventory_assignments inventory_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_assignments
    ADD CONSTRAINT inventory_assignments_pkey PRIMARY KEY (id);


--
-- Name: inventory_campaign_scopes inventory_campaign_scopes_campaign_id_family_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_campaign_scopes
    ADD CONSTRAINT inventory_campaign_scopes_campaign_id_family_id_key UNIQUE (campaign_id, family_id);


--
-- Name: inventory_campaign_scopes inventory_campaign_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_campaign_scopes
    ADD CONSTRAINT inventory_campaign_scopes_pkey PRIMARY KEY (id);


--
-- Name: inventory_campaigns inventory_campaigns_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_campaigns
    ADD CONSTRAINT inventory_campaigns_code_key UNIQUE (code);


--
-- Name: inventory_campaigns inventory_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_campaigns
    ADD CONSTRAINT inventory_campaigns_pkey PRIMARY KEY (id);


--
-- Name: inventory_counts inventory_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_pkey PRIMARY KEY (id);


--
-- Name: inventory_counts inventory_counts_target_id_assignment_id_round_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_target_id_assignment_id_round_key UNIQUE (target_id, assignment_id, round);


--
-- Name: inventory_results inventory_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_results
    ADD CONSTRAINT inventory_results_pkey PRIMARY KEY (target_id);


--
-- Name: inventory_targets inventory_targets_campaign_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_targets
    ADD CONSTRAINT inventory_targets_campaign_id_entity_type_entity_id_key UNIQUE (campaign_id, entity_type, entity_id);


--
-- Name: inventory_targets inventory_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_targets
    ADD CONSTRAINT inventory_targets_pkey PRIMARY KEY (id);


--
-- Name: line_products line_products_line_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_products
    ADD CONSTRAINT line_products_line_id_product_id_key UNIQUE (line_id, product_id);


--
-- Name: line_products line_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_products
    ADD CONSTRAINT line_products_pkey PRIMARY KEY (id);


--
-- Name: machine_documents machine_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_documents
    ADD CONSTRAINT machine_documents_pkey PRIMARY KEY (id);


--
-- Name: machine_families machine_families_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_families
    ADD CONSTRAINT machine_families_pkey PRIMARY KEY (id);


--
-- Name: machine_line_assignments machine_line_assignments_machine_id_line_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_line_assignments
    ADD CONSTRAINT machine_line_assignments_machine_id_line_id_key UNIQUE (machine_id, line_id);


--
-- Name: machine_line_assignments machine_line_assignments_machine_id_priority_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_line_assignments
    ADD CONSTRAINT machine_line_assignments_machine_id_priority_key UNIQUE (machine_id, priority);


--
-- Name: machine_line_assignments machine_line_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_line_assignments
    ADD CONSTRAINT machine_line_assignments_pkey PRIMARY KEY (id);


--
-- Name: machine_pdr machine_pdr_machine_id_pdr_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_pdr
    ADD CONSTRAINT machine_pdr_machine_id_pdr_id_key UNIQUE (machine_id, pdr_id);


--
-- Name: machine_pdr machine_pdr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_pdr
    ADD CONSTRAINT machine_pdr_pkey PRIMARY KEY (id);


--
-- Name: machines machines_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_code_key UNIQUE (code);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: maintenance_shifts maintenance_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_shifts
    ADD CONSTRAINT maintenance_shifts_pkey PRIMARY KEY (id);


--
-- Name: notification_email_log notification_email_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_email_log
    ADD CONSTRAINT notification_email_log_pkey PRIMARY KEY (id);


--
-- Name: notification_rules notification_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_rules
    ADD CONSTRAINT notification_rules_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: of_mode_history of_mode_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.of_mode_history
    ADD CONSTRAINT of_mode_history_pkey PRIMARY KEY (id);


--
-- Name: of_shift_assignments of_shift_assignments_of_id_shift_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.of_shift_assignments
    ADD CONSTRAINT of_shift_assignments_of_id_shift_type_key UNIQUE (of_id, shift_type);


--
-- Name: of_shift_assignments of_shift_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.of_shift_assignments
    ADD CONSTRAINT of_shift_assignments_pkey PRIMARY KEY (id);


--
-- Name: ordres_fabrication ordres_fabrication_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordres_fabrication
    ADD CONSTRAINT ordres_fabrication_numero_key UNIQUE (numero);


--
-- Name: ordres_fabrication ordres_fabrication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordres_fabrication
    ADD CONSTRAINT ordres_fabrication_pkey PRIMARY KEY (id);


--
-- Name: organes organes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organes
    ADD CONSTRAINT organes_code_key UNIQUE (code);


--
-- Name: organes organes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organes
    ADD CONSTRAINT organes_pkey PRIMARY KEY (id);


--
-- Name: packaging_levels packaging_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packaging_levels
    ADD CONSTRAINT packaging_levels_pkey PRIMARY KEY (id);


--
-- Name: panne_types panne_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.panne_types
    ADD CONSTRAINT panne_types_pkey PRIMARY KEY (id);


--
-- Name: pdr_entity_links pdr_entity_links_pdr_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_entity_links
    ADD CONSTRAINT pdr_entity_links_pdr_id_entity_type_entity_id_key UNIQUE (pdr_id, entity_type, entity_id);


--
-- Name: pdr_entity_links pdr_entity_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_entity_links
    ADD CONSTRAINT pdr_entity_links_pkey PRIMARY KEY (id);


--
-- Name: pdr_equivalences pdr_equivalences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_equivalences
    ADD CONSTRAINT pdr_equivalences_pkey PRIMARY KEY (id);


--
-- Name: pdr_families pdr_families_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_families
    ADD CONSTRAINT pdr_families_pkey PRIMARY KEY (id);


--
-- Name: pdr_family_suppliers pdr_family_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_family_suppliers
    ADD CONSTRAINT pdr_family_suppliers_pkey PRIMARY KEY (id);


--
-- Name: pdr_install_positions pdr_install_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_install_positions
    ADD CONSTRAINT pdr_install_positions_pkey PRIMARY KEY (id);


--
-- Name: pdr_instances pdr_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_instances
    ADD CONSTRAINT pdr_instances_pkey PRIMARY KEY (id);


--
-- Name: pdr pdr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr
    ADD CONSTRAINT pdr_pkey PRIMARY KEY (id);


--
-- Name: pdr_install_positions pdr_pos_unique_idx; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_install_positions
    ADD CONSTRAINT pdr_pos_unique_idx UNIQUE (link_id, position_index);


--
-- Name: pdr pdr_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr
    ADD CONSTRAINT pdr_reference_key UNIQUE (reference);


--
-- Name: pdr_stock_movements pdr_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_stock_movements
    ADD CONSTRAINT pdr_stock_movements_pkey PRIMARY KEY (id);


--
-- Name: pdr_stock_permissions pdr_stock_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_stock_permissions
    ADD CONSTRAINT pdr_stock_permissions_pkey PRIMARY KEY (id);


--
-- Name: pdr_stock_permissions pdr_stock_permissions_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_stock_permissions
    ADD CONSTRAINT pdr_stock_permissions_role_key UNIQUE (role);


--
-- Name: pdr_suppliers pdr_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_suppliers
    ADD CONSTRAINT pdr_suppliers_pkey PRIMARY KEY (id);


--
-- Name: preventive_executions preventive_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_executions
    ADD CONSTRAINT preventive_executions_pkey PRIMARY KEY (id);


--
-- Name: preventive_plan_assignees preventive_plan_assignees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plan_assignees
    ADD CONSTRAINT preventive_plan_assignees_pkey PRIMARY KEY (id);


--
-- Name: preventive_plan_assignees preventive_plan_assignees_plan_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plan_assignees
    ADD CONSTRAINT preventive_plan_assignees_plan_id_user_id_key UNIQUE (plan_id, user_id);


--
-- Name: preventive_plan_pdr preventive_plan_pdr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plan_pdr
    ADD CONSTRAINT preventive_plan_pdr_pkey PRIMARY KEY (id);


--
-- Name: preventive_plans preventive_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plans
    ADD CONSTRAINT preventive_plans_pkey PRIMARY KEY (id);


--
-- Name: product_families product_families_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_families
    ADD CONSTRAINT product_families_pkey PRIMARY KEY (id);


--
-- Name: production_declarations production_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_declarations
    ADD CONSTRAINT production_declarations_pkey PRIMARY KEY (id);


--
-- Name: production_lines production_lines_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lines
    ADD CONSTRAINT production_lines_code_key UNIQUE (code);


--
-- Name: production_lines production_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lines
    ADD CONSTRAINT production_lines_pkey PRIMARY KEY (id);


--
-- Name: production_stops production_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stops
    ADD CONSTRAINT production_stops_pkey PRIMARY KEY (id);


--
-- Name: products products_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_code_key UNIQUE (code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: quality_action_categories quality_action_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_action_categories
    ADD CONSTRAINT quality_action_categories_code_key UNIQUE (code);


--
-- Name: quality_action_categories quality_action_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_action_categories
    ADD CONSTRAINT quality_action_categories_pkey PRIMARY KEY (id);


--
-- Name: quality_actions quality_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_actions
    ADD CONSTRAINT quality_actions_pkey PRIMARY KEY (id);


--
-- Name: quality_checks quality_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_pkey PRIMARY KEY (id);


--
-- Name: quality_control_point_lines quality_control_point_lines_control_point_id_production_lin_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_control_point_lines
    ADD CONSTRAINT quality_control_point_lines_control_point_id_production_lin_key UNIQUE (control_point_id, production_line_id);


--
-- Name: quality_control_point_lines quality_control_point_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_control_point_lines
    ADD CONSTRAINT quality_control_point_lines_pkey PRIMARY KEY (id);


--
-- Name: quality_control_point_ofs quality_control_point_ofs_control_point_id_of_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_control_point_ofs
    ADD CONSTRAINT quality_control_point_ofs_control_point_id_of_id_key UNIQUE (control_point_id, of_id);


--
-- Name: quality_control_point_ofs quality_control_point_ofs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_control_point_ofs
    ADD CONSTRAINT quality_control_point_ofs_pkey PRIMARY KEY (id);


--
-- Name: quality_control_points quality_control_points_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_control_points
    ADD CONSTRAINT quality_control_points_code_key UNIQUE (code);


--
-- Name: quality_control_points quality_control_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_control_points
    ADD CONSTRAINT quality_control_points_pkey PRIMARY KEY (id);


--
-- Name: quality_decision_reasons quality_decision_reasons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_decision_reasons
    ADD CONSTRAINT quality_decision_reasons_code_key UNIQUE (code);


--
-- Name: quality_decision_reasons quality_decision_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_decision_reasons
    ADD CONSTRAINT quality_decision_reasons_pkey PRIMARY KEY (id);


--
-- Name: quality_defect_types quality_defect_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_defect_types
    ADD CONSTRAINT quality_defect_types_code_key UNIQUE (code);


--
-- Name: quality_defect_types quality_defect_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_defect_types
    ADD CONSTRAINT quality_defect_types_pkey PRIMARY KEY (id);


--
-- Name: quality_indicator_assignments quality_indicator_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_indicator_assignments
    ADD CONSTRAINT quality_indicator_assignments_pkey PRIMARY KEY (id);


--
-- Name: quality_indicators quality_indicators_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_indicators
    ADD CONSTRAINT quality_indicators_code_key UNIQUE (code);


--
-- Name: quality_indicators quality_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_indicators
    ADD CONSTRAINT quality_indicators_pkey PRIMARY KEY (id);


--
-- Name: quality_nc_categories quality_nc_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_nc_categories
    ADD CONSTRAINT quality_nc_categories_code_key UNIQUE (code);


--
-- Name: quality_nc_categories quality_nc_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_nc_categories
    ADD CONSTRAINT quality_nc_categories_pkey PRIMARY KEY (id);


--
-- Name: quality_non_conformities quality_non_conformities_nc_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_non_conformities
    ADD CONSTRAINT quality_non_conformities_nc_number_key UNIQUE (nc_number);


--
-- Name: quality_non_conformities quality_non_conformities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_non_conformities
    ADD CONSTRAINT quality_non_conformities_pkey PRIMARY KEY (id);


--
-- Name: quality_permissions quality_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_permissions
    ADD CONSTRAINT quality_permissions_pkey PRIMARY KEY (id);


--
-- Name: quality_permissions quality_permissions_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_permissions
    ADD CONSTRAINT quality_permissions_role_key UNIQUE (role);


--
-- Name: quality_shift_assignments quality_shift_assignments_controller_id_shift_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_assignments
    ADD CONSTRAINT quality_shift_assignments_controller_id_shift_type_key UNIQUE (controller_id, shift_type);


--
-- Name: quality_shift_assignments quality_shift_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_assignments
    ADD CONSTRAINT quality_shift_assignments_pkey PRIMARY KEY (id);


--
-- Name: quality_shift_lines quality_shift_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_lines
    ADD CONSTRAINT quality_shift_lines_pkey PRIMARY KEY (quality_shift_id, production_line_id);


--
-- Name: quality_shift_lines quality_shift_lines_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_lines
    ADD CONSTRAINT quality_shift_lines_unique UNIQUE (quality_shift_id, production_line_id);


--
-- Name: quality_shift_production_links quality_shift_production_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_production_links
    ADD CONSTRAINT quality_shift_production_links_pkey PRIMARY KEY (quality_shift_id, production_shift_id);


--
-- Name: quality_shift_production_links quality_shift_production_links_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_production_links
    ADD CONSTRAINT quality_shift_production_links_unique UNIQUE (quality_shift_id, production_shift_id);


--
-- Name: quality_shifts quality_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shifts
    ADD CONSTRAINT quality_shifts_pkey PRIMARY KEY (id);


--
-- Name: quality_units quality_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_units
    ADD CONSTRAINT quality_units_pkey PRIMARY KEY (id);


--
-- Name: quality_units quality_units_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_units
    ADD CONSTRAINT quality_units_symbol_key UNIQUE (symbol);


--
-- Name: recipe_lines recipe_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_lines
    ADD CONSTRAINT recipe_lines_pkey PRIMARY KEY (id);


--
-- Name: recipe_steps recipe_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT recipe_steps_pkey PRIMARY KEY (id);


--
-- Name: recipe_steps recipe_steps_recipe_id_step_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT recipe_steps_recipe_id_step_order_key UNIQUE (recipe_id, step_order);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_product_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_product_id_version_key UNIQUE (product_id, version);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_module_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_module_key UNIQUE (role, module);


--
-- Name: scan_history scan_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_history
    ADD CONSTRAINT scan_history_pkey PRIMARY KEY (id);


--
-- Name: shift_mode_slots shift_mode_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_mode_slots
    ADD CONSTRAINT shift_mode_slots_pkey PRIMARY KEY (id);


--
-- Name: shift_modes shift_modes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_modes
    ADD CONSTRAINT shift_modes_code_key UNIQUE (code);


--
-- Name: shift_modes shift_modes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_modes
    ADD CONSTRAINT shift_modes_pkey PRIMARY KEY (id);


--
-- Name: shift_settings shift_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_settings
    ADD CONSTRAINT shift_settings_key_key UNIQUE (key);


--
-- Name: shift_settings shift_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_settings
    ADD CONSTRAINT shift_settings_pkey PRIMARY KEY (id);


--
-- Name: shift_team_members shift_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_team_members
    ADD CONSTRAINT shift_team_members_pkey PRIMARY KEY (id);


--
-- Name: shift_team_members shift_team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_team_members
    ADD CONSTRAINT shift_team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: shift_teams shift_teams_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_teams
    ADD CONSTRAINT shift_teams_code_key UNIQUE (code);


--
-- Name: shift_teams shift_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_teams
    ADD CONSTRAINT shift_teams_pkey PRIMARY KEY (id);


--
-- Name: shift_templates shift_templates_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_templates
    ADD CONSTRAINT shift_templates_code_key UNIQUE (code);


--
-- Name: shift_templates shift_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_templates
    ADD CONSTRAINT shift_templates_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: ticket_collaborators ticket_collaborators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_collaborators
    ADD CONSTRAINT ticket_collaborators_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_numero_key UNIQUE (numero);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_user_id_module_notification_t_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_module_notification_t_key UNIQUE (user_id, module, notification_type);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: validation_permissions validation_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_permissions
    ADD CONSTRAINT validation_permissions_pkey PRIMARY KEY (id);


--
-- Name: validation_permissions validation_permissions_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_permissions
    ADD CONSTRAINT validation_permissions_role_key UNIQUE (role);


--
-- Name: validation_requests validation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_requests
    ADD CONSTRAINT validation_requests_pkey PRIMARY KEY (id);


--
-- Name: validation_rules validation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_rules
    ADD CONSTRAINT validation_rules_pkey PRIMARY KEY (id);


--
-- Name: idx_app_settings_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_settings_key ON public.app_settings USING btree (key);


--
-- Name: idx_articles_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_search ON public.articles USING gin (search_vector);


--
-- Name: idx_articles_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_trgm ON public.articles USING gin (code public.gin_trgm_ops, designation public.gin_trgm_ops);


--
-- Name: idx_audit_logs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action_type ON public.audit_logs USING btree (action_type);


--
-- Name: idx_audit_logs_archived_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_archived_at ON public.audit_logs USING btree (archived_at);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs USING btree (entity_id);


--
-- Name: idx_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- Name: idx_audit_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_module ON public.audit_logs USING btree (module);


--
-- Name: idx_audit_logs_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_search ON public.audit_logs USING gin (search_vector);


--
-- Name: idx_audit_logs_search_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_search_trgm ON public.audit_logs USING gin ((((((((((COALESCE(description, ''::text) || ' '::text) || COALESCE(entity_code, ''::text)) || ' '::text) || COALESCE(entity_label, ''::text)) || ' '::text) || COALESCE(user_email, ''::text)) || ' '::text) || COALESCE(user_full_name, ''::text))) public.gin_trgm_ops);


--
-- Name: idx_audit_logs_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_severity ON public.audit_logs USING btree (severity);


--
-- Name: idx_audit_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_status ON public.audit_logs USING btree (status);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_bom_items_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_items_article ON public.bom_items USING btree (article_id);


--
-- Name: idx_bom_items_bom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_items_bom ON public.bom_items USING btree (bom_id);


--
-- Name: idx_bom_items_quality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_items_quality ON public.bom_items USING btree (is_quality_sensitive) WHERE (is_quality_sensitive = true);


--
-- Name: idx_bom_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_product ON public.bill_of_materials USING btree (product_id);


--
-- Name: idx_bom_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_status ON public.bill_of_materials USING btree (status);


--
-- Name: idx_consumptions_batch_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumptions_batch_number ON public.consumptions USING btree (batch_number) WHERE (batch_number IS NOT NULL);


--
-- Name: idx_consumptions_lot_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumptions_lot_number ON public.consumptions USING btree (lot_number) WHERE (lot_number IS NOT NULL);


--
-- Name: idx_consumptions_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumptions_search ON public.consumptions USING gin (search_vector);


--
-- Name: idx_entity_documents_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_documents_search ON public.entity_documents USING gin (search_vector);


--
-- Name: idx_entity_images_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_images_lookup ON public.entity_images USING btree (entity_type, entity_id);


--
-- Name: idx_equipements_code_erp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipements_code_erp ON public.equipements USING btree (lower(code_erp)) WHERE (code_erp IS NOT NULL);


--
-- Name: idx_equipements_qr_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipements_qr_code ON public.equipements USING btree (lower(qr_code)) WHERE (qr_code IS NOT NULL);


--
-- Name: idx_equipements_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipements_search ON public.equipements USING gin (search_vector);


--
-- Name: idx_equipements_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipements_trgm ON public.equipements USING gin (code public.gin_trgm_ops, designation public.gin_trgm_ops);


--
-- Name: idx_intervention_pdr_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intervention_pdr_position ON public.intervention_pdr USING btree (position_id);


--
-- Name: idx_interventions_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interventions_search ON public.interventions USING gin (search_vector);


--
-- Name: idx_interventions_technicien; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interventions_technicien ON public.interventions USING btree (technicien_id);


--
-- Name: idx_interventions_ticket_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interventions_ticket_role ON public.interventions USING btree (ticket_id, role);


--
-- Name: idx_machines_code_erp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machines_code_erp ON public.machines USING btree (lower(code_erp)) WHERE (code_erp IS NOT NULL);


--
-- Name: idx_machines_qr_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machines_qr_code ON public.machines USING btree (lower(qr_code)) WHERE (qr_code IS NOT NULL);


--
-- Name: idx_machines_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machines_search ON public.machines USING gin (search_vector);


--
-- Name: idx_machines_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machines_trgm ON public.machines USING gin (code public.gin_trgm_ops, designation public.gin_trgm_ops);


--
-- Name: idx_maintenance_shifts_maintenancier_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_shifts_maintenancier_active ON public.maintenance_shifts USING btree (maintenancier_id, is_active, date_shift);


--
-- Name: idx_notif_email_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_email_log_created ON public.notification_email_log USING btree (created_at DESC);


--
-- Name: idx_notif_email_log_dedup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_email_log_dedup ON public.notification_email_log USING btree (dedup_key) WHERE (dedup_key IS NOT NULL);


--
-- Name: idx_notif_email_log_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_email_log_recipient ON public.notification_email_log USING btree (recipient_user_id) WHERE (recipient_user_id IS NOT NULL);


--
-- Name: idx_notif_rules_module_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_rules_module_event ON public.notification_rules USING btree (module, event_type) WHERE (is_active = true);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_dedup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_dedup ON public.notifications USING btree (deduplication_key) WHERE (deduplication_key IS NOT NULL);


--
-- Name: idx_notifications_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_entity ON public.notifications USING btree (entity_type, entity_id);


--
-- Name: idx_notifications_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_module ON public.notifications USING btree (module);


--
-- Name: idx_notifications_recipient_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient_role ON public.notifications USING btree (recipient_role) WHERE (recipient_role IS NOT NULL);


--
-- Name: idx_notifications_recipient_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient_user ON public.notifications USING btree (recipient_user_id) WHERE (recipient_user_id IS NOT NULL);


--
-- Name: idx_notifications_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_search ON public.notifications USING gin (search_vector);


--
-- Name: idx_notifications_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_severity ON public.notifications USING btree (severity);


--
-- Name: idx_notifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_status ON public.notifications USING btree (status);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (notification_type);


--
-- Name: idx_of_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_of_search ON public.ordres_fabrication USING gin (search_vector);


--
-- Name: idx_of_shift_assignments_chef; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_of_shift_assignments_chef ON public.of_shift_assignments USING btree (chef_ligne_id);


--
-- Name: idx_of_shift_assignments_of; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_of_shift_assignments_of ON public.of_shift_assignments USING btree (of_id);


--
-- Name: idx_of_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_of_trgm ON public.ordres_fabrication USING gin (numero public.gin_trgm_ops);


--
-- Name: idx_organes_code_barres; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organes_code_barres ON public.organes USING btree (lower(code_barres)) WHERE (code_barres IS NOT NULL);


--
-- Name: idx_organes_code_erp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organes_code_erp ON public.organes USING btree (lower(code_erp)) WHERE (code_erp IS NOT NULL);


--
-- Name: idx_organes_equipement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organes_equipement ON public.organes USING btree (equipement_id);


--
-- Name: idx_organes_machine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organes_machine ON public.organes USING btree (machine_id);


--
-- Name: idx_organes_qr_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organes_qr_code ON public.organes USING btree (lower(qr_code)) WHERE (qr_code IS NOT NULL);


--
-- Name: idx_organes_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organes_search ON public.organes USING gin (search_vector);


--
-- Name: idx_organes_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organes_trgm ON public.organes USING gin (code public.gin_trgm_ops, designation public.gin_trgm_ops);


--
-- Name: idx_pdr_code_barres; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_code_barres ON public.pdr USING btree (lower(code_barres)) WHERE (code_barres IS NOT NULL);


--
-- Name: idx_pdr_code_erp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_code_erp ON public.pdr USING btree (lower(code_erp)) WHERE (code_erp IS NOT NULL);


--
-- Name: idx_pdr_equivalences_pdr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_equivalences_pdr ON public.pdr_equivalences USING btree (pdr_id);


--
-- Name: idx_pdr_equivalences_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_equivalences_status ON public.pdr_equivalences USING btree (validation_status);


--
-- Name: idx_pdr_family_suppliers_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_family_suppliers_search ON public.pdr_family_suppliers USING gin (search_vector);


--
-- Name: idx_pdr_instances_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_instances_position ON public.pdr_instances USING btree (position_id);


--
-- Name: idx_pdr_pos_link; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_pos_link ON public.pdr_install_positions USING btree (link_id);


--
-- Name: idx_pdr_pos_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_pos_statut ON public.pdr_install_positions USING btree (statut);


--
-- Name: idx_pdr_qr_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_qr_code ON public.pdr USING btree (lower(qr_code)) WHERE (qr_code IS NOT NULL);


--
-- Name: idx_pdr_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_search ON public.pdr USING gin (search_vector);


--
-- Name: idx_pdr_stock_movements_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_stock_movements_search ON public.pdr_stock_movements USING gin (search_vector);


--
-- Name: idx_pdr_suppliers_pdr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_suppliers_pdr ON public.pdr_suppliers USING btree (pdr_id);


--
-- Name: idx_pdr_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdr_trgm ON public.pdr USING gin (reference public.gin_trgm_ops, designation public.gin_trgm_ops);


--
-- Name: idx_pel_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pel_entity ON public.pdr_entity_links USING btree (entity_type, entity_id);


--
-- Name: idx_pel_pdr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pel_pdr ON public.pdr_entity_links USING btree (pdr_id);


--
-- Name: idx_preventive_plans_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preventive_plans_search ON public.preventive_plans USING gin (search_vector);


--
-- Name: idx_production_lines_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_lines_search ON public.production_lines USING gin (search_vector);


--
-- Name: idx_production_stops_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_stops_search ON public.production_stops USING gin (search_vector);


--
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_search ON public.products USING gin (search_vector);


--
-- Name: idx_products_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_trgm ON public.products USING gin (code public.gin_trgm_ops, designation public.gin_trgm_ops);


--
-- Name: idx_qa_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_due ON public.quality_actions USING btree (due_date);


--
-- Name: idx_qa_nc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_nc ON public.quality_actions USING btree (nc_id);


--
-- Name: idx_qa_responsible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_responsible ON public.quality_actions USING btree (responsible_user_id);


--
-- Name: idx_qa_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_status ON public.quality_actions USING btree (status);


--
-- Name: idx_qc_conform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qc_conform ON public.quality_checks USING btree (is_conform);


--
-- Name: idx_qc_indicator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qc_indicator ON public.quality_checks USING btree (indicator_id);


--
-- Name: idx_qc_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qc_line ON public.quality_checks USING btree (production_line_id);


--
-- Name: idx_qc_of; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qc_of ON public.quality_checks USING btree (of_id);


--
-- Name: idx_qc_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qc_time ON public.quality_checks USING btree (control_time DESC);


--
-- Name: idx_qcpl_cp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qcpl_cp ON public.quality_control_point_lines USING btree (control_point_id);


--
-- Name: idx_qcpl_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qcpl_line ON public.quality_control_point_lines USING btree (production_line_id);


--
-- Name: idx_qcpo_cp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qcpo_cp ON public.quality_control_point_ofs USING btree (control_point_id);


--
-- Name: idx_qcpo_of; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qcpo_of ON public.quality_control_point_ofs USING btree (of_id);


--
-- Name: idx_qia_family; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qia_family ON public.quality_indicator_assignments USING btree (product_family_id) WHERE (product_family_id IS NOT NULL);


--
-- Name: idx_qia_indicator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qia_indicator ON public.quality_indicator_assignments USING btree (indicator_id);


--
-- Name: idx_qia_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qia_line ON public.quality_indicator_assignments USING btree (production_line_id) WHERE (production_line_id IS NOT NULL);


--
-- Name: idx_qia_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qia_product ON public.quality_indicator_assignments USING btree (product_id) WHERE (product_id IS NOT NULL);


--
-- Name: idx_qia_recipe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qia_recipe ON public.quality_indicator_assignments USING btree (recipe_id) WHERE (recipe_id IS NOT NULL);


--
-- Name: idx_qnc_detected_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qnc_detected_at ON public.quality_non_conformities USING btree (detected_at DESC);


--
-- Name: idx_qnc_of; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qnc_of ON public.quality_non_conformities USING btree (of_id);


--
-- Name: idx_qnc_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qnc_search ON public.quality_non_conformities USING gin (search_vector);


--
-- Name: idx_qnc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qnc_status ON public.quality_non_conformities USING btree (status);


--
-- Name: idx_qsa_controller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qsa_controller ON public.quality_shift_assignments USING btree (controller_id);


--
-- Name: idx_qspl_prod_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qspl_prod_shift ON public.quality_shift_production_links USING btree (production_shift_id);


--
-- Name: idx_quality_checks_qshift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_checks_qshift ON public.quality_checks USING btree (quality_shift_id);


--
-- Name: idx_quality_indicators_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_indicators_active ON public.quality_indicators USING btree (is_active);


--
-- Name: idx_quality_indicators_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_indicators_category ON public.quality_indicators USING btree (category);


--
-- Name: idx_quality_indicators_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_indicators_type ON public.quality_indicators USING btree (indicator_type);


--
-- Name: idx_quality_nc_qshift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_nc_qshift ON public.quality_non_conformities USING btree (quality_shift_id);


--
-- Name: idx_quality_shift_lines_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_shift_lines_line ON public.quality_shift_lines USING btree (production_line_id);


--
-- Name: idx_quality_shifts_controller_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_shifts_controller_active ON public.quality_shifts USING btree (controller_id, is_active);


--
-- Name: idx_quality_shifts_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_shifts_date ON public.quality_shifts USING btree (date_shift DESC);


--
-- Name: idx_recipe_steps_indicator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipe_steps_indicator ON public.recipe_steps USING btree (quality_indicator_id);


--
-- Name: idx_recipe_steps_recipe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipe_steps_recipe ON public.recipe_steps USING btree (recipe_id);


--
-- Name: idx_recipes_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipes_search ON public.recipes USING gin (search_vector);


--
-- Name: idx_scan_history_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_history_entity ON public.scan_history USING btree (entity_type, entity_id);


--
-- Name: idx_scan_history_outcome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_history_outcome ON public.scan_history USING btree (outcome);


--
-- Name: idx_scan_history_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_history_scanned_at ON public.scan_history USING btree (scanned_at DESC);


--
-- Name: idx_scan_history_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_history_search ON public.scan_history USING gin (search_vector);


--
-- Name: idx_scan_history_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_history_user_date ON public.scan_history USING btree (user_id, scanned_at DESC);


--
-- Name: idx_shift_templates_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_templates_mode ON public.shift_templates USING btree (shift_mode_id);


--
-- Name: idx_ticket_collaborators_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_collaborators_ticket ON public.ticket_collaborators USING btree (ticket_id);


--
-- Name: idx_ticket_collaborators_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_collaborators_user ON public.ticket_collaborators USING btree (user_id);


--
-- Name: idx_tickets_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_search ON public.tickets USING gin (search_vector);


--
-- Name: idx_tickets_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_trgm ON public.tickets USING gin (numero public.gin_trgm_ops);


--
-- Name: idx_user_notif_prefs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notif_prefs_user ON public.user_notification_preferences USING btree (user_id);


--
-- Name: idx_validation_requests_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_requests_search ON public.validation_requests USING gin (search_vector);


--
-- Name: idx_validation_rules_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_rules_lookup ON public.validation_rules USING btree (module, action_type, is_active);


--
-- Name: idx_vr_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vr_created_at ON public.validation_requests USING btree (created_at DESC);


--
-- Name: idx_vr_enforcement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vr_enforcement ON public.validation_requests USING btree (enforcement);


--
-- Name: idx_vr_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vr_entity ON public.validation_requests USING btree (entity_type, entity_id);


--
-- Name: idx_vr_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vr_module ON public.validation_requests USING btree (module);


--
-- Name: idx_vr_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vr_priority ON public.validation_requests USING btree (priority);


--
-- Name: idx_vr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vr_status ON public.validation_requests USING btree (status);


--
-- Name: idx_vr_submitted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vr_submitted_by ON public.validation_requests USING btree (submitted_by_user_id);


--
-- Name: idx_vr_validator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vr_validator ON public.validation_requests USING btree (assigned_validator_user_id);


--
-- Name: inventory_counts_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_counts_target_idx ON public.inventory_counts USING btree (target_id);


--
-- Name: inventory_targets_campaign_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_targets_campaign_status_idx ON public.inventory_targets USING btree (campaign_id, status);


--
-- Name: inventory_targets_family_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_targets_family_idx ON public.inventory_targets USING btree (family_id);


--
-- Name: ticket_collaborators_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ticket_collaborators_unique_active ON public.ticket_collaborators USING btree (ticket_id, user_id) WHERE (removed_at IS NULL);


--
-- Name: uq_shifts_active_of_line_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_shifts_active_of_line_slot ON public.shifts USING btree (of_id, line_id, date_shift, shift_type) WHERE (is_active = true);


--
-- Name: maintenance_shifts maintenance_shift_notify_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER maintenance_shift_notify_event AFTER INSERT OR UPDATE OF is_active ON public.maintenance_shifts FOR EACH ROW EXECUTE FUNCTION public.notify_shift_event();


--
-- Name: quality_shifts quality_shift_notify_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quality_shift_notify_event AFTER INSERT OR UPDATE OF is_active ON public.quality_shifts FOR EACH ROW EXECUTE FUNCTION public.notify_shift_event();


--
-- Name: ordres_fabrication set_of_numero; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_of_numero BEFORE INSERT ON public.ordres_fabrication FOR EACH ROW WHEN (((new.numero IS NULL) OR (new.numero = ''::text))) EXECUTE FUNCTION public.generate_of_numero();


--
-- Name: pdr_stock_permissions set_pdr_stock_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_pdr_stock_permissions_updated_at BEFORE UPDATE ON public.pdr_stock_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tickets set_ticket_numero; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_ticket_numero BEFORE INSERT ON public.tickets FOR EACH ROW WHEN (((new.numero IS NULL) OR (new.numero = ''::text))) EXECUTE FUNCTION public.generate_ticket_numero();


--
-- Name: shifts shift_notify_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER shift_notify_event AFTER INSERT OR UPDATE OF is_active ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.notify_shift_event();


--
-- Name: inventory_campaigns tg_inv_campaigns_uat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_inv_campaigns_uat BEFORE UPDATE ON public.inventory_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_results tg_inv_results_uat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_inv_results_uat BEFORE UPDATE ON public.inventory_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_targets tg_inv_targets_uat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_inv_targets_uat BEFORE UPDATE ON public.inventory_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_campaigns tg_inventory_campaign_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_inventory_campaign_code BEFORE INSERT ON public.inventory_campaigns FOR EACH ROW EXECUTE FUNCTION public.tg_inventory_campaign_code();


--
-- Name: inventory_counts tg_lock_inventory_counts_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lock_inventory_counts_del BEFORE DELETE ON public.inventory_counts FOR EACH ROW EXECUTE FUNCTION public.tg_lock_inventory_counts();


--
-- Name: inventory_counts tg_lock_inventory_counts_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_lock_inventory_counts_upd BEFORE UPDATE ON public.inventory_counts FOR EACH ROW EXECUTE FUNCTION public.tg_lock_inventory_counts();


--
-- Name: ordres_fabrication tg_of_close_cascade_shifts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_of_close_cascade_shifts AFTER UPDATE OF statut ON public.ordres_fabrication FOR EACH ROW EXECUTE FUNCTION public.of_close_cascade_shifts();


--
-- Name: of_shift_assignments tg_of_shift_assignments_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_of_shift_assignments_updated BEFORE UPDATE ON public.of_shift_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: production_declarations tg_production_declarations_hour_minus_1; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_production_declarations_hour_minus_1 BEFORE INSERT OR UPDATE OF heure_production ON public.production_declarations FOR EACH ROW EXECUTE FUNCTION public.tg_production_declarations_hour_minus_1();


--
-- Name: quality_shift_assignments tg_qsa_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_qsa_updated BEFORE UPDATE ON public.quality_shift_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shifts tg_qshift_unlink_closed_production; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_qshift_unlink_closed_production AFTER UPDATE OF is_active ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.qshift_unlink_closed_production();


--
-- Name: shifts tg_shifts_fill_defaults; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_shifts_fill_defaults BEFORE INSERT ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.shifts_fill_defaults();


--
-- Name: articles trg_articles_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_articles_search BEFORE INSERT OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.articles_search_refresh();


--
-- Name: audit_logs trg_audit_logs_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_logs_search BEFORE INSERT OR UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.audit_logs_search_refresh();


--
-- Name: audit_role_settings trg_audit_settings_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_settings_updated BEFORE UPDATE ON public.audit_role_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bom_items trg_bom_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bom_items_updated_at BEFORE UPDATE ON public.bom_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bill_of_materials trg_bom_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bom_updated_at BEFORE UPDATE ON public.bill_of_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consumptions trg_consumptions_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_consumptions_search BEFORE INSERT OR UPDATE ON public.consumptions FOR EACH ROW EXECUTE FUNCTION public.consumptions_search_refresh();


--
-- Name: custom_roles trg_custom_roles_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_custom_roles_updated BEFORE UPDATE ON public.custom_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entity_documents trg_entity_documents_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_entity_documents_search BEFORE INSERT OR UPDATE ON public.entity_documents FOR EACH ROW EXECUTE FUNCTION public.entity_documents_search_refresh();


--
-- Name: equipements trg_equipements_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_equipements_search BEFORE INSERT OR UPDATE ON public.equipements FOR EACH ROW EXECUTE FUNCTION public.equipements_search_refresh();


--
-- Name: intervention_pdr trg_intervention_pdr_lifecycle; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_intervention_pdr_lifecycle AFTER INSERT ON public.intervention_pdr FOR EACH ROW EXECUTE FUNCTION public.tg_intervention_pdr_lifecycle();


--
-- Name: interventions trg_interventions_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_interventions_search BEFORE INSERT OR UPDATE ON public.interventions FOR EACH ROW EXECUTE FUNCTION public.interventions_search_refresh();


--
-- Name: machines trg_machines_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_machines_search BEFORE INSERT OR UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.machines_search_refresh();


--
-- Name: maintenance_shifts trg_maintenance_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_maintenance_shifts_updated_at BEFORE UPDATE ON public.maintenance_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_rules trg_notif_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notif_rules_updated_at BEFORE UPDATE ON public.notification_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notifications trg_notifications_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notifications_search BEFORE INSERT OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.notifications_search_refresh();


--
-- Name: notifications trg_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ordres_fabrication trg_of_backfill_bom_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_of_backfill_bom_id BEFORE INSERT ON public.ordres_fabrication FOR EACH ROW EXECUTE FUNCTION public.of_backfill_bom_id();


--
-- Name: ordres_fabrication trg_of_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_of_search BEFORE INSERT OR UPDATE ON public.ordres_fabrication FOR EACH ROW EXECUTE FUNCTION public.of_search_refresh();


--
-- Name: organes trg_organes_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_organes_search BEFORE INSERT OR UPDATE ON public.organes FOR EACH ROW EXECUTE FUNCTION public.organes_search_refresh();


--
-- Name: organes trg_organes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_organes_updated_at BEFORE UPDATE ON public.organes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pdr_equivalences trg_pdr_equivalences_proposal; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pdr_equivalences_proposal BEFORE INSERT ON public.pdr_equivalences FOR EACH ROW EXECUTE FUNCTION public.pdr_equivalences_enforce_proposal();


--
-- Name: pdr_equivalences trg_pdr_equivalences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pdr_equivalences_updated_at BEFORE UPDATE ON public.pdr_equivalences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pdr_family_suppliers trg_pdr_family_suppliers_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pdr_family_suppliers_search BEFORE INSERT OR UPDATE ON public.pdr_family_suppliers FOR EACH ROW EXECUTE FUNCTION public.pdr_family_suppliers_search_refresh();


--
-- Name: pdr_install_positions trg_pdr_position_block_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pdr_position_block_delete BEFORE DELETE ON public.pdr_install_positions FOR EACH ROW EXECUTE FUNCTION public.tg_pdr_position_block_delete();


--
-- Name: pdr_install_positions trg_pdr_position_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pdr_position_updated_at BEFORE UPDATE ON public.pdr_install_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pdr_install_positions trg_pdr_position_validate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pdr_position_validate BEFORE INSERT OR UPDATE ON public.pdr_install_positions FOR EACH ROW EXECUTE FUNCTION public.tg_pdr_position_validate();


--
-- Name: pdr trg_pdr_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pdr_search BEFORE INSERT OR UPDATE ON public.pdr FOR EACH ROW EXECUTE FUNCTION public.pdr_search_refresh();


--
-- Name: pdr_stock_movements trg_pdr_stock_movements_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pdr_stock_movements_search BEFORE INSERT OR UPDATE ON public.pdr_stock_movements FOR EACH ROW EXECUTE FUNCTION public.pdr_stock_movements_search_refresh();


--
-- Name: pdr_suppliers trg_pdr_suppliers_unique_principal; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pdr_suppliers_unique_principal AFTER INSERT OR UPDATE OF is_principal ON public.pdr_suppliers FOR EACH ROW EXECUTE FUNCTION public.pdr_suppliers_unique_principal();


--
-- Name: pdr_entity_links trg_pel_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pel_updated_at BEFORE UPDATE ON public.pdr_entity_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: preventive_executions trg_preventive_execution_pdr_lifecycle; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_preventive_execution_pdr_lifecycle AFTER INSERT ON public.preventive_executions FOR EACH ROW EXECUTE FUNCTION public.tg_preventive_execution_pdr_lifecycle();


--
-- Name: preventive_plans trg_preventive_plans_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_preventive_plans_search BEFORE INSERT OR UPDATE ON public.preventive_plans FOR EACH ROW EXECUTE FUNCTION public.preventive_plans_search_refresh();


--
-- Name: production_lines trg_production_lines_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_production_lines_search BEFORE INSERT OR UPDATE ON public.production_lines FOR EACH ROW EXECUTE FUNCTION public.production_lines_search_refresh();


--
-- Name: production_stops trg_production_stops_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_production_stops_search BEFORE INSERT OR UPDATE ON public.production_stops FOR EACH ROW EXECUTE FUNCTION public.production_stops_search_refresh();


--
-- Name: products trg_products_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_products_search BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.products_search_refresh();


--
-- Name: quality_actions trg_qa_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_qa_search BEFORE INSERT OR UPDATE ON public.quality_actions FOR EACH ROW EXECUTE FUNCTION public.quality_actions_search_refresh();


--
-- Name: quality_actions trg_qa_validate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_qa_validate BEFORE INSERT OR UPDATE ON public.quality_actions FOR EACH ROW EXECUTE FUNCTION public.quality_actions_validate();


--
-- Name: quality_checks trg_qc_conformity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_qc_conformity BEFORE INSERT OR UPDATE ON public.quality_checks FOR EACH ROW EXECUTE FUNCTION public.quality_checks_compute_conformity();


--
-- Name: quality_checks trg_qc_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_qc_updated_at BEFORE UPDATE ON public.quality_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quality_indicator_assignments trg_qia_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_qia_updated_at BEFORE UPDATE ON public.quality_indicator_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quality_indicator_assignments trg_qia_validate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_qia_validate BEFORE INSERT OR UPDATE ON public.quality_indicator_assignments FOR EACH ROW EXECUTE FUNCTION public.quality_indicator_assignments_validate();


--
-- Name: quality_non_conformities trg_qnc_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_qnc_number BEFORE INSERT ON public.quality_non_conformities FOR EACH ROW EXECUTE FUNCTION public.generate_nc_number();


--
-- Name: quality_non_conformities trg_qnc_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_qnc_search BEFORE INSERT OR UPDATE ON public.quality_non_conformities FOR EACH ROW EXECUTE FUNCTION public.quality_nc_search_refresh();


--
-- Name: quality_non_conformities trg_qnc_validate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_qnc_validate BEFORE INSERT OR UPDATE ON public.quality_non_conformities FOR EACH ROW EXECUTE FUNCTION public.quality_nc_validate();


--
-- Name: quality_action_categories trg_quality_action_categories_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_action_categories_updated BEFORE UPDATE ON public.quality_action_categories FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: quality_control_points trg_quality_control_points_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_control_points_updated BEFORE UPDATE ON public.quality_control_points FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: quality_decision_reasons trg_quality_decision_reasons_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_decision_reasons_updated BEFORE UPDATE ON public.quality_decision_reasons FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: quality_defect_types trg_quality_defect_types_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_defect_types_updated BEFORE UPDATE ON public.quality_defect_types FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: quality_indicators trg_quality_indicators_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_indicators_updated_at BEFORE UPDATE ON public.quality_indicators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quality_indicators trg_quality_indicators_validate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_indicators_validate BEFORE INSERT OR UPDATE ON public.quality_indicators FOR EACH ROW EXECUTE FUNCTION public.quality_indicators_validate();


--
-- Name: quality_nc_categories trg_quality_nc_categories_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_nc_categories_updated BEFORE UPDATE ON public.quality_nc_categories FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: quality_permissions trg_quality_perms_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_perms_updated BEFORE UPDATE ON public.quality_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quality_shift_lines trg_quality_shift_lines_attach; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_shift_lines_attach AFTER INSERT ON public.quality_shift_lines FOR EACH ROW EXECUTE FUNCTION public.quality_shift_lines_attach_links();


--
-- Name: quality_shifts trg_quality_shifts_close_validate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_shifts_close_validate BEFORE UPDATE ON public.quality_shifts FOR EACH ROW EXECUTE FUNCTION public.quality_shifts_close_validate();


--
-- Name: quality_shifts trg_quality_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_shifts_updated_at BEFORE UPDATE ON public.quality_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quality_units trg_quality_units_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quality_units_updated BEFORE UPDATE ON public.quality_units FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: recipe_steps trg_recipe_steps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recipe_steps_updated_at BEFORE UPDATE ON public.recipe_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recipes trg_recipes_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recipes_search BEFORE INSERT OR UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.recipes_search_refresh();


--
-- Name: recipes trg_recipes_sync_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recipes_sync_status BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.recipes_sync_status();


--
-- Name: scan_history trg_scan_history_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_scan_history_search BEFORE INSERT OR UPDATE ON public.scan_history FOR EACH ROW EXECUTE FUNCTION public.scan_history_search_refresh();


--
-- Name: shift_team_members trg_shift_team_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_shift_team_members_updated_at BEFORE UPDATE ON public.shift_team_members FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: shift_templates trg_shift_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_shift_templates_updated_at BEFORE UPDATE ON public.shift_templates FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: tickets trg_tickets_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tickets_search BEFORE INSERT OR UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.tickets_search_refresh();


--
-- Name: user_notification_preferences trg_user_notif_prefs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_notif_prefs_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: validation_permissions trg_validation_permissions_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validation_permissions_updated BEFORE UPDATE ON public.validation_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: validation_requests trg_validation_requests_search; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validation_requests_search BEFORE INSERT OR UPDATE ON public.validation_requests FOR EACH ROW EXECUTE FUNCTION public.validation_requests_search_refresh();


--
-- Name: validation_requests trg_validation_requests_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validation_requests_updated BEFORE UPDATE ON public.validation_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: validation_rules trg_validation_rules_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validation_rules_updated BEFORE UPDATE ON public.validation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: articles update_articles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: production_declarations update_declarations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_declarations_updated_at BEFORE UPDATE ON public.production_declarations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: interventions update_interventions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON public.interventions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: machine_families update_machine_families_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_machine_families_updated_at BEFORE UPDATE ON public.machine_families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: machines update_machines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ordres_fabrication update_ofs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ofs_updated_at BEFORE UPDATE ON public.ordres_fabrication FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pdr_families update_pdr_families_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pdr_families_updated_at BEFORE UPDATE ON public.pdr_families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pdr update_pdr_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pdr_updated_at BEFORE UPDATE ON public.pdr FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: preventive_plans update_preventive_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_preventive_plans_updated_at BEFORE UPDATE ON public.preventive_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_families update_product_families_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_families_updated_at BEFORE UPDATE ON public.product_families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: production_lines update_production_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_production_lines_updated_at BEFORE UPDATE ON public.production_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recipes update_recipes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: role_permissions update_role_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shift_modes update_shift_modes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shift_modes_updated_at BEFORE UPDATE ON public.shift_modes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shift_settings update_shift_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shift_settings_updated_at BEFORE UPDATE ON public.shift_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shift_teams update_shift_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shift_teams_updated_at BEFORE UPDATE ON public.shift_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shifts update_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: production_stops update_stops_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stops_updated_at BEFORE UPDATE ON public.production_stops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tickets update_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: articles articles_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.product_families(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: bill_of_materials bill_of_materials_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: bom_items bom_items_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE RESTRICT;


--
-- Name: bom_items bom_items_bom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.bill_of_materials(id) ON DELETE CASCADE;


--
-- Name: consumptions consumptions_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumptions
    ADD CONSTRAINT consumptions_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE SET NULL;


--
-- Name: consumptions consumptions_declared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumptions
    ADD CONSTRAINT consumptions_declared_by_fkey FOREIGN KEY (declared_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: consumptions consumptions_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumptions
    ADD CONSTRAINT consumptions_of_id_fkey FOREIGN KEY (of_id) REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE;


--
-- Name: consumptions consumptions_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumptions
    ADD CONSTRAINT consumptions_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;


--
-- Name: document_audit_logs document_audit_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_audit_logs
    ADD CONSTRAINT document_audit_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.entity_documents(id) ON DELETE SET NULL;


--
-- Name: entity_documents entity_documents_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_documents
    ADD CONSTRAINT entity_documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.document_categories(id);


--
-- Name: entity_documents entity_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_documents
    ADD CONSTRAINT entity_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: equipements equipements_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipements
    ADD CONSTRAINT equipements_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.machine_families(id) ON DELETE SET NULL;


--
-- Name: equipements equipements_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipements
    ADD CONSTRAINT equipements_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.production_lines(id) ON DELETE SET NULL;


--
-- Name: equipements equipements_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipements
    ADD CONSTRAINT equipements_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;


--
-- Name: intervention_pdr intervention_pdr_intervention_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervention_pdr
    ADD CONSTRAINT intervention_pdr_intervention_id_fkey FOREIGN KEY (intervention_id) REFERENCES public.interventions(id) ON DELETE CASCADE;


--
-- Name: intervention_pdr intervention_pdr_pdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervention_pdr
    ADD CONSTRAINT intervention_pdr_pdr_id_fkey FOREIGN KEY (pdr_id) REFERENCES public.pdr(id) ON DELETE SET NULL;


--
-- Name: intervention_pdr intervention_pdr_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervention_pdr
    ADD CONSTRAINT intervention_pdr_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.pdr_install_positions(id) ON DELETE SET NULL;


--
-- Name: interventions interventions_technicien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_technicien_id_fkey FOREIGN KEY (technicien_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: interventions interventions_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: inventory_assignment_scopes inventory_assignment_scopes_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_assignment_scopes
    ADD CONSTRAINT inventory_assignment_scopes_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.inventory_assignments(id) ON DELETE CASCADE;


--
-- Name: inventory_assignment_scopes inventory_assignment_scopes_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_assignment_scopes
    ADD CONSTRAINT inventory_assignment_scopes_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.pdr_families(id) ON DELETE CASCADE;


--
-- Name: inventory_assignments inventory_assignments_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_assignments
    ADD CONSTRAINT inventory_assignments_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.inventory_campaigns(id) ON DELETE CASCADE;


--
-- Name: inventory_campaign_scopes inventory_campaign_scopes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_campaign_scopes
    ADD CONSTRAINT inventory_campaign_scopes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.inventory_campaigns(id) ON DELETE CASCADE;


--
-- Name: inventory_campaign_scopes inventory_campaign_scopes_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_campaign_scopes
    ADD CONSTRAINT inventory_campaign_scopes_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.pdr_families(id) ON DELETE CASCADE;


--
-- Name: inventory_counts inventory_counts_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.inventory_assignments(id) ON DELETE CASCADE;


--
-- Name: inventory_counts inventory_counts_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.inventory_targets(id) ON DELETE CASCADE;


--
-- Name: inventory_results inventory_results_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_results
    ADD CONSTRAINT inventory_results_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.inventory_campaigns(id) ON DELETE CASCADE;


--
-- Name: inventory_results inventory_results_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_results
    ADD CONSTRAINT inventory_results_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.inventory_targets(id) ON DELETE CASCADE;


--
-- Name: inventory_targets inventory_targets_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_targets
    ADD CONSTRAINT inventory_targets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.inventory_campaigns(id) ON DELETE CASCADE;


--
-- Name: inventory_targets inventory_targets_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_targets
    ADD CONSTRAINT inventory_targets_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.pdr_families(id);


--
-- Name: line_products line_products_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_products
    ADD CONSTRAINT line_products_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.production_lines(id) ON DELETE CASCADE;


--
-- Name: line_products line_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_products
    ADD CONSTRAINT line_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: machine_documents machine_documents_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_documents
    ADD CONSTRAINT machine_documents_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: machine_documents machine_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_documents
    ADD CONSTRAINT machine_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: machine_families machine_families_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_families
    ADD CONSTRAINT machine_families_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.machine_families(id) ON DELETE SET NULL;


--
-- Name: machine_line_assignments machine_line_assignments_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_line_assignments
    ADD CONSTRAINT machine_line_assignments_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.production_lines(id) ON DELETE CASCADE;


--
-- Name: machine_line_assignments machine_line_assignments_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_line_assignments
    ADD CONSTRAINT machine_line_assignments_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: machine_pdr machine_pdr_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_pdr
    ADD CONSTRAINT machine_pdr_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: machine_pdr machine_pdr_pdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_pdr
    ADD CONSTRAINT machine_pdr_pdr_id_fkey FOREIGN KEY (pdr_id) REFERENCES public.pdr(id) ON DELETE CASCADE;


--
-- Name: machines machines_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.machine_families(id) ON DELETE SET NULL;


--
-- Name: maintenance_shifts maintenance_shifts_maintenancier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_shifts
    ADD CONSTRAINT maintenance_shifts_maintenancier_id_fkey FOREIGN KEY (maintenancier_id) REFERENCES auth.users(id);


--
-- Name: maintenance_shifts maintenance_shifts_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_shifts
    ADD CONSTRAINT maintenance_shifts_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES auth.users(id);


--
-- Name: maintenance_shifts maintenance_shifts_shift_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_shifts
    ADD CONSTRAINT maintenance_shifts_shift_team_id_fkey FOREIGN KEY (shift_team_id) REFERENCES public.shift_teams(id);


--
-- Name: of_mode_history of_mode_history_new_mode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.of_mode_history
    ADD CONSTRAINT of_mode_history_new_mode_id_fkey FOREIGN KEY (new_mode_id) REFERENCES public.shift_modes(id);


--
-- Name: of_mode_history of_mode_history_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.of_mode_history
    ADD CONSTRAINT of_mode_history_of_id_fkey FOREIGN KEY (of_id) REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE;


--
-- Name: of_mode_history of_mode_history_old_mode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.of_mode_history
    ADD CONSTRAINT of_mode_history_old_mode_id_fkey FOREIGN KEY (old_mode_id) REFERENCES public.shift_modes(id);


--
-- Name: of_shift_assignments of_shift_assignments_chef_ligne_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.of_shift_assignments
    ADD CONSTRAINT of_shift_assignments_chef_ligne_id_fkey FOREIGN KEY (chef_ligne_id) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: of_shift_assignments of_shift_assignments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.of_shift_assignments
    ADD CONSTRAINT of_shift_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: of_shift_assignments of_shift_assignments_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.of_shift_assignments
    ADD CONSTRAINT of_shift_assignments_of_id_fkey FOREIGN KEY (of_id) REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE;


--
-- Name: of_shift_assignments of_shift_assignments_shift_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.of_shift_assignments
    ADD CONSTRAINT of_shift_assignments_shift_team_id_fkey FOREIGN KEY (shift_team_id) REFERENCES public.shift_teams(id) ON DELETE RESTRICT;


--
-- Name: ordres_fabrication ordres_fabrication_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordres_fabrication
    ADD CONSTRAINT ordres_fabrication_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ordres_fabrication ordres_fabrication_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordres_fabrication
    ADD CONSTRAINT ordres_fabrication_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.production_lines(id) ON DELETE SET NULL;


--
-- Name: ordres_fabrication ordres_fabrication_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordres_fabrication
    ADD CONSTRAINT ordres_fabrication_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: ordres_fabrication ordres_fabrication_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordres_fabrication
    ADD CONSTRAINT ordres_fabrication_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL;


--
-- Name: ordres_fabrication ordres_fabrication_shift_mode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordres_fabrication
    ADD CONSTRAINT ordres_fabrication_shift_mode_id_fkey FOREIGN KEY (shift_mode_id) REFERENCES public.shift_modes(id);


--
-- Name: organes organes_equipement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organes
    ADD CONSTRAINT organes_equipement_id_fkey FOREIGN KEY (equipement_id) REFERENCES public.equipements(id) ON DELETE CASCADE;


--
-- Name: organes organes_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organes
    ADD CONSTRAINT organes_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: pdr_entity_links pdr_entity_links_pdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_entity_links
    ADD CONSTRAINT pdr_entity_links_pdr_id_fkey FOREIGN KEY (pdr_id) REFERENCES public.pdr(id) ON DELETE CASCADE;


--
-- Name: pdr_equivalences pdr_equivalences_equivalent_pdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_equivalences
    ADD CONSTRAINT pdr_equivalences_equivalent_pdr_id_fkey FOREIGN KEY (equivalent_pdr_id) REFERENCES public.pdr(id) ON DELETE SET NULL;


--
-- Name: pdr_equivalences pdr_equivalences_pdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_equivalences
    ADD CONSTRAINT pdr_equivalences_pdr_id_fkey FOREIGN KEY (pdr_id) REFERENCES public.pdr(id) ON DELETE CASCADE;


--
-- Name: pdr_families pdr_families_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_families
    ADD CONSTRAINT pdr_families_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.pdr_families(id);


--
-- Name: pdr pdr_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr
    ADD CONSTRAINT pdr_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.pdr_families(id);


--
-- Name: pdr_family_suppliers pdr_family_suppliers_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_family_suppliers
    ADD CONSTRAINT pdr_family_suppliers_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.pdr_families(id) ON DELETE CASCADE;


--
-- Name: pdr_install_positions pdr_install_positions_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_install_positions
    ADD CONSTRAINT pdr_install_positions_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.pdr_entity_links(id) ON DELETE CASCADE;


--
-- Name: pdr_instances pdr_instances_equipement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_instances
    ADD CONSTRAINT pdr_instances_equipement_id_fkey FOREIGN KEY (equipement_id) REFERENCES public.equipements(id) ON DELETE SET NULL;


--
-- Name: pdr_instances pdr_instances_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_instances
    ADD CONSTRAINT pdr_instances_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;


--
-- Name: pdr_instances pdr_instances_organe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_instances
    ADD CONSTRAINT pdr_instances_organe_id_fkey FOREIGN KEY (organe_id) REFERENCES public.organes(id) ON DELETE SET NULL;


--
-- Name: pdr_instances pdr_instances_pdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_instances
    ADD CONSTRAINT pdr_instances_pdr_id_fkey FOREIGN KEY (pdr_id) REFERENCES public.pdr(id) ON DELETE CASCADE;


--
-- Name: pdr_instances pdr_instances_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_instances
    ADD CONSTRAINT pdr_instances_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.pdr_install_positions(id) ON DELETE SET NULL;


--
-- Name: pdr_stock_movements pdr_stock_movements_pdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_stock_movements
    ADD CONSTRAINT pdr_stock_movements_pdr_id_fkey FOREIGN KEY (pdr_id) REFERENCES public.pdr(id) ON DELETE CASCADE;


--
-- Name: pdr_suppliers pdr_suppliers_pdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdr_suppliers
    ADD CONSTRAINT pdr_suppliers_pdr_id_fkey FOREIGN KEY (pdr_id) REFERENCES public.pdr(id) ON DELETE CASCADE;


--
-- Name: preventive_executions preventive_executions_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_executions
    ADD CONSTRAINT preventive_executions_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: preventive_executions preventive_executions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_executions
    ADD CONSTRAINT preventive_executions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.preventive_plans(id) ON DELETE CASCADE;


--
-- Name: preventive_plan_assignees preventive_plan_assignees_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plan_assignees
    ADD CONSTRAINT preventive_plan_assignees_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.preventive_plans(id) ON DELETE CASCADE;


--
-- Name: preventive_plan_pdr preventive_plan_pdr_pdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plan_pdr
    ADD CONSTRAINT preventive_plan_pdr_pdr_id_fkey FOREIGN KEY (pdr_id) REFERENCES public.pdr(id) ON DELETE CASCADE;


--
-- Name: preventive_plan_pdr preventive_plan_pdr_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plan_pdr
    ADD CONSTRAINT preventive_plan_pdr_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.preventive_plans(id) ON DELETE CASCADE;


--
-- Name: preventive_plans preventive_plans_equipement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plans
    ADD CONSTRAINT preventive_plans_equipement_id_fkey FOREIGN KEY (equipement_id) REFERENCES public.equipements(id) ON DELETE SET NULL;


--
-- Name: preventive_plans preventive_plans_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plans
    ADD CONSTRAINT preventive_plans_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.production_lines(id) ON DELETE SET NULL;


--
-- Name: preventive_plans preventive_plans_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plans
    ADD CONSTRAINT preventive_plans_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: preventive_plans preventive_plans_organe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plans
    ADD CONSTRAINT preventive_plans_organe_id_fkey FOREIGN KEY (organe_id) REFERENCES public.organes(id) ON DELETE SET NULL;


--
-- Name: preventive_plans preventive_plans_source_pdr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_plans
    ADD CONSTRAINT preventive_plans_source_pdr_id_fkey FOREIGN KEY (source_pdr_id) REFERENCES public.pdr(id) ON DELETE SET NULL;


--
-- Name: product_families product_families_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_families
    ADD CONSTRAINT product_families_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.product_families(id);


--
-- Name: production_declarations production_declarations_declared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_declarations
    ADD CONSTRAINT production_declarations_declared_by_fkey FOREIGN KEY (declared_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: production_declarations production_declarations_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_declarations
    ADD CONSTRAINT production_declarations_of_id_fkey FOREIGN KEY (of_id) REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE;


--
-- Name: production_declarations production_declarations_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_declarations
    ADD CONSTRAINT production_declarations_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;


--
-- Name: production_lines production_lines_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lines
    ADD CONSTRAINT production_lines_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;


--
-- Name: production_stops production_stops_declared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stops
    ADD CONSTRAINT production_stops_declared_by_fkey FOREIGN KEY (declared_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: production_stops production_stops_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stops
    ADD CONSTRAINT production_stops_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.production_lines(id) ON DELETE SET NULL;


--
-- Name: production_stops production_stops_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stops
    ADD CONSTRAINT production_stops_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;


--
-- Name: production_stops production_stops_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stops
    ADD CONSTRAINT production_stops_of_id_fkey FOREIGN KEY (of_id) REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE;


--
-- Name: production_stops production_stops_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stops
    ADD CONSTRAINT production_stops_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;


--
-- Name: production_stops production_stops_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stops
    ADD CONSTRAINT production_stops_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;


--
-- Name: products products_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.product_families(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quality_checks quality_checks_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.quality_indicators(id) ON DELETE RESTRICT;


--
-- Name: quality_checks quality_checks_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_of_id_fkey FOREIGN KEY (of_id) REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE;


--
-- Name: quality_checks quality_checks_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: quality_checks quality_checks_production_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_production_line_id_fkey FOREIGN KEY (production_line_id) REFERENCES public.production_lines(id) ON DELETE SET NULL;


--
-- Name: quality_checks quality_checks_quality_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_quality_shift_id_fkey FOREIGN KEY (quality_shift_id) REFERENCES public.quality_shifts(id);


--
-- Name: quality_checks quality_checks_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;


--
-- Name: quality_checks quality_checks_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.shift_teams(id) ON DELETE SET NULL;


--
-- Name: quality_control_point_lines quality_control_point_lines_control_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_control_point_lines
    ADD CONSTRAINT quality_control_point_lines_control_point_id_fkey FOREIGN KEY (control_point_id) REFERENCES public.quality_control_points(id) ON DELETE CASCADE;


--
-- Name: quality_control_point_lines quality_control_point_lines_production_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_control_point_lines
    ADD CONSTRAINT quality_control_point_lines_production_line_id_fkey FOREIGN KEY (production_line_id) REFERENCES public.production_lines(id) ON DELETE CASCADE;


--
-- Name: quality_control_point_ofs quality_control_point_ofs_control_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_control_point_ofs
    ADD CONSTRAINT quality_control_point_ofs_control_point_id_fkey FOREIGN KEY (control_point_id) REFERENCES public.quality_control_points(id) ON DELETE CASCADE;


--
-- Name: quality_control_point_ofs quality_control_point_ofs_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_control_point_ofs
    ADD CONSTRAINT quality_control_point_ofs_of_id_fkey FOREIGN KEY (of_id) REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE;


--
-- Name: quality_indicator_assignments quality_indicator_assignments_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_indicator_assignments
    ADD CONSTRAINT quality_indicator_assignments_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.quality_indicators(id) ON DELETE CASCADE;


--
-- Name: quality_indicator_assignments quality_indicator_assignments_product_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_indicator_assignments
    ADD CONSTRAINT quality_indicator_assignments_product_family_id_fkey FOREIGN KEY (product_family_id) REFERENCES public.product_families(id) ON DELETE CASCADE;


--
-- Name: quality_indicator_assignments quality_indicator_assignments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_indicator_assignments
    ADD CONSTRAINT quality_indicator_assignments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: quality_indicator_assignments quality_indicator_assignments_production_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_indicator_assignments
    ADD CONSTRAINT quality_indicator_assignments_production_line_id_fkey FOREIGN KEY (production_line_id) REFERENCES public.production_lines(id) ON DELETE CASCADE;


--
-- Name: quality_indicator_assignments quality_indicator_assignments_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_indicator_assignments
    ADD CONSTRAINT quality_indicator_assignments_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: quality_non_conformities quality_non_conformities_quality_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_non_conformities
    ADD CONSTRAINT quality_non_conformities_quality_shift_id_fkey FOREIGN KEY (quality_shift_id) REFERENCES public.quality_shifts(id);


--
-- Name: quality_shift_assignments quality_shift_assignments_controller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_assignments
    ADD CONSTRAINT quality_shift_assignments_controller_id_fkey FOREIGN KEY (controller_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quality_shift_assignments quality_shift_assignments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_assignments
    ADD CONSTRAINT quality_shift_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: quality_shift_assignments quality_shift_assignments_shift_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_assignments
    ADD CONSTRAINT quality_shift_assignments_shift_team_id_fkey FOREIGN KEY (shift_team_id) REFERENCES public.shift_teams(id) ON DELETE SET NULL;


--
-- Name: quality_shift_lines quality_shift_lines_production_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_lines
    ADD CONSTRAINT quality_shift_lines_production_line_id_fkey FOREIGN KEY (production_line_id) REFERENCES public.production_lines(id) ON DELETE CASCADE;


--
-- Name: quality_shift_lines quality_shift_lines_quality_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_lines
    ADD CONSTRAINT quality_shift_lines_quality_shift_id_fkey FOREIGN KEY (quality_shift_id) REFERENCES public.quality_shifts(id) ON DELETE CASCADE;


--
-- Name: quality_shift_production_links quality_shift_production_links_production_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_production_links
    ADD CONSTRAINT quality_shift_production_links_production_shift_id_fkey FOREIGN KEY (production_shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;


--
-- Name: quality_shift_production_links quality_shift_production_links_quality_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shift_production_links
    ADD CONSTRAINT quality_shift_production_links_quality_shift_id_fkey FOREIGN KEY (quality_shift_id) REFERENCES public.quality_shifts(id) ON DELETE CASCADE;


--
-- Name: quality_shifts quality_shifts_controller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shifts
    ADD CONSTRAINT quality_shifts_controller_id_fkey FOREIGN KEY (controller_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quality_shifts quality_shifts_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shifts
    ADD CONSTRAINT quality_shifts_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES auth.users(id);


--
-- Name: quality_shifts quality_shifts_shift_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_shifts
    ADD CONSTRAINT quality_shifts_shift_team_id_fkey FOREIGN KEY (shift_team_id) REFERENCES public.shift_teams(id);


--
-- Name: recipe_lines recipe_lines_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_lines
    ADD CONSTRAINT recipe_lines_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE SET NULL;


--
-- Name: recipe_lines recipe_lines_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_lines
    ADD CONSTRAINT recipe_lines_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: recipe_steps recipe_steps_quality_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT recipe_steps_quality_indicator_id_fkey FOREIGN KEY (quality_indicator_id) REFERENCES public.quality_indicators(id) ON DELETE SET NULL;


--
-- Name: recipe_steps recipe_steps_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT recipe_steps_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: recipes recipes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: shift_mode_slots shift_mode_slots_shift_mode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_mode_slots
    ADD CONSTRAINT shift_mode_slots_shift_mode_id_fkey FOREIGN KEY (shift_mode_id) REFERENCES public.shift_modes(id) ON DELETE CASCADE;


--
-- Name: shift_team_members shift_team_members_shift_mode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_team_members
    ADD CONSTRAINT shift_team_members_shift_mode_id_fkey FOREIGN KEY (shift_mode_id) REFERENCES public.shift_modes(id) ON DELETE SET NULL;


--
-- Name: shift_team_members shift_team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_team_members
    ADD CONSTRAINT shift_team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.shift_teams(id) ON DELETE CASCADE;


--
-- Name: shift_team_members shift_team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_team_members
    ADD CONSTRAINT shift_team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: shift_templates shift_templates_shift_mode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_templates
    ADD CONSTRAINT shift_templates_shift_mode_id_fkey FOREIGN KEY (shift_mode_id) REFERENCES public.shift_modes(id) ON DELETE SET NULL;


--
-- Name: shifts shifts_chef_ligne_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_chef_ligne_id_fkey FOREIGN KEY (chef_ligne_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: shifts shifts_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.production_lines(id) ON DELETE SET NULL;


--
-- Name: shifts shifts_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_of_id_fkey FOREIGN KEY (of_id) REFERENCES public.ordres_fabrication(id) ON DELETE CASCADE;


--
-- Name: shifts shifts_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES auth.users(id);


--
-- Name: shifts shifts_shift_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_shift_team_id_fkey FOREIGN KEY (shift_team_id) REFERENCES public.shift_teams(id);


--
-- Name: tickets tickets_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_declarant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_declarant_id_fkey FOREIGN KEY (declarant_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_equipement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_equipement_id_fkey FOREIGN KEY (equipement_id) REFERENCES public.equipements(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_ligne_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ligne_id_fkey FOREIGN KEY (ligne_id) REFERENCES public.production_lines(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_of_id_fkey FOREIGN KEY (of_id) REFERENCES public.ordres_fabrication(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_organe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_organe_id_fkey FOREIGN KEY (organe_id) REFERENCES public.organes(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_panne_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_panne_type_id_fkey FOREIGN KEY (panne_type_id) REFERENCES public.panne_types(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: validation_requests validation_requests_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_requests
    ADD CONSTRAINT validation_requests_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.validation_rules(id) ON DELETE SET NULL;


--
-- Name: ordres_fabrication Admin can delete OFs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete OFs" ON public.ordres_fabrication FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shift_mode_slots Admin can manage mode slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage mode slots" ON public.shift_mode_slots TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: shift_settings Admin can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage settings" ON public.shift_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shift_modes Admin can manage shift modes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage shift modes" ON public.shift_modes TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: pdr_families Admin/maintenance/magasin can manage pdr_families; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/maintenance/magasin can manage pdr_families" ON public.pdr_families TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role)));


--
-- Name: pdr_family_suppliers Admin/maintenance/magasin can manage pdr_family_suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/maintenance/magasin can manage pdr_family_suppliers" ON public.pdr_family_suppliers TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role)));


--
-- Name: pdr_suppliers Admin/maintenance/magasin can manage pdr_suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/maintenance/magasin can manage pdr_suppliers" ON public.pdr_suppliers TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role)));


--
-- Name: entity_documents Admin/maintenance/production can delete entity documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/maintenance/production can delete entity documents" ON public.entity_documents FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR (uploaded_by = auth.uid())));


--
-- Name: entity_images Admin/maintenance/production can delete entity images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/maintenance/production can delete entity images" ON public.entity_images FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR (uploaded_by = auth.uid())));


--
-- Name: entity_documents Admin/maintenance/production can update entity documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/maintenance/production can update entity documents" ON public.entity_documents FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR (uploaded_by = auth.uid())));


--
-- Name: entity_images Admin/maintenance/production can update entity images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/maintenance/production can update entity images" ON public.entity_images FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR (uploaded_by = auth.uid())));


--
-- Name: line_products Admin/prod can manage line products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/prod can manage line products" ON public.line_products TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: production_lines Admin/prod can manage lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/prod can manage lines" ON public.production_lines TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: packaging_levels Admin/prod can manage packaging levels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/prod can manage packaging levels" ON public.packaging_levels TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: product_families Admin/prod can manage product families; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/prod can manage product families" ON public.product_families TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: products Admin/prod can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/prod can manage products" ON public.products TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: recipe_lines Admin/prod can manage recipe lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/prod can manage recipe lines" ON public.recipe_lines TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: recipes Admin/prod can manage recipes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/prod can manage recipes" ON public.recipes TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: shift_teams Admin/prod can manage shift teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/prod can manage shift teams" ON public.shift_teams TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: articles Admin/prod/magasin can manage articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/prod/magasin can manage articles" ON public.articles TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role)));


--
-- Name: scan_history Admins and SI view all scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and SI view all scans" ON public.scan_history FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role)));


--
-- Name: pdr_equivalences Admins can delete equivalences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete equivalences" ON public.pdr_equivalences FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tickets Admins can delete tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete tickets" ON public.tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_settings Admins can manage app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage app settings" ON public.app_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: document_categories Admins can manage document categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage document categories" ON public.document_categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: document_permissions Admins can manage document_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage document_permissions" ON public.document_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: machine_families Admins can manage families; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage families" ON public.machine_families TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: panne_types Admins can manage panne types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage panne types" ON public.panne_types TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: pdr_stock_permissions Admins can manage pdr_stock_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage pdr_stock_permissions" ON public.pdr_stock_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: role_permissions Admins can manage role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage role_permissions" ON public.role_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: document_audit_logs Admins can view document audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view document audit logs" ON public.document_audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_settings App settings viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "App settings viewable by authenticated" ON public.app_settings FOR SELECT TO authenticated USING (true);


--
-- Name: articles Articles viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Articles viewable by authenticated" ON public.articles FOR SELECT TO authenticated USING (true);


--
-- Name: audit_logs Audit logs viewable by authorized roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Audit logs viewable by authorized roles" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_audit_access(auth.uid(), COALESCE(module, 'system'::text)));


--
-- Name: tickets Authenticated can create tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK ((auth.uid() = declarant_id));


--
-- Name: audit_logs Authenticated can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: document_audit_logs Authenticated can insert document audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert document audit logs" ON public.document_audit_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: entity_documents Authenticated can insert entity documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert entity documents" ON public.entity_documents FOR INSERT TO authenticated WITH CHECK ((auth.uid() = uploaded_by));


--
-- Name: entity_images Authenticated can insert entity images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert entity images" ON public.entity_images FOR INSERT TO authenticated WITH CHECK ((auth.uid() = uploaded_by));


--
-- Name: pdr_stock_movements Authenticated can insert stock movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert stock movements" ON public.pdr_stock_movements FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: tickets Authorized users can update tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (((auth.uid() = declarant_id) OR (auth.uid() = assignee_id) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role)));


--
-- Name: bom_items BOM items manageable by qualified roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "BOM items manageable by qualified roles" ON public.bom_items TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role)));


--
-- Name: bom_items BOM items viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "BOM items viewable by authenticated" ON public.bom_items FOR SELECT TO authenticated USING (true);


--
-- Name: bill_of_materials BOM manageable by qualified roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "BOM manageable by qualified roles" ON public.bill_of_materials TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role)));


--
-- Name: bill_of_materials BOM viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "BOM viewable by authenticated" ON public.bill_of_materials FOR SELECT TO authenticated USING (true);


--
-- Name: consumptions Consumptions viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Consumptions viewable by authenticated" ON public.consumptions FOR SELECT TO authenticated USING (true);


--
-- Name: production_declarations Declarations viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Declarations viewable by authenticated" ON public.production_declarations FOR SELECT TO authenticated USING (true);


--
-- Name: ticket_collaborators Delete ticket collaborators by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delete ticket collaborators by admin" ON public.ticket_collaborators FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: document_categories Document categories viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Document categories viewable by authenticated" ON public.document_categories FOR SELECT TO authenticated USING (true);


--
-- Name: document_permissions Document permissions viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Document permissions viewable by authenticated" ON public.document_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: machine_documents Documents viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Documents viewable by authenticated" ON public.machine_documents FOR SELECT TO authenticated USING (true);


--
-- Name: notification_email_log Email log: admins and SI can view all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Email log: admins and SI can view all" ON public.notification_email_log FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role) OR (recipient_user_id = auth.uid())));


--
-- Name: notification_email_log Email log: admins can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Email log: admins can update" ON public.notification_email_log FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notification_email_log Email log: authenticated can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Email log: authenticated can insert" ON public.notification_email_log FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: entity_documents Entity documents viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Entity documents viewable by authenticated" ON public.entity_documents FOR SELECT TO authenticated USING (true);


--
-- Name: entity_images Entity images viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Entity images viewable by authenticated" ON public.entity_images FOR SELECT TO authenticated USING (true);


--
-- Name: equipements Equipements viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Equipements viewable by authenticated" ON public.equipements FOR SELECT TO authenticated USING (true);


--
-- Name: machine_families Families viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Families viewable by authenticated" ON public.machine_families FOR SELECT TO authenticated USING (true);


--
-- Name: intervention_pdr Intervention PDR viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Intervention PDR viewable by authenticated" ON public.intervention_pdr FOR SELECT TO authenticated USING (true);


--
-- Name: interventions Interventions viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Interventions viewable by authenticated" ON public.interventions FOR SELECT TO authenticated USING (true);


--
-- Name: line_products Line products viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Line products viewable by authenticated" ON public.line_products FOR SELECT TO authenticated USING (true);


--
-- Name: production_lines Lines viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lines viewable by authenticated" ON public.production_lines FOR SELECT TO authenticated USING (true);


--
-- Name: machine_pdr Machine PDR viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Machine PDR viewable by authenticated" ON public.machine_pdr FOR SELECT TO authenticated USING (true);


--
-- Name: machine_line_assignments Machine line assignments viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Machine line assignments viewable by authenticated" ON public.machine_line_assignments FOR SELECT TO authenticated USING (true);


--
-- Name: machines Machines viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Machines viewable by authenticated" ON public.machines FOR SELECT TO authenticated USING (true);


--
-- Name: machine_documents Maintenance can manage documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage documents" ON public.machine_documents TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: equipements Maintenance can manage equipements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage equipements" ON public.equipements TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: intervention_pdr Maintenance can manage intervention PDR; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage intervention PDR" ON public.intervention_pdr TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role)));


--
-- Name: interventions Maintenance can manage interventions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage interventions" ON public.interventions TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role)));


--
-- Name: machine_pdr Maintenance can manage machine PDR; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage machine PDR" ON public.machine_pdr TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: machine_line_assignments Maintenance can manage machine line assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage machine line assignments" ON public.machine_line_assignments TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: machines Maintenance can manage machines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage machines" ON public.machines TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: organes Maintenance can manage organes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage organes" ON public.organes TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: pdr_install_positions Maintenance can manage pdr positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage pdr positions" ON public.pdr_install_positions TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role)));


--
-- Name: pdr_entity_links Maintenance can manage pdr_entity_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage pdr_entity_links" ON public.pdr_entity_links TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role)));


--
-- Name: pdr_instances Maintenance can manage pdr_instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage pdr_instances" ON public.pdr_instances TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role)));


--
-- Name: preventive_plan_pdr Maintenance can manage plan PDR; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage plan PDR" ON public.preventive_plan_pdr TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role)));


--
-- Name: preventive_plan_assignees Maintenance can manage plan assignees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage plan assignees" ON public.preventive_plan_assignees TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: preventive_executions Maintenance can manage preventive executions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage preventive executions" ON public.preventive_executions TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role)));


--
-- Name: preventive_plans Maintenance can manage preventive plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance can manage preventive plans" ON public.preventive_plans TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role)));


--
-- Name: maintenance_shifts Maintenance shifts created by managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance shifts created by managers" ON public.maintenance_shifts FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: maintenance_shifts Maintenance shifts deletable by managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance shifts deletable by managers" ON public.maintenance_shifts FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: maintenance_shifts Maintenance shifts updatable by owner or managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance shifts updatable by owner or managers" ON public.maintenance_shifts FOR UPDATE USING (((auth.uid() = maintenancier_id) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role)));


--
-- Name: maintenance_shifts Maintenance shifts viewable by owner or managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance shifts viewable by owner or managers" ON public.maintenance_shifts FOR SELECT USING (((auth.uid() = maintenancier_id) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'auditeur'::public.app_role)));


--
-- Name: pdr Maintenance/magasin can manage PDR; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance/magasin can manage PDR" ON public.pdr TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role)));


--
-- Name: pdr_equivalences Maintenance/magasin/bureau can insert equivalences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Maintenance/magasin/bureau can insert equivalences" ON public.pdr_equivalences FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'maintenancier'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role)));


--
-- Name: ticket_collaborators Manage ticket collaborators by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Manage ticket collaborators by authorized" ON public.ticket_collaborators FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.tickets t
  WHERE ((t.id = ticket_collaborators.ticket_id) AND (t.assignee_id = auth.uid()))))));


--
-- Name: of_mode_history Mode history viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mode history viewable by authenticated" ON public.of_mode_history FOR SELECT TO authenticated USING (true);


--
-- Name: shift_mode_slots Mode slots viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mode slots viewable by authenticated" ON public.shift_mode_slots FOR SELECT TO authenticated USING (true);


--
-- Name: quality_non_conformities NC delete by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "NC delete by admin" ON public.quality_non_conformities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quality_non_conformities NC insert by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "NC insert by authorized" ON public.quality_non_conformities FOR INSERT TO authenticated WITH CHECK (((declared_by = auth.uid()) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role))));


--
-- Name: quality_non_conformities NC update by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "NC update by authorized" ON public.quality_non_conformities FOR UPDATE TO authenticated USING (((declared_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role)));


--
-- Name: quality_non_conformities NC viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "NC viewable by authenticated" ON public.quality_non_conformities FOR SELECT TO authenticated USING (true);


--
-- Name: notification_rules Notif rules: manage by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notif rules: manage by authorized" ON public.notification_rules TO authenticated USING (public.can_manage_notification_rule(auth.uid(), module)) WITH CHECK (public.can_manage_notification_rule(auth.uid(), module));


--
-- Name: notification_rules Notif rules: select authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notif rules: select authenticated" ON public.notification_rules FOR SELECT TO authenticated USING (true);


--
-- Name: notifications Notifications: delete by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications: delete by admin" ON public.notifications FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Notifications: insert by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications: insert by authenticated" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: notifications Notifications: select own or by role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications: select own or by role" ON public.notifications FOR SELECT TO authenticated USING (((recipient_user_id = auth.uid()) OR ((recipient_role IS NOT NULL) AND public.user_has_role_text(auth.uid(), recipient_role)) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role)));


--
-- Name: notifications Notifications: update own or admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications: update own or admin" ON public.notifications FOR UPDATE TO authenticated USING (((recipient_user_id = auth.uid()) OR ((recipient_role IS NOT NULL) AND public.user_has_role_text(auth.uid(), recipient_role)) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: ordres_fabrication OFs viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OFs viewable by authenticated" ON public.ordres_fabrication FOR SELECT TO authenticated USING (true);


--
-- Name: organes Organes viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organes viewable by authenticated" ON public.organes FOR SELECT TO authenticated USING (true);


--
-- Name: pdr_equivalences PDR equivalences viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "PDR equivalences viewable by authenticated" ON public.pdr_equivalences FOR SELECT TO authenticated USING (true);


--
-- Name: pdr_families PDR families viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "PDR families viewable by authenticated" ON public.pdr_families FOR SELECT TO authenticated USING (true);


--
-- Name: pdr_family_suppliers PDR family suppliers viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "PDR family suppliers viewable by authenticated" ON public.pdr_family_suppliers FOR SELECT TO authenticated USING (true);


--
-- Name: pdr_instances PDR instances viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "PDR instances viewable by authenticated" ON public.pdr_instances FOR SELECT TO authenticated USING (true);


--
-- Name: pdr_entity_links PDR links viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "PDR links viewable by authenticated" ON public.pdr_entity_links FOR SELECT TO authenticated USING (true);


--
-- Name: pdr_install_positions PDR positions viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "PDR positions viewable by authenticated" ON public.pdr_install_positions FOR SELECT TO authenticated USING (true);


--
-- Name: pdr_stock_permissions PDR stock permissions viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "PDR stock permissions viewable by authenticated" ON public.pdr_stock_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: pdr_suppliers PDR suppliers viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "PDR suppliers viewable by authenticated" ON public.pdr_suppliers FOR SELECT TO authenticated USING (true);


--
-- Name: pdr PDR viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "PDR viewable by authenticated" ON public.pdr FOR SELECT TO authenticated USING (true);


--
-- Name: packaging_levels Packaging levels viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Packaging levels viewable by authenticated" ON public.packaging_levels FOR SELECT TO authenticated USING (true);


--
-- Name: panne_types Panne types viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Panne types viewable by authenticated" ON public.panne_types FOR SELECT TO authenticated USING (true);


--
-- Name: preventive_plan_pdr Plan PDR viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Plan PDR viewable by authenticated" ON public.preventive_plan_pdr FOR SELECT TO authenticated USING (true);


--
-- Name: preventive_plan_assignees Plan assignees viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Plan assignees viewable by authenticated" ON public.preventive_plan_assignees FOR SELECT TO authenticated USING (true);


--
-- Name: user_notification_preferences Prefs: delete own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prefs: delete own" ON public.user_notification_preferences FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_notification_preferences Prefs: insert own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prefs: insert own" ON public.user_notification_preferences FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_notification_preferences Prefs: select own or admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prefs: select own or admin" ON public.user_notification_preferences FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_notification_preferences Prefs: update own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prefs: update own" ON public.user_notification_preferences FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: preventive_executions Preventive executions viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Preventive executions viewable by authenticated" ON public.preventive_executions FOR SELECT TO authenticated USING (true);


--
-- Name: preventive_plans Preventive plans viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Preventive plans viewable by authenticated" ON public.preventive_plans FOR SELECT TO authenticated USING (true);


--
-- Name: ordres_fabrication Prod can create OFs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prod can create OFs" ON public.ordres_fabrication FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role)));


--
-- Name: of_mode_history Prod can insert mode history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prod can insert mode history" ON public.of_mode_history FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role)));


--
-- Name: consumptions Prod can manage consumptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prod can manage consumptions" ON public.consumptions FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role) OR public.has_role(auth.uid(), 'operateur'::public.app_role)));


--
-- Name: production_declarations Prod can manage declarations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prod can manage declarations" ON public.production_declarations FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role) OR public.has_role(auth.uid(), 'operateur'::public.app_role)));


--
-- Name: shifts Prod can manage shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prod can manage shifts" ON public.shifts TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role)));


--
-- Name: production_stops Prod can manage stops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prod can manage stops" ON public.production_stops TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role)));


--
-- Name: ordres_fabrication Prod can update OFs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prod can update OFs" ON public.ordres_fabrication FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role)));


--
-- Name: consumptions Prod can update consumptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prod can update consumptions" ON public.consumptions FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role)));


--
-- Name: production_declarations Prod can update declarations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prod can update declarations" ON public.production_declarations FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role)));


--
-- Name: product_families Product families viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Product families viewable by authenticated" ON public.product_families FOR SELECT TO authenticated USING (true);


--
-- Name: products Products viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Products viewable by authenticated" ON public.products FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Profiles viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: quality_actions QA delete by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QA delete by admin" ON public.quality_actions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quality_actions QA insert by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QA insert by authorized" ON public.quality_actions FOR INSERT TO authenticated WITH CHECK (((auth.uid() = created_by) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role))));


--
-- Name: quality_actions QA update by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QA update by authorized" ON public.quality_actions FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role) OR (responsible_user_id = auth.uid()) OR (created_by = auth.uid())));


--
-- Name: quality_actions QA viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QA viewable by authenticated" ON public.quality_actions FOR SELECT TO authenticated USING (true);


--
-- Name: quality_checks QC delete by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QC delete by admin" ON public.quality_checks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quality_checks QC insert by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QC insert by authorized" ON public.quality_checks FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role) OR public.has_role(auth.uid(), 'operateur'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role)));


--
-- Name: quality_checks QC update by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QC update by authorized" ON public.quality_checks FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role) OR (controlled_by = auth.uid())));


--
-- Name: quality_checks QC viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QC viewable by authenticated" ON public.quality_checks FOR SELECT TO authenticated USING (true);


--
-- Name: quality_indicator_assignments QIA manage by admin/bureau/prod/magasin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QIA manage by admin/bureau/prod/magasin" ON public.quality_indicator_assignments TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role)));


--
-- Name: quality_indicator_assignments QIA viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QIA viewable by authenticated" ON public.quality_indicator_assignments FOR SELECT TO authenticated USING (true);


--
-- Name: quality_indicators Quality indicators delete by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Quality indicators delete by admin" ON public.quality_indicators FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.check_permission(auth.uid(), 'qualite_indicateurs'::text, 'delete'::text)));


--
-- Name: quality_indicators Quality indicators insert by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Quality indicators insert by authorized" ON public.quality_indicators FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.check_permission(auth.uid(), 'qualite_indicateurs'::text, 'create'::text)));


--
-- Name: quality_indicators Quality indicators update by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Quality indicators update by authorized" ON public.quality_indicators FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.check_permission(auth.uid(), 'qualite_indicateurs'::text, 'edit'::text)));


--
-- Name: quality_indicators Quality indicators viewable by qualite module; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Quality indicators viewable by qualite module" ON public.quality_indicators FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.check_permission(auth.uid(), 'qualite'::text, 'view'::text) OR public.check_permission(auth.uid(), 'qualite_indicateurs'::text, 'view'::text)));


--
-- Name: recipe_lines Recipe lines viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recipe lines viewable by authenticated" ON public.recipe_lines FOR SELECT TO authenticated USING (true);


--
-- Name: recipes Recipes viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recipes viewable by authenticated" ON public.recipes FOR SELECT TO authenticated USING (true);


--
-- Name: user_roles Roles viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Roles viewable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);


--
-- Name: shift_settings Settings viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Settings viewable by authenticated" ON public.shift_settings FOR SELECT TO authenticated USING (true);


--
-- Name: shift_modes Shift modes viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shift modes viewable by authenticated" ON public.shift_modes FOR SELECT TO authenticated USING (true);


--
-- Name: shift_teams Shift teams viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shift teams viewable by authenticated" ON public.shift_teams FOR SELECT TO authenticated USING (true);


--
-- Name: shifts Shifts viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shifts viewable by authenticated" ON public.shifts FOR SELECT TO authenticated USING (true);


--
-- Name: pdr_stock_movements Stock movements viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Stock movements viewable by authenticated" ON public.pdr_stock_movements FOR SELECT TO authenticated USING (true);


--
-- Name: production_stops Stops viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Stops viewable by authenticated" ON public.production_stops FOR SELECT TO authenticated USING (true);


--
-- Name: ticket_collaborators Ticket collaborators viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Ticket collaborators viewable by authenticated" ON public.ticket_collaborators FOR SELECT TO authenticated USING (true);


--
-- Name: tickets Tickets viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tickets viewable by authenticated" ON public.tickets FOR SELECT TO authenticated USING (true);


--
-- Name: ticket_collaborators Update ticket collaborators by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Update ticket collaborators by authorized" ON public.ticket_collaborators FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.tickets t
  WHERE ((t.id = ticket_collaborators.ticket_id) AND (t.assignee_id = auth.uid()))))));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: scan_history Users insert their own scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert their own scans" ON public.scan_history FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: scan_history Users view their own scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view their own scans" ON public.scan_history FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: validation_requests VR delete: admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "VR delete: admin" ON public.validation_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: validation_requests VR insert: authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "VR insert: authenticated" ON public.validation_requests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = submitted_by_user_id));


--
-- Name: validation_requests VR select: stakeholders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "VR select: stakeholders" ON public.validation_requests FOR SELECT TO authenticated USING (((submitted_by_user_id = auth.uid()) OR (assigned_validator_user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role) OR public.has_role(auth.uid(), 'auditeur'::public.app_role) OR public.can_validate_request(auth.uid(), id)));


--
-- Name: validation_requests VR update: validators or owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "VR update: validators or owner" ON public.validation_requests FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role) OR public.can_validate_request(auth.uid(), id) OR (submitted_by_user_id = auth.uid())));


--
-- Name: pdr_equivalences Validation by admin/maintenance/bureau; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validation by admin/maintenance/bureau" ON public.pdr_equivalences FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_maintenance'::public.app_role) OR public.has_role(auth.uid(), 'gestionnaire_magasin'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role)));


--
-- Name: validation_permissions Validation permissions manageable by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validation permissions manageable by admin" ON public.validation_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: validation_permissions Validation permissions viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validation permissions viewable by authenticated" ON public.validation_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: validation_rules Validation rules manageable by authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validation rules manageable by authorized" ON public.validation_rules TO authenticated USING (public.can_manage_validation_rule(auth.uid(), module)) WITH CHECK (public.can_manage_validation_rule(auth.uid(), module));


--
-- Name: validation_rules Validation rules viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validation rules viewable by authenticated" ON public.validation_rules FOR SELECT TO authenticated USING (true);


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_role_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_role_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_role_settings audit_settings_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_settings_admin_all ON public.audit_role_settings TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role)));


--
-- Name: audit_role_settings audit_settings_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_settings_read_all ON public.audit_role_settings FOR SELECT TO authenticated USING (true);


--
-- Name: bill_of_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: bom_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;

--
-- Name: consumptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consumptions ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_roles custom_roles_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY custom_roles_admin_all ON public.custom_roles TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role)));


--
-- Name: custom_roles custom_roles_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY custom_roles_read_all ON public.custom_roles FOR SELECT TO authenticated USING (true);


--
-- Name: document_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: document_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: document_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: entity_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.entity_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: entity_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.entity_images ENABLE ROW LEVEL SECURITY;

--
-- Name: equipements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipements ENABLE ROW LEVEL SECURITY;

--
-- Name: intervention_pdr; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intervention_pdr ENABLE ROW LEVEL SECURITY;

--
-- Name: interventions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_assignments inv_as_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_as_manage ON public.inventory_assignments TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role)));


--
-- Name: inventory_assignments inv_as_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_as_self_read ON public.inventory_assignments FOR SELECT TO authenticated USING ((agent_id = auth.uid()));


--
-- Name: inventory_assignment_scopes inv_ass_scopes_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_ass_scopes_manage ON public.inventory_assignment_scopes TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role)));


--
-- Name: inventory_assignment_scopes inv_ass_scopes_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_ass_scopes_self_read ON public.inventory_assignment_scopes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.inventory_assignments a
  WHERE ((a.id = inventory_assignment_scopes.assignment_id) AND (a.agent_id = auth.uid())))));


--
-- Name: inventory_campaigns inv_camp_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_camp_manage ON public.inventory_campaigns TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role)));


--
-- Name: inventory_campaigns inv_camp_read_assigned; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_camp_read_assigned ON public.inventory_campaigns FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.inventory_assignments a
  WHERE ((a.campaign_id = inventory_campaigns.id) AND (a.agent_id = auth.uid())))));


--
-- Name: inventory_counts inv_counts_resp_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_counts_resp_read ON public.inventory_counts FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role)));


--
-- Name: inventory_counts inv_counts_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_counts_self_read ON public.inventory_counts FOR SELECT TO authenticated USING ((agent_id = auth.uid()));


--
-- Name: inventory_campaign_scopes inv_cs_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_cs_manage ON public.inventory_campaign_scopes TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role)));


--
-- Name: inventory_results inv_results_agent_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_results_agent_read ON public.inventory_results FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.inventory_assignments a
  WHERE ((a.campaign_id = inventory_results.campaign_id) AND (a.agent_id = auth.uid())))));


--
-- Name: inventory_results inv_results_resp_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_results_resp_read ON public.inventory_results FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role)));


--
-- Name: inventory_targets inv_targets_assigned_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_targets_assigned_read ON public.inventory_targets FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.inventory_assignments a
  WHERE ((a.campaign_id = inventory_targets.campaign_id) AND (a.agent_id = auth.uid())))));


--
-- Name: inventory_targets inv_targets_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_targets_manage ON public.inventory_targets TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_inventaire'::public.app_role)));


--
-- Name: inventory_assignment_scopes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_assignment_scopes ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_campaign_scopes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_campaign_scopes ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_counts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_results ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_targets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_targets ENABLE ROW LEVEL SECURITY;

--
-- Name: line_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.line_products ENABLE ROW LEVEL SECURITY;

--
-- Name: machine_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.machine_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: machine_families; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.machine_families ENABLE ROW LEVEL SECURITY;

--
-- Name: machine_line_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.machine_line_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: machine_pdr; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.machine_pdr ENABLE ROW LEVEL SECURITY;

--
-- Name: machines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

--
-- Name: maintenance_shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.maintenance_shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_email_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_email_log ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: of_mode_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.of_mode_history ENABLE ROW LEVEL SECURITY;

--
-- Name: of_shift_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.of_shift_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: of_shift_assignments of_shift_assignments_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY of_shift_assignments_manage ON public.of_shift_assignments TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.ordres_fabrication o
  WHERE ((o.id = of_shift_assignments.of_id) AND (o.created_by = auth.uid())))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.ordres_fabrication o
  WHERE ((o.id = of_shift_assignments.of_id) AND (o.created_by = auth.uid()))))));


--
-- Name: of_shift_assignments of_shift_assignments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY of_shift_assignments_select ON public.of_shift_assignments FOR SELECT TO authenticated USING (true);


--
-- Name: ordres_fabrication; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ordres_fabrication ENABLE ROW LEVEL SECURITY;

--
-- Name: organes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organes ENABLE ROW LEVEL SECURITY;

--
-- Name: packaging_levels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.packaging_levels ENABLE ROW LEVEL SECURITY;

--
-- Name: panne_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.panne_types ENABLE ROW LEVEL SECURITY;

--
-- Name: pdr; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdr ENABLE ROW LEVEL SECURITY;

--
-- Name: pdr_entity_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdr_entity_links ENABLE ROW LEVEL SECURITY;

--
-- Name: pdr_equivalences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdr_equivalences ENABLE ROW LEVEL SECURITY;

--
-- Name: pdr_families; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdr_families ENABLE ROW LEVEL SECURITY;

--
-- Name: pdr_family_suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdr_family_suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: pdr_install_positions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdr_install_positions ENABLE ROW LEVEL SECURITY;

--
-- Name: pdr_instances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdr_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: pdr_stock_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdr_stock_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: pdr_stock_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdr_stock_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: pdr_suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pdr_suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: preventive_executions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preventive_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: preventive_plan_assignees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preventive_plan_assignees ENABLE ROW LEVEL SECURITY;

--
-- Name: preventive_plan_pdr; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preventive_plan_pdr ENABLE ROW LEVEL SECURITY;

--
-- Name: preventive_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preventive_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: product_families; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;

--
-- Name: production_declarations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.production_declarations ENABLE ROW LEVEL SECURITY;

--
-- Name: production_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: production_stops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.production_stops ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_control_point_lines qcpl_mutate_admin_or_qa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qcpl_mutate_admin_or_qa ON public.quality_control_point_lines TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role) OR public.has_quality_permission(auth.uid(), 'manage_assignments'::text))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role) OR public.has_quality_permission(auth.uid(), 'manage_assignments'::text)));


--
-- Name: quality_control_point_lines qcpl_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qcpl_select_authenticated ON public.quality_control_point_lines FOR SELECT TO authenticated USING (true);


--
-- Name: quality_control_point_ofs qcpo_mutate_admin_or_qa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qcpo_mutate_admin_or_qa ON public.quality_control_point_ofs TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role) OR public.has_quality_permission(auth.uid(), 'manage_assignments'::text))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role) OR public.has_quality_permission(auth.uid(), 'manage_assignments'::text)));


--
-- Name: quality_control_point_ofs qcpo_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qcpo_select_authenticated ON public.quality_control_point_ofs FOR SELECT TO authenticated USING (true);


--
-- Name: quality_shift_assignments qsa_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qsa_manage ON public.quality_shift_assignments TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role)));


--
-- Name: quality_shift_assignments qsa_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qsa_select ON public.quality_shift_assignments FOR SELECT TO authenticated USING (true);


--
-- Name: quality_shift_lines qshift_lines_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qshift_lines_modify ON public.quality_shift_lines TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.quality_shifts qs
  WHERE ((qs.id = quality_shift_lines.quality_shift_id) AND ((qs.controller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.quality_shifts qs
  WHERE ((qs.id = quality_shift_lines.quality_shift_id) AND ((qs.controller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role))))));


--
-- Name: quality_shift_lines qshift_lines_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qshift_lines_select ON public.quality_shift_lines FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.quality_shifts qs
  WHERE (qs.id = quality_shift_lines.quality_shift_id))));


--
-- Name: quality_shift_production_links qshift_links_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qshift_links_modify ON public.quality_shift_production_links TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.quality_shifts qs
  WHERE ((qs.id = quality_shift_production_links.quality_shift_id) AND ((qs.controller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.quality_shifts qs
  WHERE ((qs.id = quality_shift_production_links.quality_shift_id) AND ((qs.controller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role))))));


--
-- Name: quality_shift_production_links qshift_links_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qshift_links_select ON public.quality_shift_production_links FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.quality_shifts qs
  WHERE (qs.id = quality_shift_production_links.quality_shift_id))));


--
-- Name: quality_shifts qshifts_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qshifts_delete_admin ON public.quality_shifts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quality_shifts qshifts_insert_self_or_manager; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qshifts_insert_self_or_manager ON public.quality_shifts FOR INSERT TO authenticated WITH CHECK ((((controller_id = auth.uid()) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role))) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role)));


--
-- Name: quality_shifts qshifts_select_own_or_managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qshifts_select_own_or_managers ON public.quality_shifts FOR SELECT TO authenticated USING (((controller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role) OR public.has_role(auth.uid(), 'auditeur'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'chef_ligne'::public.app_role)));


--
-- Name: quality_shifts qshifts_update_own_or_managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qshifts_update_own_or_managers ON public.quality_shifts FOR UPDATE TO authenticated USING (((controller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role)));


--
-- Name: quality_action_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_action_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_action_categories quality_action_categories_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_action_categories_read ON public.quality_action_categories FOR SELECT TO authenticated USING (true);


--
-- Name: quality_action_categories quality_action_categories_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_action_categories_write ON public.quality_action_categories TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role)));


--
-- Name: quality_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_control_point_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_control_point_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_control_point_ofs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_control_point_ofs ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_control_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_control_points ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_control_points quality_control_points_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_control_points_read ON public.quality_control_points FOR SELECT TO authenticated USING (true);


--
-- Name: quality_control_points quality_control_points_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_control_points_write ON public.quality_control_points TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role)));


--
-- Name: quality_decision_reasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_decision_reasons ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_decision_reasons quality_decision_reasons_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_decision_reasons_read ON public.quality_decision_reasons FOR SELECT TO authenticated USING (true);


--
-- Name: quality_decision_reasons quality_decision_reasons_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_decision_reasons_write ON public.quality_decision_reasons TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role)));


--
-- Name: quality_defect_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_defect_types ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_defect_types quality_defect_types_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_defect_types_read ON public.quality_defect_types FOR SELECT TO authenticated USING (true);


--
-- Name: quality_defect_types quality_defect_types_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_defect_types_write ON public.quality_defect_types TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role)));


--
-- Name: quality_indicator_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_indicator_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_indicators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_indicators ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_nc_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_nc_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_nc_categories quality_nc_categories_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_nc_categories_read ON public.quality_nc_categories FOR SELECT TO authenticated USING (true);


--
-- Name: quality_nc_categories quality_nc_categories_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_nc_categories_write ON public.quality_nc_categories TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role)));


--
-- Name: quality_non_conformities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_non_conformities ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_permissions quality_perms_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_perms_admin_all ON public.quality_permissions TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'responsable_si'::public.app_role)));


--
-- Name: quality_permissions quality_perms_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_perms_read_all ON public.quality_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: quality_shift_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_shift_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_shift_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_shift_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_shift_production_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_shift_production_links ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quality_units ENABLE ROW LEVEL SECURITY;

--
-- Name: quality_units quality_units_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_units_read ON public.quality_units FOR SELECT TO authenticated USING (true);


--
-- Name: quality_units quality_units_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quality_units_write ON public.quality_units TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'directeur_qualite'::public.app_role) OR public.has_role(auth.uid(), 'responsable_controle_qualite'::public.app_role)));


--
-- Name: recipe_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recipe_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: recipe_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: recipe_steps recipe_steps_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recipe_steps_select_authenticated ON public.recipe_steps FOR SELECT TO authenticated USING (true);


--
-- Name: recipe_steps recipe_steps_write_managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recipe_steps_write_managers ON public.recipe_steps TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'resp_production'::public.app_role) OR public.has_role(auth.uid(), 'bureau_methode'::public.app_role) OR public.has_role(auth.uid(), 'controleur_qualite'::public.app_role)));


--
-- Name: recipes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions role_permissions viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "role_permissions viewable by authenticated" ON public.role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: scan_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_mode_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_mode_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_modes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_modes ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_team_members shift_team_members managed by managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shift_team_members managed by managers" ON public.shift_team_members TO authenticated USING (public.can_manage_shifts(auth.uid())) WITH CHECK (public.can_manage_shifts(auth.uid()));


--
-- Name: shift_team_members shift_team_members read own or managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shift_team_members read own or managers" ON public.shift_team_members FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.can_manage_shifts(auth.uid())));


--
-- Name: shift_teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_teams ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_templates shift_templates managed by managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shift_templates managed by managers" ON public.shift_templates TO authenticated USING (public.can_manage_shifts(auth.uid())) WITH CHECK (public.can_manage_shifts(auth.uid()));


--
-- Name: shift_templates shift_templates readable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shift_templates readable by everyone" ON public.shift_templates FOR SELECT USING (true);


--
-- Name: shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_collaborators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_collaborators ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: validation_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.validation_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: validation_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.validation_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: validation_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION apply_maintenance_shift_schedules(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.apply_maintenance_shift_schedules() TO anon;
GRANT ALL ON FUNCTION public.apply_maintenance_shift_schedules() TO authenticated;
GRANT ALL ON FUNCTION public.apply_maintenance_shift_schedules() TO service_role;


--
-- Name: FUNCTION articles_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.articles_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.articles_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.articles_search_refresh() TO service_role;


--
-- Name: FUNCTION audit_logs_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.audit_logs_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.audit_logs_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.audit_logs_search_refresh() TO service_role;


--
-- Name: FUNCTION auto_close_stale_shifts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.auto_close_stale_shifts() TO anon;
GRANT ALL ON FUNCTION public.auto_close_stale_shifts() TO authenticated;
GRANT ALL ON FUNCTION public.auto_close_stale_shifts() TO service_role;


--
-- Name: FUNCTION can_manage_notification_rule(_user_id uuid, _module text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_manage_notification_rule(_user_id uuid, _module text) TO anon;
GRANT ALL ON FUNCTION public.can_manage_notification_rule(_user_id uuid, _module text) TO authenticated;
GRANT ALL ON FUNCTION public.can_manage_notification_rule(_user_id uuid, _module text) TO service_role;


--
-- Name: FUNCTION can_manage_shifts(_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_manage_shifts(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.can_manage_shifts(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_manage_shifts(_user_id uuid) TO service_role;


--
-- Name: FUNCTION can_manage_validation_rule(_user_id uuid, _module text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_manage_validation_rule(_user_id uuid, _module text) TO anon;
GRANT ALL ON FUNCTION public.can_manage_validation_rule(_user_id uuid, _module text) TO authenticated;
GRANT ALL ON FUNCTION public.can_manage_validation_rule(_user_id uuid, _module text) TO service_role;


--
-- Name: FUNCTION can_validate_request(_user_id uuid, _request_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_validate_request(_user_id uuid, _request_id uuid) TO anon;
GRANT ALL ON FUNCTION public.can_validate_request(_user_id uuid, _request_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_validate_request(_user_id uuid, _request_id uuid) TO service_role;


--
-- Name: FUNCTION check_document_permission(_user_id uuid, _entity_type text, _action text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_document_permission(_user_id uuid, _entity_type text, _action text) TO anon;
GRANT ALL ON FUNCTION public.check_document_permission(_user_id uuid, _entity_type text, _action text) TO authenticated;
GRANT ALL ON FUNCTION public.check_document_permission(_user_id uuid, _entity_type text, _action text) TO service_role;


--
-- Name: FUNCTION check_permission(_user_id uuid, _module text, _action text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_permission(_user_id uuid, _module text, _action text) TO anon;
GRANT ALL ON FUNCTION public.check_permission(_user_id uuid, _module text, _action text) TO authenticated;
GRANT ALL ON FUNCTION public.check_permission(_user_id uuid, _module text, _action text) TO service_role;


--
-- Name: FUNCTION consumptions_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.consumptions_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.consumptions_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.consumptions_search_refresh() TO service_role;


--
-- Name: FUNCTION derive_shift_type_from_now(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.derive_shift_type_from_now() TO anon;
GRANT ALL ON FUNCTION public.derive_shift_type_from_now() TO authenticated;
GRANT ALL ON FUNCTION public.derive_shift_type_from_now() TO service_role;


--
-- Name: FUNCTION ensure_my_production_shift_session(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ensure_my_production_shift_session() TO anon;
GRANT ALL ON FUNCTION public.ensure_my_production_shift_session() TO authenticated;
GRANT ALL ON FUNCTION public.ensure_my_production_shift_session() TO service_role;


--
-- Name: FUNCTION ensure_my_production_shifts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ensure_my_production_shifts() TO anon;
GRANT ALL ON FUNCTION public.ensure_my_production_shifts() TO authenticated;
GRANT ALL ON FUNCTION public.ensure_my_production_shifts() TO service_role;


--
-- Name: FUNCTION ensure_my_quality_shifts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ensure_my_quality_shifts() TO anon;
GRANT ALL ON FUNCTION public.ensure_my_quality_shifts() TO authenticated;
GRANT ALL ON FUNCTION public.ensure_my_quality_shifts() TO service_role;


--
-- Name: FUNCTION ensure_production_shift_session(p_of_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ensure_production_shift_session(p_of_id uuid) TO anon;
GRANT ALL ON FUNCTION public.ensure_production_shift_session(p_of_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.ensure_production_shift_session(p_of_id uuid) TO service_role;


--
-- Name: FUNCTION entity_documents_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.entity_documents_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.entity_documents_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.entity_documents_search_refresh() TO service_role;


--
-- Name: FUNCTION equipements_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.equipements_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.equipements_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.equipements_search_refresh() TO service_role;


--
-- Name: FUNCTION fts_build(VARIADIC parts text[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fts_build(VARIADIC parts text[]) TO anon;
GRANT ALL ON FUNCTION public.fts_build(VARIADIC parts text[]) TO authenticated;
GRANT ALL ON FUNCTION public.fts_build(VARIADIC parts text[]) TO service_role;


--
-- Name: FUNCTION generate_nc_number(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_nc_number() TO anon;
GRANT ALL ON FUNCTION public.generate_nc_number() TO authenticated;
GRANT ALL ON FUNCTION public.generate_nc_number() TO service_role;


--
-- Name: FUNCTION generate_of_numero(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_of_numero() TO anon;
GRANT ALL ON FUNCTION public.generate_of_numero() TO authenticated;
GRANT ALL ON FUNCTION public.generate_of_numero() TO service_role;


--
-- Name: FUNCTION generate_ticket_numero(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_ticket_numero() TO anon;
GRANT ALL ON FUNCTION public.generate_ticket_numero() TO authenticated;
GRANT ALL ON FUNCTION public.generate_ticket_numero() TO service_role;


--
-- Name: FUNCTION get_active_shift_context(_user_id uuid, _at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_active_shift_context(_user_id uuid, _at timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_active_shift_context(_user_id uuid, _at timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_active_shift_context(_user_id uuid, _at timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_position_counter(p_position_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_position_counter(p_position_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_position_counter(p_position_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_position_counter(p_position_id uuid) TO service_role;


--
-- Name: FUNCTION get_quality_indicators_for_of(p_of_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_quality_indicators_for_of(p_of_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_quality_indicators_for_of(p_of_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_quality_indicators_for_of(p_of_id uuid) TO service_role;


--
-- Name: FUNCTION get_recipe_for_of(p_of_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_recipe_for_of(p_of_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_recipe_for_of(p_of_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_recipe_for_of(p_of_id uuid) TO service_role;


--
-- Name: FUNCTION get_scope_shift_context(_user_id uuid, _scope text, _at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_scope_shift_context(_user_id uuid, _scope text, _at timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_scope_shift_context(_user_id uuid, _scope text, _at timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_scope_shift_context(_user_id uuid, _scope text, _at timestamp with time zone) TO service_role;


--
-- Name: FUNCTION global_search(q text, modules text[], date_from timestamp with time zone, date_to timestamp with time zone, limit_per_module integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.global_search(q text, modules text[], date_from timestamp with time zone, date_to timestamp with time zone, limit_per_module integer) TO anon;
GRANT ALL ON FUNCTION public.global_search(q text, modules text[], date_from timestamp with time zone, date_to timestamp with time zone, limit_per_module integer) TO authenticated;
GRANT ALL ON FUNCTION public.global_search(q text, modules text[], date_from timestamp with time zone, date_to timestamp with time zone, limit_per_module integer) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION has_audit_access(_user_id uuid, _module text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_audit_access(_user_id uuid, _module text) TO anon;
GRANT ALL ON FUNCTION public.has_audit_access(_user_id uuid, _module text) TO authenticated;
GRANT ALL ON FUNCTION public.has_audit_access(_user_id uuid, _module text) TO service_role;


--
-- Name: FUNCTION has_quality_permission(_user_id uuid, _action text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_quality_permission(_user_id uuid, _action text) TO anon;
GRANT ALL ON FUNCTION public.has_quality_permission(_user_id uuid, _action text) TO authenticated;
GRANT ALL ON FUNCTION public.has_quality_permission(_user_id uuid, _action text) TO service_role;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;


--
-- Name: FUNCTION interventions_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.interventions_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.interventions_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.interventions_search_refresh() TO service_role;


--
-- Name: FUNCTION inv_assignment_authorized_families(p_assignment_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inv_assignment_authorized_families(p_assignment_id uuid) TO anon;
GRANT ALL ON FUNCTION public.inv_assignment_authorized_families(p_assignment_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.inv_assignment_authorized_families(p_assignment_id uuid) TO service_role;


--
-- Name: FUNCTION inv_campaign_authorized_families(p_campaign_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inv_campaign_authorized_families(p_campaign_id uuid) TO anon;
GRANT ALL ON FUNCTION public.inv_campaign_authorized_families(p_campaign_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.inv_campaign_authorized_families(p_campaign_id uuid) TO service_role;


--
-- Name: FUNCTION inv_close_campaign(p_campaign_id uuid, p_motif text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inv_close_campaign(p_campaign_id uuid, p_motif text) TO anon;
GRANT ALL ON FUNCTION public.inv_close_campaign(p_campaign_id uuid, p_motif text) TO authenticated;
GRANT ALL ON FUNCTION public.inv_close_campaign(p_campaign_id uuid, p_motif text) TO service_role;


--
-- Name: FUNCTION inv_ensure_targets(p_campaign_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inv_ensure_targets(p_campaign_id uuid) TO anon;
GRANT ALL ON FUNCTION public.inv_ensure_targets(p_campaign_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.inv_ensure_targets(p_campaign_id uuid) TO service_role;


--
-- Name: FUNCTION inv_family_descendants(p_family_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inv_family_descendants(p_family_id uuid) TO anon;
GRANT ALL ON FUNCTION public.inv_family_descendants(p_family_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.inv_family_descendants(p_family_id uuid) TO service_role;


--
-- Name: FUNCTION inv_open_campaign(p_campaign_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inv_open_campaign(p_campaign_id uuid) TO anon;
GRANT ALL ON FUNCTION public.inv_open_campaign(p_campaign_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.inv_open_campaign(p_campaign_id uuid) TO service_role;


--
-- Name: FUNCTION inv_recompute_result(p_target_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inv_recompute_result(p_target_id uuid) TO anon;
GRANT ALL ON FUNCTION public.inv_recompute_result(p_target_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.inv_recompute_result(p_target_id uuid) TO service_role;


--
-- Name: FUNCTION inv_register_count(p_target_id uuid, p_qty numeric, p_notes text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inv_register_count(p_target_id uuid, p_qty numeric, p_notes text) TO anon;
GRANT ALL ON FUNCTION public.inv_register_count(p_target_id uuid, p_qty numeric, p_notes text) TO authenticated;
GRANT ALL ON FUNCTION public.inv_register_count(p_target_id uuid, p_qty numeric, p_notes text) TO service_role;


--
-- Name: FUNCTION is_audit_enabled(_role text, _module text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_audit_enabled(_role text, _module text) TO anon;
GRANT ALL ON FUNCTION public.is_audit_enabled(_role text, _module text) TO authenticated;
GRANT ALL ON FUNCTION public.is_audit_enabled(_role text, _module text) TO service_role;


--
-- Name: FUNCTION is_user_on_shift(_user_id uuid, _scope text, _at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_user_on_shift(_user_id uuid, _scope text, _at timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.is_user_on_shift(_user_id uuid, _scope text, _at timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.is_user_on_shift(_user_id uuid, _scope text, _at timestamp with time zone) TO service_role;


--
-- Name: FUNCTION machines_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.machines_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.machines_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.machines_search_refresh() TO service_role;


--
-- Name: FUNCTION notifications_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notifications_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.notifications_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.notifications_search_refresh() TO service_role;


--
-- Name: FUNCTION notify_shift_event(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notify_shift_event() TO anon;
GRANT ALL ON FUNCTION public.notify_shift_event() TO authenticated;
GRANT ALL ON FUNCTION public.notify_shift_event() TO service_role;


--
-- Name: FUNCTION of_backfill_bom_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.of_backfill_bom_id() TO anon;
GRANT ALL ON FUNCTION public.of_backfill_bom_id() TO authenticated;
GRANT ALL ON FUNCTION public.of_backfill_bom_id() TO service_role;


--
-- Name: FUNCTION of_close_cascade_shifts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.of_close_cascade_shifts() TO anon;
GRANT ALL ON FUNCTION public.of_close_cascade_shifts() TO authenticated;
GRANT ALL ON FUNCTION public.of_close_cascade_shifts() TO service_role;


--
-- Name: FUNCTION of_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.of_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.of_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.of_search_refresh() TO service_role;


--
-- Name: FUNCTION open_my_work_session(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.open_my_work_session() TO anon;
GRANT ALL ON FUNCTION public.open_my_work_session() TO authenticated;
GRANT ALL ON FUNCTION public.open_my_work_session() TO service_role;


--
-- Name: FUNCTION organes_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.organes_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.organes_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.organes_search_refresh() TO service_role;


--
-- Name: FUNCTION pdr_equivalences_enforce_proposal(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pdr_equivalences_enforce_proposal() TO anon;
GRANT ALL ON FUNCTION public.pdr_equivalences_enforce_proposal() TO authenticated;
GRANT ALL ON FUNCTION public.pdr_equivalences_enforce_proposal() TO service_role;


--
-- Name: FUNCTION pdr_family_suppliers_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pdr_family_suppliers_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.pdr_family_suppliers_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.pdr_family_suppliers_search_refresh() TO service_role;


--
-- Name: FUNCTION pdr_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pdr_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.pdr_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.pdr_search_refresh() TO service_role;


--
-- Name: FUNCTION pdr_stock_movements_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pdr_stock_movements_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.pdr_stock_movements_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.pdr_stock_movements_search_refresh() TO service_role;


--
-- Name: FUNCTION pdr_suppliers_unique_principal(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pdr_suppliers_unique_principal() TO anon;
GRANT ALL ON FUNCTION public.pdr_suppliers_unique_principal() TO authenticated;
GRANT ALL ON FUNCTION public.pdr_suppliers_unique_principal() TO service_role;


--
-- Name: FUNCTION preventive_plans_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.preventive_plans_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.preventive_plans_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.preventive_plans_search_refresh() TO service_role;


--
-- Name: FUNCTION production_lines_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.production_lines_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.production_lines_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.production_lines_search_refresh() TO service_role;


--
-- Name: FUNCTION production_stops_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.production_stops_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.production_stops_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.production_stops_search_refresh() TO service_role;


--
-- Name: FUNCTION products_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.products_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.products_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.products_search_refresh() TO service_role;


--
-- Name: FUNCTION qshift_unlink_closed_production(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.qshift_unlink_closed_production() TO anon;
GRANT ALL ON FUNCTION public.qshift_unlink_closed_production() TO authenticated;
GRANT ALL ON FUNCTION public.qshift_unlink_closed_production() TO service_role;


--
-- Name: FUNCTION quality_actions_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.quality_actions_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.quality_actions_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.quality_actions_search_refresh() TO service_role;


--
-- Name: FUNCTION quality_actions_validate(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.quality_actions_validate() TO anon;
GRANT ALL ON FUNCTION public.quality_actions_validate() TO authenticated;
GRANT ALL ON FUNCTION public.quality_actions_validate() TO service_role;


--
-- Name: FUNCTION quality_checks_compute_conformity(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.quality_checks_compute_conformity() TO anon;
GRANT ALL ON FUNCTION public.quality_checks_compute_conformity() TO authenticated;
GRANT ALL ON FUNCTION public.quality_checks_compute_conformity() TO service_role;


--
-- Name: FUNCTION quality_indicator_assignments_validate(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.quality_indicator_assignments_validate() TO anon;
GRANT ALL ON FUNCTION public.quality_indicator_assignments_validate() TO authenticated;
GRANT ALL ON FUNCTION public.quality_indicator_assignments_validate() TO service_role;


--
-- Name: FUNCTION quality_indicators_validate(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.quality_indicators_validate() TO anon;
GRANT ALL ON FUNCTION public.quality_indicators_validate() TO authenticated;
GRANT ALL ON FUNCTION public.quality_indicators_validate() TO service_role;


--
-- Name: FUNCTION quality_nc_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.quality_nc_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.quality_nc_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.quality_nc_search_refresh() TO service_role;


--
-- Name: FUNCTION quality_nc_validate(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.quality_nc_validate() TO anon;
GRANT ALL ON FUNCTION public.quality_nc_validate() TO authenticated;
GRANT ALL ON FUNCTION public.quality_nc_validate() TO service_role;


--
-- Name: FUNCTION quality_shift_lines_attach_links(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.quality_shift_lines_attach_links() TO anon;
GRANT ALL ON FUNCTION public.quality_shift_lines_attach_links() TO authenticated;
GRANT ALL ON FUNCTION public.quality_shift_lines_attach_links() TO service_role;


--
-- Name: FUNCTION quality_shift_refresh_links(p_quality_shift_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.quality_shift_refresh_links(p_quality_shift_id uuid) TO anon;
GRANT ALL ON FUNCTION public.quality_shift_refresh_links(p_quality_shift_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.quality_shift_refresh_links(p_quality_shift_id uuid) TO service_role;


--
-- Name: FUNCTION quality_shifts_close_validate(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.quality_shifts_close_validate() TO anon;
GRANT ALL ON FUNCTION public.quality_shifts_close_validate() TO authenticated;
GRANT ALL ON FUNCTION public.quality_shifts_close_validate() TO service_role;


--
-- Name: FUNCTION recipes_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.recipes_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.recipes_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.recipes_search_refresh() TO service_role;


--
-- Name: FUNCTION recipes_sync_status(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.recipes_sync_status() TO anon;
GRANT ALL ON FUNCTION public.recipes_sync_status() TO authenticated;
GRANT ALL ON FUNCTION public.recipes_sync_status() TO service_role;


--
-- Name: FUNCTION resolve_scanned_code(p_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.resolve_scanned_code(p_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.resolve_scanned_code(p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.resolve_scanned_code(p_code text) TO service_role;


--
-- Name: FUNCTION scan_history_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.scan_history_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.scan_history_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.scan_history_search_refresh() TO service_role;


--
-- Name: FUNCTION search_suggest(q text, max_results integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.search_suggest(q text, max_results integer) TO anon;
GRANT ALL ON FUNCTION public.search_suggest(q text, max_results integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_suggest(q text, max_results integer) TO service_role;


--
-- Name: FUNCTION set_bom_status(p_bom_id uuid, p_status text, p_reason text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_bom_status(p_bom_id uuid, p_status text, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.set_bom_status(p_bom_id uuid, p_status text, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.set_bom_status(p_bom_id uuid, p_status text, p_reason text) TO service_role;


--
-- Name: FUNCTION set_of_quality_status(p_of_id uuid, p_status public.of_quality_status, p_reason text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_of_quality_status(p_of_id uuid, p_status public.of_quality_status, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.set_of_quality_status(p_of_id uuid, p_status public.of_quality_status, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.set_of_quality_status(p_of_id uuid, p_status public.of_quality_status, p_reason text) TO service_role;


--
-- Name: FUNCTION set_recipe_status(p_recipe_id uuid, p_status text, p_reason text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_recipe_status(p_recipe_id uuid, p_status text, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.set_recipe_status(p_recipe_id uuid, p_status text, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.set_recipe_status(p_recipe_id uuid, p_status text, p_reason text) TO service_role;


--
-- Name: FUNCTION shift_cycle_slot(_pattern text[], _anchor date, _d date); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.shift_cycle_slot(_pattern text[], _anchor date, _d date) TO anon;
GRANT ALL ON FUNCTION public.shift_cycle_slot(_pattern text[], _anchor date, _d date) TO authenticated;
GRANT ALL ON FUNCTION public.shift_cycle_slot(_pattern text[], _anchor date, _d date) TO service_role;


--
-- Name: FUNCTION shifts_fill_defaults(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.shifts_fill_defaults() TO anon;
GRANT ALL ON FUNCTION public.shifts_fill_defaults() TO authenticated;
GRANT ALL ON FUNCTION public.shifts_fill_defaults() TO service_role;


--
-- Name: FUNCTION tg_intervention_pdr_lifecycle(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_intervention_pdr_lifecycle() TO anon;
GRANT ALL ON FUNCTION public.tg_intervention_pdr_lifecycle() TO authenticated;
GRANT ALL ON FUNCTION public.tg_intervention_pdr_lifecycle() TO service_role;


--
-- Name: FUNCTION tg_inventory_campaign_code(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_inventory_campaign_code() TO anon;
GRANT ALL ON FUNCTION public.tg_inventory_campaign_code() TO authenticated;
GRANT ALL ON FUNCTION public.tg_inventory_campaign_code() TO service_role;


--
-- Name: FUNCTION tg_lock_inventory_counts(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_lock_inventory_counts() TO anon;
GRANT ALL ON FUNCTION public.tg_lock_inventory_counts() TO authenticated;
GRANT ALL ON FUNCTION public.tg_lock_inventory_counts() TO service_role;


--
-- Name: FUNCTION tg_pdr_position_block_delete(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_pdr_position_block_delete() TO anon;
GRANT ALL ON FUNCTION public.tg_pdr_position_block_delete() TO authenticated;
GRANT ALL ON FUNCTION public.tg_pdr_position_block_delete() TO service_role;


--
-- Name: FUNCTION tg_pdr_position_validate(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_pdr_position_validate() TO anon;
GRANT ALL ON FUNCTION public.tg_pdr_position_validate() TO authenticated;
GRANT ALL ON FUNCTION public.tg_pdr_position_validate() TO service_role;


--
-- Name: FUNCTION tg_preventive_execution_pdr_lifecycle(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_preventive_execution_pdr_lifecycle() TO anon;
GRANT ALL ON FUNCTION public.tg_preventive_execution_pdr_lifecycle() TO authenticated;
GRANT ALL ON FUNCTION public.tg_preventive_execution_pdr_lifecycle() TO service_role;


--
-- Name: FUNCTION tg_production_declarations_hour_minus_1(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_production_declarations_hour_minus_1() TO anon;
GRANT ALL ON FUNCTION public.tg_production_declarations_hour_minus_1() TO authenticated;
GRANT ALL ON FUNCTION public.tg_production_declarations_hour_minus_1() TO service_role;


--
-- Name: FUNCTION tg_set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.tg_set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.tg_set_updated_at() TO service_role;


--
-- Name: FUNCTION tickets_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tickets_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.tickets_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.tickets_search_refresh() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION user_has_role_text(_user_id uuid, _role_text text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.user_has_role_text(_user_id uuid, _role_text text) TO anon;
GRANT ALL ON FUNCTION public.user_has_role_text(_user_id uuid, _role_text text) TO authenticated;
GRANT ALL ON FUNCTION public.user_has_role_text(_user_id uuid, _role_text text) TO service_role;


--
-- Name: FUNCTION validation_requests_search_refresh(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validation_requests_search_refresh() TO anon;
GRANT ALL ON FUNCTION public.validation_requests_search_refresh() TO authenticated;
GRANT ALL ON FUNCTION public.validation_requests_search_refresh() TO service_role;


--
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_settings TO anon;
GRANT ALL ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;


--
-- Name: TABLE articles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.articles TO anon;
GRANT ALL ON TABLE public.articles TO authenticated;
GRANT ALL ON TABLE public.articles TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE audit_role_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_role_settings TO anon;
GRANT ALL ON TABLE public.audit_role_settings TO authenticated;
GRANT ALL ON TABLE public.audit_role_settings TO service_role;


--
-- Name: TABLE bill_of_materials; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bill_of_materials TO anon;
GRANT ALL ON TABLE public.bill_of_materials TO authenticated;
GRANT ALL ON TABLE public.bill_of_materials TO service_role;


--
-- Name: TABLE bom_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bom_items TO anon;
GRANT ALL ON TABLE public.bom_items TO authenticated;
GRANT ALL ON TABLE public.bom_items TO service_role;


--
-- Name: TABLE consumptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.consumptions TO anon;
GRANT ALL ON TABLE public.consumptions TO authenticated;
GRANT ALL ON TABLE public.consumptions TO service_role;


--
-- Name: TABLE custom_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.custom_roles TO anon;
GRANT ALL ON TABLE public.custom_roles TO authenticated;
GRANT ALL ON TABLE public.custom_roles TO service_role;


--
-- Name: TABLE document_audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.document_audit_logs TO anon;
GRANT ALL ON TABLE public.document_audit_logs TO authenticated;
GRANT ALL ON TABLE public.document_audit_logs TO service_role;


--
-- Name: TABLE document_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.document_categories TO anon;
GRANT ALL ON TABLE public.document_categories TO authenticated;
GRANT ALL ON TABLE public.document_categories TO service_role;


--
-- Name: TABLE document_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.document_permissions TO anon;
GRANT ALL ON TABLE public.document_permissions TO authenticated;
GRANT ALL ON TABLE public.document_permissions TO service_role;


--
-- Name: TABLE entity_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.entity_documents TO anon;
GRANT ALL ON TABLE public.entity_documents TO authenticated;
GRANT ALL ON TABLE public.entity_documents TO service_role;


--
-- Name: TABLE entity_images; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.entity_images TO anon;
GRANT ALL ON TABLE public.entity_images TO authenticated;
GRANT ALL ON TABLE public.entity_images TO service_role;


--
-- Name: TABLE equipements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.equipements TO anon;
GRANT ALL ON TABLE public.equipements TO authenticated;
GRANT ALL ON TABLE public.equipements TO service_role;


--
-- Name: TABLE intervention_pdr; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.intervention_pdr TO anon;
GRANT ALL ON TABLE public.intervention_pdr TO authenticated;
GRANT ALL ON TABLE public.intervention_pdr TO service_role;


--
-- Name: TABLE interventions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.interventions TO anon;
GRANT ALL ON TABLE public.interventions TO authenticated;
GRANT ALL ON TABLE public.interventions TO service_role;


--
-- Name: TABLE inventory_assignment_scopes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_assignment_scopes TO anon;
GRANT ALL ON TABLE public.inventory_assignment_scopes TO authenticated;
GRANT ALL ON TABLE public.inventory_assignment_scopes TO service_role;


--
-- Name: TABLE inventory_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_assignments TO anon;
GRANT ALL ON TABLE public.inventory_assignments TO authenticated;
GRANT ALL ON TABLE public.inventory_assignments TO service_role;


--
-- Name: TABLE inventory_campaign_scopes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_campaign_scopes TO anon;
GRANT ALL ON TABLE public.inventory_campaign_scopes TO authenticated;
GRANT ALL ON TABLE public.inventory_campaign_scopes TO service_role;


--
-- Name: TABLE inventory_campaigns; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_campaigns TO anon;
GRANT ALL ON TABLE public.inventory_campaigns TO authenticated;
GRANT ALL ON TABLE public.inventory_campaigns TO service_role;


--
-- Name: TABLE inventory_counts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_counts TO anon;
GRANT ALL ON TABLE public.inventory_counts TO authenticated;
GRANT ALL ON TABLE public.inventory_counts TO service_role;


--
-- Name: TABLE inventory_results; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_results TO anon;
GRANT ALL ON TABLE public.inventory_results TO authenticated;
GRANT ALL ON TABLE public.inventory_results TO service_role;


--
-- Name: TABLE inventory_targets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_targets TO anon;
GRANT ALL ON TABLE public.inventory_targets TO authenticated;
GRANT ALL ON TABLE public.inventory_targets TO service_role;


--
-- Name: TABLE line_products; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.line_products TO anon;
GRANT ALL ON TABLE public.line_products TO authenticated;
GRANT ALL ON TABLE public.line_products TO service_role;


--
-- Name: TABLE machine_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.machine_documents TO anon;
GRANT ALL ON TABLE public.machine_documents TO authenticated;
GRANT ALL ON TABLE public.machine_documents TO service_role;


--
-- Name: TABLE machine_families; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.machine_families TO anon;
GRANT ALL ON TABLE public.machine_families TO authenticated;
GRANT ALL ON TABLE public.machine_families TO service_role;


--
-- Name: TABLE machine_line_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.machine_line_assignments TO anon;
GRANT ALL ON TABLE public.machine_line_assignments TO authenticated;
GRANT ALL ON TABLE public.machine_line_assignments TO service_role;


--
-- Name: TABLE machine_pdr; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.machine_pdr TO anon;
GRANT ALL ON TABLE public.machine_pdr TO authenticated;
GRANT ALL ON TABLE public.machine_pdr TO service_role;


--
-- Name: TABLE machines; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.machines TO anon;
GRANT ALL ON TABLE public.machines TO authenticated;
GRANT ALL ON TABLE public.machines TO service_role;


--
-- Name: TABLE maintenance_shifts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.maintenance_shifts TO anon;
GRANT ALL ON TABLE public.maintenance_shifts TO authenticated;
GRANT ALL ON TABLE public.maintenance_shifts TO service_role;


--
-- Name: TABLE notification_email_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_email_log TO anon;
GRANT ALL ON TABLE public.notification_email_log TO authenticated;
GRANT ALL ON TABLE public.notification_email_log TO service_role;


--
-- Name: TABLE notification_rules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_rules TO anon;
GRANT ALL ON TABLE public.notification_rules TO authenticated;
GRANT ALL ON TABLE public.notification_rules TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE of_mode_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.of_mode_history TO anon;
GRANT ALL ON TABLE public.of_mode_history TO authenticated;
GRANT ALL ON TABLE public.of_mode_history TO service_role;


--
-- Name: TABLE of_shift_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.of_shift_assignments TO anon;
GRANT ALL ON TABLE public.of_shift_assignments TO authenticated;
GRANT ALL ON TABLE public.of_shift_assignments TO service_role;


--
-- Name: TABLE ordres_fabrication; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ordres_fabrication TO anon;
GRANT ALL ON TABLE public.ordres_fabrication TO authenticated;
GRANT ALL ON TABLE public.ordres_fabrication TO service_role;


--
-- Name: TABLE organes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.organes TO anon;
GRANT ALL ON TABLE public.organes TO authenticated;
GRANT ALL ON TABLE public.organes TO service_role;


--
-- Name: TABLE packaging_levels; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.packaging_levels TO anon;
GRANT ALL ON TABLE public.packaging_levels TO authenticated;
GRANT ALL ON TABLE public.packaging_levels TO service_role;


--
-- Name: TABLE panne_types; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.panne_types TO anon;
GRANT ALL ON TABLE public.panne_types TO authenticated;
GRANT ALL ON TABLE public.panne_types TO service_role;


--
-- Name: TABLE pdr; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr TO anon;
GRANT ALL ON TABLE public.pdr TO authenticated;
GRANT ALL ON TABLE public.pdr TO service_role;


--
-- Name: TABLE pdr_entity_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr_entity_links TO anon;
GRANT ALL ON TABLE public.pdr_entity_links TO authenticated;
GRANT ALL ON TABLE public.pdr_entity_links TO service_role;


--
-- Name: TABLE pdr_equivalences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr_equivalences TO anon;
GRANT ALL ON TABLE public.pdr_equivalences TO authenticated;
GRANT ALL ON TABLE public.pdr_equivalences TO service_role;


--
-- Name: TABLE pdr_families; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr_families TO anon;
GRANT ALL ON TABLE public.pdr_families TO authenticated;
GRANT ALL ON TABLE public.pdr_families TO service_role;


--
-- Name: TABLE pdr_family_suppliers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr_family_suppliers TO anon;
GRANT ALL ON TABLE public.pdr_family_suppliers TO authenticated;
GRANT ALL ON TABLE public.pdr_family_suppliers TO service_role;


--
-- Name: TABLE pdr_install_positions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr_install_positions TO anon;
GRANT ALL ON TABLE public.pdr_install_positions TO authenticated;
GRANT ALL ON TABLE public.pdr_install_positions TO service_role;


--
-- Name: TABLE pdr_instances; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr_instances TO anon;
GRANT ALL ON TABLE public.pdr_instances TO authenticated;
GRANT ALL ON TABLE public.pdr_instances TO service_role;


--
-- Name: TABLE pdr_position_status; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr_position_status TO anon;
GRANT ALL ON TABLE public.pdr_position_status TO authenticated;
GRANT ALL ON TABLE public.pdr_position_status TO service_role;


--
-- Name: TABLE pdr_stock_movements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr_stock_movements TO anon;
GRANT ALL ON TABLE public.pdr_stock_movements TO authenticated;
GRANT ALL ON TABLE public.pdr_stock_movements TO service_role;


--
-- Name: TABLE pdr_stock_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr_stock_permissions TO anon;
GRANT ALL ON TABLE public.pdr_stock_permissions TO authenticated;
GRANT ALL ON TABLE public.pdr_stock_permissions TO service_role;


--
-- Name: TABLE pdr_suppliers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pdr_suppliers TO anon;
GRANT ALL ON TABLE public.pdr_suppliers TO authenticated;
GRANT ALL ON TABLE public.pdr_suppliers TO service_role;


--
-- Name: TABLE preventive_executions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.preventive_executions TO anon;
GRANT ALL ON TABLE public.preventive_executions TO authenticated;
GRANT ALL ON TABLE public.preventive_executions TO service_role;


--
-- Name: TABLE preventive_plan_assignees; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.preventive_plan_assignees TO anon;
GRANT ALL ON TABLE public.preventive_plan_assignees TO authenticated;
GRANT ALL ON TABLE public.preventive_plan_assignees TO service_role;


--
-- Name: TABLE preventive_plan_pdr; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.preventive_plan_pdr TO anon;
GRANT ALL ON TABLE public.preventive_plan_pdr TO authenticated;
GRANT ALL ON TABLE public.preventive_plan_pdr TO service_role;


--
-- Name: TABLE preventive_plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.preventive_plans TO anon;
GRANT ALL ON TABLE public.preventive_plans TO authenticated;
GRANT ALL ON TABLE public.preventive_plans TO service_role;


--
-- Name: TABLE product_families; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_families TO anon;
GRANT ALL ON TABLE public.product_families TO authenticated;
GRANT ALL ON TABLE public.product_families TO service_role;


--
-- Name: TABLE production_declarations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.production_declarations TO anon;
GRANT ALL ON TABLE public.production_declarations TO authenticated;
GRANT ALL ON TABLE public.production_declarations TO service_role;


--
-- Name: TABLE production_lines; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.production_lines TO anon;
GRANT ALL ON TABLE public.production_lines TO authenticated;
GRANT ALL ON TABLE public.production_lines TO service_role;


--
-- Name: TABLE production_stops; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.production_stops TO anon;
GRANT ALL ON TABLE public.production_stops TO authenticated;
GRANT ALL ON TABLE public.production_stops TO service_role;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE quality_action_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_action_categories TO anon;
GRANT ALL ON TABLE public.quality_action_categories TO authenticated;
GRANT ALL ON TABLE public.quality_action_categories TO service_role;


--
-- Name: TABLE quality_actions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_actions TO anon;
GRANT ALL ON TABLE public.quality_actions TO authenticated;
GRANT ALL ON TABLE public.quality_actions TO service_role;


--
-- Name: TABLE quality_checks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_checks TO anon;
GRANT ALL ON TABLE public.quality_checks TO authenticated;
GRANT ALL ON TABLE public.quality_checks TO service_role;


--
-- Name: TABLE quality_control_point_lines; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_control_point_lines TO anon;
GRANT ALL ON TABLE public.quality_control_point_lines TO authenticated;
GRANT ALL ON TABLE public.quality_control_point_lines TO service_role;


--
-- Name: TABLE quality_control_point_ofs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_control_point_ofs TO anon;
GRANT ALL ON TABLE public.quality_control_point_ofs TO authenticated;
GRANT ALL ON TABLE public.quality_control_point_ofs TO service_role;


--
-- Name: TABLE quality_control_points; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_control_points TO anon;
GRANT ALL ON TABLE public.quality_control_points TO authenticated;
GRANT ALL ON TABLE public.quality_control_points TO service_role;


--
-- Name: TABLE quality_decision_reasons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_decision_reasons TO anon;
GRANT ALL ON TABLE public.quality_decision_reasons TO authenticated;
GRANT ALL ON TABLE public.quality_decision_reasons TO service_role;


--
-- Name: TABLE quality_defect_types; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_defect_types TO anon;
GRANT ALL ON TABLE public.quality_defect_types TO authenticated;
GRANT ALL ON TABLE public.quality_defect_types TO service_role;


--
-- Name: TABLE quality_indicator_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_indicator_assignments TO anon;
GRANT ALL ON TABLE public.quality_indicator_assignments TO authenticated;
GRANT ALL ON TABLE public.quality_indicator_assignments TO service_role;


--
-- Name: TABLE quality_indicators; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_indicators TO anon;
GRANT ALL ON TABLE public.quality_indicators TO authenticated;
GRANT ALL ON TABLE public.quality_indicators TO service_role;


--
-- Name: TABLE quality_nc_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_nc_categories TO anon;
GRANT ALL ON TABLE public.quality_nc_categories TO authenticated;
GRANT ALL ON TABLE public.quality_nc_categories TO service_role;


--
-- Name: TABLE quality_non_conformities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_non_conformities TO anon;
GRANT ALL ON TABLE public.quality_non_conformities TO authenticated;
GRANT ALL ON TABLE public.quality_non_conformities TO service_role;


--
-- Name: TABLE quality_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_permissions TO anon;
GRANT ALL ON TABLE public.quality_permissions TO authenticated;
GRANT ALL ON TABLE public.quality_permissions TO service_role;


--
-- Name: TABLE quality_shift_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_shift_assignments TO anon;
GRANT ALL ON TABLE public.quality_shift_assignments TO authenticated;
GRANT ALL ON TABLE public.quality_shift_assignments TO service_role;


--
-- Name: TABLE quality_shift_lines; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_shift_lines TO anon;
GRANT ALL ON TABLE public.quality_shift_lines TO authenticated;
GRANT ALL ON TABLE public.quality_shift_lines TO service_role;


--
-- Name: TABLE quality_shift_production_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_shift_production_links TO anon;
GRANT ALL ON TABLE public.quality_shift_production_links TO authenticated;
GRANT ALL ON TABLE public.quality_shift_production_links TO service_role;


--
-- Name: TABLE quality_shifts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_shifts TO anon;
GRANT ALL ON TABLE public.quality_shifts TO authenticated;
GRANT ALL ON TABLE public.quality_shifts TO service_role;


--
-- Name: TABLE quality_units; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quality_units TO anon;
GRANT ALL ON TABLE public.quality_units TO authenticated;
GRANT ALL ON TABLE public.quality_units TO service_role;


--
-- Name: TABLE recipe_lines; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.recipe_lines TO anon;
GRANT ALL ON TABLE public.recipe_lines TO authenticated;
GRANT ALL ON TABLE public.recipe_lines TO service_role;


--
-- Name: TABLE recipe_steps; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.recipe_steps TO anon;
GRANT ALL ON TABLE public.recipe_steps TO authenticated;
GRANT ALL ON TABLE public.recipe_steps TO service_role;


--
-- Name: TABLE recipes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.recipes TO anon;
GRANT ALL ON TABLE public.recipes TO authenticated;
GRANT ALL ON TABLE public.recipes TO service_role;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.role_permissions TO anon;
GRANT ALL ON TABLE public.role_permissions TO authenticated;
GRANT ALL ON TABLE public.role_permissions TO service_role;


--
-- Name: TABLE scan_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scan_history TO anon;
GRANT ALL ON TABLE public.scan_history TO authenticated;
GRANT ALL ON TABLE public.scan_history TO service_role;


--
-- Name: TABLE shift_mode_slots; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shift_mode_slots TO anon;
GRANT ALL ON TABLE public.shift_mode_slots TO authenticated;
GRANT ALL ON TABLE public.shift_mode_slots TO service_role;


--
-- Name: TABLE shift_modes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shift_modes TO anon;
GRANT ALL ON TABLE public.shift_modes TO authenticated;
GRANT ALL ON TABLE public.shift_modes TO service_role;


--
-- Name: TABLE shift_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shift_settings TO anon;
GRANT ALL ON TABLE public.shift_settings TO authenticated;
GRANT ALL ON TABLE public.shift_settings TO service_role;


--
-- Name: TABLE shift_team_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shift_team_members TO anon;
GRANT ALL ON TABLE public.shift_team_members TO authenticated;
GRANT ALL ON TABLE public.shift_team_members TO service_role;


--
-- Name: TABLE shift_teams; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shift_teams TO anon;
GRANT ALL ON TABLE public.shift_teams TO authenticated;
GRANT ALL ON TABLE public.shift_teams TO service_role;


--
-- Name: TABLE shift_templates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shift_templates TO anon;
GRANT ALL ON TABLE public.shift_templates TO authenticated;
GRANT ALL ON TABLE public.shift_templates TO service_role;


--
-- Name: TABLE shifts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shifts TO anon;
GRANT ALL ON TABLE public.shifts TO authenticated;
GRANT ALL ON TABLE public.shifts TO service_role;


--
-- Name: TABLE ticket_collaborators; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ticket_collaborators TO anon;
GRANT ALL ON TABLE public.ticket_collaborators TO authenticated;
GRANT ALL ON TABLE public.ticket_collaborators TO service_role;


--
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tickets TO anon;
GRANT ALL ON TABLE public.tickets TO authenticated;
GRANT ALL ON TABLE public.tickets TO service_role;


--
-- Name: TABLE user_notification_preferences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_notification_preferences TO anon;
GRANT ALL ON TABLE public.user_notification_preferences TO authenticated;
GRANT ALL ON TABLE public.user_notification_preferences TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;


--
-- Name: TABLE validation_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.validation_permissions TO anon;
GRANT ALL ON TABLE public.validation_permissions TO authenticated;
GRANT ALL ON TABLE public.validation_permissions TO service_role;


--
-- Name: TABLE validation_requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.validation_requests TO anon;
GRANT ALL ON TABLE public.validation_requests TO authenticated;
GRANT ALL ON TABLE public.validation_requests TO service_role;


--
-- Name: TABLE validation_rules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.validation_rules TO anon;
GRANT ALL ON TABLE public.validation_rules TO authenticated;
GRANT ALL ON TABLE public.validation_rules TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--



-- =============================================================================
-- 2) BUCKETS STORAGE (idempotents)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('entity-documents',  'entity-documents',  true),
  ('entity-images',     'entity-images',     true),
  ('machine-documents', 'machine-documents', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3) POLITIQUES STORAGE (idempotentes)
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can view entity documents" ON storage.objects;
CREATE POLICY "Anyone can view entity documents" ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'entity-documents'::text));
DROP POLICY IF EXISTS "Authenticated can delete entity images" ON storage.objects;
CREATE POLICY "Authenticated can delete entity images" ON storage.objects FOR DELETE TO authenticated USING ((bucket_id = 'entity-images'::text));
DROP POLICY IF EXISTS "Authenticated can delete machine docs" ON storage.objects;
CREATE POLICY "Authenticated can delete machine docs" ON storage.objects FOR DELETE TO authenticated USING ((bucket_id = 'machine-documents'::text));
DROP POLICY IF EXISTS "Authenticated can update entity images" ON storage.objects;
CREATE POLICY "Authenticated can update entity images" ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'entity-images'::text));
DROP POLICY IF EXISTS "Authenticated can update machine docs" ON storage.objects;
CREATE POLICY "Authenticated can update machine docs" ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'machine-documents'::text));
DROP POLICY IF EXISTS "Authenticated can upload entity documents" ON storage.objects;
CREATE POLICY "Authenticated can upload entity documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'entity-documents'::text));
DROP POLICY IF EXISTS "Authenticated can upload entity images" ON storage.objects;
CREATE POLICY "Authenticated can upload entity images" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'entity-images'::text));
DROP POLICY IF EXISTS "Authenticated can upload machine docs" ON storage.objects;
CREATE POLICY "Authenticated can upload machine docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'machine-documents'::text));
DROP POLICY IF EXISTS "Entity images public read" ON storage.objects;
CREATE POLICY "Entity images public read" ON storage.objects FOR SELECT USING ((bucket_id = 'entity-images'::text));
DROP POLICY IF EXISTS "Machine docs publicly accessible" ON storage.objects;
CREATE POLICY "Machine docs publicly accessible" ON storage.objects FOR SELECT USING ((bucket_id = 'machine-documents'::text));
DROP POLICY IF EXISTS "Owner can delete entity documents" ON storage.objects;
CREATE POLICY "Owner can delete entity documents" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'entity-documents'::text) AND (((auth.uid())::text = (storage.foldername(name))[1]) OR public.has_role(auth.uid(), 'admin'::public.app_role))));

-- =============================================================================
-- 5) MATRICE DE PERMISSIONS PAR ROLE (config systeme, idempotente)
-- =============================================================================
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES
  ('admin','analytiques',true,true,true,true),
  ('admin','apps',true,true,true,true),
  ('admin','arrets',true,true,true,true),
  ('admin','articles',true,true,true,true),
  ('admin','audit',true,true,true,true),
  ('admin','consommations',true,true,true,true),
  ('admin','dashboard',true,true,true,true),
  ('admin','documents',true,true,true,true),
  ('admin','equipements',true,true,true,true),
  ('admin','general',true,true,true,true),
  ('admin','gpao_dashboard',true,true,true,true),
  ('admin','historique',true,true,true,true),
  ('admin','images',true,true,true,true),
  ('admin','inventaire',true,true,true,true),
  ('admin','inventaire_campagnes',true,true,true,true),
  ('admin','journal',true,true,true,true),
  ('admin','journal_stock',true,false,false,false),
  ('admin','lignes',true,true,true,true),
  ('admin','machines',true,true,true,true),
  ('admin','notifications',true,true,true,true),
  ('admin','notifications_rules',true,true,true,true),
  ('admin','of',true,true,true,true),
  ('admin','organes',true,true,true,true),
  ('admin','parametres',true,true,true,true),
  ('admin','pdr',true,true,true,true),
  ('admin','pdr_demandes',true,true,true,true),
  ('admin','pdr_stock_config',true,true,true,true),
  ('admin','preventif',true,true,true,true),
  ('admin','produits',true,true,true,true),
  ('admin','qualite',true,true,true,true),
  ('admin','qualite_actions',true,true,true,true),
  ('admin','qualite_controles',true,true,true,true),
  ('admin','qualite_dashboard',true,true,true,true),
  ('admin','qualite_indicateurs',true,true,true,true),
  ('admin','qualite_nc',true,true,true,true),
  ('admin','qualite_of',true,true,true,true),
  ('admin','qualite_parametres',true,true,true,true),
  ('admin','qualite_rapports',true,true,true,true),
  ('admin','qualite_recettes',true,true,true,true),
  ('admin','qualite_shift',true,true,true,true),
  ('admin','qualite_tracabilite',true,true,true,true),
  ('admin','recettes',true,true,true,true),
  ('admin','recherche',true,true,true,true),
  ('admin','referentiels',true,true,true,true),
  ('admin','securite',true,true,true,true),
  ('admin','shift_magasin',true,true,true,true),
  ('admin','shift_maintenance',true,true,true,true),
  ('admin','shift_production',true,true,true,true),
  ('admin','smtp',true,true,true,true),
  ('admin','tickets',true,true,true,true),
  ('admin','utilisateurs',true,true,true,true),
  ('admin','validations',true,true,true,true),
  ('admin','validations_rules',true,true,true,true),
  ('resp_maintenance','analytiques',true,true,true,true),
  ('resp_maintenance','apps',true,false,false,false),
  ('resp_maintenance','arrets',true,false,false,false),
  ('resp_maintenance','articles',true,false,false,false),
  ('resp_maintenance','audit',true,false,false,false),
  ('resp_maintenance','consommations',true,false,false,false),
  ('resp_maintenance','dashboard',true,true,true,true),
  ('resp_maintenance','documents',false,false,false,false),
  ('resp_maintenance','equipements',true,false,false,false),
  ('resp_maintenance','general',false,false,false,false),
  ('resp_maintenance','gpao_dashboard',true,false,false,false),
  ('resp_maintenance','historique',true,true,true,true),
  ('resp_maintenance','images',false,false,false,false),
  ('resp_maintenance','inventaire',true,false,false,false),
  ('resp_maintenance','inventaire_campagnes',false,false,false,false),
  ('resp_maintenance','journal',true,true,true,true),
  ('resp_maintenance','lignes',true,false,false,false),
  ('resp_maintenance','machines',true,false,false,false),
  ('resp_maintenance','notifications',true,true,true,false),
  ('resp_maintenance','notifications_rules',false,false,false,false),
  ('resp_maintenance','of',true,false,false,false),
  ('resp_maintenance','organes',true,false,false,false),
  ('resp_maintenance','parametres',true,false,false,false),
  ('resp_maintenance','pdr',true,false,false,false),
  ('resp_maintenance','pdr_stock_config',false,false,false,false),
  ('resp_maintenance','preventif',true,true,true,true),
  ('resp_maintenance','produits',true,false,false,false),
  ('resp_maintenance','qualite',true,false,false,false),
  ('resp_maintenance','qualite_actions',false,false,false,false),
  ('resp_maintenance','qualite_controles',false,false,false,false),
  ('resp_maintenance','qualite_dashboard',false,false,false,false),
  ('resp_maintenance','qualite_indicateurs',false,false,false,false),
  ('resp_maintenance','qualite_nc',false,false,false,false),
  ('resp_maintenance','qualite_of',false,false,false,false),
  ('resp_maintenance','qualite_parametres',false,false,false,false),
  ('resp_maintenance','qualite_rapports',false,false,false,false),
  ('resp_maintenance','qualite_recettes',false,false,false,false),
  ('resp_maintenance','qualite_shift',false,false,false,false),
  ('resp_maintenance','qualite_tracabilite',false,false,false,false),
  ('resp_maintenance','recettes',true,false,false,false),
  ('resp_maintenance','recherche',true,false,false,false),
  ('resp_maintenance','referentiels',true,false,false,false),
  ('resp_maintenance','securite',false,false,false,false),
  ('resp_maintenance','shift_maintenance',true,true,true,true),
  ('resp_maintenance','shift_production',true,false,false,false),
  ('resp_maintenance','smtp',false,false,false,false),
  ('resp_maintenance','tickets',true,true,true,true),
  ('resp_maintenance','utilisateurs',false,false,false,false),
  ('resp_maintenance','validations',true,true,true,false),
  ('resp_maintenance','validations_rules',false,false,false,false),
  ('maintenancier','analytiques',true,false,false,false),
  ('maintenancier','apps',true,false,false,false),
  ('maintenancier','arrets',false,false,false,false),
  ('maintenancier','articles',false,false,false,false),
  ('maintenancier','audit',false,false,false,false),
  ('maintenancier','consommations',false,false,false,false),
  ('maintenancier','dashboard',true,true,true,false),
  ('maintenancier','documents',false,false,false,false),
  ('maintenancier','equipements',true,false,false,false),
  ('maintenancier','general',false,false,false,false),
  ('maintenancier','gpao_dashboard',false,false,false,false),
  ('maintenancier','historique',true,false,false,false),
  ('maintenancier','images',false,false,false,false),
  ('maintenancier','inventaire',false,false,false,false),
  ('maintenancier','inventaire_campagnes',false,false,false,false),
  ('maintenancier','journal',true,false,false,false),
  ('maintenancier','lignes',true,false,false,false),
  ('maintenancier','machines',true,false,false,false),
  ('maintenancier','notifications',true,false,false,false),
  ('maintenancier','notifications_rules',false,false,false,false),
  ('maintenancier','of',false,false,false,false),
  ('maintenancier','organes',true,false,false,false),
  ('maintenancier','parametres',false,false,false,false),
  ('maintenancier','pdr',true,false,false,false),
  ('maintenancier','pdr_stock_config',false,false,false,false),
  ('maintenancier','preventif',true,false,false,false),
  ('maintenancier','produits',false,false,false,false),
  ('maintenancier','qualite',false,false,false,false),
  ('maintenancier','qualite_actions',false,false,false,false),
  ('maintenancier','qualite_controles',false,false,false,false),
  ('maintenancier','qualite_dashboard',false,false,false,false),
  ('maintenancier','qualite_indicateurs',false,false,false,false),
  ('maintenancier','qualite_nc',false,false,false,false),
  ('maintenancier','qualite_of',false,false,false,false),
  ('maintenancier','qualite_parametres',false,false,false,false),
  ('maintenancier','qualite_rapports',false,false,false,false),
  ('maintenancier','qualite_recettes',false,false,false,false),
  ('maintenancier','qualite_shift',false,false,false,false),
  ('maintenancier','qualite_tracabilite',false,false,false,false),
  ('maintenancier','recettes',false,false,false,false),
  ('maintenancier','recherche',true,false,false,false),
  ('maintenancier','referentiels',false,false,false,false),
  ('maintenancier','securite',false,false,false,false),
  ('maintenancier','shift_maintenance',true,true,true,false),
  ('maintenancier','shift_production',false,false,false,false),
  ('maintenancier','smtp',false,false,false,false),
  ('maintenancier','tickets',true,true,true,true),
  ('maintenancier','utilisateurs',false,false,false,false),
  ('maintenancier','validations',false,false,false,false),
  ('maintenancier','validations_rules',false,false,false,false),
  ('resp_production','analytiques',true,false,false,false),
  ('resp_production','apps',true,false,false,false),
  ('resp_production','arrets',true,true,true,true),
  ('resp_production','articles',true,true,true,true),
  ('resp_production','audit',true,false,false,false),
  ('resp_production','consommations',true,true,true,true),
  ('resp_production','dashboard',true,false,false,false),
  ('resp_production','documents',false,false,false,false),
  ('resp_production','equipements',true,false,false,false),
  ('resp_production','general',false,false,false,false),
  ('resp_production','gpao_dashboard',true,true,true,true),
  ('resp_production','historique',true,false,false,false),
  ('resp_production','images',false,false,false,false),
  ('resp_production','inventaire',true,false,false,false),
  ('resp_production','inventaire_campagnes',false,false,false,false),
  ('resp_production','journal',true,false,false,false),
  ('resp_production','lignes',true,false,false,false),
  ('resp_production','machines',true,false,false,false),
  ('resp_production','notifications',true,true,true,false),
  ('resp_production','notifications_rules',false,false,false,false),
  ('resp_production','of',true,true,true,true),
  ('resp_production','organes',true,false,false,false),
  ('resp_production','parametres',true,false,false,false),
  ('resp_production','pdr',true,false,false,false),
  ('resp_production','pdr_stock_config',false,false,false,false),
  ('resp_production','preventif',true,false,false,false),
  ('resp_production','produits',true,false,false,false),
  ('resp_production','qualite',true,false,false,false),
  ('resp_production','qualite_actions',false,false,false,false),
  ('resp_production','qualite_controles',false,false,false,false),
  ('resp_production','qualite_dashboard',false,false,false,false),
  ('resp_production','qualite_indicateurs',false,false,false,false),
  ('resp_production','qualite_nc',false,false,false,false),
  ('resp_production','qualite_of',false,false,false,false),
  ('resp_production','qualite_parametres',false,false,false,false),
  ('resp_production','qualite_rapports',false,false,false,false),
  ('resp_production','qualite_recettes',false,false,false,false),
  ('resp_production','qualite_shift',false,false,false,false),
  ('resp_production','qualite_tracabilite',false,false,false,false),
  ('resp_production','recettes',true,false,false,false),
  ('resp_production','recherche',true,false,false,false),
  ('resp_production','referentiels',false,false,false,false),
  ('resp_production','securite',false,false,false,false),
  ('resp_production','shift_maintenance',true,false,false,false),
  ('resp_production','shift_production',true,true,true,true),
  ('resp_production','smtp',false,false,false,false),
  ('resp_production','tickets',true,true,false,false),
  ('resp_production','utilisateurs',false,false,false,false),
  ('resp_production','validations',true,true,true,false),
  ('resp_production','validations_rules',false,false,false,false),
  ('chef_ligne','analytiques',true,false,false,false),
  ('chef_ligne','apps',true,false,false,false),
  ('chef_ligne','arrets',true,true,true,false),
  ('chef_ligne','articles',true,false,false,false),
  ('chef_ligne','audit',false,false,false,false),
  ('chef_ligne','consommations',true,true,true,false),
  ('chef_ligne','dashboard',true,false,false,false),
  ('chef_ligne','documents',false,false,false,false),
  ('chef_ligne','equipements',true,false,false,false),
  ('chef_ligne','general',false,false,false,false),
  ('chef_ligne','gpao_dashboard',true,true,true,false),
  ('chef_ligne','historique',false,false,false,false),
  ('chef_ligne','images',false,false,false,false),
  ('chef_ligne','inventaire',false,false,false,false),
  ('chef_ligne','inventaire_campagnes',false,false,false,false),
  ('chef_ligne','journal',false,false,false,false),
  ('chef_ligne','lignes',true,false,false,false),
  ('chef_ligne','machines',true,false,false,false),
  ('chef_ligne','notifications',true,false,false,false),
  ('chef_ligne','notifications_rules',false,false,false,false),
  ('chef_ligne','of',true,true,true,false),
  ('chef_ligne','organes',true,false,false,false),
  ('chef_ligne','parametres',false,false,false,false),
  ('chef_ligne','pdr',false,false,false,false),
  ('chef_ligne','pdr_stock_config',false,false,false,false),
  ('chef_ligne','preventif',false,false,false,false),
  ('chef_ligne','produits',true,false,false,false),
  ('chef_ligne','qualite',false,false,false,false),
  ('chef_ligne','qualite_actions',false,false,false,false),
  ('chef_ligne','qualite_controles',false,false,false,false),
  ('chef_ligne','qualite_dashboard',false,false,false,false),
  ('chef_ligne','qualite_indicateurs',false,false,false,false),
  ('chef_ligne','qualite_nc',false,false,false,false),
  ('chef_ligne','qualite_of',false,false,false,false),
  ('chef_ligne','qualite_parametres',false,false,false,false),
  ('chef_ligne','qualite_rapports',false,false,false,false),
  ('chef_ligne','qualite_recettes',false,false,false,false),
  ('chef_ligne','qualite_shift',false,false,false,false),
  ('chef_ligne','qualite_tracabilite',false,false,false,false),
  ('chef_ligne','recettes',true,false,false,false),
  ('chef_ligne','recherche',true,false,false,false),
  ('chef_ligne','referentiels',false,false,false,false),
  ('chef_ligne','securite',false,false,false,false),
  ('chef_ligne','shift_maintenance',false,false,false,false),
  ('chef_ligne','shift_production',true,true,true,false),
  ('chef_ligne','smtp',false,false,false,false),
  ('chef_ligne','tickets',true,true,false,false),
  ('chef_ligne','utilisateurs',false,false,false,false),
  ('chef_ligne','validations',false,false,false,false),
  ('chef_ligne','validations_rules',false,false,false,false),
  ('operateur','analytiques',false,false,false,false),
  ('operateur','apps',true,false,false,false),
  ('operateur','arrets',true,true,true,false),
  ('operateur','articles',true,false,false,false),
  ('operateur','audit',false,false,false,false),
  ('operateur','consommations',true,true,true,false),
  ('operateur','dashboard',true,false,false,false),
  ('operateur','documents',false,false,false,false),
  ('operateur','equipements',false,false,false,false),
  ('operateur','general',false,false,false,false),
  ('operateur','gpao_dashboard',true,false,false,false),
  ('operateur','historique',false,false,false,false),
  ('operateur','images',false,false,false,false),
  ('operateur','inventaire',false,false,false,false),
  ('operateur','inventaire_campagnes',false,false,false,false),
  ('operateur','journal',false,false,false,false),
  ('operateur','lignes',true,false,false,false),
  ('operateur','machines',true,false,false,false),
  ('operateur','notifications',true,false,false,false),
  ('operateur','notifications_rules',false,false,false,false),
  ('operateur','of',true,false,false,false),
  ('operateur','organes',false,false,false,false),
  ('operateur','parametres',false,false,false,false),
  ('operateur','pdr',false,false,false,false),
  ('operateur','pdr_stock_config',false,false,false,false),
  ('operateur','preventif',false,false,false,false),
  ('operateur','produits',true,false,false,false),
  ('operateur','qualite',false,false,false,false),
  ('operateur','qualite_actions',false,false,false,false),
  ('operateur','qualite_controles',false,false,false,false),
  ('operateur','qualite_dashboard',false,false,false,false),
  ('operateur','qualite_indicateurs',false,false,false,false),
  ('operateur','qualite_nc',false,false,false,false),
  ('operateur','qualite_of',false,false,false,false),
  ('operateur','qualite_parametres',false,false,false,false),
  ('operateur','qualite_rapports',false,false,false,false),
  ('operateur','qualite_recettes',false,false,false,false),
  ('operateur','qualite_shift',false,false,false,false),
  ('operateur','qualite_tracabilite',false,false,false,false),
  ('operateur','recettes',true,false,false,false),
  ('operateur','recherche',true,false,false,false),
  ('operateur','referentiels',false,false,false,false),
  ('operateur','securite',false,false,false,false),
  ('operateur','shift_maintenance',false,false,false,false),
  ('operateur','shift_production',true,true,true,false),
  ('operateur','smtp',false,false,false,false),
  ('operateur','tickets',true,true,false,false),
  ('operateur','utilisateurs',false,false,false,false),
  ('operateur','validations',false,false,false,false),
  ('operateur','validations_rules',false,false,false,false),
  ('gestionnaire_magasin','analytiques',false,false,false,false),
  ('gestionnaire_magasin','apps',true,false,false,false),
  ('gestionnaire_magasin','arrets',false,false,false,false),
  ('gestionnaire_magasin','articles',true,true,true,false),
  ('gestionnaire_magasin','audit',false,false,false,false),
  ('gestionnaire_magasin','consommations',false,false,false,false),
  ('gestionnaire_magasin','dashboard',true,false,false,false),
  ('gestionnaire_magasin','documents',false,false,false,false),
  ('gestionnaire_magasin','equipements',true,false,false,false),
  ('gestionnaire_magasin','general',false,false,false,false),
  ('gestionnaire_magasin','gpao_dashboard',false,false,false,false),
  ('gestionnaire_magasin','historique',false,false,false,false),
  ('gestionnaire_magasin','images',false,false,false,false),
  ('gestionnaire_magasin','inventaire',true,true,true,false),
  ('gestionnaire_magasin','inventaire_campagnes',true,true,true,false),
  ('gestionnaire_magasin','journal',false,false,false,false),
  ('gestionnaire_magasin','journal_stock',true,false,false,false),
  ('gestionnaire_magasin','lignes',false,false,false,false),
  ('gestionnaire_magasin','machines',true,false,false,false),
  ('gestionnaire_magasin','notifications',true,false,false,false),
  ('gestionnaire_magasin','notifications_rules',false,false,false,false),
  ('gestionnaire_magasin','of',false,false,false,false),
  ('gestionnaire_magasin','organes',true,false,false,false),
  ('gestionnaire_magasin','parametres',false,false,false,false),
  ('gestionnaire_magasin','pdr',true,true,true,true),
  ('gestionnaire_magasin','pdr_demandes',true,true,true,false),
  ('gestionnaire_magasin','pdr_stock_config',false,false,false,false),
  ('gestionnaire_magasin','preventif',false,false,false,false),
  ('gestionnaire_magasin','produits',false,false,false,false),
  ('gestionnaire_magasin','qualite',false,false,false,false),
  ('gestionnaire_magasin','qualite_actions',false,false,false,false),
  ('gestionnaire_magasin','qualite_controles',false,false,false,false),
  ('gestionnaire_magasin','qualite_dashboard',false,false,false,false),
  ('gestionnaire_magasin','qualite_indicateurs',false,false,false,false),
  ('gestionnaire_magasin','qualite_nc',false,false,false,false),
  ('gestionnaire_magasin','qualite_of',false,false,false,false),
  ('gestionnaire_magasin','qualite_parametres',false,false,false,false),
  ('gestionnaire_magasin','qualite_rapports',false,false,false,false),
  ('gestionnaire_magasin','qualite_recettes',false,false,false,false),
  ('gestionnaire_magasin','qualite_shift',false,false,false,false),
  ('gestionnaire_magasin','qualite_tracabilite',false,false,false,false),
  ('gestionnaire_magasin','recettes',false,false,false,false),
  ('gestionnaire_magasin','recherche',true,false,false,false),
  ('gestionnaire_magasin','referentiels',false,false,false,false),
  ('gestionnaire_magasin','securite',false,false,false,false),
  ('gestionnaire_magasin','shift_magasin',true,true,true,false),
  ('gestionnaire_magasin','shift_maintenance',false,false,false,false),
  ('gestionnaire_magasin','shift_production',false,false,false,false),
  ('gestionnaire_magasin','smtp',false,false,false,false),
  ('gestionnaire_magasin','tickets',false,false,false,false),
  ('gestionnaire_magasin','utilisateurs',false,false,false,false),
  ('gestionnaire_magasin','validations',false,false,false,false),
  ('gestionnaire_magasin','validations_rules',false,false,false,false),
  ('bureau_methode','analytiques',true,false,false,false),
  ('bureau_methode','apps',true,false,false,false),
  ('bureau_methode','arrets',false,false,false,false),
  ('bureau_methode','articles',false,false,false,false),
  ('bureau_methode','audit',false,false,false,false),
  ('bureau_methode','consommations',false,false,false,false),
  ('bureau_methode','dashboard',true,true,true,false),
  ('bureau_methode','documents',false,false,false,false),
  ('bureau_methode','equipements',true,true,true,false),
  ('bureau_methode','general',false,false,false,false),
  ('bureau_methode','gpao_dashboard',false,false,false,false),
  ('bureau_methode','historique',true,true,true,false),
  ('bureau_methode','images',false,false,false,false),
  ('bureau_methode','inventaire',false,false,false,false),
  ('bureau_methode','inventaire_campagnes',false,false,false,false),
  ('bureau_methode','journal',true,true,true,false),
  ('bureau_methode','lignes',true,true,true,false),
  ('bureau_methode','machines',true,true,true,false),
  ('bureau_methode','notifications',true,false,false,false),
  ('bureau_methode','notifications_rules',false,false,false,false),
  ('bureau_methode','of',false,false,false,false),
  ('bureau_methode','organes',true,true,true,false),
  ('bureau_methode','parametres',false,false,false,false),
  ('bureau_methode','pdr',true,true,true,false),
  ('bureau_methode','pdr_stock_config',false,false,false,false),
  ('bureau_methode','preventif',true,true,true,true),
  ('bureau_methode','produits',false,false,false,false),
  ('bureau_methode','qualite',false,false,false,false),
  ('bureau_methode','qualite_actions',false,false,false,false),
  ('bureau_methode','qualite_controles',false,false,false,false),
  ('bureau_methode','qualite_dashboard',false,false,false,false),
  ('bureau_methode','qualite_indicateurs',false,false,false,false),
  ('bureau_methode','qualite_nc',false,false,false,false),
  ('bureau_methode','qualite_of',false,false,false,false),
  ('bureau_methode','qualite_parametres',false,false,false,false),
  ('bureau_methode','qualite_rapports',false,false,false,false),
  ('bureau_methode','qualite_recettes',false,false,false,false),
  ('bureau_methode','qualite_shift',false,false,false,false),
  ('bureau_methode','qualite_tracabilite',false,false,false,false),
  ('bureau_methode','recettes',true,false,false,false),
  ('bureau_methode','recherche',true,false,false,false),
  ('bureau_methode','referentiels',false,false,false,false),
  ('bureau_methode','securite',false,false,false,false),
  ('bureau_methode','shift_maintenance',true,true,true,false),
  ('bureau_methode','shift_production',false,false,false,false),
  ('bureau_methode','smtp',false,false,false,false),
  ('bureau_methode','tickets',true,true,true,false),
  ('bureau_methode','utilisateurs',false,false,false,false),
  ('bureau_methode','validations',false,false,false,false),
  ('bureau_methode','validations_rules',false,false,false,false),
  ('responsable_si','analytiques',true,true,true,true),
  ('responsable_si','apps',true,true,true,true),
  ('responsable_si','arrets',true,true,true,true),
  ('responsable_si','articles',true,true,true,true),
  ('responsable_si','audit',true,true,true,true),
  ('responsable_si','consommations',true,true,true,true),
  ('responsable_si','dashboard',true,true,true,true),
  ('responsable_si','documents',true,true,true,true),
  ('responsable_si','equipements',true,true,true,true),
  ('responsable_si','general',true,true,true,true),
  ('responsable_si','gpao_dashboard',true,true,true,true),
  ('responsable_si','historique',true,true,true,true),
  ('responsable_si','images',true,true,true,true),
  ('responsable_si','inventaire',true,true,true,true),
  ('responsable_si','inventaire_campagnes',true,true,true,true),
  ('responsable_si','journal',true,true,true,true),
  ('responsable_si','lignes',true,true,true,true),
  ('responsable_si','machines',true,true,true,true),
  ('responsable_si','notifications',true,true,true,true),
  ('responsable_si','notifications_rules',true,true,true,true),
  ('responsable_si','of',true,true,true,true),
  ('responsable_si','organes',true,true,true,true),
  ('responsable_si','parametres',true,true,true,true),
  ('responsable_si','pdr',true,true,true,true),
  ('responsable_si','pdr_stock_config',true,true,true,true),
  ('responsable_si','preventif',true,true,true,true),
  ('responsable_si','produits',true,true,true,true),
  ('responsable_si','qualite',true,true,true,true),
  ('responsable_si','qualite_actions',true,true,true,true),
  ('responsable_si','qualite_controles',true,true,true,true),
  ('responsable_si','qualite_dashboard',true,true,true,true),
  ('responsable_si','qualite_indicateurs',true,true,true,true),
  ('responsable_si','qualite_nc',true,true,true,true),
  ('responsable_si','qualite_of',true,true,true,true),
  ('responsable_si','qualite_parametres',true,true,true,true),
  ('responsable_si','qualite_rapports',true,true,true,true),
  ('responsable_si','qualite_recettes',true,true,true,true),
  ('responsable_si','qualite_shift',true,true,true,true),
  ('responsable_si','qualite_tracabilite',true,true,true,true),
  ('responsable_si','recettes',true,true,true,true),
  ('responsable_si','recherche',true,true,true,true),
  ('responsable_si','referentiels',true,true,true,true),
  ('responsable_si','securite',true,true,true,true),
  ('responsable_si','shift_maintenance',true,true,true,true),
  ('responsable_si','shift_production',true,true,true,true),
  ('responsable_si','smtp',true,true,true,true),
  ('responsable_si','tickets',true,true,true,true),
  ('responsable_si','utilisateurs',true,true,true,true),
  ('responsable_si','validations',true,true,true,true),
  ('responsable_si','validations_rules',true,true,true,true),
  ('auditeur','analytiques',true,false,false,false),
  ('auditeur','apps',true,false,false,false),
  ('auditeur','arrets',true,false,false,false),
  ('auditeur','articles',true,false,false,false),
  ('auditeur','audit',true,false,false,false),
  ('auditeur','consommations',true,false,false,false),
  ('auditeur','dashboard',true,false,false,false),
  ('auditeur','documents',true,false,false,false),
  ('auditeur','equipements',true,false,false,false),
  ('auditeur','general',true,false,false,false),
  ('auditeur','gpao_dashboard',true,false,false,false),
  ('auditeur','historique',true,false,false,false),
  ('auditeur','images',true,false,false,false),
  ('auditeur','inventaire',true,false,false,false),
  ('auditeur','inventaire_campagnes',true,false,false,false),
  ('auditeur','journal',true,false,false,false),
  ('auditeur','lignes',true,false,false,false),
  ('auditeur','machines',true,false,false,false),
  ('auditeur','notifications',true,false,false,false),
  ('auditeur','notifications_rules',true,false,false,false),
  ('auditeur','of',true,false,false,false),
  ('auditeur','organes',true,false,false,false),
  ('auditeur','parametres',true,false,false,false),
  ('auditeur','pdr',true,false,false,false),
  ('auditeur','pdr_stock_config',true,false,false,false),
  ('auditeur','preventif',true,false,false,false),
  ('auditeur','produits',true,false,false,false),
  ('auditeur','qualite',true,false,false,false),
  ('auditeur','qualite_actions',true,false,false,false),
  ('auditeur','qualite_controles',true,false,false,false),
  ('auditeur','qualite_dashboard',true,false,false,false),
  ('auditeur','qualite_indicateurs',true,false,false,false),
  ('auditeur','qualite_nc',true,false,false,false),
  ('auditeur','qualite_of',true,false,false,false),
  ('auditeur','qualite_parametres',true,false,false,false),
  ('auditeur','qualite_rapports',true,false,false,false),
  ('auditeur','qualite_recettes',true,false,false,false),
  ('auditeur','qualite_shift',true,false,false,false),
  ('auditeur','qualite_tracabilite',true,false,false,false),
  ('auditeur','recettes',true,false,false,false),
  ('auditeur','recherche',true,false,false,false),
  ('auditeur','referentiels',true,false,false,false),
  ('auditeur','securite',true,false,false,false),
  ('auditeur','shift_maintenance',true,false,false,false),
  ('auditeur','shift_production',true,false,false,false),
  ('auditeur','smtp',true,false,false,false),
  ('auditeur','tickets',true,false,false,false),
  ('auditeur','utilisateurs',true,false,false,false),
  ('auditeur','validations',true,false,false,false),
  ('auditeur','validations_rules',true,false,false,false),
  ('controleur_qualite','analytiques',false,false,false,false),
  ('controleur_qualite','apps',true,false,false,false),
  ('controleur_qualite','arrets',false,false,false,false),
  ('controleur_qualite','articles',false,false,false,false),
  ('controleur_qualite','audit',false,false,false,false),
  ('controleur_qualite','consommations',false,false,false,false),
  ('controleur_qualite','dashboard',false,false,false,false),
  ('controleur_qualite','documents',false,false,false,false),
  ('controleur_qualite','equipements',false,false,false,false),
  ('controleur_qualite','general',false,false,false,false),
  ('controleur_qualite','gpao_dashboard',false,false,false,false),
  ('controleur_qualite','historique',false,false,false,false),
  ('controleur_qualite','images',false,false,false,false),
  ('controleur_qualite','inventaire',false,false,false,false),
  ('controleur_qualite','inventaire_campagnes',false,false,false,false),
  ('controleur_qualite','journal',false,false,false,false),
  ('controleur_qualite','lignes',true,false,false,false),
  ('controleur_qualite','machines',true,false,false,false),
  ('controleur_qualite','notifications',true,false,false,false),
  ('controleur_qualite','notifications_rules',false,false,false,false),
  ('controleur_qualite','of',true,false,false,false),
  ('controleur_qualite','organes',false,false,false,false),
  ('controleur_qualite','parametres',false,false,false,false),
  ('controleur_qualite','pdr',false,false,false,false),
  ('controleur_qualite','pdr_stock_config',false,false,false,false),
  ('controleur_qualite','preventif',false,false,false,false),
  ('controleur_qualite','produits',true,false,false,false),
  ('controleur_qualite','qualite',true,true,true,false),
  ('controleur_qualite','qualite_actions',true,false,false,false),
  ('controleur_qualite','qualite_controles',true,true,true,false),
  ('controleur_qualite','qualite_dashboard',true,false,false,false),
  ('controleur_qualite','qualite_indicateurs',true,false,false,false),
  ('controleur_qualite','qualite_nc',true,true,true,false),
  ('controleur_qualite','qualite_of',true,false,false,false),
  ('controleur_qualite','qualite_parametres',false,false,false,false),
  ('controleur_qualite','qualite_rapports',true,false,false,false),
  ('controleur_qualite','qualite_recettes',true,false,false,false),
  ('controleur_qualite','qualite_shift',true,true,true,false),
  ('controleur_qualite','qualite_tracabilite',true,false,false,false),
  ('controleur_qualite','recettes',false,false,false,false),
  ('controleur_qualite','recherche',true,false,false,false),
  ('controleur_qualite','referentiels',false,false,false,false),
  ('controleur_qualite','securite',false,false,false,false),
  ('controleur_qualite','shift_maintenance',false,false,false,false),
  ('controleur_qualite','shift_production',false,false,false,false),
  ('controleur_qualite','smtp',false,false,false,false),
  ('controleur_qualite','tickets',false,false,false,false),
  ('controleur_qualite','utilisateurs',false,false,false,false),
  ('controleur_qualite','validations',false,false,false,false),
  ('controleur_qualite','validations_rules',false,false,false,false),
  ('responsable_controle_qualite','analytiques',true,false,false,false),
  ('responsable_controle_qualite','apps',true,false,false,false),
  ('responsable_controle_qualite','arrets',false,false,false,false),
  ('responsable_controle_qualite','articles',true,false,false,false),
  ('responsable_controle_qualite','audit',false,false,false,false),
  ('responsable_controle_qualite','consommations',false,false,false,false),
  ('responsable_controle_qualite','dashboard',true,false,false,false),
  ('responsable_controle_qualite','documents',false,false,false,false),
  ('responsable_controle_qualite','equipements',false,false,false,false),
  ('responsable_controle_qualite','general',false,false,false,false),
  ('responsable_controle_qualite','gpao_dashboard',false,false,false,false),
  ('responsable_controle_qualite','historique',false,false,false,false),
  ('responsable_controle_qualite','images',false,false,false,false),
  ('responsable_controle_qualite','inventaire',false,false,false,false),
  ('responsable_controle_qualite','inventaire_campagnes',false,false,false,false),
  ('responsable_controle_qualite','journal',false,false,false,false),
  ('responsable_controle_qualite','lignes',true,false,false,false),
  ('responsable_controle_qualite','machines',true,false,false,false),
  ('responsable_controle_qualite','notifications',true,true,true,false),
  ('responsable_controle_qualite','notifications_rules',false,false,false,false),
  ('responsable_controle_qualite','of',true,false,false,false),
  ('responsable_controle_qualite','organes',false,false,false,false),
  ('responsable_controle_qualite','parametres',false,false,false,false),
  ('responsable_controle_qualite','pdr',false,false,false,false),
  ('responsable_controle_qualite','pdr_stock_config',false,false,false,false),
  ('responsable_controle_qualite','preventif',false,false,false,false),
  ('responsable_controle_qualite','produits',true,true,true,false),
  ('responsable_controle_qualite','qualite',true,true,true,true),
  ('responsable_controle_qualite','qualite_actions',true,true,true,true),
  ('responsable_controle_qualite','qualite_controles',true,true,true,true),
  ('responsable_controle_qualite','qualite_dashboard',true,true,true,true),
  ('responsable_controle_qualite','qualite_indicateurs',true,true,true,true),
  ('responsable_controle_qualite','qualite_nc',true,true,true,true),
  ('responsable_controle_qualite','qualite_of',true,true,true,true),
  ('responsable_controle_qualite','qualite_parametres',true,true,true,false),
  ('responsable_controle_qualite','qualite_rapports',true,true,true,true),
  ('responsable_controle_qualite','qualite_recettes',true,true,true,true),
  ('responsable_controle_qualite','qualite_shift',true,true,true,true),
  ('responsable_controle_qualite','qualite_tracabilite',true,true,true,true),
  ('responsable_controle_qualite','recettes',true,true,true,false),
  ('responsable_controle_qualite','recherche',true,false,false,false),
  ('responsable_controle_qualite','referentiels',false,false,false,false),
  ('responsable_controle_qualite','securite',false,false,false,false),
  ('responsable_controle_qualite','shift_maintenance',false,false,false,false),
  ('responsable_controle_qualite','shift_production',false,false,false,false),
  ('responsable_controle_qualite','smtp',false,false,false,false),
  ('responsable_controle_qualite','tickets',false,false,false,false),
  ('responsable_controle_qualite','utilisateurs',false,false,false,false),
  ('responsable_controle_qualite','validations',false,false,false,false),
  ('responsable_controle_qualite','validations_rules',false,false,false,false),
  ('directeur_qualite','analytiques',true,false,false,false),
  ('directeur_qualite','apps',true,false,false,false),
  ('directeur_qualite','arrets',true,false,false,false),
  ('directeur_qualite','articles',true,false,false,false),
  ('directeur_qualite','audit',true,false,false,false),
  ('directeur_qualite','consommations',true,false,false,false),
  ('directeur_qualite','dashboard',true,false,false,false),
  ('directeur_qualite','documents',false,false,false,false),
  ('directeur_qualite','equipements',true,false,false,false),
  ('directeur_qualite','general',false,false,false,false),
  ('directeur_qualite','gpao_dashboard',true,false,false,false),
  ('directeur_qualite','historique',true,false,false,false),
  ('directeur_qualite','images',false,false,false,false),
  ('directeur_qualite','inventaire',false,false,false,false),
  ('directeur_qualite','inventaire_campagnes',false,false,false,false),
  ('directeur_qualite','journal',true,false,false,false),
  ('directeur_qualite','lignes',true,false,false,false),
  ('directeur_qualite','machines',true,false,false,false),
  ('directeur_qualite','notifications',true,true,true,false),
  ('directeur_qualite','notifications_rules',false,false,false,false),
  ('directeur_qualite','of',true,false,false,false),
  ('directeur_qualite','organes',true,false,false,false),
  ('directeur_qualite','parametres',true,false,false,false),
  ('directeur_qualite','pdr',true,false,false,false),
  ('directeur_qualite','pdr_stock_config',false,false,false,false),
  ('directeur_qualite','preventif',true,false,false,false),
  ('directeur_qualite','produits',true,true,true,true),
  ('directeur_qualite','qualite',true,true,true,true),
  ('directeur_qualite','qualite_actions',true,true,true,true),
  ('directeur_qualite','qualite_controles',true,true,true,true),
  ('directeur_qualite','qualite_dashboard',true,true,true,true),
  ('directeur_qualite','qualite_indicateurs',true,true,true,true),
  ('directeur_qualite','qualite_nc',true,true,true,true),
  ('directeur_qualite','qualite_of',true,true,true,true),
  ('directeur_qualite','qualite_parametres',true,true,true,false),
  ('directeur_qualite','qualite_rapports',true,true,true,true),
  ('directeur_qualite','qualite_recettes',true,true,true,true),
  ('directeur_qualite','qualite_shift',true,true,true,true),
  ('directeur_qualite','qualite_tracabilite',true,true,true,true),
  ('directeur_qualite','recettes',true,true,true,true),
  ('directeur_qualite','recherche',true,false,false,false),
  ('directeur_qualite','referentiels',false,false,false,false),
  ('directeur_qualite','securite',false,false,false,false),
  ('directeur_qualite','shift_maintenance',true,false,false,false),
  ('directeur_qualite','shift_production',true,false,false,false),
  ('directeur_qualite','smtp',false,false,false,false),
  ('directeur_qualite','tickets',true,false,false,false),
  ('directeur_qualite','utilisateurs',false,false,false,false),
  ('directeur_qualite','validations',true,true,true,false),
  ('directeur_qualite','validations_rules',false,false,false,false),
  ('responsable_inventaire','analytiques',true,false,false,false),
  ('responsable_inventaire','apps',true,false,false,false),
  ('responsable_inventaire','arrets',false,false,false,false),
  ('responsable_inventaire','articles',true,false,false,false),
  ('responsable_inventaire','audit',false,false,false,false),
  ('responsable_inventaire','consommations',false,false,false,false),
  ('responsable_inventaire','dashboard',true,false,false,false),
  ('responsable_inventaire','documents',false,false,false,false),
  ('responsable_inventaire','equipements',false,false,false,false),
  ('responsable_inventaire','general',false,false,false,false),
  ('responsable_inventaire','gpao_dashboard',false,false,false,false),
  ('responsable_inventaire','historique',false,false,false,false),
  ('responsable_inventaire','images',false,false,false,false),
  ('responsable_inventaire','inventaire',true,true,true,true),
  ('responsable_inventaire','inventaire_campagnes',true,true,true,true),
  ('responsable_inventaire','journal',false,false,false,false),
  ('responsable_inventaire','lignes',false,false,false,false),
  ('responsable_inventaire','machines',true,false,false,false),
  ('responsable_inventaire','notifications',true,true,true,false),
  ('responsable_inventaire','notifications_rules',false,false,false,false),
  ('responsable_inventaire','of',false,false,false,false),
  ('responsable_inventaire','organes',true,false,false,false),
  ('responsable_inventaire','parametres',false,false,false,false),
  ('responsable_inventaire','pdr',true,true,true,false),
  ('responsable_inventaire','pdr_stock_config',false,false,false,false),
  ('responsable_inventaire','preventif',false,false,false,false),
  ('responsable_inventaire','produits',false,false,false,false),
  ('responsable_inventaire','qualite',false,false,false,false),
  ('responsable_inventaire','qualite_actions',false,false,false,false),
  ('responsable_inventaire','qualite_controles',false,false,false,false),
  ('responsable_inventaire','qualite_dashboard',false,false,false,false),
  ('responsable_inventaire','qualite_indicateurs',false,false,false,false),
  ('responsable_inventaire','qualite_nc',false,false,false,false),
  ('responsable_inventaire','qualite_of',false,false,false,false),
  ('responsable_inventaire','qualite_parametres',false,false,false,false),
  ('responsable_inventaire','qualite_rapports',false,false,false,false),
  ('responsable_inventaire','qualite_recettes',false,false,false,false),
  ('responsable_inventaire','qualite_shift',false,false,false,false),
  ('responsable_inventaire','qualite_tracabilite',false,false,false,false),
  ('responsable_inventaire','recettes',false,false,false,false),
  ('responsable_inventaire','recherche',true,false,false,false),
  ('responsable_inventaire','referentiels',false,false,false,false),
  ('responsable_inventaire','securite',false,false,false,false),
  ('responsable_inventaire','shift_maintenance',false,false,false,false),
  ('responsable_inventaire','shift_production',false,false,false,false),
  ('responsable_inventaire','smtp',false,false,false,false),
  ('responsable_inventaire','tickets',false,false,false,false),
  ('responsable_inventaire','utilisateurs',false,false,false,false),
  ('responsable_inventaire','validations',false,false,false,false),
  ('responsable_inventaire','validations_rules',false,false,false,false),
  ('agent_inventaire','analytiques',false,false,false,false),
  ('agent_inventaire','apps',true,false,false,false),
  ('agent_inventaire','arrets',false,false,false,false),
  ('agent_inventaire','articles',true,false,false,false),
  ('agent_inventaire','audit',false,false,false,false),
  ('agent_inventaire','consommations',false,false,false,false),
  ('agent_inventaire','dashboard',false,false,false,false),
  ('agent_inventaire','documents',false,false,false,false),
  ('agent_inventaire','equipements',false,false,false,false),
  ('agent_inventaire','general',false,false,false,false),
  ('agent_inventaire','gpao_dashboard',false,false,false,false),
  ('agent_inventaire','historique',false,false,false,false),
  ('agent_inventaire','images',false,false,false,false),
  ('agent_inventaire','inventaire',true,true,true,false),
  ('agent_inventaire','inventaire_campagnes',true,true,true,false),
  ('agent_inventaire','journal',false,false,false,false),
  ('agent_inventaire','lignes',false,false,false,false),
  ('agent_inventaire','machines',true,false,false,false),
  ('agent_inventaire','notifications',false,false,false,false),
  ('agent_inventaire','notifications_rules',false,false,false,false),
  ('agent_inventaire','of',false,false,false,false),
  ('agent_inventaire','organes',true,false,false,false),
  ('agent_inventaire','parametres',false,false,false,false),
  ('agent_inventaire','pdr',true,false,false,false),
  ('agent_inventaire','pdr_stock_config',false,false,false,false),
  ('agent_inventaire','preventif',false,false,false,false),
  ('agent_inventaire','produits',false,false,false,false),
  ('agent_inventaire','qualite',false,false,false,false),
  ('agent_inventaire','qualite_actions',false,false,false,false),
  ('agent_inventaire','qualite_controles',false,false,false,false),
  ('agent_inventaire','qualite_dashboard',false,false,false,false),
  ('agent_inventaire','qualite_indicateurs',false,false,false,false),
  ('agent_inventaire','qualite_nc',false,false,false,false),
  ('agent_inventaire','qualite_of',false,false,false,false),
  ('agent_inventaire','qualite_parametres',false,false,false,false),
  ('agent_inventaire','qualite_rapports',false,false,false,false),
  ('agent_inventaire','qualite_recettes',false,false,false,false),
  ('agent_inventaire','qualite_shift',false,false,false,false),
  ('agent_inventaire','qualite_tracabilite',false,false,false,false),
  ('agent_inventaire','recettes',false,false,false,false),
  ('agent_inventaire','recherche',true,false,false,false),
  ('agent_inventaire','referentiels',false,false,false,false),
  ('agent_inventaire','securite',false,false,false,false),
  ('agent_inventaire','shift_maintenance',false,false,false,false),
  ('agent_inventaire','shift_production',false,false,false,false),
  ('agent_inventaire','smtp',false,false,false,false),
  ('agent_inventaire','tickets',false,false,false,false),
  ('agent_inventaire','utilisateurs',false,false,false,false),
  ('agent_inventaire','validations',false,false,false,false),
  ('agent_inventaire','validations_rules',false,false,false,false),
  ('responsable_magasin','analytiques',true,false,false,false),
  ('responsable_magasin','apps',true,false,false,false),
  ('responsable_magasin','arrets',false,false,false,false),
  ('responsable_magasin','articles',true,true,true,false),
  ('responsable_magasin','audit',true,false,false,false),
  ('responsable_magasin','consommations',false,false,false,false),
  ('responsable_magasin','dashboard',true,false,false,false),
  ('responsable_magasin','documents',true,false,false,false),
  ('responsable_magasin','equipements',true,false,false,false),
  ('responsable_magasin','general',false,false,false,false),
  ('responsable_magasin','gpao_dashboard',false,false,false,false),
  ('responsable_magasin','historique',true,false,false,false),
  ('responsable_magasin','images',false,false,false,false),
  ('responsable_magasin','inventaire',true,true,true,false),
  ('responsable_magasin','inventaire_campagnes',true,true,true,false),
  ('responsable_magasin','journal',true,false,false,false),
  ('responsable_magasin','journal_stock',true,true,true,true),
  ('responsable_magasin','lignes',false,false,false,false),
  ('responsable_magasin','machines',true,false,false,false),
  ('responsable_magasin','notifications',true,false,false,false),
  ('responsable_magasin','notifications_rules',false,false,false,false),
  ('responsable_magasin','of',false,false,false,false),
  ('responsable_magasin','organes',true,false,false,false),
  ('responsable_magasin','parametres',false,false,false,false),
  ('responsable_magasin','pdr',true,true,true,true),
  ('responsable_magasin','pdr_demandes',true,true,true,true),
  ('responsable_magasin','pdr_stock_config',true,true,true,true),
  ('responsable_magasin','preventif',false,false,false,false),
  ('responsable_magasin','produits',false,false,false,false),
  ('responsable_magasin','qualite',false,false,false,false),
  ('responsable_magasin','qualite_actions',false,false,false,false),
  ('responsable_magasin','qualite_controles',false,false,false,false),
  ('responsable_magasin','qualite_dashboard',false,false,false,false),
  ('responsable_magasin','qualite_indicateurs',false,false,false,false),
  ('responsable_magasin','qualite_nc',false,false,false,false),
  ('responsable_magasin','qualite_of',false,false,false,false),
  ('responsable_magasin','qualite_parametres',false,false,false,false),
  ('responsable_magasin','qualite_rapports',false,false,false,false),
  ('responsable_magasin','qualite_recettes',false,false,false,false),
  ('responsable_magasin','qualite_shift',false,false,false,false),
  ('responsable_magasin','qualite_tracabilite',false,false,false,false),
  ('responsable_magasin','recettes',false,false,false,false),
  ('responsable_magasin','recherche',true,false,false,false),
  ('responsable_magasin','referentiels',false,false,false,false),
  ('responsable_magasin','securite',false,false,false,false),
  ('responsable_magasin','shift_magasin',true,true,true,true),
  ('responsable_magasin','shift_maintenance',false,false,false,false),
  ('responsable_magasin','shift_production',false,false,false,false),
  ('responsable_magasin','smtp',false,false,false,false),
  ('responsable_magasin','tickets',false,false,false,false),
  ('responsable_magasin','utilisateurs',false,false,false,false),
  ('responsable_magasin','validations',false,false,false,false),
  ('responsable_magasin','validations_rules',false,false,false,false)
ON CONFLICT (role, module) DO UPDATE
  SET can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete;


-- =============================================================================
-- FIN DU BASELINE
-- =============================================================================
