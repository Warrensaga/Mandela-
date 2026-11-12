import type { Category, ProductSummary } from '../api/types';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export interface SearchSuggestions {
  products: ProductSummary[];
  categories: Category[];
}

/**
 * Instant suggestions for the header search. Every word typed must appear in
 * the product's name, category, room, materials or colours. Products whose
 * name starts with the query rank first, then name matches, then the rest.
 * `withinCategoryIds` limits results to a category and its sub-categories.
 */
export function suggest(
  query: string,
  products: ProductSummary[],
  categories: Category[],
  options: { limit?: number; withinCategoryIds?: Set<string> | null } = {},
): SearchSuggestions {
  const q = norm(query);
  if (q.length < 2) return { products: [], categories: [] };
  const words = q.split(' ');
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const limit = options.limit ?? 6;

  const scored = products
    .filter((p) => !options.withinCategoryIds || options.withinCategoryIds.has(p.categoryId))
    .map((p) => {
      const name = norm(p.name);
      const haystack = `${name} ${norm(catName.get(p.categoryId) ?? '')} ${norm(p.room ?? '')} ${norm(p.materials ?? '')} ${norm(p.colours.join(' '))} ${norm(p.materialTags.join(' '))}`;
      if (!words.every((w) => haystack.includes(w))) return null;
      const score = name.startsWith(q) ? 0 : words.every((w) => name.includes(w)) ? 1 : 2;
      return { p, score };
    })
    .filter((x): x is { p: ProductSummary; score: number } => x !== null)
    .sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name));

  // Visitors only ever receive active categories, so no extra filter is needed.
  const cats = categories.filter((c) => words.every((w) => norm(c.name).includes(w))).slice(0, 3);
  return { products: scored.slice(0, limit).map((x) => x.p), categories: cats };
}

/** A category's id plus its direct sub-categories' ids (the tree is two levels). */
export function categorySubtreeIds(categories: Category[], slug: string): Set<string> | null {
  const root = categories.find((c) => c.slug === slug);
  if (!root) return null;
  return new Set([root.id, ...categories.filter((c) => c.parentId === root.id).map((c) => c.id)]);
}
