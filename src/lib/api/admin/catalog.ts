import type {
  AdminInventoryRow,
  CategoryRow,
  HeroSlideRow,
  InventoryMovementRow,
  InventoryReason,
  Json,
  ProductImageRow,
  ProductOptionRow,
  ProductRow,
  ProductSummaryRow,
  ProductVariantRow,
} from '../../database.types';
import { IMAGE_WIDTHS, resizeToWebp } from '../../admin/imageResize';
import { supabase } from '../../supabase';
import { ApiError, toApiError } from '../errors';

const BUCKET = 'product-images';

function check<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw toApiError(res.error);
  return res.data as NonNullable<T>;
}

// ---------------------------------------------------------------- uploads

/**
 * Uploads an image at 400/800/1200px (WebP, or JPEG where the browser cannot
 * encode WebP) into product-images/<folder>/.
 * Returns the public URL of the 1200px copy (the storefront derives the others).
 */
export async function uploadPublicImage(file: File, folder: string): Promise<string> {
  const copies = await resizeToWebp(file);
  const stem = `${folder}/${crypto.randomUUID()}`;
  for (const { width, blob, ext } of copies) {
    const { error } = await supabase.storage.from(BUCKET).upload(`${stem}-${width}w.${ext}`, blob, {
      contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw new ApiError('UPLOAD_FAILED', `Upload failed: ${error.message}`);
  }
  const ext = copies[0]?.ext ?? 'webp';
  return supabase.storage.from(BUCKET).getPublicUrl(`${stem}-${IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]}w.${ext}`).data.publicUrl;
}

/** Removes all sized copies of an uploaded image. Non-storage URLs (placeholders) are ignored. */
export async function deletePublicImage(url: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0] ?? '');
  const m = /^(.*)-\d+w\.(webp|jpg)$/.exec(path);
  const paths = m ? IMAGE_WIDTHS.map((w) => `${m[1]}-${w}w.${m[2]}`) : [path];
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function setSortOrder(
  table: 'categories' | 'hero_slides' | 'product_images' | 'product_options' | 'product_variants' | 'delivery_zones' | 'reviews' | 'projects',
  ids: string[],
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_sort_order', { p_table: table, p_ids: ids });
  if (error) throw toApiError(error);
}

// ---------------------------------------------------------------- products

export async function listProducts(): Promise<ProductSummaryRow[]> {
  return check(await supabase.from('product_summaries').select('*').order('created_at', { ascending: false }));
}

/**
 * Permanently deletes products (owner only), with their images, options,
 * variants and stock history. Past orders keep their own snapshot of each line.
 * Uploaded photos are then removed from storage (placeholder URLs are skipped).
 */
export async function deleteProducts(ids: string[]): Promise<{ deleted: number; names: string[] }> {
  const { data, error } = await supabase.rpc('admin_delete_products', { p_product_ids: ids });
  if (error) throw toApiError(error);
  const r = (data ?? {}) as { deleted?: number; names?: string[]; image_urls?: string[] };
  // Storage cleanup is best effort: the products are already gone.
  await Promise.allSettled((r.image_urls ?? []).map((url) => deletePublicImage(url)));
  return { deleted: Number(r.deleted ?? 0), names: r.names ?? [] };
}

export interface AdminProduct {
  product: ProductRow;
  images: ProductImageRow[];
  options: ProductOptionRow[];
  variants: ProductVariantRow[];
}

export async function getProduct(id: string): Promise<AdminProduct> {
  const [p, images, options, variants] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase.from('product_images').select('*').eq('product_id', id).order('sort_order'),
    supabase.from('product_options').select('*').eq('product_id', id).order('sort_order'),
    supabase.from('product_variants').select('*').eq('product_id', id).order('sort_order'),
  ]);
  const product = check(p);
  if (!product) throw new ApiError('NOT_FOUND', 'Product not found.');
  return { product, images: check(images), options: check(options), variants: check(variants) };
}

export type ProductInput = Omit<ProductRow, 'id' | 'created_at' | 'updated_at' | 'has_variants'>;

export async function createProduct(input: ProductInput): Promise<string> {
  const row = check(await supabase.from('products').insert({ ...input, has_variants: false }).select('id').single());
  return row.id;
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  check(await supabase.from('products').update(patch).eq('id', id));
}

export async function addProductImage(productId: string, file: File, alt: string, sortOrder: number): Promise<ProductImageRow> {
  const url = await uploadPublicImage(file, `products/${productId}`);
  return check(
    await supabase.from('product_images').insert({ product_id: productId, url, alt_text: alt, sort_order: sortOrder }).select('*').single(),
  );
}

