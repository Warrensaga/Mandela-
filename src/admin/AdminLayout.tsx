import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { signOut } from '../lib/api/admin';
import { RequireAdmin, useAdmin } from './auth';
import { Loading } from './components/ui';

const NAV: { to: string; label: string; end?: boolean; ownerOnly?: boolean }[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/custom-requests', label: 'Custom requests' },
  { to: '/admin/hero', label: 'Hero carousel' },
  { to: '/admin/zones', label: 'Delivery zones' },
  { to: '/admin/guides', label: 'Guides' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/admin/team', label: 'Team', ownerOnly: true },
];

function Shell() {
  const { identity, isOwner } = useAdmin();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Admin" className="space-y-0.5">
      {NAV.filter((n) => !n.ownerOnly || isOwner).map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) =>
            `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-navy-800 font-medium text-paper-50' : 'text-navy-800 hover:bg-paper-200'}`
          }
        >
          {n.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-paper-100 font-sans text-ink">
      <title>Admin | Mandela Heritage</title>
      <meta name="robots" content="noindex" />
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-paper-200 bg-white px-4 print:hidden">
        <button type="button" className="rounded p-2 text-navy-800 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
          ☰
        </button>
        <span className="font-serif text-xl font-semibold text-navy-800">Mandela admin</span>
        <a href="/" target="_blank" rel="noopener" className="ml-2 hidden text-xs text-muted underline sm:inline">
          View shop
        </a>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">
            {identity.email} · {identity.role}
          </span>
          <button type="button" onClick={() => void signOut()} className="rounded-lg border border-paper-300 px-3 py-1.5 text-navy-800 hover:bg-paper-100">
            Sign out
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-paper-200 bg-paper-50 p-3 lg:block print:hidden">
          {nav}
        </aside>
        {open && (
          <div className="fixed inset-0 top-14 z-20 bg-navy-900/30 lg:hidden" onClick={() => setOpen(false)}>
            <aside className="h-full w-64 overflow-y-auto bg-paper-50 p-3" onClick={(e) => e.stopPropagation()}>
              {nav}
            </aside>
          </div>
        )}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/** Auth guard without the shell (printable pages). */
export function AdminBare() {
  return (
    <RequireAdmin>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </RequireAdmin>
  );
}

/** Admin shell: native scrolling (no Lenis), auth-guarded, code-split from the storefront. */
export default function AdminLayout() {
  return (
    <RequireAdmin>
      <Shell />
    </RequireAdmin>
  );
}
