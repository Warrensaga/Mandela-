import { MotionConfig } from 'framer-motion';
import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { SmoothScrollProvider } from '../../state/smoothScroll';
import { WhatsAppProvider } from '../../state/whatsapp';
import { CartDrawer } from '../cart/CartDrawer';
import { GridSkeleton } from '../ui/Skeleton';
import { BackToTop } from './BackToTop';
import { FloatingWhatsApp } from './FloatingWhatsApp';
import { Footer } from './Footer';
import { Header } from './Header';

function PageFallback() {
  return (
    <div className="container-page py-12">
      <GridSkeleton count={4} />
    </div>
  );
}

/** Storefront shell. Lenis smooth scrolling lives here, so /admin never gets it. */
export function StorefrontLayout() {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScrollProvider>
        <WhatsAppProvider>
          <div className="flex min-h-dvh flex-col">
            <Header />
            <main id="main" className="flex-1" tabIndex={-1}>
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            </main>
            <Footer />
          </div>
          <CartDrawer />
          <BackToTop />
          <FloatingWhatsApp />
          {/* Top of page on new navigation, previous position on browser back. */}
          <ScrollRestoration getKey={(location) => location.key} />
        </WhatsAppProvider>
      </SmoothScrollProvider>
    </MotionConfig>
  );
}
