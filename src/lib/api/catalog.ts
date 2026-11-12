import { supabase } from '../supabase';
import { safeLink } from '../url';
import type { CategoryRow, ProductSummaryRow } from '../database.types';
import { ApiError, toApiError } from './errors';
import type {
  Category,
  CategoryNode,
  HeroSlide,
  ProductDetail,
  ProductSummary,
  ProductVariant,
} from './types';

const MATERIAL_OPTION_NAMES = ['fabric', 'finish', 'material'];
const KNOWN_MATERIALS = [
  'Mahogany', 'Oak', 'Mvule', 'Walnut', 'Teak', 'Cypress', 'Hardwood', 'Velvet', 'Chenille',
  'Leather', 'Linen', 'Cotton', 'Mesh', 'Metal', 'Glass', 'Rattan', 'Foam',
];

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
  };
}

/** Active categories as a two-level tree, sorted. */
export async function fetchCategoryTree(): Promise<CategoryNode[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')
    .order('name');
  if (error) throw toApiError(error);

  const all = data.map(mapCategory);
  const topLevel = all.filter((c) => c.parentId === null);
  return topLevel.map((parent) => ({
    ...parent,
    children: all.filter((c) => c.parentId === parent.id),
  }));
}

/** Active, in-date hero slides (RLS filters the dates). */
export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase.from('hero_slides').select('*').order('sort_order');
  if (error) throw toApiError(error);
  return data.map((s) => ({
    id: s.id,
    imageUrl: s.image_url,
    mobileImageUrl: s.mobile_image_url,
    headline: s.headline,
    subtext: s.subtext,
    ctaLabel: s.cta_label,
    ctaUrl: safeLink(s.cta_url),
  }));
}

function mapSummary(
  row: ProductSummaryRow,
  colours: Map<string, string[]>,
  materials: Map<string, string[]>,
): ProductSummary | null {
  if (!row.id || !row.slug || !row.name || !row.category_id) return null;
  const materialText = row.materials ?? '';
  const textTags = KNOWN_MATERIALS.filter((m) => new RegExp(`\\b${m}\\b`, 'i').test(materialText));
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    categoryId: row.category_id,
    price: Number(row.price ?? 0),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    hasVariants: Boolean(row.has_variants),
    isFeatured: Boolean(row.is_featured),
    room: row.room,
    materials: row.materials,
    badge: row.badge,
    freeDelivery: Boolean(row.free_delivery),
    madeToOrder: Boolean(row.is_made_to_order),
    leadTimeDays: row.lead_time_days ?? 0,
    lowStockThreshold: row.low_stock_threshold ?? 5,
    createdAt: row.created_at ?? '',
    minPrice: Number(row.min_price ?? row.price ?? 0),
    maxPrice: Number(row.max_price ?? row.price ?? 0),
    totalStock: row.total_stock ?? 0,
    imageUrl: row.primary_image_url,
    colours: unique([...(row.colour ? [row.colour] : []), ...(colours.get(row.id) ?? [])]),
    materialTags: unique([...(materials.get(row.id) ?? []), ...textTags]),
  };
}

let catalogPromise: Promise<ProductSummary[]> | null = null;

/**
 * All active products with listing data and filter facets.
 * The catalogue is small (hundreds of products), so it is loaded once per
 * session and filtered in memory, which keeps filtering instant on mobile.
 */
export function fetchCatalog(force = false): Promise<ProductSummary[]> {
  if (!catalogPromise || force) {
    catalogPromise = loadCatalog().catch((err: unknown) => {
      catalogPromise = null;
      throw err;
    });
  }
  return catalogPromise;
}

async function loadCatalog(): Promise<ProductSummary[]> {
  const [summaries, options] = await Promise.all([
    supabase.from('product_summaries').select('*').order('created_at', { ascending: false }),
    supabase.from('product_options').select('product_id, name, values'),
  ]);
  if (summaries.error) throw toApiError(summaries.error);
  if (options.error) throw toApiError(options.error);

  const colours = new Map<string, string[]>();
  const materials = new Map<string, string[]>();
  for (const opt of options.data) {
    const name = opt.name.toLowerCase();
    if (name === 'colour' || name === 'color') {
      colours.set(opt.product_id, [...(colours.get(opt.product_id) ?? []), ...opt.values]);
    } else if (MATERIAL_OPTION_NAMES.includes(name)) {
      materials.set(opt.product_id, [...(materials.get(opt.product_id) ?? []), ...opt.values]);
    }
  }

  return summaries.data
    .map((row) => mapSummary(row, colours, materials))
    .filter((p): p is ProductSummary => p !== null);
}

function toOptionValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

/** Full product page data: product, images, options and active variants. */
export async function fetchProductBySlug(slug: string): Promise<ProductDetail> {
  const { data: p, error } = await supabase.from('products').select('*').eq('slug', slug).maybeSingle();
  if (error) throw toApiError(error);
  if (!p) throw new ApiError('NOT_FOUND', 'This product is not available.');

  const [images, options, variants] = await Promise.all([
    supabase.from('product_images').select('*').eq('product_id', p.id).order('sort_order'),
    supabase.from('product_options').select('*').eq('product_id', p.id).order('sort_order'),
    supabase.from('product_variants').select('*').eq('product_id', p.id).order('sort_order'),
  ]);
  if (images.error) throw toApiError(images.error);
  if (options.error) throw toApiError(options.error);
  if (variants.error) throw toApiError(variants.error);

  const price = Number(p.price);
  const mappedVariants: ProductVariant[] = variants.data.map((v) => ({
    id: v.id,
    sku: v.sku,
    optionValues: toOptionValues(v.option_values),
    price: v.price === null ? price : Number(v.price),
    compareAtPrice:
      v.compare_at_price !== null ? Number(v.compare_at_price) : p.compare_at_price !== null ? Number(p.compare_at_price) : null,
    stock: v.stock_quantity,
    lowStockThreshold: v.low_stock_threshold,
    imageId: v.image_id,
  }));

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    categoryId: p.category_id,
    price,
    compareAtPrice: p.compare_at_price === null ? null : Number(p.compare_at_price),
    sku: p.sku,
    hasVariants: p.has_variants,
    stock: p.stock_quantity,
    lowStockThreshold: p.low_stock_threshold,
    dimensions: p.dimensions,
    materials: p.materials,
    room: p.room,
    colour: p.colour,
    leadTimeDays: p.lead_time_days,
    madeToOrder: p.is_made_to_order,
    freeDelivery: p.free_delivery,
    badge: p.badge,
    images: images.data.map((i) => ({ id: i.id, url: i.url, alt: i.alt_text ?? p.name })),
    options: options.data.map((o) => ({ name: o.name, values: o.values })),
    variants: mappedVariants,
  };
}

export interface LivePricing {
  /** key: `${productId}:${variantId ?? ''}` */
  lines: Map<string, { price: number; stock: number; available: boolean; madeToOrder: boolean }>;
}

/** Current price and stock for cart lines, so the cart never shows stale prices at checkout. */
export async function fetchLivePricing(
  items: { productId: string; variantId: string | null }[],
): Promise<LivePricing> {
  const productIds = unique(items.map((i) => i.productId));
  const variantIds = unique(items.map((i) => i.variantId ?? ''));
  const [products, variants] = await Promise.all([
    supabase.from('products').select('id, price, stock_quantity, has_variants, is_made_to_order').in('id', productIds),
    variantIds.length
      ? supabase.from('product_variants').select('id, product_id, price, stock_quantity').in('id', variantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (products.error) throw toApiError(products.error);
  if (variants.error) throw toApiError(variants.error);

  const productMap = new Map(products.data.map((p) => [p.id, p]));
  const variantMap = new Map(variants.data.map((v) => [v.id, v]));
  const lines: LivePricing['lines'] = new Map();

  for (const item of items) {
    const key = `${item.productId}:${item.variantId ?? ''}`;
    const product = productMap.get(item.productId);
    if (!product) {
      lines.set(key, { price: 0, stock: 0, available: false, madeToOrder: false });
      continue;
    }
    if (product.has_variants) {
      const variant = item.variantId ? variantMap.get(item.variantId) : undefined;
      lines.set(key, {
        price: Number(variant?.price ?? product.price),
        stock: variant?.stock_quantity ?? 0,
        available: Boolean(variant),
        madeToOrder: product.is_made_to_order,
      });
    } else {
      lines.set(key, {
        price: Number(product.price),
        stock: product.stock_quantity,
        available: true,
        madeToOrder: product.is_made_to_order,
      });
    }
  }
  return { lines };
}
