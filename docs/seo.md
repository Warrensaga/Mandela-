# SEO

## What competitors do (checked 12 Nov 2026)

| Site | Platform | robots.txt | Sitemap | Structured data |
|---|---|---|---|---|
| Victoria Homestore | WordPress + Yoast | Blocks cart, checkout, account, filter/sort params and ad tracking params | Index split by type (pages, products, categories, tags), `lastmod`, product photos as `image:image` | WebPage/ItemPage, BreadcrumbList, WebSite, Organization, ProductGroup (variants); Open Graph with image sizes; Twitter card; `max-image-preview:large` |
| MoKo | Shopify | Blocks admin, cart, checkout, orders, account, `sort_by` filters | Index split into products, pages, collections, blogs, articles | Organization; keyword-led home title ("Buy Furniture in Kenya Online, We Deliver") |
| Fairdeal | WordPress + Yoast | Blocks admin and add-to-cart URLs | Yoast index | Yoast defaults |
| Furniture Palace | — | Blocked automated access (Cloudflare) | — | — |

Keyword targets and what to do when adding products: see [seo-keywords.md](seo-keywords.md).

## What this site now does

- **robots.txt** (generated at build): allows the catalogue; blocks `/admin`, `/cart`, `/checkout`,
  `/order/`, the filter/sort/search parameters, and ad/social tracking parameters; points to the sitemap.
- **Sitemaps** (generated at build from the live catalogue, Yoast/Shopify layout):
  `sitemap.xml` (index) → `sitemap-pages.xml`, `sitemap-categories.xml` (only categories that have
  products), `sitemap-products.xml` (with product photos). Every URL has `lastmod`.
- **Every page**: unique title and description (cut to ~158 characters), canonical URL (query strings
  removed, so filter URLs point to the main page), robots meta, Open Graph and Twitter card tags.
  Cart, checkout and order pages are `noindex`.
- **Structured data**: FurnitureStore + WebSite with site search (home), FurnitureStore with opening
  hours and map pin (contact), Product or ProductGroup with one Product per variant, offers in KES,
  stock status, condition and Kenya shipping (product pages), BreadcrumbList (product, category, shop,
  help pages), FAQPage (FAQ).
- **Link previews**: `index.html` has default title, description and image for WhatsApp/Facebook,
  which do not run JavaScript.
- **Broken links**: a crawl of all 67 reachable pages found no broken internal links or images, one H1
  per page and alt text on every image.

## Owner setup (once)

1. In Vercel → Project → Settings → Environment Variables, add `VITE_SITE_URL` = your live domain,
   e.g. `https://mandelaheritage.co.ke` (no trailing slash), then redeploy.
2. Add the site to **Google Search Console** and **Bing Webmaster Tools** and submit
   `https://<your-domain>/sitemap.xml`.
3. Create or claim the **Google Business Profile** for the showroom (biggest win for "furniture shop near
   me" searches in Nairobi). Use the same name, phone and address as in Settings.
4. **Redeploy after adding or renaming products** so the sitemap updates (Vercel → Deployments →
   Redeploy). Google also finds new products through the site's own links.
5. Write care and buying guides once the Guides pages are built (Phase 4). They are the main source of
   non-brand search traffic for MoKo and Victoria.

## Product link previews

`middleware.ts` (Vercel Routing Middleware) runs only for link-preview bots (WhatsApp, Facebook, X,
Telegram, LinkedIn and others) and search crawlers on `/product/...` and `/category/...` pages. It
serves the page with that product's own title, price, description and photo in the head, so a product
shared on WhatsApp shows its own photo and price. Visitors' requests pass straight through, untouched.
It reads only public data with the anon key; if anything fails, the normal page is served. Tested
locally against the live catalogue; it runs on Vercel only (not in `npm run dev` or `npm run preview`).

To check after deploying, paste a product link into the Facebook Sharing Debugger
(developers.facebook.com/tools/debug). WhatsApp caches previews, so a link shared before may keep
its old preview for a while.
