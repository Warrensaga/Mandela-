import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useSite } from '../../state/site';
import { Icon } from '../ui/Icon';
import { Img } from '../ui/Img';

/**
 * Desktop "Browse categories" button and panel: a text panel on the left and a
 * photo tile per collection (with its sub-categories) on the right.
 * Opens on hover, click or keyboard; Escape closes.
 */
export function MegaMenu() {
  const { categories } = useSite();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const { pathname, search } = useLocation();

  useEffect(() => setOpen(false), [pathname, search]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  };

  return (
    <div ref={wrapRef} className="static" onMouseEnter={show} onMouseLeave={hide}>
      <button
        ref={buttonRef}
        type="button"
        className={`inline-flex h-12 w-64 items-center gap-3 px-4 font-label text-[11px] font-bold tracking-[0.16em] text-white uppercase transition-colors ${open ? 'bg-navy-800' : 'bg-brand-600 hover:bg-navy-800'}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="menu" className="h-5 w-5" />
        Browse categories
        <Icon name="chevronDown" className={`ml-auto h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full border-t border-paper-200 bg-paper-50 shadow-lift"
          >
            <div className="container-page grid grid-cols-[260px_1fr] gap-10 py-8">
              <div className="border-r border-paper-200 pr-8">
                <p className="eyebrow">Shop by category</p>
                <p className="mt-3 font-serif text-3xl text-navy-800">Our collections</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">Hardwood furniture for every room, made in our Nairobi workshop.</p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link to="/categories" className="label-mono text-navy-800 hover:text-brand-600">
                    All collections ↗
                  </Link>
                  <Link to="/shop?offers=1" className="label-mono text-terracotta-600 hover:text-terracotta-500">
                    Offers ↗
                  </Link>
                </div>
              </div>
              <nav aria-label="Categories">
                <ul className="grid grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link to={`/category/${cat.slug}`} className="group block">
                        <span className="block overflow-hidden bg-paper-200">
                          <Img src={cat.imageUrl} alt="" sizes="220px" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        </span>
                        <span className="mt-2 flex items-center justify-between text-sm font-semibold text-navy-800 group-hover:text-brand-600">
                          {cat.name}
                          <span aria-hidden="true">↗</span>
                        </span>
                      </Link>
                      {cat.children.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {cat.children.slice(0, 4).map((child) => (
                            <li key={child.id}>
                              <Link to={`/category/${child.slug}`} className="text-[13px] text-muted hover:text-brand-600">
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
