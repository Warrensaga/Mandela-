/**
 * Vercel Routing Middleware: product, category and project link previews.
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

// Deliberately no imports: Vercel loads this file on its own, and a relative
// import it cannot resolve makes every matched page fail with
// MIDDLEWARE_INVOCATION_FAILED, for people as well as bots. Category search
// titles come from /seo-categories.json, written by the Vite build from
// src/lib/seoKeywords.ts (the same text the category pages use).

declare const process: { env: Record<string, string | undefined> };

export const config = {
  matcher: ['/product/:slug*', '/category/:slug*', '/projects/:slug*'],
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

type KeywordMap = Record<string, { title: string; lead: string }>;
let keywordCache: Promise<KeywordMap> | null = null;

function categoryKeywordMap(origin: string): Promise<KeywordMap> {
  keywordCache ??= fetch(new URL('/seo-categories.json', origin), { signal: AbortSignal.timeout(1500) })
    .then((r) => (r.ok ? (r.json() as Promise<KeywordMap>) : {}))
    .catch(() => {
      keywordCache = null; // try again on the next request
      return {};
    });
  return keywordCache;
}

async function categoryMeta(slug: string, store: string, origin: string): Promise<Meta | null> {
  const keywords = categoryKeywordMap(origin);
  const rows = await query<{ name: string; description: string | null; image_url: string | null }>(
    `categories?select=name,description,image_url&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&limit=1`,
  );
  const c = rows[0];
  if (!c) return null;
  // Same keyword titles and lead sentences as the category pages.
  const kw = (await keywords)[slug] ?? { title: `${c.name} in Kenya & Prices`, lead: `${c.name} in Kenya with prices online` };
  return {
    title: `${kw.title} | Mandela Heritage`,
    description: clip(`${kw.lead}. Made in our Nairobi workshop and delivered across Kenya, with fast delivery in Nairobi.`),
    image: c.image_url,
    type: 'website',
  };
}

async function projectMeta(slug: string, store: string): Promise<Meta | null> {
  const rows = await query<{ title: string; summary: string | null; space_type: string | null; location: string | null; cover_image_url: string | null; gallery: string[] | null }>(
    `projects?select=title,summary,space_type,location,cover_image_url,gallery&slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&limit=1`,
  );
  const p = rows[0];
  if (!p) return null;
  const where = [p.space_type, p.location].filter(Boolean).join(', ');
  return {
    title: `${p.title}: Furnishing Project | Mandela Heritage`,
    description: clip(p.summary ?? `${p.title}${where ? `, ${where}` : ''}: a space furnished by ${store}.`),
    image: p.cover_image_url ?? p.gallery?.[0] ?? null,
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
  const m = /^\/(product|category|projects)\/([^/]+)\/?$/.exec(url.pathname);
  const slug = m?.[2] ? decodeURIComponent(m[2]) : '';
  if (!m || !SLUG.test(slug)) return undefined;

  const siteEnv = (process.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
  const site = /^https:\/\/[^/\s]+$/.test(siteEnv) ? siteEnv : url.origin;
  const store = 'Mandela Heritage Furniture';

  try {
    const [meta, page] = await Promise.all([
      m[1] === 'product' ? productMeta(slug, store) : m[1] === 'projects' ? projectMeta(slug, store) : categoryMeta(slug, store, url.origin),
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
