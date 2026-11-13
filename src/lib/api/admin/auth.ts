import type { Session } from '@supabase/supabase-js';
import type { AccessRequestStatus, AdminRole } from '../../database.types';
import { authLink, supabase } from '../../supabase';
import { ApiError, toApiError } from '../errors';

export interface AdminIdentity {
  userId: string;
  email: string | null;
  role: AdminRole | null; // null: signed in but not an admin
  /** Sign-up approval state, for accounts without a role. */
  requestStatus: AccessRequestStatus | null;
}

/**
 * Creates an account. It has no admin access until the owner approves it on
 * the Team page. Returns whether Supabase wants the email confirmed first.
 */
export async function signUp(input: { fullName: string; email: string; password: string }): Promise<{ needsEmailConfirmation: boolean }> {
  const fullName = input.fullName.trim();
  if (fullName.length < 2) throw new ApiError('INVALID_NAME', 'Please enter your full name.');
  if (input.password.length < 10) throw new ApiError('WEAK_PASSWORD', 'Use at least 10 characters for your password.');
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/admin/login` },
  });
  if (error) {
    const msg = /not allowed|disabled/i.test(error.message)
      ? 'Sign-ups are turned off. Ask the owner to enable them in Supabase, or to create your account.'
      : error.message;
    throw new ApiError('SIGN_UP_FAILED', msg);
  }
  return { needsEmailConfirmation: !data.session };
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    throw new ApiError('SIGN_IN_FAILED', error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Emails a one-time link to /admin/reset-password, where a new password is chosen. */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/admin/reset-password`,
  });
  if (error) {
    const msg = /rate limit|too many|security purposes/i.test(error.message)
      ? 'Too many reset emails were requested. Please wait a few minutes and try again.'
      : error.message;
    throw new ApiError('RESET_FAILED', msg);
  }
}

/** Whether this page was opened from a password-reset email, and any error that link carried. */
export function passwordResetLink(): { opened: boolean; error: string | null } {
  return { opened: authLink.recovery, error: authLink.error };
}

/**
 * Marks the reset link as handled (so signing out later does not reopen the
 * reset page) and removes its one-time tokens or error from the address bar.
 */
export function clearAuthLinkFromUrl(): void {
  authLink.recovery = false;
  authLink.error = null;
  if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
}

export async function changePassword(password: string): Promise<void> {
  if (password.length < 10) throw new ApiError('WEAK_PASSWORD', 'Use at least 10 characters.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const msg = /different from the old/i.test(error.message)
      ? 'Choose a password you have not used before.'
      : /pwned|leaked|compromised|known to be weak/i.test(error.message)
        ? 'That password has appeared in a data breach. Please choose another.'
        : /session|jwt|expired/i.test(error.message)
          ? 'Your reset link has expired. Request a new one from the sign-in page.'
          : error.message;
    throw new ApiError('PASSWORD_FAILED', msg);
  }
}

/** Resolves the signed-in user and their admin role (from admin_users, own row only). */
export async function getIdentity(session: Session | null): Promise<AdminIdentity | null> {
  if (!session) return null;
  const load = () =>
    Promise.all([
      supabase.from('admin_users').select('role').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('admin_access_requests').select('status').eq('user_id', session.user.id).maybeSingle(),
    ]);
  let [admin, request] = await load();
  // A tab that slept past the token's expiry can send one stale token
  // (PostgREST PGRST303 / 401). Refresh once and retry; if the refresh itself
  // fails the session is over and the user signs in again.
  if (admin.error && isExpiredToken(admin.error)) {
    const { error } = await supabase.auth.refreshSession();
    if (error) return null;
    [admin, request] = await load();
  }
  if (admin.error) throw toApiError(admin.error);
  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    role: admin.data?.role ?? null,
    requestStatus: request.data?.status ?? null,
  };
}

function isExpiredToken(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST303' || error.code === 'PGRST301' || /jwt expired/i.test(error.message ?? '');
}

/**
 * Calls back with the current session, then on every sign-in, sign-out and
 * token refresh. Supabase sends the current session as its first event
 * (INITIAL_SESSION), so there is no separate getSession() call to race with.
 * The callback is deferred: running database queries inside Supabase's own
 * auth callback can deadlock its session lock.
 */
export function onAuthChange(callback: (session: Session | null) => void): () => void {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const t = setTimeout(() => {
      timers.delete(t);
      callback(session);
    }, 0);
    timers.add(t);
  });
  return () => {
    timers.forEach(clearTimeout);
    data.subscription.unsubscribe();
  };
}
