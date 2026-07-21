// Client Supabase à URL dynamique — compatible Lovable preview + self-hosting (Nginx/Cloudflare).
// Ordre de résolution : window.__RUNTIME_CONFIG__ > import.meta.env > window.location.origin.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

type RuntimeConfig = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

function resolveSupabaseConfig(): { url: string; anonKey: string; source: string } {
  const runtime: RuntimeConfig =
    (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) || {};

  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const envKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? '';

  const runtimeUrl = runtime.SUPABASE_URL?.trim() || '';
  const runtimeKey = runtime.SUPABASE_ANON_KEY?.trim() || '';

  // URL : runtime > env > même origine (proxy Nginx)
  let url = runtimeUrl || envUrl;
  let source = runtimeUrl ? 'runtime' : envUrl ? 'env' : 'origin';
  if (!url && typeof window !== 'undefined') {
    url = window.location.origin;
  }

  // Clé anon : runtime > env
  const anonKey = runtimeKey || envKey;

  return { url, anonKey, source };
}

const { url: SUPABASE_URL, anonKey: SUPABASE_PUBLISHABLE_KEY, source } = resolveSupabaseConfig();

export const SUPABASE_BASE_URL = SUPABASE_URL;

if (typeof window !== 'undefined') {
  if (!SUPABASE_PUBLISHABLE_KEY) {
    // eslint-disable-next-line no-console
    console.error(
      '[Supabase] Clé anon absente. Vérifier /config.js (window.__RUNTIME_CONFIG__.SUPABASE_ANON_KEY) ou VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  if (!SUPABASE_URL) {
    // eslint-disable-next-line no-console
    console.error('[Supabase] URL non résolue. Vérifier /config.js ou VITE_SUPABASE_URL.');
  } else {
    // eslint-disable-next-line no-console
    console.info(`[Supabase] URL=${SUPABASE_URL} (source=${source})`);
  }
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-prodintime-auth',
  },
  global: {
    headers: { 'X-Client-Info': 'prodintime-web' },
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
