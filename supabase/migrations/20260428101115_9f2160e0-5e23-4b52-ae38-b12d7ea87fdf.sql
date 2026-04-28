-- 1) Email log table
CREATE TABLE IF NOT EXISTS public.notification_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID NULL,
  subject TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT NULL,
  dedup_key TEXT NULL,
  sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_email_log_dedup ON public.notification_email_log (dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_email_log_created ON public.notification_email_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_email_log_recipient ON public.notification_email_log (recipient_user_id) WHERE recipient_user_id IS NOT NULL;

ALTER TABLE public.notification_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email log: admins and SI can view all"
ON public.notification_email_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'responsable_si'::app_role)
  OR recipient_user_id = auth.uid()
);

CREATE POLICY "Email log: authenticated can insert"
ON public.notification_email_log
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Email log: admins can update"
ON public.notification_email_log
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) Seed new app_settings keys (idempotent)
INSERT INTO public.app_settings (key, value, label, description, is_secret) VALUES
  ('smtp_secure', 'tls', 'Sécurité SMTP', 'tls | ssl | none', false),
  ('support_email', '', 'Email de support', 'Affiché dans le pied des emails', false),
  ('notif_email_enabled', 'true', 'Emails de notification activés', 'true | false', false),
  ('notif_rappel_jours_defaut', '3', 'Jours avant échéance', 'Délai pour rappel automatique', false),
  ('cron_secret', encode(gen_random_bytes(24), 'hex'), 'Secret cron interne', 'Utilisé par les jobs cron pour appeler les edge functions', true)
ON CONFLICT (key) DO NOTHING;

-- 3) Extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;