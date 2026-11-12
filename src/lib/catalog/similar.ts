import type { CategoryNode, ProductSummary } from '../api/types';
import { isAvailable } from './filters';

/**
 * Products similar to the one being viewed, best match first:
 *   same sub-category  >  same top-level category  >  same room  >  anything else,
 * then in-stock before out-of-stock, then closest in price.
 * Always returns up to `limit` products (when the catalogue has enough), so the
 * "Similar products" row is never empty just because a sub-category is small.
 */
export function similarProducts(
  current: { id: string; categoryId: string; room: string | null; price: number },
  catalog: ProductSummary[],
  categories: CategoryNode[],
  limit = 8,
): ProductSummary[] {
  const parentOf = new Map<string, string>();
  for (const parent of categories) {
    parentOf.set(parent.id, parent.id);
    for (const child of parent.children) parentOf.set(child.id, parent.id);
  }
  const topLevel = parentOf.get(current.categoryId) ?? current.categoryId;
  const room = current.room?.toLowerCase() ?? null;

  const score = (p: ProductSummary): number => {
    if (p.categoryId === current.categoryId) return 3;
    if ((parentOf.get(p.categoryId) ?? p.categoryId) === topLevel) return 2;
    if (room && p.room?.toLowerCase() === room) return 1;
    return 0;
  };

  return catalog
    .filter((p) => p.id !== current.id)
    .map((p) => ({ p, s: score(p), available: isAvailable(p), distance: Math.abs(p.minPrice - current.price) }))
    .sort((a, b) => b.s - a.s || Number(b.available) - Number(a.available) || a.distance - b.distance)
    .slice(0, limit)
    .map((x) => x.p);
}
