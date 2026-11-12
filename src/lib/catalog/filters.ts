import type { CategoryNode, ProductSummary } from '../api/types';

export type SortKey = 'featured' | 'newest' | 'price-asc' | 'price-desc';

export interface ShopFilters {
  q: string;
  category: string | null; // slug
  room: string | null;
  material: string | null;
  colour: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  freeDelivery: boolean;
  madeToOrder: boolean;
  offers: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: ShopFilters = {
  q: '',
  category: null,
  room: null,
  material: null,
  colour: null,
  minPrice: null,
  maxPrice: null,
  inStock: false,
  freeDelivery: false,
  madeToOrder: false,
  offers: false,
  sort: 'featured',
};

const SORTS: SortKey[] = ['featured', 'newest', 'price-asc', 'price-desc'];

function numParam(v: string | null): number | null {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseFilters(params: URLSearchParams): ShopFilters {
  const sort = params.get('sort') as SortKey | null;
  return {
    q: params.get('q') ?? '',
    category: params.get('category'),
    room: params.get('room'),
    material: params.get('material'),
    colour: params.get('colour'),
    minPrice: numParam(params.get('min')),
    maxPrice: numParam(params.get('max')),
    inStock: params.get('stock') === '1',
    freeDelivery: params.get('free') === '1',
    madeToOrder: params.get('mto') === '1',
    offers: params.get('offers') === '1',
    sort: sort && SORTS.includes(sort) ? sort : 'featured',
  };
}

export function filtersToParams(f: ShopFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.category) p.set('category', f.category);
  if (f.room) p.set('room', f.room);
  if (f.material) p.set('material', f.material);
  if (f.colour) p.set('colour', f.colour);
  if (f.minPrice !== null) p.set('min', String(f.minPrice));
  if (f.maxPrice !== null) p.set('max', String(f.maxPrice));
  if (f.inStock) p.set('stock', '1');
  if (f.freeDelivery) p.set('free', '1');
  if (f.madeToOrder) p.set('mto', '1');
  if (f.offers) p.set('offers', '1');
  if (f.sort !== 'featured') p.set('sort', f.sort);
  return p;
}

export function activeFilterCount(f: ShopFilters, ignoreCategory = false): number {
  return [
    !ignoreCategory && f.category,
    f.room,
    f.material,
    f.colour,
    f.minPrice !== null || f.maxPrice !== null,
    f.inStock,
    f.freeDelivery,
    f.madeToOrder,
    f.offers,
  ].filter(Boolean).length;
}

/** Ids of a category and all its sub-categories (filters work on the whole subtree). */
export function categorySubtreeIds(tree: CategoryNode[], slug: string | null): Set<string> | null {
  if (!slug) return null;
  for (const parent of tree) {
    if (parent.slug === slug) return new Set([parent.id, ...parent.children.map((c) => c.id)]);
    const child = parent.children.find((c) => c.slug === slug);
    if (child) return new Set([child.id]);
  }
  return new Set(); // unknown slug: nothing matches
}

export function isAvailable(p: ProductSummary): boolean {
  return p.madeToOrder || p.totalStock > 0;
}

function matchesText(p: ProductSummary, q: string): boolean {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = [p.name, p.materials, p.room, p.badge, ...p.colours, ...p.materialTags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

export function applyFilters(
  products: ProductSummary[],
  f: ShopFilters,
  categoryIds: Set<string> | null,
): ProductSummary[] {
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const result = products.filter(
    (p) =>
      (!categoryIds || categoryIds.has(p.categoryId)) &&
      (!f.room || (p.room !== null && eq(p.room, f.room))) &&
      (!f.material || p.materialTags.some((m) => eq(m, f.material as string))) &&
      (!f.colour || p.colours.some((c) => eq(c, f.colour as string))) &&
      // A product matches a price range if any of its prices fall inside it.
      (f.minPrice === null || p.maxPrice >= f.minPrice) &&
      (f.maxPrice === null || p.minPrice <= f.maxPrice) &&
      (!f.inStock || isAvailable(p)) &&
      (!f.freeDelivery || p.freeDelivery) &&
      (!f.madeToOrder || p.madeToOrder) &&
      (!f.offers || (p.compareAtPrice !== null && p.compareAtPrice > p.minPrice)) &&
      matchesText(p, f.q),
  );
  return sortProducts(result, f.sort);
}

export function sortProducts(products: ProductSummary[], sort: SortKey): ProductSummary[] {
  const list = [...products];
  switch (sort) {
    case 'newest':
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'price-asc':
      return list.sort((a, b) => a.minPrice - b.minPrice);
    case 'price-desc':
      return list.sort((a, b) => b.minPrice - a.minPrice);
    case 'featured':
    default:
      // Featured first, then in-stock, then newest.
      return list.sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          Number(isAvailable(b)) - Number(isAvailable(a)) ||
          b.createdAt.localeCompare(a.createdAt),
      );
  }
}

export interface Facets {
  rooms: string[];
  materials: string[];
  colours: string[];
  priceMin: number;
  priceMax: number;
}

/** Filter options present in a set of products (so we never offer an empty filter). */
export function buildFacets(products: ProductSummary[]): Facets {
  const sorted = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b));
  const rooms = new Set<string>();
  const materials = new Set<string>();
  const colours = new Set<string>();
  let priceMin = Infinity;
  let priceMax = 0;
  for (const p of products) {
    if (p.room) rooms.add(p.room);
    p.materialTags.forEach((m) => materials.add(m));
    p.colours.forEach((c) => colours.add(c));
    priceMin = Math.min(priceMin, p.minPrice);
    priceMax = Math.max(priceMax, p.maxPrice);
  }
  return {
    rooms: sorted(rooms),
    materials: sorted(materials),
    colours: sorted(colours),
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax,
  };
}

export const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Featured',
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
};
