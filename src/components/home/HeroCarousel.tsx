import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import type { HeroSlide } from '../../lib/api';
import { buildSrcSet } from '../../lib/images';
import { buttonClasses } from '../ui/Button';
import { Icon } from '../ui/Icon';

const AUTOPLAY_MS = 6000;
const SWIPE_PX = 50;

function Cta({ slide }: { slide: HeroSlide }) {
  if (!slide.ctaLabel || !slide.ctaUrl) return null;
  const cls = buttonClasses('primary', 'lg', '!bg-white !text-[#0a1530] hover:!bg-gold-500');
  return slide.ctaUrl.startsWith('/') ? (
    <Link to={slide.ctaUrl} className={cls}>
      {slide.ctaLabel} <span aria-hidden="true">↗</span>
    </Link>
  ) : (
    <a href={slide.ctaUrl} className={cls} rel="noopener">
      {slide.ctaLabel} <span aria-hidden="true">↗</span>
    </a>
  );
}

/** Splits a headline into up to three lines; the middle line is drawn as outlined text. */
function Headline({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return <>{text}</>;
  const size = Math.ceil(words.length / 3);
  const lines = words.length === 2 ? [[words[0]], [words[1]]] : [words.slice(0, size), words.slice(size, size * 2), words.slice(size * 2)];
  return (
    <>
      {lines
        .filter((l) => l.length)
        .map((l, i) => (
          <span key={i} className={`block ${i === 1 ? 'text-outline' : ''}`}>
            {l.join(' ')}
          </span>
        ))}
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

function SlideImage({ slide, eager }: { slide: HeroSlide; eager: boolean }) {
  return (
    <picture>
      {slide.mobileImageUrl && (
        <source media="(max-width: 767px)" srcSet={buildSrcSet(slide.mobileImageUrl, [400, 800]) ?? slide.mobileImageUrl} sizes="100vw" />
      )}
      <img
        src={slide.imageUrl}
        srcSet={buildSrcSet(slide.imageUrl, [800, 1200, 1920])}
        sizes="100vw"
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding={eager ? 'sync' : 'async'}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </picture>
  );
}

/**
 * Home hero carousel: autoplays every 6s, pauses on hover, touch, focus and
 * when the tab is hidden, loops, supports arrows, dots, swipe and keyboard.
 * Autoplay is off when the visitor prefers reduced motion.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [userPaused, setUserPaused] = useState(Boolean(reduce));
  const touchTimer = useRef<number | undefined>(undefined);
  const count = slides.length;

  useEffect(() => {
    if (reduce) setUserPaused(true);
  }, [reduce]);

  const go = useCallback(
    (next: number, dir: number) => {
      setDirection(dir);
      setIndex(((next % count) + count) % count);
    },
    [count],
  );
  const next = useCallback(() => go(index + 1, 1), [go, index]);
  const prev = useCallback(() => go(index - 1, -1), [go, index]);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const paused = userPaused || hovered || focused || touching || tabHidden || count < 2;

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(next, AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [paused, next, index]);

  // Warm the next slide's image so the crossfade never shows a blank frame.
  useEffect(() => {
    const upcoming = slides[(index + 1) % count];
    if (!upcoming) return;
    const img = new Image();
    img.src = window.matchMedia('(max-width: 767px)').matches && upcoming.mobileImageUrl ? upcoming.mobileImageUrl : upcoming.imageUrl;
  }, [index, slides, count]);

  if (!count) return null;
  const slide = slides[index] as HeroSlide;

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_PX) next();
    else if (info.offset.x > SWIPE_PX) prev();
  };

  const offset = reduce ? 0 : 40;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative isolate overflow-hidden bg-[#0a1530] text-white"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setFocused(false)}
      onTouchStart={() => {
        window.clearTimeout(touchTimer.current);
        setTouching(true);
      }}
      onTouchEnd={() => {
        touchTimer.current = window.setTimeout(() => setTouching(false), 4000);
      }}
      onKeyDown={onKeyDown}
    >
      <div className="relative h-[calc(100svh-104px)] max-h-[900px] min-h-[520px] w-full" aria-live={paused ? 'polite' : 'off'}>
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}: ${slide.headline}`}
            className="absolute inset-0 touch-pan-y"
            custom={direction}
            initial={{ opacity: 0, x: direction * offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * offset }}
            transition={{ duration: reduce ? 0.01 : 0.8, ease: [0.22, 1, 0.36, 1] }}
            drag={count > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={onDragEnd}
          >
            <SlideImage slide={slide} eager={index === 0} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1530]/90 via-[#0a1530]/45 to-[#0a1530]/20 md:bg-gradient-to-r md:from-[#0a1530]/90 md:via-[#0a1530]/50 md:to-[#0a1530]/10" />
            {/* The text block always stops above the slide controls (pb-24), and the
                headline scales with screen height too, so on short laptop screens it
                never runs into the counter or arrows. */}
            <div className="absolute inset-0 flex flex-col justify-end pt-12 pb-24 md:justify-center">
              <div className="container-page w-full">
                <div className="max-w-3xl">
                  <p className="eyebrow eyebrow-line !text-gold-400">Mandela Heritage Furniture</p>
                  <h2 className="mt-5 text-[min(3rem,7.5svh)] leading-[0.95] !text-white sm:text-[min(4.5rem,9svh)] lg:text-[min(6rem,10.5svh)]">
                    <Headline text={slide.headline} />
                  </h2>
                  {slide.subtext && <p className="mt-6 max-w-lg text-base text-white/80 sm:text-lg">{slide.subtext}</p>}
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Cta slide={slide} />
                    <Link
                      to="/custom-request"
                      className={buttonClasses('outline', 'lg', '!border-white/50 !text-white hover:!bg-white hover:!text-[#0a1530]')}
                    >
                      Custom order
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className="container-page absolute inset-x-0 bottom-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="hidden font-label text-xs font-bold tracking-[0.2em] text-white min-[400px]:inline" aria-hidden="true">
              {pad(index + 1)} <span className="text-white/70">/ {pad(count)}</span>
            </span>
            <div className="flex items-center" role="group" aria-label="Choose slide">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i, i > index ? 1 : -1)}
                  aria-label={`Go to slide ${i + 1}: ${s.headline}`}
                  aria-current={i === index ? 'true' : undefined}
                  className="group grid h-11 place-items-center px-1"
                >
                  <span
                    className={`block h-0.5 transition-all duration-300 ${i === index ? 'w-8 bg-gold-500 sm:w-10' : 'w-4 bg-white/35 group-hover:bg-white/70 sm:w-5'}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              className="grid h-10 w-10 place-items-center border border-white/30 text-white hover:border-gold-500 hover:text-gold-400"
              aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'}
            >
              <Icon name={userPaused ? 'play' : 'pause'} className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={prev}
              className="grid h-10 w-10 place-items-center border border-white/30 text-white hover:border-gold-500 hover:text-gold-400"
              aria-label="Previous slide"
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              type="button"
              onClick={next}
              className="grid h-10 w-10 place-items-center border border-white/30 text-white hover:border-gold-500 hover:text-gold-400"
              aria-label="Next slide"
            >
              <Icon name="chevronRight" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function HeroSkeleton() {
  return <div className="h-[calc(100svh-104px)] max-h-[900px] min-h-[520px] w-full animate-pulse bg-[#0a1530]" aria-hidden="true" />;
}
