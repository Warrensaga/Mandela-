import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { ApiError, sendPasswordReset, signIn } from '../../lib/api/admin';
import { useAdminSession } from '../auth';
import { Btn, inputCls, Notice } from '../components/ui';

export default function LoginPage() {
  const session = useAdminSession();
  const [params] = useSearchParams();
  const next = params.get('next');
  const target = next && next.startsWith('/admin') ? next : '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Signed in: admins go to the admin; accounts awaiting approval see the waiting screen there.
  if (session.status === 'ready') return <Navigate to={session.identity.role ? target : '/admin'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email) {
      setError('Enter your email first, then choose "Forgot password".');
      return;
    }
    try {
      await sendPasswordReset(email);
      setInfo('If that email has an account, a reset link is on its way.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-paper-100 p-4">
      <title>Admin sign in | Mandela Heritage</title>
      <meta name="robots" content="noindex" />
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-paper-200 bg-white p-6 shadow-sm">
        <h1 className="font-serif text-3xl font-semibold text-navy-800">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted">Mandela Heritage Furniture</p>
        <div className="mt-6 space-y-4">
          {error && <Notice kind="error">{error}</Notice>}
          {info && <Notice kind="info">{info}</Notice>}
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-xs font-medium text-navy-800">Email</label>
            <input id="admin-email" type="email" autoComplete="username" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1 block text-xs font-medium text-navy-800">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Btn type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Btn>
          <button type="button" onClick={() => void reset()} className="w-full text-center text-xs text-muted underline">
            Forgot password
          </button>
          <p className="border-t border-paper-200 pt-3 text-center text-xs text-muted">
            New to the team? <Link to="/admin/signup" className="text-navy-800 underline">Create a staff account</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
