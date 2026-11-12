import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import { fetchCatalog } from '../../lib/api';
import {
  activeFilterCount,
  applyFilters,
  buildFacets,
  categorySubtreeIds,
  EMPTY_FILTERS,
  filtersToParams,
  parseFilters,
  SORT_LABELS,
  type ShopFilters,
  type SortKey,
} from '../../lib/catalog/filters';
import { pluralise } from '../../lib/format';
import { useSite } from '../../state/site';
import { ProductGrid } from '../product/ProductGrid';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { Icon } from '../ui/Icon';
import { GridSkeleton } from '../ui/Skeleton';
import { Filters } from './Filters';

interface ShopViewProps {
  /** Fixed category (category pages). The shop page lets visitors pick one. */
  categorySlug?: string;
  /** Chips to show instead of the default All / Offers / collections chips. */
  chips?: ReactNode;
}

export const chipClass = (active: boolean) =>
  `shrink-0 rounded-full border px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
    active ? 'border-navy-800 bg-navy-800 text-paper-50' : 'border-paper-300 text-navy-800 hover:border-navy-400'
  }`;

/** Product grid with URL-driven chips, search, sort and a "Refine" filter drawer. */
export function ShopView({ categorySlug, chips }: ShopViewProps) {
  const [params, setParams] = useSearchParams();
  const { categories } = useSite();
  const catalog = useAsync(() => fetchCatalog(), []);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo(() => {
    const f = parseFilters(params);
    return categorySlug ? { ...f, category: categorySlug } : f;
  }, [params, categorySlug]);

  const scope = useMemo(() => {
    const all = catalog.data ?? [];
    const ids = categorySubtreeIds(categories, filters.category);
    return ids ? all.filter((p) => ids.has(p.categoryId)) : all;
  }, [catalog.data, categories, filters.category]);

  const facets = useMemo(() => buildFacets(scope), [scope]);
  const results = useMemo(() => applyFilters(scope, filters, null), [scope, filters]);
  const activeCount = activeFilterCount(filters, true) - (filters.offers ? 1 : 0);

  const update = (patch: Partial<ShopFilters>) => {
    const next = filtersToParams({ ...filters, ...patch });
    if (categorySlug) next.delete('category');
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const clear = () =>
    setParams(filtersToParams({ ...EMPTY_FILTERS, q: filters.q, sort: filters.sort }), { replace: true, preventScrollReset: true });

  const defaultChips = (
    <>
      <button type="button" className={chipClass(!filters.category && !filters.offers)} onClick={() => update({ category: null, offers: false })}>
        All
      </button>
      <button
        type="button"
        className={`${chipClass(filters.offers)} ${filters.offers ? '' : '!border-terracotta-500/50 !text-terracotta-600'}`}
        onClick={() => update({ offers: !filters.offers })}
        aria-pressed={filters.offers}
      >
        Offers
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={chipClass(filters.category === c.slug || c.children.some((k) => k.slug === filters.category))}
          onClick={() => update({ category: filters.category === c.slug ? null : c.slug })}
        >
          {c.name}
        </button>
      ))}
    </>
  );

  return (
    <div>
      <div className="sticky top-[var(--header-offset,0px)] z-20 transition-[top] duration-300 -mx-4 border-y border-paper-200 bg-paper-50/95 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
          <nav aria-label="Collections" className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 [scrollbar-width:none]" data-lenis-prevent>
            {chips ?? defaultChips}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <form role="search" onSubmit={(e) => e.preventDefault()} className="relative min-w-0 flex-1 lg:w-52 lg:flex-none">
              <label htmlFor="shop-search" className="sr-only">Search products</label>
              <input
                id="shop-search"
                type="search"
                value={filters.q}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="Search"
                className="h-10 w-full border border-paper-300 bg-paper-50 pr-3 pl-9 text-sm text-ink placeholder:text-muted/70 focus:border-brand-600 focus:outline-none"
              />
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            </form>
            <label htmlFor="shop-sort" className="sr-only">Sort by</label>
            <select
              id="shop-sort"
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
              className="h-10 border border-paper-300 bg-paper-50 px-3 text-sm text-ink focus:border-brand-600 focus:outline-none"
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="label-mono inline-flex h-10 items-center gap-2 border border-paper-300 px-4 text-navy-800 hover:border-navy-800"
            >
              <Icon name="filter" className="h-4 w-4" />
              Refine{activeCount > 0 && ` (${activeCount})`}
            </button>
          </div>
        </div>
      </div>

      <p className="label-mono mt-6 mb-6 text-muted" aria-live="polite">
        {catalog.loading && !catalog.data ? 'Loading pieces…' : pluralise(results.length, 'piece')}
        {filters.offers && ' on offer'}
      </p>

      {catalog.error && (
        <div className="card p-6 text-center">
          <p className="text-navy-800">{catalog.error.message}</p>
          <Button variant="outline" className="mt-4" onClick={catalog.reload}>Try again</Button>
        </div>
      )}
      {catalog.loading && !catalog.data && <GridSkeleton />}
      {catalog.data && results.length > 0 && <ProductGrid products={results} priorityCount={2} />}
      {catalog.data && results.length === 0 && (
        <div className="card px-6 py-14 text-center">
          <p className="font-serif text-3xl text-navy-800">No pieces match</p>
          <p className="mt-2 text-sm text-muted">
            {filters.offers ? 'There are no offers in this selection right now.' : 'Try removing a filter, or ask us on WhatsApp. We may be able to make it.'}
          </p>
          <Button variant="outline" className="mt-6" onClick={clear}>Clear filters</Button>
        </div>
      )}

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Refine"
        side="right"
        footer={
          <Button size="lg" className="w-full" onClick={() => setFiltersOpen(false)}>
            Show {pluralise(results.length, 'piece')}
          </Button>
        }
      >
        <Filters filters={filters} facets={facets} onChange={update} onClear={clear} showCategory={!categorySlug} />
      </Drawer>
    </div>
  );
}
