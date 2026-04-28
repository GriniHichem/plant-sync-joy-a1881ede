DO $$
DECLARE
  v_secret text;
  v_jobid bigint;
BEGIN
  SELECT value INTO v_secret FROM public.app_settings WHERE key='cron_secret';
  IF v_secret IS NULL OR v_secret = '' THEN
    v_secret := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.app_settings(key, value, label, description, is_secret)
      VALUES ('cron_secret', v_secret, 'Secret cron interne', 'Cron auth', true)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  END IF;

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname='notifications-check-deadlines';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;

  PERFORM cron.schedule(
    'notifications-check-deadlines',
    '0 6 * * *',
    format($cron$
      SELECT net.http_post(
        url := 'https://luryiclhlftqikiqkwsp.supabase.co/functions/v1/check-deadlines',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', %L),
        body := '{}'::jsonb
      );
    $cron$, v_secret)
  );
END$$;