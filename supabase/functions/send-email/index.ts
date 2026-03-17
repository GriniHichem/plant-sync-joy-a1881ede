import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth manuelle
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Vérifier l'utilisateur
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Utilisateur non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier le rôle admin via service_role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Lire la config SMTP depuis app_settings
    const { data: settings, error: settingsError } = await adminClient
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "smtp_host", "smtp_port", "smtp_user", "smtp_password",
        "smtp_from_email", "smtp_from_name", "app_name",
      ]);

    if (settingsError) {
      return new Response(JSON.stringify({ error: "Impossible de lire la configuration SMTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config: Record<string, string> = {};
    for (const s of settings || []) {
      config[s.key] = s.value;
    }

    // Valider la config
    if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
      return new Response(JSON.stringify({ error: "Configuration SMTP incomplète. Veuillez renseigner le serveur, l'utilisateur et le mot de passe." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Lire le body de la requête
    const body = await req.json();
    const { to, subject, html, text, is_test } = body;

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "Destinataire (to) et sujet (subject) requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Configurer et envoyer via denomailer
    const port = parseInt(config.smtp_port || "587");
    const tls = port === 465;

    const client = new SMTPClient({
      connection: {
        hostname: config.smtp_host,
        port,
        tls,
        auth: {
          username: config.smtp_user,
          password: config.smtp_password,
        },
      },
    });

    const fromName = config.smtp_from_name || config.app_name || "Application";
    const fromEmail = config.smtp_from_email || config.smtp_user;

    const emailContent: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
    };

    if (html) {
      emailContent.html = html;
      emailContent.content = text || "Veuillez utiliser un client email supportant le HTML.";
    } else {
      emailContent.content = text || subject;
    }

    await client.send(emailContent as any);
    await client.close();

    // 5. Log de l'envoi
    await adminClient.from("audit_logs").insert({
      action: "send_email",
      table_name: "emails",
      user_id: user.id,
      new_values: { to, subject, is_test: is_test || false },
    });

    return new Response(
      JSON.stringify({ success: true, message: `Email envoyé à ${to}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erreur envoi email:", error);
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ error: `Échec de l'envoi: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
