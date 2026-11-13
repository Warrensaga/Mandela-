import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError, changePassword, clearAuthLinkFromUrl, onAuthChange, passwordResetLink } from '../../lib/api/admin';
import { Btn, inputCls, Notice } from '../components/ui';

const MIN_LENGTH = 10;
/** How long to wait for the reset link's one-time session before calling the link invalid. */
const SESSION_WAIT_MS = 6000;

type State = { step: 'checking' } | { step: 'invalid'; message: string } | { step: 'form'; email: string | null } | { step: 'done' };

/**
 * Landing page for the "Forgot password" email. The link signs the user in
 * for this one purpose; they choose a new password here, then continue to
 * the admin. Expired or reused links explain what to do instead.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>(() => {
    const link = passwordResetLink();
    return link.error ? { step: 'invalid', message: link.error } : { step: 'checking' };
  });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.step !== 'checking') {
      clearAuthLinkFromUrl();
      return;
    }
    const timer = window.setTimeout(() => {
      clearAuthLinkFromUrl(); // so "Back to sign in" does not return here
      setState((s) =>
        s.step === 'checking'
          ? { step: 'invalid', message: 'This reset link has expired or was already used. Request a new one below.' }
          : s,
      );
    }, SESSION_WAIT_MS);
    const unsubscribe = onAuthChange((session) => {
      if (!session) return; // keep waiting until the timer gives up
      window.clearTimeout(timer);
      clearAuthLinkFromUrl();
      setState((s) => (s.step === 'checking' ? { step: 'form', email: session.user.email ?? null } : s));
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      await changePassword(password);
      setState({ step: 'done' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your new password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-paper-100 p-4">
      <title>Set a new password | Mandela Heritage</title>
      <meta name="robots" content="noindex" />
      <div className="w-full max-w-sm rounded-xl border border-paper-200 bg-white p-6 shadow-sm">
        <h1 className="font-serif text-3xl font-semibold text-navy-800">Set a new password</h1>
        <p className="mt-1 text-sm text-muted">Mandela Heritage Furniture admin</p>

        {state.step === 'checking' && (
          <p className="mt-6 text-sm text-muted" role="status">Checking your reset link…</p>
        )}

        {state.step === 'invalid' && (
          <div className="mt-6 space-y-4">
            <Notice kind="error">{state.message}</Notice>
            <p className="text-sm text-muted">
              Reset links work once and expire after about an hour. On the sign-in page, enter your email and choose “Forgot password” to get a new
              one.
            </p>
            <Link to="/admin/login" className="block rounded-lg bg-navy-800 px-4 py-2.5 text-center text-sm text-paper-50">
              Back to sign in
            </Link>
          </div>
        )}

        {state.step === 'form' && (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {state.email && (
              <p className="text-sm text-muted">
                For <strong className="text-navy-800">{state.email}</strong>
              </p>
            )}
            {error && <Notice kind="error">{error}</Notice>}
            <div>
              <label htmlFor="new-password" className="mb-1 block text-xs font-medium text-navy-800">New password</label>
              <input
                id="new-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={MIN_LENGTH}
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="new-password-hint"
              />
              <p id="new-password-hint" className="mt-1 text-xs text-muted">At least {MIN_LENGTH} characters. A short sentence is easy to remember.</p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-xs font-medium text-navy-800">Type it again</label>
              <input
                id="confirm-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className={inputCls}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-navy-800">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
            </label>
            <Btn type="submit" className="w-full" disabled={busy}>
              {busy ? 'Saving…' : 'Save new password'}
            </Btn>
          </form>
        )}

        {state.step === 'done' && (
          <div className="mt-6 space-y-4">
            <Notice kind="success">Your password has been changed. Use it next time you sign in.</Notice>
            <Btn className="w-full" onClick={() => navigate('/admin', { replace: true })}>
              Continue to the admin
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
