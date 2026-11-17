# Google Search Console: sitemap, robots.txt and indexed pages

Prepared 17 November 2026 for **https://mandelaheritagefurnitures.co.ke**, the main address set in `VITE_SITE_URL`.

## What the leading Kenyan furniture stores do

From their live `robots.txt` and sitemap files: Fairdeal, Victoria Homestore, Furniture Choice, MoKo, Hotpoint and Jiji. Furniture Palace blocks automated visits, so it could not be read.

| Practice | Who does it | Mandela Heritage |
|---|---|---|
| Every page to index listed in the sitemap. Large stores split it into one file per page type. | Fairdeal, Victoria (Yoast), MoKo (Shopify), Hotpoint | Yes, in a single `sitemap.xml`. Under 50,000 pages (Google's per-file limit), one file is simpler and easier to check, and works just as well |
| A real last-updated date on every link | All of them | Yes. As of today, it also counts variant and photo changes, and help pages no longer claim "updated now" on every deploy |
| Product photos listed in the product sitemap (`<image:image>`), so pieces appear in Google Images | Fairdeal, Victoria | Yes: up to 10 photos per product and project |
| Block cart, checkout, account and wishlist pages | Victoria, Hotpoint, Fairdeal | Yes: `/cart`, `/checkout`, `/order/`, `/admin`, and `/saved` as of today |
| Block filter, sort and price links, which repeat the same products under endless URLs | Victoria (very thorough), Jiji | Yes: every shop filter, sort and search parameter |
| Block ad-tracking links (`utm_`, `fbclid`, `gclid`) | Victoria | Yes |
| Block AI crawlers (GPTBot, ClaudeBot and others) | Hotpoint | **No, on purpose.** A new shop benefits from appearing in AI search answers. One line can be added later if the owner prefers. |

The files are **generated automatically on every deploy** by `scripts/generate-seo-files.mjs`, from the live catalogue. Nothing needs uploading by hand: adding a product and redeploying updates the sitemap.

## The robots.txt (live at /robots.txt after the next deploy)

```
User-agent: *
Allow: /

# Private and transactional pages
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /order/
Disallow: /saved

# Filter, sort and search URLs repeat the shop and category pages (crawl traps)
Disallow: /*?q=        Disallow: /*&q=
Disallow: /*?sort=     Disallow: /*&sort=
Disallow: /*?min=      Disallow: /*&min=
Disallow: /*?max=      Disallow: /*&max=
Disallow: /*?colour=   Disallow: /*&colour=
Disallow: /*?material= Disallow: /*&material=
Disallow: /*?stock=    Disallow: /*&stock=
Disallow: /*?free=     Disallow: /*&free=
Disallow: /*?mto=      Disallow: /*&mto=
Disallow: /*?category= Disallow: /*&category=
Disallow: /*?page=     Disallow: /*&page=

# Ad and social tracking parameters
Disallow: /*?utm_   Disallow: /*&utm_
Disallow: /*?fbclid= Disallow: /*&fbclid=
Disallow: /*?gclid=  Disallow: /*&gclid=
Disallow: /*?srsltid=

Sitemap: https://mandelaheritagefurnitures.co.ke/sitemap.xml
```

The real file has one rule per line; pairs are shown side by side here to save space.

## Pages Google will index (49 today)

**`https://mandelaheritagefurnitures.co.ke/sitemap.xml` lists every page, in this order:**

- **Main pages (10):** `/`, `/shop`, `/categories`, `/projects`, `/custom-request`, `/contact`, `/delivery`, `/payment`, `/faq`, `/track-order`.
- **Categories (22):** only categories that have at least one active product, because empty category pages count as thin content. Each top-level category is followed by its sub-categories:
  - living-room: sofas, armchairs, coffee-tables;
  - dining: dining-sets, dining-chairs, sideboards;
  - bedroom: beds-and-bed-frames, wardrobes, bedside-tables;
  - mattresses-and-bedding;
  - office: office-desks, office-chairs;
  - outdoor-and-garden: patio-sets, loungers;
  - home-decor: rugs, mirrors.
- **Products (17, with 28 photos):** every active product.
- **Projects:** added automatically once a project is published.
- **Later additions:** a new product, a category's first product, or a newly published project is added on the next deploy. Deactivated or deleted items drop out.

Every indexed page has its own title, description and canonical link, plus structured data:
- **Products** carry price, stock, brand and delivery details, with variants grouped together (Product / ProductGroup).
- **The business** has its address, map position and phone (FurnitureStore, a type of LocalBusiness), plus a site search box (WebSite).
- **Pages** have breadcrumb trails (BreadcrumbList).

## Pages Google will NOT index (by design)

| Page | How it is kept out | Why |
|---|---|---|
| `/admin/*` | Blocked in robots.txt, plus a `noindex` header | Private |
| `/cart`, `/checkout`, `/order/MH-…` | Blocked, plus `noindex` | Personal and transactional |
| `/saved` | Blocked, plus `noindex` | Exists only on each visitor's device |
| Shop links with filters, sort or search (`?sort=`, `?min=`, `?q=`…) | Blocked | Duplicates of `/shop` and the category pages |
| `/shop?room=…`, `/shop?offers=1` | Canonical link points to `/shop` | Same products as the shop |
| "Request received" and the 404 page | `noindex` | No search value |
| `mandelafurn.vercel.app` and `www.` | Canonical links point to the main address. **Also set Vercel redirects** (below) | Prevents duplicate copies |

## Before submitting (important)

1. **Redirects:** these are now in `vercel.json`, so they do not depend on the dashboard. `www.mandelaheritagefurnitures.co.ke` and `mandelafurn.vercel.app` both send visitors permanently (308) to the same page on `mandelaheritagefurnitures.co.ke`, and `http://` already redirects to `https://`.
2. **Hide the placeholder products first.** The 17 products above are invented demo items with stock photos. Once Google indexes them, they can stay in search results for weeks after deletion. Either:
   - add the real products, or
   - at least untick **Active** on the demo products,

   then **redeploy**, so the sitemap lists only real items.
3. **Deploy this update** (merge the pull request), so the new sitemap dates and `/saved` rule are live.

## Search Console steps

The sitemap is not uploaded as a file. Google is told its address and fetches it.

1. Open [search.google.com/search-console](https://search.google.com/search-console) with the business Google account.
2. **Add property → Domain** → `mandelaheritagefurnitures.co.ke`. A Domain property covers www, the bare domain and http in one place.
3. Google shows a **TXT record**. Add it in the DNS settings where the domain is managed (Vercel → Domains if Vercel runs the DNS, otherwise the .co.ke registrar), then click **Verify**. DNS can take minutes to a few hours.
4. Left menu → **Sitemaps** → enter `sitemap.xml` → **Submit**. Status should turn to "Success" with 49 discovered URLs.
5. **URL inspection** → paste `https://mandelaheritagefurnitures.co.ke/` → **Request indexing**. Repeat for `/shop` and the top categories (living-room, bedroom, dining). There is a small daily limit; the rest is found through the sitemap.
6. **Bing Webmaster Tools** ([bing.com/webmasters](https://www.bing.com/webmasters)): choose **Import from Google Search Console**. This also feeds DuckDuckGo and many AI search tools.
7. **Google Business Profile** ([business.google.com](https://business.google.com)): use the exact name, phone (+254 701 333 358) and Eastern Bypass address shown on the site. Set the website to `https://mandelaheritagefurnitures.co.ke`. This is what makes the shop appear with a map and photos when someone searches the business name.

## What to expect

- **Business name searches:** usually within a few days to two weeks of submitting.
- **Generic searches** ("sofas Nairobi", "beds in Kenya"): weeks to months. Real products with original photos and descriptions, Google reviews, and links from Instagram, TikTok and directories are what move these.
- **Check weekly:** Search Console → **Pages** (indexed versus not, and why) and **Performance** (what people searched to find the site).
- **Redeploy** after adding several products, so the sitemap stays current.
