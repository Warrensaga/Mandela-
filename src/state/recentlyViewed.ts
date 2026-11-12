/**
 * Recently viewed products, kept on this device only (product IDs, newest
 * first). Displayed from the live catalogue, like saved items.
 */
const STORAGE_KEY = 'mh-recent-v1';
const MAX_RECENT = 12;

export function readRecentlyViewed(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(productId: string): void {
  try {
    const next = [productId, ...readRecentlyViewed().filter((id) => id !== productId)].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: nothing to remember */
  }
}
