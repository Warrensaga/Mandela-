// Generates robots.txt and XML sitemaps into dist/ after `vite build`.
//
// Layout follows what the leading furniture stores use (Yoast/WooCommerce and
// Shopify): a sitemap index that points to one sitemap per content type, each
// URL with <lastmod>, and product URLs carrying their photos (<image:image>).
//
//   /sitemap.xml             index
//   /sitemap-pages.xml       home, shop, help pages
//   /sitemap-categories.xml  categories that have at least one active product
//   /sitemap-products.xml    active products + their images
//   /sitemap-projects.xml    published furnishing projects + their photos
//
// Data comes from Supabase with the public anon key, so only what visitors can
// already see is listed. The sitemap is rebuilt on every deploy: redeploy on
// Vercel after adding many products (Google also finds them through links).
//
// The live domain comes from VITE_SITE_URL (e.g. https://mandelaheritage.co.ke),
// falling back to Vercel's production domain. Without either, robots.txt is
// written without a Sitemap line and no sitemap is generated.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DIST = resolve('dist');

/** Minimal .env reader so local builds see the same values as Vite. */
function loadEnvFiles() {
  const env = {};
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return { ...env, ...process.env };
}

const env = loadEnvFiles();

function resolveSiteUrl() {
  const candidates = [
    env.VITE_SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
  ];
  for (const c of candidates) {
    const v = (c || '').trim().replace(/\/+$/, '');
    if (/^https:\/\/[^/\s]+$/.test(v) || /^http:\/\/localhost(:\d+)?$/.test(v)) return v;
  }
  return null;
}

const xmlEscape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

const isoDate = (d) => (d ? new Date(d).toISOString() : null);

