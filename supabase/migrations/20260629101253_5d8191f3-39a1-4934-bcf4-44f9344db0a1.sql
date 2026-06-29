DO $$
DECLARE
  v_email text := 'respmagasin@prod-in-time.dz';
  v_uid uuid;
  v_pwd text := 'Am@ur2027';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RETURN;
  END IF;
  v_uid := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, confirmation_token,
    recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    v_email, crypt(v_pwd, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name', 'Hakim', 'last_name', 'Benali', 'poste', 'Responsable Magasin'),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_uid, v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  INSERT INTO public.profiles (user_id, first_name, last_name, poste)
  VALUES (v_uid, 'Hakim', 'Benali', 'Responsable Magasin')
  ON CONFLICT (user_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, poste = EXCLUDED.poste;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'responsable_magasin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;