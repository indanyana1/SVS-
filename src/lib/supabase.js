import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

// Diagnostic: lets you verify in the deployed browser console whether the
// Supabase env vars were baked into the build. CRA only inlines REACT_APP_*
// values at build time, so missing vars on Vercel are a common silent failure.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info(
    `[SVS] Supabase configured: ${hasSupabaseEnv}` +
      (hasSupabaseEnv ? ` (host: ${(() => { try { return new URL(supabaseUrl).host; } catch (_) { return 'invalid-url'; } })()})` : ' — orders/return state will only persist in this browser'),
  );
}

export const supabase = hasSupabaseEnv ? createClient(supabaseUrl, supabaseAnonKey) : null;
