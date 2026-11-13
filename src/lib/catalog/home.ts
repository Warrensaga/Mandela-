import type { ProductSummary } from '../api';
import { isAvailable, sortProducts } from './filters';

/** A best-sellers shelf is only shown when real orders rank at least this many pieces. */
export const MIN_BEST_SELLERS = 4;

export interface HomeShelves {
  /** Ranked by units sold in confirmed orders; empty until there are enough. */
  bestSellers: ProductSummary[];
  /** Admin-featured pieces, used in the same slot while there are no best sellers. */
  featured: ProductSummary[];
  newest: ProductSummary[];
}

/**
 * Picks the home page product shelves without showing a piece twice.
 * Best sellers come from the `get_best_sellers` ranking (ids only); when fewer
 * than MIN_BEST_SELLERS are in stock, the slot falls back to featured pieces,
 * which are labelled as featured, never as best sellers.
 */
export function pickHomeShelves(products: ProductSummary[], bestSellerIds: string[]): HomeShelves {
  const byId = new Map(products.map((p) => [p.id, p]));
  const ranked = bestSellerIds
    .map((id) => byId.get(id))
    .filter((p): p is ProductSummary => Boolean(p && isAvailable(p)))
    .slice(0, 8);
  const bestSellers = ranked.length >= MIN_BEST_SELLERS ? ranked.slice(0, ranked.length >= 8 ? 8 : 4) : [];

  const shown = new Set(bestSellers.map((p) => p.id));
  const featured = bestSellers.length
    ? []
    : sortProducts(products.filter((p) => p.isFeatured && isAvailable(p)), 'featured').slice(0, 4);
  featured.forEach((p) => shown.add(p.id));

  const newest = sortProducts(products.filter((p) => isAvailable(p) && !shown.has(p.id)), 'newest').slice(0, 4);
  return { bestSellers, featured, newest };
}
