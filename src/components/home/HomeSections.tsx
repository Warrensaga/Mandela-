import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { CategoryNode, ProductSummary } from '../../lib/api';
import { isAvailable } from '../../lib/catalog/filters';
import { formatKES } from '../../lib/format';
import { whatsappLink } from '../../lib/whatsapp';
import { useSite } from '../../state/site';
import { SocialLinks } from '../layout/SocialLinks';
import { percentOff, ProductCard } from '../product/ProductCard';
import { ProductGrid } from '../product/ProductGrid';
import { ButtonAnchor, ButtonLink } from '../ui/Button';
import { Icon, WhatsAppIcon, type IconName } from '../ui/Icon';
import { Img } from '../ui/Img';
import { Reveal } from '../ui/Reveal';
import { GridSkeleton, Skeleton } from '../ui/Skeleton';

// Factual statements about how the business works. No ratings, counts or reviews.
const BENEFITS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'ruler', title: 'Custom sizing', body: 'Built to fit your space' },
  { icon: 'truck', title: 'Nairobi next-day', body: 'For in-stock pieces' },
  { icon: 'hammer', title: 'Made in our workshop', body: 'Hardwood frames' },
  { icon: 'shield', title: 'Pay after we confirm', body: 'Order confirmed on WhatsApp' },
];

