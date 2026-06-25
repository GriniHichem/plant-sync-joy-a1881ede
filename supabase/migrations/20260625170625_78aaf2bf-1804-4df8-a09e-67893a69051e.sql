DO $$
DECLARE
  v_users jsonb := '[
    {"email":"maint1@prod-in-time.dz","first":"Karim","last":"Belhadj","role":"maintenancier"},
    {"email":"maint2@prod-in-time.dz","first":"Sofiane","last":"Mansouri","role":"maintenancier"},
    {"email":"maint3@prod-in-time.dz","first":"Yacine","last":"Bouaziz","role":"maintenancier"},
    {"email":"respmaint@prod-in-time.dz","first":"Nabil","last":"Cherif","role":"resp_maintenance"}
  ]'::jsonb;
  v_rec jsonb;
  v_uid uuid;
  v_pwd text := 'Am@ur2027';
BEGIN
  FOR v_rec IN SELECT * FROM jsonb_array_elements(v_users)
  LOOP
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_rec->>'email') THEN
      CONTINUE;
    END IF;
    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token,
      recovery_token, email_change_token_new, email_change
    ) VALUES (
      v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_rec->>'email', crypt(v_pwd, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', v_rec->>'first', 'last_name', v_rec->>'last', 'poste',
        CASE WHEN v_rec->>'role'='resp_maintenance' THEN 'Responsable Maintenance' ELSE 'Maintenancier' END),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', v_rec->>'email', 'email_verified', true),
      'email', now(), now(), now()
    );

    INSERT INTO public.profiles (user_id, first_name, last_name, poste)
    VALUES (v_uid, v_rec->>'first', v_rec->>'last',
      CASE WHEN v_rec->>'role'='resp_maintenance' THEN 'Responsable Maintenance' ELSE 'Maintenancier' END)
    ON CONFLICT (user_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, poste = EXCLUDED.poste;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, (v_rec->>'role')::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;