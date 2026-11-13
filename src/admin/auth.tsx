import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { getIdentity, onAuthChange, signOut, type AdminIdentity } from '../lib/api/admin';

interface AdminContextValue {
  identity: AdminIdentity;
  isOwner: boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <RequireAdmin>');
  return ctx;
}

type State = { status: 'loading' } | { status: 'signed_out' } | { status: 'ready'; identity: AdminIdentity } | { status: 'error'; message: string };

/** Hook used by both the guard and the login page. */
export function useAdminSession(): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    // Only the newest check may set state: an older, slower one (for example
    // sent with a token that has since been refreshed) must not overwrite it.
    let latest = 0;
    const unsubscribe = onAuthChange((session) => {
      const run = ++latest;
      if (!session) {
        setState({ status: 'signed_out' });
        return;
      }
      getIdentity(session)
        .then((identity) => run === latest && setState(identity ? { status: 'ready', identity } : { status: 'signed_out' }))
        .catch((e: unknown) => run === latest && setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not check your account.' }));
    });
    return () => {
      latest = -1;
      unsubscribe();
    };
  }, []);
  return state;
}

function FullPage({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh place-items-center bg-paper-100 p-6 text-center">{children}</div>;
}

/** Only signed-in users listed in admin_users get past this. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const state = useAdminSession();
  const location = useLocation();

  if (state.status === 'loading') {
    return (
      <FullPage>
        <p className="text-muted" role="status">Checking your account…</p>
      </FullPage>
    );
  }
  if (state.status === 'signed_out') {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (state.status === 'error') {
    return (
      <FullPage>
        <div>
          <p className="text-navy-800">{state.message}</p>
          <button type="button" className="mt-4 underline" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </FullPage>
    );
  }
  if (!state.identity.role) {
    const declined = state.identity.requestStatus === 'declined';
    return (
      <FullPage>
        <div className="max-w-sm">
          <h1 className="font-serif text-3xl text-navy-800">{declined ? 'No admin access' : 'Waiting for approval'}</h1>
          <p className="mt-2 text-sm text-muted">
            {declined
              ? `${state.identity.email} does not have access to the admin. Contact the owner if you think this is a mistake.`
              : `Your account (${state.identity.email}) has been created. The owner needs to approve it on the Team page before you can use the admin. Reload this page once they have.`}
          </p>
          <button type="button" className="mt-6 rounded-full bg-navy-800 px-5 py-2.5 text-sm text-paper-50" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </FullPage>
    );
  }
  return (
    <AdminContext.Provider value={{ identity: state.identity, isOwner: state.identity.role === 'owner' }}>{children}</AdminContext.Provider>
  );
}