/** Service facts under the hero. */
export function BenefitStrip() {
  return (
    <div className="border-b border-paper-200 bg-paper-50">
      <ul className="container-page grid grid-cols-2 gap-y-4 py-5 lg:grid-cols-4 lg:py-6">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex min-w-0 items-start gap-3 pr-2">
            <Icon name={b.icon} className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-navy-800">{b.title}</span>
              <span className="block text-[13px] text-muted">{b.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Section title row: heading (plus an optional line of context) and a "view all" link. */
export function SectionHeading({
  id,
  title,
  intro,
  link,
}: {
  id: string;
  title: ReactNode;
  intro?: ReactNode;
  link?: { to: string; label: string };
}) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-paper-200 pb-5">
      <div className="max-w-2xl">
        <h2 id={id} className="text-3xl sm:text-4xl">
          {title}
        </h2>
        {intro && <p className="mt-2 text-[15px] text-muted">{intro}</p>}
      </div>
      {link && (
        <Link
          to={link.to}
          className="py-2 text-sm font-semibold text-navy-800 underline decoration-paper-300 underline-offset-[6px] transition-colors hover:text-brand-600 hover:decoration-brand-600"
        >
          {link.label}
        </Link>
      )}
    </Reveal>
  );
}

/** Collections: the first category as a tall tile, the rest beside it. */
export function ShopByCategory() {
  const { categories, ready } = useSite();
  return (
    <section aria-labelledby="cat-heading" className="section-y bg-paper-50">
      <div className="container-page">
        <SectionHeading id="cat-heading" title="Shop by category" link={{ to: '/categories', label: 'All categories' }} />
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-flow-dense lg:grid-cols-3">
          {!ready &&
            Array.from({ length: 7 }, (_, i) => (
              <li key={i} className={i === 0 ? 'col-span-2 lg:col-span-1 lg:row-span-3' : ''}>
                <Skeleton className="aspect-[4/3] h-full w-full rounded-none" />
              </li>
            ))}
          {categories.map((cat, i) => (
            <Reveal as="li" key={cat.id} delay={(i % 3) * 0.05} className={i === 0 ? 'col-span-2 lg:col-span-1 lg:row-span-3' : ''}>
              <CategoryTile cat={cat} fill={i === 0} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CategoryTile({
  cat,
  tall = false,
  fill = false,
}: {
  cat: CategoryNode;
  tall?: boolean;
  /** Stretch to the grid cell's height on desktop (the large lead tile). */
  fill?: boolean;
}) {
  const aspect = tall ? 'aspect-[3/4]' : fill ? 'aspect-[4/3] lg:aspect-auto lg:h-full' : 'aspect-[4/3]';
  return (
    <Link to={`/category/${cat.slug}`} className={`group relative block overflow-hidden bg-paper-200 ${fill ? 'h-full' : ''}`}>
      <Img
        src={cat.imageUrl}
        alt=""
        sizes={fill ? '(min-width: 1024px) 33vw, 100vw' : '(min-width: 1024px) 33vw, 50vw'}
        className={`${aspect} w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]`}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-[#0a1530]/75 via-transparent to-transparent" />
      <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <span className={`block leading-tight font-semibold text-white ${fill ? 'text-xl sm:text-2xl' : 'text-[15px] sm:text-lg'}`}>
          {cat.name}
        </span>
        {cat.children.length > 0 && (
          <span className="mt-1 hidden text-[13px] text-white/80 sm:block">
            {cat.children.slice(0, 3).map((c) => c.name).join(', ')}
          </span>
        )}
      </span>
    </Link>
  );
}

/** A title row plus a product grid (best sellers, featured, new arrivals). */
export function ProductShelf({
  id,
  title,
  intro,
  link,
  products,
  loading,
  tone = 'white',
}: {
  id: string;
  title: ReactNode;
  intro?: ReactNode;
  link?: { to: string; label: string };
  products: ProductSummary[];
  loading: boolean;
  tone?: 'white' | 'grey';
}) {
  if (!loading && !products.length) return null;
  return (
    <section aria-labelledby={id} className={`section-y ${tone === 'grey' ? 'bg-paper-100' : 'bg-paper-50'}`}>
      <div className="container-page">
        <SectionHeading id={id} title={title} intro={intro} link={link} />
        <div className="mt-8">{loading ? <GridSkeleton count={4} /> : <ProductGrid products={products} />}</div>
      </div>
    </section>
  );
}

/**
 * Pieces with an admin-entered compare-at price, on a navy band.
 * Hidden when nothing is on offer. No countdowns or invented urgency.
 */
export function OffersFeature({ products }: { products: ProductSummary[] }) {
  const deals = products
    .filter((p) => isAvailable(p) && percentOff(p.compareAtPrice, p.minPrice))
    .sort((a, b) => (percentOff(b.compareAtPrice, b.minPrice) ?? 0) - (percentOff(a.compareAtPrice, a.minPrice) ?? 0))
    .slice(0, 4);
  if (!deals.length) return null;
  return (
    <section aria-labelledby="offers-heading" className="theme-dark section-y">
      <div className="container-page">
        <SectionHeading
          id="offers-heading"
          title="On offer now"
          intro="Reduced prices on selected pieces, with the original price shown."
          link={{ to: '/shop?offers=1', label: 'All offers' }}
        />
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
          {deals.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 0.05}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

const ROOMS: { slug: string; prefer: string; name: string; body: string }[] = [
  {
    slug: 'living-room',
    prefer: 'sofas',
    name: 'Living room',
    body: '2-seaters to L-shapes in chenille, velvet or leather, plus coffee tables and TV stands.',
  },
  {
    slug: 'dining',
    prefer: 'dining-sets',
    name: 'Dining',
    body: 'Sets for four to eight in oak, walnut and ebony finishes, with chairs and sideboards.',
  },
  {
    slug: 'bedroom',
    prefer: 'beds-and-bed-frames',
    name: 'Bedroom',
    body: 'Beds in standard and custom sizes, wardrobes, bedside tables and mattresses.',
  },
];

/**
 * Three rooms with a product photo each (so this does not repeat the category
 * tiles above), then links to every room the catalogue covers.
 */
export function InteriorInspiration({ products }: { products: ProductSummary[] }) {
  const { categories } = useSite();
  const rooms = ROOMS.flatMap((r) => {
    const cat = categories.find((c) => c.slug === r.slug);
    if (!cat) return [];
    const ids = new Set([cat.id, ...cat.children.map((c) => c.id)]);
    const inCat = products.filter((p) => ids.has(p.categoryId));
    const preferredId = cat.children.find((c) => c.slug === r.prefer)?.id;
    const image =
      inCat.find((p) => p.categoryId === preferredId && p.isFeatured && p.imageUrl)?.imageUrl ??
      inCat.find((p) => p.categoryId === preferredId && p.imageUrl)?.imageUrl ??
      inCat.find((p) => p.imageUrl)?.imageUrl ??
      cat.imageUrl;
    const from = inCat.length ? Math.min(...inCat.map((p) => p.minPrice)) : null;
    return [{ ...r, cat, image, from }];
  });
  const roomFilters = [...new Set(products.map((p) => p.room).filter((r): r is string => Boolean(r)))].sort();
  if (!rooms.length) return null;

  return (
    <section aria-labelledby="rooms-heading" className="section-y bg-paper-100">
      <div className="container-page">
        <SectionHeading id="rooms-heading" title="Furnish a room" intro="Where to start for the rooms customers ask us about most." />
        <ul className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
          {rooms.map((r, i) => (
            <Reveal as="li" key={r.slug} delay={i * 0.06}>
              <Link to={`/category/${r.cat.slug}`} className="group block h-full bg-paper-50">
                <span className="block overflow-hidden bg-paper-200">
                  <Img
                    src={r.image}
                    alt={`${r.name} furniture`}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </span>
                <span className="block p-5 sm:p-6">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-serif text-2xl text-navy-800 group-hover:text-brand-600">{r.name}</span>
                    {r.from !== null && <span className="shrink-0 text-sm text-muted">from {formatKES(r.from)}</span>}
                  </span>
                  <span className="mt-2 block text-[15px] leading-relaxed text-muted">{r.body}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
        {roomFilters.length > 0 && (
          <nav aria-label="Shop by room" className="mt-8 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm text-muted">Shop by room:</span>
            {roomFilters.map((room) => (
              <Link
                key={room}
                to={`/shop?room=${encodeURIComponent(room)}`}
                className="inline-flex h-10 items-center border border-paper-300 bg-paper-50 px-4 text-sm text-navy-800 transition-colors hover:border-brand-600 hover:text-brand-600"
              >
                {room}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}

// How ordering works here. Facts about the process, not reviews.
const STEPS: { title: string; body: string }[] = [
  { title: 'You order online', body: 'Pick your pieces and delivery area. Nothing is charged when you place the order.' },
  { title: 'We confirm on WhatsApp', body: 'You get the items, total and delivery date in writing before you pay anything.' },
  { title: 'You pay, we deliver', body: 'Pay by M-Pesa or bank transfer. Next-day in Nairobi for in-stock pieces; courier or branch pick-up upcountry.' },
];

export function PromiseSection() {
  return (
    <section aria-labelledby="steps-heading" className="section-y bg-paper-50">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <Reveal>
          <h2 id="steps-heading" className="text-3xl sm:text-4xl">
            How ordering works
          </h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
            No online payment and no surprises. Questions first?{' '}
            <Link to="/faq" className="text-navy-800 underline underline-offset-4 hover:text-brand-600">
              Read the FAQs
            </Link>
            .
          </p>
        </Reveal>
        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 0.05} className="border-t-2 border-navy-800 pt-4">
              <span className="text-sm font-semibold text-brand-600">Step {i + 1}</span>
              <h3 className="mt-1 font-sans text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Delivery fees by area. Shown where reviews go until the owner publishes one. */
export function DeliveryAndPayment() {
  const { zones, settings } = useSite();
  if (!zones.length) return null;
  return (
    <section aria-labelledby="delivery-heading" className="section-y bg-paper-100">
      <div className="container-page grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <Reveal>
          <h2 id="delivery-heading" className="text-3xl sm:text-4xl">
            Delivery fees
          </h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
            You choose your area at checkout and the fee is added to your total. Custom and made-to-order pieces start with a{' '}
            {settings.depositPercent}% deposit.
          </p>
          <Link to="/delivery" className="mt-4 inline-block py-2 text-sm font-semibold text-navy-800 underline underline-offset-[6px] hover:text-brand-600">
            Delivery and installation details
          </Link>
        </Reveal>
        <Reveal delay={0.08}>
          <table className="w-full border-collapse bg-paper-50 text-left text-[15px]">
            <thead>
              <tr className="border-b border-paper-200 text-sm text-muted">
                <th scope="col" className="px-4 py-3 font-medium sm:px-5">Area</th>
                <th scope="col" className="px-4 py-3 font-medium sm:px-5">Time</th>
                <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">Fee</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className="border-b border-paper-200 last:border-0">
                  <th scope="row" className="px-4 py-3.5 font-medium text-navy-800 sm:px-5">
                    {z.name}
                    {z.freeThreshold !== null && <span className="block text-[13px] font-normal text-muted">Free over {formatKES(z.freeThreshold)}</span>}
                  </th>
                  <td className="px-4 py-3.5 text-muted sm:px-5">
                    {z.daysMin === z.daysMax ? `${z.daysMin} day${z.daysMin === 1 ? '' : 's'}` : `${z.daysMin} to ${z.daysMax} days`}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-navy-800 sm:px-5">{z.fee === 0 ? 'Free' : formatKES(z.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Social follow strip, in place of a newsletter (owner's choice). Nothing is
 * collected. Hidden when no social links are set.
 */
export function StayInTouch() {
  const { settings } = useSite();
  if (!settings.social.instagram && !settings.social.tiktok) return null;
  return (
    <section aria-labelledby="follow-heading" className="border-t border-paper-200 bg-paper-50 py-10 sm:py-12">
      <Reveal className="container-page flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="follow-heading" className="font-sans text-lg font-semibold">
            Follow {settings.storeName}
          </h2>
          <p className="mt-1 text-[15px] text-muted">New pieces and photos from the workshop, on Instagram and TikTok.</p>
        </div>
        <SocialLinks />
      </Reveal>
    </section>
  );
}

/** Closing call to action for custom and made-to-order pieces. */
export function CustomCta() {
  const { settings, categories } = useSite();
  const bg = categories.find((c) => c.slug === 'living-room')?.imageUrl ?? null;
  return (
    <section aria-labelledby="custom-heading" className="relative isolate overflow-hidden bg-[#0a1530] text-white">
      {bg && <Img src={bg} alt="" sizes="100vw" className="absolute inset-0 -z-20 h-full w-full object-cover" />}
      <span className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a1530] via-[#0a1530]/90 to-[#0a1530]/60" aria-hidden="true" />
      <Reveal className="container-page py-16 sm:py-24">
        <h2 id="custom-heading" className="max-w-xl text-3xl !text-white sm:text-5xl">
          Need a different size or fabric?
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85">
          We make sofas, beds, wardrobes and tables to order. Send the measurements, and a photo if you have one, and we'll reply with a
          quote. Custom pieces start with a {settings.depositPercent}% deposit.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/custom-request" size="lg" className="!bg-white !text-[#0a1530] hover:!bg-gold-400">
            Request a custom piece
          </ButtonLink>
          {settings.whatsappNumber && (
            <ButtonAnchor
              variant="whatsapp"
              size="lg"
              href={whatsappLink(settings.whatsappNumber, 'Hello, I would like a custom furniture piece made.')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon className="h-4 w-4" /> Ask on WhatsApp
            </ButtonAnchor>
          )}
        </div>
      </Reveal>
    </section>
  );
}
