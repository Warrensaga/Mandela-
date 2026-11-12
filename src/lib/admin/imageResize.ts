/**
 * Resizes an image in the browser into WebP copies at fixed widths, so the
 * storefront can serve a srcset (see lib/images.ts: `<name>-<width>w.webp`).
 * Smaller originals are never upscaled.
 */
export const IMAGE_WIDTHS = [400, 800, 1200] as const;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

async function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), type, quality),
  );
}

/** WebP where the browser can encode it; Safari returns PNG for WebP, so fall back to JPEG there. */
async function toWebOptimised(canvas: HTMLCanvasElement, quality: number): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  const webp = await encode(canvas, 'image/webp', quality);
  if (webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
  return { blob: await encode(canvas, 'image/jpeg', quality), ext: 'jpg' };
}

export async function resizeToWebp(
  file: File,
  widths: readonly number[] = IMAGE_WIDTHS,
  quality = 0.82,
): Promise<{ width: number; blob: Blob; ext: 'webp' | 'jpg' }[]> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error('Please choose a JPG, PNG, WebP or AVIF image.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Please choose an image under 15 MB.');
  const bitmap = await loadBitmap(file);
  try {
    const out: { width: number; blob: Blob; ext: 'webp' | 'jpg' }[] = [];
    for (const target of widths) {
      const width = Math.min(target, bitmap.width);
      const height = Math.round((bitmap.height * width) / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, width, height);
      out.push({ width: target, ...(await toWebOptimised(canvas, quality)) });
    }
    return out;
  } finally {
    bitmap.close();
  }
}
