import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { fetchCatalog, type ProductSummary } from '../../lib/api';
import { categorySubtreeIds, suggest } from '../../lib/catalog/search';
import { formatKES } from '../../lib/format';
import { useSite } from '../../state/site';
import { Img } from '../ui/Img';

export interface SuggestionItem {
  key: string;
  to: string;
  label: string;
}

/** Builds the suggestion list (products, categories, then "see all"). */
export function useSearchSuggestions(query: string, categorySlug: string, enabled: boolean) {
  const { categories } = useSite();
  const [catalog, setCatalog] = useState<ProductSummary[] | null>(null);

  // Load the (cached) catalogue the first time the search box is used.
  useEffect(() => {
    if (!enabled || catalog) return;
    let alive = true;
    fetchCatalog()
      .then((c) => alive && setCatalog(c))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled, catalog]);

  return useMemo(() => {
    const flat = categories.flatMap((c) => [c, ...c.children]);
    const within = categorySlug ? categorySubtreeIds(flat, categorySlug) : null;
    const result = suggest(query, catalog ?? [], categorySlug ? [] : flat, { withinCategoryIds: within });    const term = query.trim();
    const base = categorySlug ? `/category/${categorySlug}` : '/shop';
    const items: (SuggestionItem & { product?: ProductSummary; kind: 'product' | 'category' | 'all' })[] = [
      ...result.products.map((p) => ({ key: `p-${p.id}`, to: `/product/${p.slug}`, label: p.name, product: p, kind: 'product' as const })),
      ...result.categories.map((c) => ({ key: `c-${c.id}`, to: `/category/${c.slug}`, label: c.name, kind: 'category' as const })),
    ];
    if (term.length >= 2) items.push({ key: 'all', to: `${base}?q=${encodeURIComponent(term)}`, label: `See all results for “${term}”`, kind: 'all' });
    return { items, loading: enabled && !catalog };
  }, [categories, catalog, categorySlug, query, enabled]);
}

/** The dropdown under the search box. Keyboard handling lives in the search bar. */
export function SearchSuggestionList({
  id,
  items,
  activeIndex,
  onPick,
}: {
  id: string;
  items: ReturnType<typeof useSearchSuggestions>['items'];
  activeIndex: number;
  onPick: () => void;
}) {
  const { categoryById } = useSite();
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Search suggestions"
      data-lenis-prevent
      className="absolute inset-x-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto border border-paper-300 bg-paper-50 shadow-xl"
    >
      {items.map((item, i) => (
        <li key={item.key} id={`${id}-${i}`} role="option" aria-selected={i === activeIndex}>
          <Link
            to={item.to}
            onClick={onPick}
            tabIndex={-1}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm ${i === activeIndex ? 'bg-paper-200' : 'hover:bg-paper-100'} ${item.kind === 'all' ? 'border-t border-paper-200 font-label text-[11px] font-bold tracking-[0.14em] text-brand-600 uppercase' : 'text-navy-800'}`}
          >
            {item.kind === 'product' && item.product && (
              <>
                <Img src={item.product.imageUrl} alt="" sizes="48px" className="h-10 w-12 shrink-0 object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted">{categoryById(item.product.categoryId)?.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {item.product.hasVariants && item.product.minPrice !== item.product.maxPrice ? 'From ' : ''}
                  {formatKES(item.product.minPrice)}
                </span>
              </>
            )}
            {item.kind === 'category' && (
              <span>
                <span className="mr-2 font-label text-[9px] font-bold tracking-[0.16em] text-gold-ink uppercase">Category</span>
                {item.label}
              </span>
            )}
            {item.kind === 'all' && item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
