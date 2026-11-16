import { MotionConfig } from 'framer-motion';
import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { useSite } from '../../state/site';
import { SmoothScrollProvider } from '../../state/smoothScroll';
import { WhatsAppProvider } from '../../state/whatsapp';
import { CartDrawer } from '../cart/CartDrawer';
import { GridSkeleton } from '../ui/Skeleton';
import { BackToTop } from './BackToTop';
import { FloatingWhatsApp } from './FloatingWhatsApp';
import { Footer } from './Footer';
import { Header } from './Header';

// Loading states fill the screen, so the footer starts below the fold and does
// not jump when the page arrives (layout shift).
function PageFallback() {
  return (
    <div className="container-page min-h-[100svh] py-12">
      <GridSkeleton count={4} />
    </div>
  );
}

/** Storefront shell. Lenis smooth scrolling lives here, so /admin never gets it. */
export function StorefrontLayout() {
  const { ready } = useSite();
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScrollProvider>
        <WhatsAppProvider>
          <div className="flex min-h-dvh flex-col">
            <Header />
            <main id="main" className={ready ? 'flex-1' : 'min-h-[100svh] flex-1'} tabIndex={-1}>
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            </main>
            <Footer />
          </div>
          <CartDrawer />
          <BackToTop />
          <FloatingWhatsApp />
          {/* Top of page on new navigation, previous position on browser back.
              Full page loads all share the key "default", so key those by path:
              otherwise opening /cart would reuse the last page's scroll position. */}
          <ScrollRestoration getKey={(location) => (location.key === 'default' ? location.pathname : location.key)} />
        </WhatsAppProvider>
      </SmoothScrollProvider>
    </MotionConfig>
  );
}
