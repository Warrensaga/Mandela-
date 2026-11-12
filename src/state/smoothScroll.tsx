import Lenis from 'lenis';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';

interface ScrollApi {
  /** Smoothly scrolls to a y position, element or selector (native fallback when Lenis is off). */
  scrollTo: (target: number | string | HTMLElement, options?: { offset?: number; immediate?: boolean }) => void;
  /** Pause smooth scrolling (while a modal or drawer is open). */
  stop: () => void;
  start: () => void;
  enabled: boolean;
}

const ScrollContext = createContext<ScrollApi | null>(null);

function shouldEnable(): boolean {
  if (typeof window === 'undefined') return false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Touch devices keep native scrolling (it is already smooth and Lenis adds cost).
  const touch = window.matchMedia('(pointer: coarse)').matches;
  return !reduced && !touch;
}

/**
 * Lenis inertial scrolling for the storefront. Mounted once in the storefront
 * layout only, so /admin keeps native scrolling.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (!shouldEnable()) return;
    const instance = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    let frame = 0;
    const loop = (time: number) => {
      instance.raf(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    setLenis(instance);

    // React to the user toggling reduced motion while the page is open.
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => (mql.matches ? instance.stop() : instance.start());
    mql.addEventListener('change', onChange);

    return () => {
      mql.removeEventListener('change', onChange);
      cancelAnimationFrame(frame);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  // On every navigation, drop any inertia left over from the previous page.
  // While Lenis is mid-glide it ignores native scrolls, so without this it would
  // drag the new page back to the old position and fight the user's scrolling.
  // ScrollRestoration (a child, so its layout effect runs first) has already
  // moved the window to the top or the restored position; an immediate scrollTo adopts it.
  useLayoutEffect(() => {
    if (!lenis) return;
    lenis.resize(); // new page height first, so the position is not clamped
    lenis.scrollTo(window.scrollY, { immediate: true, force: true });
  }, [lenis, location.key]);

  const api = useMemo<ScrollApi>(
    () => ({
      enabled: lenis !== null,
      scrollTo: (target, options) => {
        if (lenis) {
          lenis.scrollTo(target, { offset: options?.offset ?? 0, immediate: options?.immediate });
          return;
        }
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const behavior: ScrollBehavior = options?.immediate || reduced ? 'auto' : 'smooth';
        if (typeof target === 'number') {
          window.scrollTo({ top: target, behavior });
          return;
        }
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY + (options?.offset ?? 0);
          window.scrollTo({ top, behavior });
        }
      },
      stop: () => lenis?.stop(),
      start: () => lenis?.start(),
    }),
    [lenis],
  );

  return <ScrollContext.Provider value={api}>{children}</ScrollContext.Provider>;
}

const NATIVE: ScrollApi = {
  enabled: false,
  scrollTo: (target) => typeof target === 'number' && window.scrollTo({ top: target }),
  stop: () => undefined,
  start: () => undefined,
};

export function useSmoothScroll(): ScrollApi {
  return useContext(ScrollContext) ?? NATIVE;
}
