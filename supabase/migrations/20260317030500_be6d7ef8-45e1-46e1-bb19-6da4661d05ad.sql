
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  description text DEFAULT '',
  is_secret boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App settings viewable by authenticated"
ON public.app_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage app settings"
ON public.app_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed SMTP settings
INSERT INTO public.app_settings (key, value, label, description, is_secret) VALUES
  ('smtp_host', '', 'Serveur SMTP', 'Adresse du serveur SMTP (ex: smtp.gmail.com)', false),
  ('smtp_port', '587', 'Port SMTP', 'Port du serveur SMTP (587 pour TLS, 465 pour SSL)', false),
  ('smtp_user', '', 'Utilisateur SMTP', 'Adresse email pour l''authentification SMTP', false),
  ('smtp_password', '', 'Mot de passe SMTP', 'Mot de passe ou App Password SMTP', true),
  ('smtp_from_email', '', 'Email expéditeur', 'Adresse email utilisée comme expéditeur', false),
  ('smtp_from_name', '', 'Nom expéditeur', 'Nom affiché comme expéditeur (ex: Mon Application)', false),
  ('app_name', 'GMAO/GPAO', 'Nom de l''application', 'Nom utilisé dans les emails et l''interface', false)
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings (key);
