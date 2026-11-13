import { Link } from 'react-router';
import type { ProductSummary } from '../../lib/api';
import { isAvailable } from '../../lib/catalog/filters';
import { useSite } from '../../state/site';
import { Img } from '../ui/Img';
import { Price } from '../ui/Price';
import { SaveButton } from './SaveButton';

export function isOnOffer(p: Pick<ProductSummary, 'compareAtPrice' | 'minPrice'>): boolean {
  return p.compareAtPrice !== null && p.compareAtPrice > p.minPrice;
}

/** Whole-number discount from the admin-entered compare-at price, or null. */
export function percentOff(compareAt: number | null | undefined, price: number | null | undefined): number | null {
  if (compareAt == null || price == null || !(compareAt > price)) return null;
  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  return pct >= 1 ? pct : null;
}

/** Quiet labels on the product photo (offer, badge, made to order, free delivery). */
export function ProductBadges({
  product,
}: {
  product: Pick<ProductSummary, 'badge' | 'freeDelivery' | 'madeToOrder'> & { compareAtPrice?: number | null; minPrice?: number };
}) {
  const badges: { label: string; tone: string }[] = [];
  const pct = percentOff(product.compareAtPrice, product.minPrice);
  if (pct) badges.push({ label: `-${pct}%`, tone: 'bg-terracotta-600 text-white' });
  if (product.badge && !/made to order|sale|offer/i.test(product.badge)) {
    badges.push({ label: product.badge, tone: 'bg-[#0a1530] text-[#ffffff]' });
  }
  if (product.madeToOrder) badges.push({ label: 'Made to order', tone: 'bg-[#ffffff]/95 text-[#0a1530]' });
  if (product.freeDelivery) badges.push({ label: 'Free delivery', tone: 'bg-[#ffffff]/95 text-[#0a1530]' });
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span key={b.label} className={`px-2 py-1 font-label text-[10px] font-semibold tracking-[0.12em] uppercase ${b.tone}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

export function ProductCard({ product, priority = false }: { product: ProductSummary; priority?: boolean }) {
  const { categoryById } = useSite();
  const category = categoryById(product.categoryId);
  const available = isAvailable(product);
  const low = !product.madeToOrder && available && product.totalStock <= product.lowStockThreshold;
  const priceVaries = product.hasVariants && product.minPrice !== product.maxPrice;
  return (
    <article className="group relative">
      <div className="relative overflow-hidden bg-paper-200">
        <Img
          src={product.imageUrl}
          alt={product.name}
          priority={priority}
          sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, 48vw"
          className={`aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${available ? '' : 'opacity-60 grayscale-[40%]'}`}
        />
        <div className="absolute top-3 left-3">
          <ProductBadges product={product} />
        </div>
        <SaveButton productId={product.id} productName={product.name} className="absolute top-2 right-2" />
        <span className="label-mono pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 bg-[#ffffff] py-3 text-center text-[#0a1530] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {available ? (product.hasVariants ? 'Choose options' : 'View piece') : 'View details'} ↗
        </span>
      </div>
      <div className="mt-3 space-y-1">
        {category && <p className="font-label text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">{category.name}</p>}
        <h3 className="font-sans text-[15px] leading-snug font-medium text-navy-800 sm:text-base">
          <Link to={`/product/${product.slug}`} className="after:absolute after:inset-0 focus:outline-none">
            {product.name}
          </Link>
        </h3>
        <Price amount={product.minPrice} compareAt={priceVaries ? null : product.compareAtPrice} from={priceVaries} size="sm" />
        {!available && <p className="label-mono text-muted">Out of stock</p>}
        {low && <p className="text-xs font-medium text-gold-ink">Only {product.totalStock} left</p>}
      </div>
    </article>
  );
}
