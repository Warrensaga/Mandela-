import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { ProductImage } from '../../lib/api';
import { useSmoothScroll } from '../../state/smoothScroll';
import { Icon } from '../ui/Icon';
import { Img } from '../ui/Img';

const ZOOM = 2.5;
const SWIPE_PX = 50;

/**
 * Full-screen photo viewer. Tap or click to zoom in where you tapped, move or
 * drag to look around, tap again to zoom out. Swipe, arrow buttons or arrow
 * keys change photo; Escape closes. Pauses smooth scrolling while open.
 */
export function Lightbox({
  images,
  productName,
  startIndex,
  onClose,
}: {
  images: ProductImage[];
  productName: string;
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const scroll = useSmoothScroll();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const count = images.length;
  const current = images[Math.min(index, count - 1)] as ProductImage;
  const go = (i: number) => {
    setZoomed(false);
    setIndex((i + count) % count);
  };
  const goRef = useRef(go);
  goRef.current = go;
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    const restore = document.activeElement as HTMLElement | null;
    scroll.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      else if (e.key === 'ArrowRight') goRef.current(indexRef.current + 1);
      else if (e.key === 'ArrowLeft') goRef.current(indexRef.current - 1);
      else if (e.key === 'Tab') {
        // Keep focus inside the viewer.
        const items = [...document.querySelectorAll<HTMLElement>('[data-lightbox] button')];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      scroll.start();
      restore?.focus?.();
    };
  }, [scroll]);

  const originFrom = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
    return `${x}% ${y}%`;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) start.current.moved = true;
    // While zoomed, the zoom point follows the mouse or finger.
    if (zoomed && (e.pointerType === 'mouse' || start.current)) setOrigin(originFrom(e));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (!zoomed && count > 1 && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
      go(index + (dx < 0 ? 1 : -1));
      return;
    }
    if (!s.moved) {
      if (!zoomed) setOrigin(originFrom(e));
      setZoomed((z) => !z);
    }
  };

  return createPortal(
    <div
      data-lightbox
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[60] flex flex-col bg-[#060d1f]/97 text-white"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p id={titleId} className="min-w-0 truncate text-sm text-white/80">
          {productName}
          {count > 1 && <span className="ml-2 text-white/50">{index + 1} / {count}</span>}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Close photo viewer"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={`flex h-full w-full items-center justify-center select-none ${zoomed ? 'cursor-zoom-out touch-none' : 'cursor-zoom-in touch-pan-y'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (start.current = null)}
        >
          <img
            key={current.id}
            src={current.url}
            alt={current.alt || productName}
            draggable={false}
            className="max-h-full max-w-full object-contain transition-transform duration-200 ease-out"
            style={{ transform: zoomed ? `scale(${ZOOM})` : 'none', transformOrigin: origin }}
          />
        </div>
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="absolute top-1/2 left-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:left-4"
              aria-label="Previous photo"
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="absolute top-1/2 right-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:right-4"
              aria-label="Next photo"
            >
              <Icon name="chevronRight" />
            </button>
          </>
        )}
      </div>

      <p className="px-4 py-2 text-center text-xs text-white/50" aria-live="polite">
        {zoomed ? 'Drag to look around. Tap to zoom out.' : 'Tap the photo to zoom in.'}
      </p>
      {count > 1 && (
        <ul className="flex justify-center gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:none]" aria-label="Photos">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={`block overflow-hidden border-2 ${i === index ? 'border-gold-500' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <Img src={img.url} alt="" sizes="64px" className="h-12 w-16 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}
