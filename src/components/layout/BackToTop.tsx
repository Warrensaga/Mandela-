import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSmoothScroll } from '../../state/smoothScroll';
import { Icon } from '../ui/Icon';

export function BackToTop() {
  const scroll = useSmoothScroll();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setVisible(window.scrollY > 900);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={() => scroll.scrollTo(0)}
          className="fixed right-4 bottom-22 z-30 grid h-11 w-11 place-items-center rounded-full border border-paper-300 bg-paper-50 text-navy-800 shadow-md hover:bg-paper-100 sm:right-6 sm:bottom-24"
          aria-label="Back to top"
        >
          <Icon name="arrowUp" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
