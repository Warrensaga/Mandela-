/**
 * Vercel Routing Middleware: product and category link previews.
 *
 * WhatsApp, Facebook, X, Telegram and other link-preview bots do not run
 * JavaScript, so on a single-page app they would only see the site defaults.
 * For those bots (and search crawlers) this middleware serves index.html with
 * the product's or category's own title, description, price and photo in the
 * <head>. Real visitors are not affected: their requests pass straight through.
 *
 * Reads only public data with the public anon key (same as the storefront).
 * Any problem (unknown slug, slow database) falls back to the normal page.
 */

import { categoryKeywords } from './src/lib/seoKeywords';

declare const process: { env: Record<string, string | undefined> };

export const config = {
  matcher: ['/product/:slug*', '/category/:slug*'],
};

const BOTS =
  /facebookexternalhit|facebot|meta-externalagent|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest|skypeuripreview|viber|snapchat|redditbot|embedly|googlebot|google-inspectiontool|bingbot|applebot|duckduckbot|yandex|baiduspider/i;

const SLUG = /^[a-z0-9-]{1,120}$/;

interface Meta {
  title: string;
  description: string;
  image: string | null;
  type: 'product' | 'website';
  price?: number;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const clip = (s: string, max = 158) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

const kes = (n: number) => `KES ${new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(n)}`;

async function query<T>(path: string): Promise<T[]> {
  const base = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!base || !key) return [];
  const res = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(1500),
  });
  return res.ok ? ((await res.json()) as T[]) : [];
}

async function productMeta(slug: string, store: string): Promise<Meta | null> {
  const s = encodeURIComponent(slug);
  const [summaries, details] = await Promise.all([
    query<{ name: string; min_price: number | null; max_price: number | null; price: number | null; primary_image_url: string | null }>(
      `product_summaries?select=name,price,min_price,max_price,primary_image_url&slug=eq.${s}&is_active=eq.true&limit=1`,
    ),
    query<{ description: string | null }>(`products?select=description&slug=eq.${s}&is_active=eq.true&limit=1`),
  ]);
  const p = summaries[0];
  if (!p) return null;
  const min = Number(p.min_price ?? p.price ?? 0);
  const max = Number(p.max_price ?? min);
  const price = min > 0 ? (max > min ? `From ${kes(min)}` : kes(min)) : '';
  const text = `${p.name} price in Kenya${price ? `: ${price.toLowerCase().startsWith('from') ? price.replace('From', 'from') : price}` : ''}, delivered across Kenya. ${details[0]?.description ?? ''}`;
  // Same title pattern as the site: "<product> Price in Kenya" (how Kenyans search).
  return { title: `${p.name} Price in Kenya | Mandela Heritage`, description: clip(text), image: p.primary_image_url, type: 'product', price: min > 0 ? min : undefined };
}

async function categoryMeta(slug: string, store: string): Promise<Meta | null> {
  const rows = await query<{ name: string; description: string | null; image_url: string | null }>(
    `categories?select=name,description,image_url&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&limit=1`,
  );
  const c = rows[0];
  if (!c) return null;
  // Same keyword titles and lead sentences as the category pages.
  const kw = categoryKeywords({ slug, name: c.name });
  return {
    title: `${kw.title} | Mandela Heritage`,
    description: clip(`${kw.lead}. Made in our Nairobi workshop and delivered across Kenya, with fast delivery in Nairobi.`),
    image: c.image_url,
    type: 'website',
  };
}

function headTags(meta: Meta, url: string, site: string, store: string): string {
  const image = meta.image && /^https:\/\//.test(meta.image) ? meta.image : `${site}/logo.png`;
  const tags = [
    `<title data-default>${esc(meta.title)}</title>`,
    `<meta data-default name="description" content="${esc(meta.description)}" />`,
    `<link data-default rel="canonical" href="${esc(url)}" />`,
    `<meta data-default property="og:site_name" content="${esc(store)}" />`,
    `<meta data-default property="og:locale" content="en_KE" />`,
    `<meta data-default property="og:type" content="${meta.type}" />`,
    `<meta data-default property="og:title" content="${esc(meta.title)}" />`,
    `<meta data-default property="og:description" content="${esc(meta.description)}" />`,
    `<meta data-default property="og:url" content="${esc(url)}" />`,
    `<meta data-default property="og:image" content="${esc(image)}" />`,
    `<meta data-default name="twitter:card" content="summary_large_image" />`,
    `<meta data-default name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta data-default name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta data-default name="twitter:image" content="${esc(image)}" />`,
  ];
  if (meta.price) {
    tags.push(`<meta data-default property="product:price:amount" content="${meta.price}" />`);
    tags.push(`<meta data-default property="product:price:currency" content="KES" />`);
  }
  return tags.join('\n    ');
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  if (request.method !== 'GET' || !BOTS.test(request.headers.get('user-agent') ?? '')) return undefined;

  const url = new URL(request.url);
  const m = /^\/(product|category)\/([^/]+)\/?$/.exec(url.pathname);
  const slug = m?.[2] ? decodeURIComponent(m[2]) : '';
  if (!m || !SLUG.test(slug)) return undefined;

  const siteEnv = (process.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
  const site = /^https:\/\/[^/\s]+$/.test(siteEnv) ? siteEnv : url.origin;
  const store = 'Mandela Heritage Furniture';

  try {
    const [meta, page] = await Promise.all([
      m[1] === 'product' ? productMeta(slug, store) : categoryMeta(slug, store),
      fetch(new URL('/index.html', url), { signal: AbortSignal.timeout(1500) }).then((r) => (r.ok ? r.text() : '')),
    ]);
    if (!meta || !page.includes('</head>')) return undefined;

    const html = page
      .replace(/<title data-default>[\s\S]*?<\/title>\s*/g, '')
      .replace(/<meta\s+data-default[^>]*>\s*/g, '')
      .replace('</head>', `    ${headTags(meta, `${site}${url.pathname}`, site, store)}\n  </head>`);

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
        'x-content-type-options': 'nosniff',
        vary: 'user-agent',
      },
    });
  } catch {
    return undefined;
  }
}
