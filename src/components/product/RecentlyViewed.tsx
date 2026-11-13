import { useMemo, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { fetchCatalog } from '../../lib/api';
import { readRecentlyViewed } from '../../state/recentlyViewed';
import { ProductGrid } from './ProductGrid';

/**
 * Products this visitor looked at before (stored on their device), newest
 * first, excluding the one on screen. Hidden when there is nothing to show.
 */
export function RecentlyViewed({ excludeId, limit = 4 }: { excludeId?: string; limit?: number }) {
  // Read once on mount: the current product is recorded after this render.
  const [ids] = useState(readRecentlyViewed);
  const catalog = useAsync(() => fetchCatalog(), []);

  const products = useMemo(() => {
    const byId = new Map((catalog.data ?? []).map((p) => [p.id, p]));
    return ids
      .filter((id) => id !== excludeId)
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .slice(0, limit);
  }, [catalog.data, ids, excludeId, limit]);

  if (!products.length) return null;

  return (
    <section aria-labelledby="recent-heading" className="mt-20 border-t border-paper-200 pt-12">
      <h2 id="recent-heading" className="mb-8 text-3xl sm:text-4xl">Recently viewed</h2>
      <ProductGrid products={products} />
    </section>
  );
}
