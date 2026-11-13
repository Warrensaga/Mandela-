import { lazy } from 'react';
import { createBrowserRouter, isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { adminRoutes } from './admin/routes';
import { StorefrontLayout } from './components/layout/StorefrontLayout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

// Code-split everything except the home page.
const ShopPage = lazy(() => import('./pages/ShopPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
const CustomRequestPage = lazy(() => import('./pages/CustomRequestPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const DeliveryPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.DeliveryPage })));
const PaymentPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.PaymentPage })));
const FaqPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.FaqPage })));

function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : 'Something went wrong on this page.';
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl text-navy-800">Sorry about that</h1>
      <p className="mt-3 text-muted">{message} Please refresh, or go back to the shop.</p>
      <Link to="/" className="mt-6 inline-block underline underline-offset-4">
        Go home
      </Link>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <StorefrontLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'category/:slug', element: <CategoryPage /> },
      { path: 'product/:slug', element: <ProductPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'order/:orderNumber', element: <OrderConfirmationPage /> },
      { path: 'track-order', element: <TrackOrderPage /> },
      { path: 'custom-request', element: <CustomRequestPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'categories', element: <CollectionsPage /> },
      { path: 'delivery', element: <DeliveryPage /> },
      { path: 'payment', element: <PaymentPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'saved', element: <SavedPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:slug', element: <ProjectPage /> },
      // Still to come (Phase 4): guides, About, and Returns & Warranty (needs the owner's policy).
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Admin: its own layout (native scrolling, no Lenis), fully code-split.
  ...adminRoutes.map((r) => ({ ...r, errorElement: <RouteError /> })),
]);
