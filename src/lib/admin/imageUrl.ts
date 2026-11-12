/**
 * Checks a pasted image link before it is saved: it must be https (the shop is
 * served over https, so http images would be blocked) and must actually load
 * as an image in the browser. Returns the cleaned URL or throws a friendly error.
 */
export async function validateImageUrl(raw: string, timeoutMs = 12000): Promise<string> {
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('That does not look like a web address. Paste a full link starting with https://');
  }
  if (url.protocol !== 'https:') throw new Error('Use a secure link that starts with https://');
  if (/drive\.google\.com|dropbox\.com\/s\/|photos\.app\.goo\.gl|photos\.google\.com/.test(url.hostname + url.pathname)) {
    throw new Error('Share links from Google Drive, Google Photos or Dropbox are web pages, not images. Download the photo and upload it instead, or use a direct image link.');
  }

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.src = '';
      reject(new Error('The image took too long to load. Check the link, or upload the file instead.'));
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      if (img.naturalWidth < 400) reject(new Error(`That image is only ${img.naturalWidth}px wide, too small to look sharp. Use one at least 800px wide.`));
      else resolve();
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('That link did not load as an image. Open it in a new tab: it should show only the picture.'));
    };
    img.src = url.toString();
  });

  return url.toString();
}