async function fetchTable(path) {
  const base = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set');
  const res = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

function urlset(entries, withImages = false) {
  const ns = withImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : '';
  const body = entries
    .map((e) => {
      const parts = [`    <loc>${xmlEscape(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
      for (const img of e.images ?? []) parts.push(`    <image:image>\n      <image:loc>${xmlEscape(img)}</image:loc>\n    </image:image>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${ns}>\n${body}\n</urlset>\n`;
}

function sitemapIndex(site, files) {
  const body = files
    .map((f) => `  <sitemap>\n    <loc>${xmlEscape(`${site}/${f.name}`)}</loc>${f.lastmod ? `\n    <lastmod>${f.lastmod}</lastmod>` : ''}\n  </sitemap>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

function robots(site) {
  return `# ${'Mandela Heritage Furniture'}: crawl rules
User-agent: *
Allow: /

# Private and transactional pages
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /order/

# Filter, sort and search URLs repeat the shop and category pages (crawl traps)
Disallow: /*?q=
Disallow: /*&q=
Disallow: /*?sort=
Disallow: /*&sort=
Disallow: /*?min=
Disallow: /*&min=
Disallow: /*?max=
Disallow: /*&max=
Disallow: /*?colour=
Disallow: /*&colour=
Disallow: /*?material=
Disallow: /*&material=
Disallow: /*?stock=
Disallow: /*&stock=
Disallow: /*?free=
Disallow: /*&free=
Disallow: /*?mto=
Disallow: /*&mto=
Disallow: /*?category=
Disallow: /*&category=
Disallow: /*?page=
Disallow: /*&page=

# Ad and social tracking parameters
Disallow: /*?utm_
Disallow: /*&utm_
Disallow: /*?fbclid=
Disallow: /*&fbclid=
Disallow: /*?gclid=
Disallow: /*&gclid=
Disallow: /*?srsltid=
${site ? `\nSitemap: ${site}/sitemap.xml\n` : ''}`;
}

/** Static pages, highest value first. */
const STATIC_PAGES = ['/', '/shop', '/categories', '/projects', '/custom-request', '/contact', '/delivery', '/payment', '/faq', '/track-order'];

async function main() {
  if (!existsSync(DIST)) throw new Error('dist/ not found: run vite build first');
  const site = resolveSiteUrl();
  const now = new Date().toISOString();

  // Default social preview tags in index.html (WhatsApp and Facebook link
  // previews do not run JavaScript) need absolute URLs.
  const indexPath = resolve(DIST, 'index.html');
  writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replaceAll('__SITE_URL__', site ?? ''));

  if (!site) {
    writeFileSync(resolve(DIST, 'robots.txt'), robots(null));
    console.warn('[seo] VITE_SITE_URL not set: robots.txt written without a Sitemap line, no sitemap generated.');
    return;
  }

  let categories = [];
  let products = [];
  let images = [];
  let projects = [];
  try {
    [categories, products, images] = await Promise.all([
      fetchTable('categories?select=id,parent_id,slug&is_active=eq.true&order=sort_order'),
      fetchTable('products?select=id,slug,category_id,updated_at&is_active=eq.true&order=created_at.desc'),
      fetchTable('product_images?select=product_id,url,sort_order&order=sort_order'),
    ]);
    // Separate request: a missing projects table must not hide the catalogue.
    projects = await fetchTable('projects?select=slug,updated_at,cover_image_url,gallery&is_published=eq.true&order=sort_order').catch(() => []);
  } catch (err) {
    console.warn(`[seo] Could not load catalogue (${err.message}); writing page sitemap only.`);
  }

  const abs = (u) => (/^https?:\/\//.test(u) ? u : `${site}${u.startsWith('/') ? '' : '/'}${u}`);
  const imagesByProduct = new Map();
  for (const img of images) {
    if (!imagesByProduct.has(img.product_id)) imagesByProduct.set(img.product_id, []);
    imagesByProduct.get(img.product_id).push(abs(img.url));
  }

  // Latest product change per category, rolled up to the parent category.
  const parentOf = new Map(categories.map((c) => [c.id, c.parent_id]));
  const latestByCategory = new Map();
  for (const p of products) {
    for (let id = p.category_id; id; id = parentOf.get(id)) {
      const prev = latestByCategory.get(id);
      if (!prev || p.updated_at > prev) latestByCategory.set(id, p.updated_at);
    }
  }
  const latestProduct = products.reduce((m, p) => (p.updated_at > m ? p.updated_at : m), '');

  const files = [];
  const pages = STATIC_PAGES.map((path) => ({
    loc: `${site}${path}`,
    lastmod: path === '/' || path === '/shop' || path === '/categories' ? isoDate(latestProduct) ?? now : now,
  }));
  writeFileSync(resolve(DIST, 'sitemap-pages.xml'), urlset(pages));
  files.push({ name: 'sitemap-pages.xml', lastmod: now });

  // Only categories with products: empty category pages are thin content.
  const cats = categories
    .filter((c) => latestByCategory.has(c.id))
    .map((c) => ({ loc: `${site}/category/${encodeURIComponent(c.slug)}`, lastmod: isoDate(latestByCategory.get(c.id)) }));
  if (cats.length) {
    writeFileSync(resolve(DIST, 'sitemap-categories.xml'), urlset(cats));
    files.push({ name: 'sitemap-categories.xml', lastmod: isoDate(latestProduct) });
  }

  const prods = products.map((p) => ({
    loc: `${site}/product/${encodeURIComponent(p.slug)}`,
    lastmod: isoDate(p.updated_at),
    images: (imagesByProduct.get(p.id) ?? []).slice(0, 10),
  }));
  if (prods.length) {
    writeFileSync(resolve(DIST, 'sitemap-products.xml'), urlset(prods, true));
    files.push({ name: 'sitemap-products.xml', lastmod: isoDate(latestProduct) });
  }

  const projs = projects.map((p) => ({
    loc: `${site}/projects/${encodeURIComponent(p.slug)}`,
    lastmod: isoDate(p.updated_at),
    images: [...new Set([p.cover_image_url, ...(p.gallery ?? [])].filter(Boolean).map(abs))].slice(0, 10),
  }));
  if (projs.length) {
    writeFileSync(resolve(DIST, 'sitemap-projects.xml'), urlset(projs, true));
    files.push({ name: 'sitemap-projects.xml', lastmod: isoDate(projects.reduce((m, p) => (p.updated_at > m ? p.updated_at : m), '')) });
  }

  writeFileSync(resolve(DIST, 'sitemap.xml'), sitemapIndex(site, files));
  writeFileSync(resolve(DIST, 'robots.txt'), robots(site));
  console.log(`[seo] ${site}: sitemap.xml with ${pages.length} pages, ${cats.length} categories, ${prods.length} products, ${projs.length} projects; robots.txt written.`);
}

main().catch((err) => {
  // SEO files must never break a deploy.
  console.warn(`[seo] skipped: ${err.message}`);
});
