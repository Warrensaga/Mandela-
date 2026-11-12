import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { env } from './env';

/** Browser client. Uses the public anon key only; RLS protects all data. */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