/** Adds a photo by link (an image hosted elsewhere). The link is validated by the caller. */
export async function addProductImageUrl(productId: string, url: string, alt: string, sortOrder: number): Promise<ProductImageRow> {
  if (!/^https:\/\//.test(url)) throw new ApiError('INVALID_URL', 'Image links must start with https://');
  return check(
    await supabase.from('product_images').insert({ product_id: productId, url, alt_text: alt, sort_order: sortOrder }).select('*').single(),
  );
}

export async function updateProductImage(id: string, patch: { alt_text?: string | null }): Promise<void> {
  check(await supabase.from('product_images').update(patch).eq('id', id));
}

export async function deleteProductImage(image: ProductImageRow): Promise<void> {
  check(await supabase.from('product_images').delete().eq('id', image.id));
  await deletePublicImage(image.url);
}

// ---------------------------------------------------------------- variations

export interface OptionUsage {
  option: string;
  value: string;
  variants: number;
  orderedLines: number;
}

export async function getOptionUsage(productId: string): Promise<OptionUsage[]> {
  const { data, error } = await supabase.rpc('admin_option_usage', { p_product_id: productId });
  if (error) throw toApiError(error);
  return (Array.isArray(data) ? (data as Record<string, unknown>[]) : []).map((u) => ({
    option: String(u.option),
    value: String(u.value),
    variants: Number(u.variants),
    orderedLines: Number(u.ordered_lines),
  }));
}

export async function saveOptions(
  productId: string,
  payload: { options: { name: string; values: string[] }[]; renames: unknown },
): Promise<{ renamed: number; deactivated: number; deleted: number }> {
  const { data, error } = await supabase.rpc('admin_set_product_options', {
    p_product_id: productId,
    p_options: payload.options as Json,
    p_renames: payload.renames as Json,
  });
  if (error) throw toApiError(error);
  const r = (data ?? {}) as Record<string, unknown>;
  return { renamed: Number(r.renamed ?? 0), deactivated: Number(r.deactivated ?? 0), deleted: Number(r.deleted ?? 0) };
}

export async function generateVariants(productId: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_generate_variants', { p_product_id: productId });
  if (error) throw toApiError(error);
  return Number(data ?? 0);
}

export type VariantPatch = Partial<Pick<ProductVariantRow, 'sku' | 'price' | 'compare_at_price' | 'low_stock_threshold' | 'image_id' | 'is_active'>>;

export async function updateVariants(ids: string[], patch: VariantPatch): Promise<void> {
  if (!ids.length) return;
  check(await supabase.from('product_variants').update(patch).in('id', ids));
}

// ---------------------------------------------------------------- inventory

export async function listInventory(): Promise<AdminInventoryRow[]> {
  return check(await supabase.from('admin_inventory').select('*').order('product_name').order('sort_order'));
}

/** Restock / adjust / return with a logged movement. Returns the new stock level. */
export async function adjustStock(input: {
  productId: string;
  variantId: string | null;
  change: number;
  reason: InventoryReason;
  note?: string;
}): Promise<number> {
  if (!Number.isInteger(input.change) || input.change === 0) throw new ApiError('INVALID_CHANGE', 'Enter a whole number other than zero.');
  const { data, error } = await supabase.rpc('adjust_stock', {
    p_product_id: input.productId,
    p_variant_id: input.variantId,
    p_change: input.change,
    p_reason: input.reason,
    p_note: input.note ?? '',
  });
  if (error) throw toApiError(error);
  return Number(data);
}

export async function listMovements(filter: { productId?: string; variantId?: string | null; limit?: number } = {}): Promise<InventoryMovementRow[]> {
  let q = supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(filter.limit ?? 50);
  if (filter.productId) q = q.eq('product_id', filter.productId);
  if (filter.variantId) q = q.eq('variant_id', filter.variantId);
  else if (filter.variantId === null) q = q.is('variant_id', null);
  return check(await q);
}

// ---------------------------------------------------------------- categories

export async function listAllCategories(): Promise<CategoryRow[]> {
  return check(await supabase.from('categories').select('*').order('sort_order').order('name'));
}

export async function saveCategory(row: Partial<CategoryRow> & { name: string; slug: string }): Promise<void> {
  if (row.id) {
    const { id, ...patch } = row;
    check(await supabase.from('categories').update(patch).eq('id', id));
  } else {
    check(await supabase.from('categories').insert(row));
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id);
  if (count && count > 0) {
    throw new ApiError('IN_USE', `This category has ${count} product(s). Move them or deactivate the category instead.`);
  }
  check(await supabase.from('categories').delete().eq('id', id));
}

export async function countProductsByCategory(): Promise<Map<string, number>> {
  const rows = check(await supabase.from('products').select('category_id'));
  const map = new Map<string, number>();
  rows.forEach((r) => map.set(r.category_id, (map.get(r.category_id) ?? 0) + 1));
  return map;
}

// ---------------------------------------------------------------- hero slides

export async function listHeroSlides(): Promise<HeroSlideRow[]> {
  return check(await supabase.from('hero_slides').select('*').order('sort_order'));
}

export async function saveHeroSlide(row: Partial<HeroSlideRow> & { headline: string; image_url: string }): Promise<void> {
  if (row.id) {
    const { id, ...patch } = row;
    check(await supabase.from('hero_slides').update(patch).eq('id', id));
  } else {
    check(await supabase.from('hero_slides').insert(row));
  }
}

export async function deleteHeroSlide(slide: HeroSlideRow): Promise<void> {
  check(await supabase.from('hero_slides').delete().eq('id', slide.id));
  await deletePublicImage(slide.image_url);
  if (slide.mobile_image_url) await deletePublicImage(slide.mobile_image_url);
}
