/**
 * Link safety for admin-entered URLs (hero buttons, announcement bar, social
 * links). Only two shapes are allowed:
 *  - a path on this site: "/shop", "/category/sofas?q=grey" (not "//host")
 *  - an absolute https:// URL
 * Anything else (javascript:, data:, http:, "//evil.example", "\\host") is refused.
 */
export function isSitePath(value: string): boolean {
  return /^\/(?![/\\])/.test(value) && !/[\s\\]/.test(value);
}

export function isHttpsUrl(value: string): boolean {
  if (!/^https:\/\/[^\s]+$/i.test(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeLink(value: string): boolean {
  return isSitePath(value) || isHttpsUrl(value);
}

/** The link if it is safe, otherwise null (so the UI simply shows no link). */
export function safeLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v && isSafeLink(v) ? v : null;
}
