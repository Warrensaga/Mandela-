/**
 * Responsive image helpers.
 *
 * - images.unsplash.com: stand-in stock photos; the width is a URL parameter.
 * - placehold.co: the size is in the path, so we can request each width.
 * - Supabase Storage uploads (Phase 3) are saved as `<name>-<width>w.webp`
 *   next to the original; `-1200w.webp` URLs get a srcset across the sizes.
 * Anything else is returned without a srcset.
 */
const WIDTHS = [400, 800, 1200] as const;

const PLACEHOLD = /^(https:\/\/placehold\.co\/)(\d+)x(\d+)(.*)$/;
const SIZED = /^(.*)-(\d+)w\.(webp|jpg)(\?.*)?$/;

export function buildSrcSet(url: string, widths: readonly number[] = WIDTHS): string | undefined {
  // Unsplash (imgix): change the w= parameter; ar= keeps the crop ratio, auto=format serves WebP/AVIF.
  if (url.startsWith('https://images.unsplash.com/')) {
    try {
      return widths
        .map((width) => {
          const u = new URL(url);
          u.searchParams.set('w', String(width));
          return `${u.toString()} ${width}w`;
        })
        .join(', ');
    } catch {
      return undefined;
    }
  }
  const p = PLACEHOLD.exec(url);
  if (p) {
    const [, base, w, h, rest] = p;
    const ratio = Number(h) / Number(w);
    return widths.map((width) => `${base}${width}x${Math.round(width * ratio)}${rest} ${width}w`).join(', ');
  }
  const s = SIZED.exec(url);
  if (s) {
    const [, stem, , ext, query = ''] = s;
    return widths.map((width) => `${stem}-${width}w.${ext}${query} ${width}w`).join(', ');
  }
  return undefined;
}
