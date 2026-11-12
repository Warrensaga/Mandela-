import { Link } from 'react-router';
import type { CategoryNode, ProductSummary } from '../../lib/api';
import { formatKES } from '../../lib/format';
import { whatsappLink } from '../../lib/whatsapp';
import { useSite } from '../../state/site';
import { ButtonAnchor, ButtonLink } from '../ui/Button';
import { Icon, WhatsAppIcon, type IconName } from '../ui/Icon';
import { Img } from '../ui/Img';
import { Price } from '../ui/Price';
import { isAvailable } from '../../lib/catalog/filters';
import { percentOff } from '../product/ProductCard';
import { Reveal } from '../ui/Reveal';
import { Skeleton } from '../ui/Skeleton';

// Factual statements about how the business works. No ratings, counts or reviews.
const BENEFITS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'ruler', title: 'Custom sizing', body: 'Built to your exact space' },
  { icon: 'truck', title: 'Nairobi next-day', body: 'For in-stock pieces' },
  { icon: 'hammer', title: 'Workshop made', body: 'Hardwood frames, built to last' },
  { icon: 'shield', title: 'Pay on confirmation', body: 'Confirmed on WhatsApp first' },
];

export function BenefitStrip() {
  return (
    <div className="border-y border-white/10 bg-[#0a1530] text-white">
      <ul className="container-page grid grid-cols-1 divide-white/10 min-[400px]:grid-cols-2 lg:grid-cols-4 lg:divide-x">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex min-w-0 items-center gap-3 px-2 py-4 min-[400px]:py-5 lg:px-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 text-gold-400">
              <Icon name={b.icon} className="h-5 w-5" />
            </span>
            <span>
              <span className="label-mono block text-white">{b.title}</span>
              <span className="block text-xs text-white/60">{b.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow eyebrow-line">{eyebrow}</p>
        <h2 className="mt-3 text-4xl sm:text-5xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** Dark "Shop by Category" grid: photo tiles, name bottom-left, arrow top-right. */
export function ShopByCategory() {
  const { categories, ready } = useSite();
  return (
    <section aria-labelledby="cat-heading" className="theme-dark py-20 sm:py-24">
      <div className="container-page">
        <div id="cat-heading">
          <SectionHeading
            eyebrow="Browse"
            title="Shop by Category"
            action={
              <Link to="/categories" className="label-mono tap hidden text-navy-600 hover:text-gold-400 sm:inline-block">
                All categories ↗
              </Link>
            }
          />
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {!ready && Array.from({ length: 6 }, (_, i) => <li key={i}><Skeleton className="aspect-[4/3] w-full rounded-none" /></li>)}
          {categories.map((cat, i) => (
            <Reveal as="li" key={cat.id} delay={(i % 3) * 0.06}>
              <CategoryTile cat={cat} />
            </Reveal>
          ))}
        </ul>
        <div className="mt-10 flex justify-center sm:justify-end">
          <ButtonLink to="/categories" variant="outline" size="lg">
            Browse all categories <span aria-hidden="true">↗</span>
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function CategoryTile({ cat, tall = false }: { cat: CategoryNode; tall?: boolean }) {
  return (
    <Link to={`/category/${cat.slug}`} className="group relative block overflow-hidden bg-paper-200">
      <Img
        src={cat.imageUrl}
        alt=""
        sizes="(min-width: 1024px) 33vw, 50vw"
        className={`${tall ? 'aspect-[3/4]' : 'aspect-[4/3]'} w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105`}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-[#0a1530]/85 via-[#0a1530]/10 to-transparent" />
      <span className="absolute top-3 right-3 grid h-9 w-9 place-items-center bg-[#0a1530]/50 text-white backdrop-blur-sm transition-colors group-hover:bg-gold-500 group-hover:text-[#0a1530]">
        ↗
      </span>
      <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <span className="block text-base font-medium text-white sm:text-lg">{cat.name}</span>
        {cat.children.length > 0 && (
          <span className="mt-0.5 hidden text-xs text-white/70 sm:block">{cat.children.slice(0, 3).map((c) => c.name).join(' · ')}</span>
        )}
      </span>
    </Link>
  );
}

const FEATURES: { slug: string; prefer: string; eyebrow: string; title: string; body: string; cta: string; badge: string }[] = [
  {
    slug: 'living-room',
    prefer: 'sofas',
    eyebrow: 'Living room',
    title: 'The perfect sofa awaits',
    body: 'From compact 2-seaters to generous L-shapes, in chenille, velvet or leather. Every frame is kiln-dried hardwood, built for family life.',
    cta: 'View sofas and living',
    badge: 'Made to your size',
  },
  {
    slug: 'dining',
    prefer: 'dining-sets',
    eyebrow: 'Dining',
    title: 'Gather around something beautiful',
    body: 'Dining sets for four to eight in oak, walnut and ebony finishes, plus chairs and sideboards to complete the room.',
    cta: 'Explore dining',
    badge: 'Seats 4 to 8',
  },
  {
    slug: 'bedroom',
    prefer: 'beds-and-bed-frames',
    eyebrow: 'Bedroom',
    title: 'Sleep in quiet comfort',
    body: 'Beds, wardrobes and bedside tables crafted for rest. Standard and custom sizes, with orthopaedic mattresses to match.',
    cta: 'Discover bedroom',
    badge: 'All bed sizes',
  },
];

/** Three alternating image-and-text sections, each linking to a collection. */
export function FeatureSplits({ products }: { products: ProductSummary[] }) {
  const { categories } = useSite();
  return (
    <>
      {FEATURES.map((f, i) => {
        const cat = categories.find((c) => c.slug === f.slug);
        if (!cat) return null;
        const ids = new Set([cat.id, ...cat.children.map((c) => c.id)]);
        const inCat = products.filter((p) => ids.has(p.categoryId));
        const preferredId = cat.children.find((c) => c.slug === f.prefer)?.id;
        const image =
          inCat.find((p) => p.categoryId === preferredId && p.imageUrl)?.imageUrl ??
          inCat.find((p) => p.isFeatured && p.imageUrl)?.imageUrl ??
          cat.imageUrl;
        const from = inCat.length ? Math.min(...inCat.map((p) => p.minPrice)) : null;
        return (
          <section key={f.slug} className="border-t border-paper-200 bg-paper-50" aria-labelledby={`feature-${f.slug}`}>
            <div className={`container-page grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
              <Reveal className="relative overflow-hidden bg-paper-200">
                <Img src={image} alt={cat.name} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/3] w-full object-cover" />
                <span className="label-mono absolute top-4 left-4 bg-paper-50 px-3 py-2 text-navy-800">{f.badge}</span>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="eyebrow eyebrow-line">{f.eyebrow}</p>
                <h2 id={`feature-${f.slug}`} className="mt-4 text-4xl leading-tight sm:text-5xl">{f.title}</h2>
                <p className="mt-5 max-w-md leading-relaxed text-muted">{f.body}</p>
                {from !== null && <p className="label-mono mt-5 text-brand-600">From {formatKES(from)}</p>}
                <ButtonLink to={`/category/${cat.slug}`} size="lg" className="mt-7">
                  {f.cta} <span aria-hidden="true">↗</span>
                </ButtonLink>
              </Reveal>
            </div>
          </section>
        );
      })}
    </>
  );
}

/** Bento grid of rooms (large tile + smaller tiles), linking to the room filter. */
export function ShopByRoom({ products }: { products: ProductSummary[] }) {
  const { categories } = useSite();
  const rooms = [...new Set(products.map((p) => p.room).filter((r): r is string => Boolean(r)))];
  const tiles = rooms
    .map((room) => {
      const inRoom = products.filter((p) => p.room === room);
      // Prefer the matching collection photo (e.g. "Bedroom" → bedroom), else a featured piece.
      const key = room.toLowerCase().replace(/[^a-z]+/g, '-');
      const cat = categories.find((c) => c.slug === key || c.slug.startsWith(`${key}-`));
      const image = cat?.imageUrl ?? (inRoom.find((p) => p.isFeatured && p.imageUrl) ?? inRoom.find((p) => p.imageUrl))?.imageUrl ?? null;
      return { room, image, count: inRoom.length };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  if (!tiles.length) return null;
  return (
    <section aria-labelledby="room-heading" className="bg-paper-100 py-20 sm:py-24">
      <div className="container-page">
        <div id="room-heading">
          <SectionHeading eyebrow="Explore" title="Shop by Room" />
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
          {tiles.map((t, i) => (
            <Reveal as="li" key={t.room} delay={i * 0.05} className={i === 0 ? 'col-span-2 lg:row-span-2' : ''}>
              <Link to={`/shop?room=${encodeURIComponent(t.room)}`} className="group relative block h-full overflow-hidden bg-paper-200">
                <Img
                  src={t.image}
                  alt=""
                  sizes={i === 0 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
                  className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${i === 0 ? 'aspect-[4/3] lg:aspect-auto' : 'aspect-square'}`}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-[#0a1530]/80 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 sm:p-5">
                  <span className={`font-serif text-white ${i === 0 ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>{t.room}</span>
                  <span className="label-mono text-white/80">{t.count} pieces ↗</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Promises the business keeps, shown where the reference layout has reviews.
// Real customer reviews can replace these once the owner collects them.
const PROMISES: { title: string; body: string }[] = [
  { title: 'Confirmed in writing', body: 'Every order is confirmed on WhatsApp with items, total and delivery date before you pay anything.' },
  { title: 'Made to measure', body: 'Need a different size, fabric or finish? Our workshop quotes and builds it, with a deposit to start.' },
  { title: 'Delivered with care', body: 'Next-day delivery in Nairobi for in-stock pieces, and courier delivery or branch pick-up across Kenya.' },
];

export function PromiseSection() {
  return (
    <section aria-labelledby="promise-heading" className="theme-dark py-20 sm:py-24">
      <div className="container-page">
        <div id="promise-heading">
          <SectionHeading eyebrow="Our promise" title="How we work with you" />
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {PROMISES.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.06} className="border border-paper-200 bg-paper-100 p-6 sm:p-8">
              <span className="font-label text-xs font-bold text-gold-ink">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-4 text-2xl">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{p.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function DeliveryAndPayment() {
  const { zones, settings } = useSite();
  if (!zones.length) return null;
  return (
    <section aria-labelledby="delivery-heading" className="bg-paper-50 py-20 sm:py-24">
      <div className="container-page grid gap-6 lg:grid-cols-2">
        <Reveal className="border border-paper-200 p-6 sm:p-8">
          <p className="eyebrow eyebrow-line">Delivery</p>
          <h2 id="delivery-heading" className="mt-3 text-3xl sm:text-4xl">Where we deliver</h2>
          <ul className="mt-6 divide-y divide-paper-200">
            {zones.map((z) => (
              <li key={z.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-navy-800">{z.name}</p>
                  <p className="text-sm text-muted">
                    {z.daysMin === z.daysMax ? `${z.daysMin} day${z.daysMin === 1 ? '' : 's'}` : `${z.daysMin} to ${z.daysMax} days`}
                    {z.freeThreshold !== null && ` · free over ${formatKES(z.freeThreshold)}`}
                  </p>
                </div>
                <p className="label-mono shrink-0 text-navy-800">{z.fee === 0 ? 'Free' : formatKES(z.fee)}</p>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.08} className="flex flex-col justify-between bg-brand-600 p-6 text-white sm:p-8">
          <div>
            <p className="label-mono text-gold-300">Paying</p>
            <h2 className="mt-3 text-3xl !text-white sm:text-4xl">Order now, pay when we confirm</h2>
            <ol className="mt-6 space-y-3 text-sm text-white/85">
              <li><span className="font-label font-bold text-gold-300">01</span> Place your order online. Nothing is charged.</li>
              <li><span className="font-label font-bold text-gold-300">02</span> We confirm items, total and delivery date on WhatsApp.</li>
              <li><span className="font-label font-bold text-gold-300">03</span> Pay by M-Pesa or bank transfer using your order number.</li>
            </ol>
          </div>
          <p className="mt-8 border-t border-white/20 pt-4 text-sm text-white/85">
            Custom and made-to-order pieces start with a {settings.depositPercent}% deposit.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** Closing call to action, as on the reference layout. */
export function CustomCta() {
  const { settings, categories } = useSite();
  const bg = categories.find((c) => c.slug === 'living-room')?.imageUrl ?? null;
  return (
    <section className="relative isolate overflow-hidden bg-[#0a1530] text-white">
      {bg && <Img src={bg} alt="" sizes="100vw" className="absolute inset-0 -z-20 h-full w-full object-cover" />}
      <span className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a1530] via-[#0a1530]/90 to-[#0a1530]/70" aria-hidden="true" />
      <span className="absolute top-0 left-0 h-1 w-28 bg-gold-500" aria-hidden="true" />
      <div className="container-page py-20 sm:py-24">
        <p className="eyebrow eyebrow-line !text-gold-400">Custom orders</p>
        <h2 className="mt-4 max-w-2xl text-4xl !text-white sm:text-5xl">Can't find what you're looking for?</h2>
        <p className="mt-5 max-w-xl text-white/80">
          We build furniture to your exact size, material, colour and style. Share your idea and a photo if you have one, and we will quote on WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/custom-request" size="lg" className="!bg-white !text-[#0a1530] hover:!bg-gold-500">
            Request a custom piece <span aria-hidden="true">↗</span>
          </ButtonLink>
          {settings.whatsappNumber && (
            <ButtonAnchor
              variant="whatsapp"
              size="lg"
              href={whatsappLink(settings.whatsappNumber, 'Hello, I would like a custom furniture piece made.')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon className="h-4 w-4" /> Chat on WhatsApp
            </ButtonAnchor>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Deals strip: compact cards for pieces with an admin-entered compare-at price.
 * Hidden when nothing is on offer. No countdowns or invented urgency.
 */
export function DealsStrip({ products }: { products: ProductSummary[] }) {
  const { categoryById } = useSite();
  const deals = products
    .filter((p) => isAvailable(p) && percentOff(p.compareAtPrice, p.minPrice))
    .sort((a, b) => (percentOff(b.compareAtPrice, b.minPrice) ?? 0) - (percentOff(a.compareAtPrice, a.minPrice) ?? 0))
    .slice(0, 4);
  if (!deals.length) return null;
  return (
    <section aria-labelledby="deals-heading" className="bg-paper-100 py-14 sm:py-16">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow eyebrow-line">Deals</p>
            <h2 id="deals-heading" className="mt-3 text-3xl sm:text-4xl">On offer now</h2>
          </div>
          <Link to="/shop?offers=1" className="label-mono tap text-terracotta-600 hover:text-terracotta-500">
            View all offers ↗
          </Link>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {deals.map((p, i) => {
            const pct = percentOff(p.compareAtPrice, p.minPrice);
            const category = categoryById(p.categoryId);
            return (
              <Reveal as="li" key={p.id} delay={i * 0.05}>
                <article className="group relative flex h-full gap-4 border border-paper-200 bg-paper-50 p-3 transition-shadow hover:shadow-lift">
                  <span className="relative block w-24 shrink-0 overflow-hidden bg-paper-200 sm:w-28">
                    <Img src={p.imageUrl} alt="" sizes="112px" className="aspect-square h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {pct && (
                      <span className="absolute top-1.5 left-1.5 bg-[#b9351f] px-1.5 py-0.5 font-label text-[10px] font-bold text-white">-{pct}%</span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col justify-center gap-1">
                    {category && <span className="font-label text-[9px] font-bold tracking-[0.18em] text-muted uppercase">{category.name}</span>}
                    <Link to={`/product/${p.slug}`} className="line-clamp-2 text-[15px] leading-snug font-medium text-navy-800 after:absolute after:inset-0 group-hover:text-brand-600">
                      {p.name}
                    </Link>
                    <Price amount={p.minPrice} compareAt={p.compareAtPrice} from={p.hasVariants && p.minPrice !== p.maxPrice} size="sm" />
                  </span>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
