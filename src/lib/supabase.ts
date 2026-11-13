import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { env } from './env';

/**
 * How this page was opened, read before the client below consumes the URL.
 * A password-reset email link lands with `#...type=recovery` (and a one-time
 * session); an expired or already-used link lands with `#error=...`.
 */
function readAuthLink(): { recovery: boolean; error: string | null } {
  if (typeof window === 'undefined') return { recovery: false, error: null };
  const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search);
  const code = params.get('error_code') ?? params.get('error');
  const error = code
    ? code === 'otp_expired'
      ? 'This reset link has expired or was already used. Request a new one below.'
      : (params.get('error_description') ?? 'This link could not be used.').replace(/\+/g, ' ')
    : null;
  return { recovery: params.get('type') === 'recovery', error };
}

export const authLink = readAuthLink();

// Supabase sends a reset link to the project's Site URL (often the home page)
// when the requested page is not on its Redirect URLs list. Wherever it
// lands, finish the reset on the reset page. Done before the client below
// reads the one-time tokens, which stay in the URL for it.
if ((authLink.recovery || authLink.error) && typeof window !== 'undefined' && window.location.pathname !== '/admin/reset-password') {
  window.history.replaceState(null, '', `/admin/reset-password${window.location.search}${window.location.hash}`);
}

/** Browser client. Uses the public anon key only; RLS protects all data. */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
