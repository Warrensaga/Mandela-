import type { RouteObject } from 'react-router';

// Every admin module is lazy-loaded, so the storefront bundle never includes admin code.
const page = (loader: () => Promise<{ default: React.ComponentType }>) => () => loader().then((m) => ({ Component: m.default }));
const named = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, name: K) => () =>
  loader().then((m) => ({ Component: m[name] }));

export const adminRoutes: RouteObject[] = [
  { path: '/admin/login', lazy: page(() => import('./pages/LoginPage')) },
  { path: '/admin/signup', lazy: page(() => import('./pages/SignUpPage')) },
  {
    path: '/admin/orders/:id/print',
    lazy: named(() => import('./AdminLayout'), 'AdminBare'),
    children: [{ index: true, lazy: page(() => import('./pages/OrderPrintPage')) }],
  },
  {
    path: '/admin',
    lazy: page(() => import('./AdminLayout')),
    children: [
      { index: true, lazy: page(() => import('./pages/DashboardPage')) },
      { path: 'orders', lazy: page(() => import('./pages/OrdersPage')) },
      { path: 'orders/:id', lazy: page(() => import('./pages/OrderDetailPage')) },
      { path: 'inventory', lazy: page(() => import('./pages/InventoryPage')) },
      { path: 'products', lazy: page(() => import('./pages/ProductsPage')) },
      { path: 'products/:id', lazy: page(() => import('./pages/ProductEditPage')) },
      { path: 'categories', lazy: page(() => import('./pages/CategoriesPage')) },
      { path: 'customers', lazy: named(() => import('./pages/CustomersPage'), 'CustomersPage') },
      { path: 'customers/:id', lazy: named(() => import('./pages/CustomersPage'), 'CustomerDetailPage') },
      { path: 'custom-requests', lazy: page(() => import('./pages/CustomRequestsPage')) },
      { path: 'hero', lazy: page(() => import('./pages/HeroSlidesPage')) },
      { path: 'zones', lazy: page(() => import('./pages/DeliveryZonesPage')) },
      { path: 'reviews', lazy: page(() => import('./pages/ReviewsPage')) },
      { path: 'guides', lazy: page(() => import('./pages/GuidesPage')) },
      { path: 'settings', lazy: page(() => import('./pages/SettingsPage')) },
      { path: 'team', lazy: page(() => import('./pages/TeamPage')) },
      { path: '*', lazy: page(() => import('./pages/DashboardPage')) },
    ],
  },
];
