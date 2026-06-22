// Edge function: admin user operations — list emails (read-only) and set/override password.
// Self-hostable: uses VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Missing bearer token" }, 401);

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: caller } = await callerClient.auth.getUser();
    if (!caller?.user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: caller.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === "list_emails") {
      const emails: Record<string, string> = {};
      let page = 1;
      // Paginate through all users
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) return json({ error: error.message }, 400);
        for (const u of data.users) emails[u.id] = u.email ?? "";
        if (data.users.length < 1000) break;
        page += 1;
      }
      return json({ emails });
    }

    if (action === "set_password") {
      const { user_id, password } = body ?? {};
      if (!user_id || typeof password !== "string" || password.length < 6) {
        return json({ error: "user_id et un mot de passe (min. 6 caractères) sont requis" }, 400);
      }
      const { error: updErr } = await admin.auth.admin.updateUserById(user_id, { password });
      if (updErr) return json({ error: updErr.message }, 400);

      const { data: target } = await admin
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", user_id)
        .maybeSingle();
      const fullName = `${target?.first_name ?? ""} ${target?.last_name ?? ""}`.trim();

      await admin.from("audit_logs").insert({
        user_id: caller.user.id,
        user_email: caller.user.email,
        action: "update",
        table_name: "auth.users",
        record_id: user_id,
        entity_type: "user",
        severity: "warning",
        description: `Réinitialisation du mot de passe de ${fullName || user_id}`,
      });

      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
