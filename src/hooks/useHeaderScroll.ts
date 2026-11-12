import { useEffect, useState } from 'react';

/**
 * Sticky header behaviour: `compact` once the page has scrolled a little,
 * `hidden` while scrolling down, shown again on any scroll up.
 * rAF-throttled and passive, so it costs nothing per frame.
 */
export function useHeaderScroll(threshold = 140): { compact: boolean; hidden: boolean } {
  const [state, setState] = useState({ compact: false, hidden: false });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;
      if (Math.abs(delta) < 6 && y > 0) return;
      const next = { compact: y > 24, hidden: delta > 0 && y > threshold };
      lastY = y;
      setState((s) => (s.compact === next.compact && s.hidden === next.hidden ? s : next));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return state;
}
