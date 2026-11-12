import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ProductImage } from '../../lib/api';
import { Icon } from '../ui/Icon';
import { Img } from '../ui/Img';
import { Lightbox } from './Lightbox';

interface GalleryProps {
  images: ProductImage[];
  productName: string;
  /** Jump to this image (the selected variant's image). */
  activeImageId?: string | null;
}

export function Gallery({ images, productName, activeImageId }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    if (!activeImageId) return;
    const i = images.findIndex((img) => img.id === activeImageId);
    if (i >= 0) setIndex(i);
  }, [activeImageId, images]);

  if (!images.length) {
    return <div className="aspect-[4/3] w-full rounded-2xl bg-paper-200" role="img" aria-label={`${productName}: no photo yet`} />;
  }

  const current = images[Math.min(index, images.length - 1)] as ProductImage;
  const go = (i: number) => setIndex((i + images.length) % images.length);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50) go(index + 1);
    else if (info.offset.x > 50) go(index - 1);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-paper-200">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            drag={images.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={onDragEnd}
            onTap={() => setViewerOpen(true)}
            className="cursor-zoom-in touch-pan-y"
          >
            <Img
              src={current.url}
              alt={current.alt}
              priority={index === 0}
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="aspect-[4/3] w-full object-cover"
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="absolute top-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-paper-50/90 text-navy-800 shadow hover:bg-paper-100"
          aria-label="View photos full screen"
        >
          <Icon name="expand" className="h-4 w-4" />
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="absolute top-1/2 left-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-paper-50/90 text-navy-800 shadow hover:bg-paper-100"
              aria-label="Previous photo"
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="absolute top-1/2 right-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-paper-50/90 text-navy-800 shadow hover:bg-paper-100"
              aria-label="Next photo"
            >
              <Icon name="chevronRight" />
            </button>
            <p className="absolute right-3 bottom-3 rounded-full bg-navy-900/70 px-2.5 py-1 text-xs text-paper-50" aria-live="polite">
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Product photos">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}: ${img.alt}`}
                aria-current={i === index ? 'true' : undefined}
                className={`block overflow-hidden rounded-lg border-2 transition-colors ${i === index ? 'border-navy-800' : 'border-transparent hover:border-paper-300'}`}
              >
                <Img src={img.url} alt="" sizes="96px" className="h-16 w-20 object-cover sm:h-20 sm:w-24" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {viewerOpen && <Lightbox images={images} productName={productName} startIndex={index} onClose={() => setViewerOpen(false)} />}
    </div>
  );
}
