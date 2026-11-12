import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { ApiError, signUp } from '../../lib/api/admin';
import { useAdminSession } from '../auth';
import { Btn, inputCls, Notice } from '../components/ui';

/**
 * Staff sign-up. Creates an account with NO access; the owner approves it on
 * the Team page (and chooses staff or owner).
 */
export default function SignUpPage() {
  const session = useAdminSession();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { needsEmailConfirmation: boolean }>(null);

  if (session.status === 'ready' && session.identity.role) return <Navigate to="/admin" replace />;
  // Signed in without access (e.g. right after sign-up): the guard shows the waiting screen.
  if (session.status === 'ready' && !done) return <Navigate to="/admin" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      setDone(await signUp({ fullName: form.fullName, email: form.email, password: form.password }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid min-h-dvh place-items-center bg-paper-100 p-4">
      <title>Admin sign up | Mandela Heritage</title>
      <meta name="robots" content="noindex" />
      <div className="w-full max-w-sm rounded-xl border border-paper-200 bg-white p-6 shadow-sm">
        <h1 className="font-serif text-3xl font-semibold text-navy-800">Create a staff account</h1>
        <p className="mt-1 text-sm text-muted">The owner must approve your account before you can use the admin.</p>

        {done ? (
          <div className="mt-6 space-y-4">
            <Notice kind="success">
              {done.needsEmailConfirmation
                ? 'Account created. Check your email and click the confirmation link, then sign in. The owner will be asked to approve you.'
                : 'Account created. The owner will approve your access; you can sign in once they have.'}
            </Notice>
            <Link to="/admin/login" className="block text-center text-sm text-navy-800 underline">Go to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && <Notice kind="error">{error}</Notice>}
            <div>
              <label htmlFor="su-name" className="mb-1 block text-xs font-medium text-navy-800">Full name</label>
              <input id="su-name" autoComplete="name" required className={inputCls} value={form.fullName} onChange={set('fullName')} />
            </div>
            <div>
              <label htmlFor="su-email" className="mb-1 block text-xs font-medium text-navy-800">Email</label>
              <input id="su-email" type="email" autoComplete="username" required className={inputCls} value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label htmlFor="su-password" className="mb-1 block text-xs font-medium text-navy-800">Password</label>
              <input id="su-password" type="password" autoComplete="new-password" minLength={10} required className={inputCls} value={form.password} onChange={set('password')} />
              <p className="mt-1 text-xs text-muted">At least 10 characters.</p>
            </div>
            <div>
              <label htmlFor="su-confirm" className="mb-1 block text-xs font-medium text-navy-800">Confirm password</label>
              <input id="su-confirm" type="password" autoComplete="new-password" required className={inputCls} value={form.confirm} onChange={set('confirm')} />
            </div>
            <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Btn>
            <p className="text-center text-xs text-muted">
              Already have an account? <Link to="/admin/login" className="underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
