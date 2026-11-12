# CLAUDE.md: Mandela Heritage Furniture

Kenyan furniture ecommerce platform: public storefront + admin dashboard + Supabase backend.
Read this file fully at the start of every session. Work phase by phase, summarise what you built, say how to test it, and STOP until the owner says "continue".

## Project goals
- Sell furniture online to Kenyan customers, mobile-first (mid-range Android over mobile data is the baseline device).
- Owner tracks **inventory, customers and orders** from an admin dashboard.
- Checkout is **WhatsApp-capture**: the order is saved to the database first, then the customer is sent to WhatsApp with a prefilled message. Payment is arranged offline.

## Stack
- React + Vite + TypeScript (strict), Tailwind CSS, Framer Motion, React Router
- Supabase: Postgres, Auth, Storage. No custom server, except the owner-approved `middleware.ts` (Vercel Routing Middleware) that serves product/category link previews to bots only.
- Deploy: Vercel
- Currency KES, phone format +254, delivery in Kenya only
- Env vars (use `.env.example`, never commit real values): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WHATSAPP_NUMBER` (format `2547XXXXXXXX`, no plus sign)

## Hard rules
- **No M-Pesa/Daraja/card integration.** Showing manual payment instructions (Paybill/Till/bank details from Settings) is allowed. Admin records payments manually.
- Never expose the Supabase service role key to the client.
- Enable RLS on every table. Anonymous users can read only active products, categories, images, delivery zones and public settings. They create orders and custom requests only through RPC functions.
- Never trust client prices or totals. `create_order` recalculates from the database and checks stock atomically.
- Never fabricate reviews, testimonials, ratings or sales counts. Use admin-entered content or clearly labelled placeholders.
- Do not add anything not listed here (customer accounts, online payments, multi-currency) without asking first. Product variations ARE in scope (see Variations).
- Do not copy Furniture Palace's (or any competitor's) product names, photos, descriptions or branding. Their category structure is a reference only. Use original placeholder products and images the owner supplies.
- One data-access layer in `/src/lib/api`. No business logic in UI components. Small reusable components.
- Before each phase, list the files you will create. Keep commits small.

## Design direction
Updated by the owner: the site **blends the layouts** of morarahomefurniture.com (dark editorial hero, story sections) and victoriahomestore.co.ke (retail header, search, deals, social strip). Format only: never either site's text, photos, logo or branding. Everything uses the **Mandela Heritage logo palette** (`public/logo.png`):
- Colours: brand blue `#1556C2`/`#3B72CF`, gold `#DE9830` for eyebrow labels and accents, deep navy (`navy-*`) for dark sections, white/cool-grey `paper-*` for light pages, `terracotta` only for offers and errors. Tokens live in `src/index.css`; add `theme-dark` to a wrapper to flip a section to the navy palette.
- Type (deliberately different from the reference site's Georgia / Inter / Roboto Mono): Playfair Display headings, Manrope body, and Manrope bold uppercase with wide letter-spacing for labels and buttons (`font-label`; no monospace on the storefront). Square buttons and cards.
- Layout: brand-blue top strip (TikTok/Instagram left, call/WhatsApp and announcement right); two-row header: logo, wide search bar with category picker, WhatsApp and cart, then a blue "Browse categories" mega-menu button and links (Home, Shop, Offers, Custom orders, Track order, Contact); on phones a search row under the logo; benefit strip; "On offer now" deals strip (from compare-at prices, no countdowns); New arrivals; full-height dark hero carousel with large serif headline (middle line outlined); dark Shop by Category; alternating feature sections; Shop by Room; dark promise section (no fabricated reviews); custom-order CTA; white footer with heavy top rule. Shop, collection and product pages are dark with a chip filter bar and "Refine" drawer; product page has Buy now / Add to cart and accordions.
- Subtle Framer Motion (fade/slide-in, hover lifts). Respect `prefers-reduced-motion`.

**Smooth scrolling (required, site-wide):**
- Use Lenis (`lenis` package) for inertial smooth scrolling on the storefront, initialised once at the app root with `requestAnimationFrame`. Disable it entirely when `prefers-reduced-motion` is set, and on touch devices keep native scrolling.
- Anchor links and "back to top" scroll smoothly via Lenis (`lenis.scrollTo`). Scroll position resets to the top on route change, and is restored on browser back.
- Scroll-reveal for sections and product cards using Framer Motion `whileInView` (once only, small translate + fade, no layout shift).
- Sticky header that shrinks or hides on scroll down and reappears on scroll up.
- Do NOT apply Lenis to `/admin` (native scrolling there for tables and forms).
- Must not hurt performance: keep 60fps on mid-range Android, no scroll-jacking of horizontal carousels or modals (pause Lenis while a modal or drawer is open).

## Features adopted from leading Kenyan furniture stores
Researched from MoKo, Fairdeal (Ashley licensee), Kings & Queens, Furniture Palace, Victoria Homestore, Bobby Furniture, Urban Sofas and Jiji. Build these in addition to the core storefront:

1. **Delivery zones and fees** (MoKo, Kings & Queens): `delivery_zones` table (name, fee, estimated_days, is_free_threshold optional). Customer picks a zone at checkout and the fee is added to the total. Nairobi zones show "next-day / 1-3 days"; upcountry shows 3-7 days and courier/branch pick-up note.
2. **Delivery and lead-time info on every product** (MoKo "next day delivery in Nairobi", Fairdeal 4-7 days vs custom 2-4 weeks): product fields `lead_time_days`, `is_made_to_order`, `free_delivery`, `badge` (e.g. New, Sale). Show a delivery estimate on the product page.
3. **Custom and made-to-order requests** (Kings & Queens, Fairdeal): a "Request a custom piece" form (name, phone, description, dimensions, preferred fabric/finish, budget, reference image upload) saved to `custom_requests`. Admin reviews, quotes a price, tracks status. Custom orders use a **50% deposit** (configurable in Settings), with `deposit_amount` and `balance_due` on the order.
4. **Order confirmed in writing before payment** (Bobby Furniture): the WhatsApp message and the confirmation page both list items, total, delivery fee, delivery zone and expected delivery date. Show payment instructions after the order is placed. (The owner removed the "We never ask for your M-Pesa PIN" line.)
5. **Floating WhatsApp button and quick-order button** on every page and product (Victoria Homestore live chat, Urban Sofas "Order via WhatsApp"), with a prefilled product message.
6. **Filters like Jiji and Furniture Palace**: room, category, material, colour, price range, in-stock only, free delivery, made-to-order. Sort by price, newest, featured.
7. **Order tracking page**: customer enters order number + phone and sees status through a secure RPC (no listing of other orders).
8. **Trust pages**: Delivery & Installation, Returns & Warranty, Payment Options, FAQ, About (local craftsmanship story), Showroom/Contact with map link and opening hours. All content is editable from Settings or kept in simple content files.
9. **Care and buying guides** (MoKo sofa guide, Sikam care tips): a simple `guides` section (admin-managed posts) for SEO, such as "How to choose a sofa", "Caring for hardwood furniture".
10. **Promotions**: `badge`, `compare_at_price` (shown struck-through), "Free delivery" tag, and an optional site-wide announcement bar editable in Settings.
11. **Hero carousel (home page, required)**: full-width carousel of 3-5 slides, each with image, headline, subtext and a call-to-action button (links to a category, product or the custom-request form). Autoplay every ~6s, pauses on hover/touch and when the tab is hidden, loops, with prev/next arrows, dot indicators, swipe on mobile, keyboard accessible and `aria-roledescription="carousel"`. Framer Motion crossfade/slide transition. First slide image is eager-loaded (LCP), the rest lazy. Slides are managed in the admin (see `hero_slides`), not hard-coded.
12. **Product variations (required, admin-editable)**: see the Variations section.
13. **Category-led catalogue**: the shop is organised by the category tree below, with category cards on the home page, a category mega-menu on desktop, and a collapsible category menu on mobile.
14. **Mobile performance**: lazy-loaded images, responsive `srcset`, WebP, code-split admin, skeleton loaders, target Lighthouse mobile performance 90+.

## Database (Supabase migration in /supabase/migrations)
Core tables:
- categories(id, parent_id nullable, name, slug, description, image_url, sort_order, is_active): two levels (category and sub-category)
- products(id, name, slug, description, category_id, price (base/"from" price), compare_at_price, sku, has_variants, stock_quantity (used only when has_variants = false), low_stock_threshold default 5, is_active, is_featured, dimensions, materials, room, lead_time_days, is_made_to_order, free_delivery, badge, created_at, updated_at)
- product_options(id, product_id, name [e.g. Size, Colour, Fabric, Finish], values text[], sort_order)
- product_variants(id, product_id, sku, option_values jsonb [e.g. {"Size":"3-seater","Fabric":"Velvet","Colour":"Grey"}], price (nullable, falls back to product price), compare_at_price, stock_quantity, low_stock_threshold, image_id nullable references product_images, is_active, sort_order, unique(product_id, option_values))
- hero_slides(id, image_url, mobile_image_url nullable, headline, subtext, cta_label, cta_url, sort_order, is_active, starts_at nullable, ends_at nullable)
- product_images(id, product_id, url, alt_text, sort_order)
- customers(id, full_name, phone unique, email, address, city, notes, created_at)
- orders(id, order_number unique like MH-000123, customer_id, status [pending, confirmed, processing, out_for_delivery, delivered, cancelled], payment_status [unpaid, deposit_paid, paid, refunded], payment_method text, subtotal, delivery_fee, delivery_zone_id, total, deposit_amount, balance_due, delivery_address, delivery_city, preferred_delivery_date, notes, internal_notes, created_at, updated_at)
- order_items(id, order_id, product_id, variant_id nullable, product_name_snapshot, variant_label_snapshot (e.g. "3-seater / Velvet / Grey"), sku_snapshot, unit_price_snapshot, quantity, line_total)
- inventory_movements(id, product_id, variant_id nullable, change_quantity, reason [restock, sale, adjustment, return, cancelled_order], order_id, note, created_by, created_at)
- delivery_zones(id, name, fee, estimated_days_min, estimated_days_max, is_active, notes)
- custom_requests(id, customer_name, phone, email, description, dimensions, preferred_material, budget, reference_image_url, status [new, quoted, accepted, in_production, ready, delivered, declined], quoted_price, deposit_amount, admin_notes, created_at)
- guides(id, title, slug, excerpt, body_markdown, cover_image_url, is_published, published_at)
- settings(key, value jsonb): whatsapp number, payment instructions, deposit percent, contact details, opening hours, announcement bar
- admin_users(user_id, role [owner, staff])

Functions and policies:
- `create_order(customer, zone_id, items jsonb)` SECURITY DEFINER: each item is `{product_id, variant_id?, quantity}`. A product with `has_variants = true` MUST come with an active `variant_id` (reject otherwise). Validates stock on the variant (or the product when it has none), upserts customer by phone, uses current DB prices (variant price, else product price), snapshots the variant label and SKU, adds delivery fee, decrements stock, logs `inventory_movements` with `variant_id`, returns order number and total. Fails cleanly on out-of-stock.
- Cancelling an order restores stock (to the same variant) and logs a movement.
- Public read access to active `product_options`, `product_variants` (without internal cost fields) and active, in-date `hero_slides`.
- `get_order_status(order_number, phone)` returns minimal tracking info only.
- `submit_custom_request(...)` inserts into `custom_requests`.
- `updated_at` triggers. Storage buckets: `product-images` (public read, admin write), `custom-requests` (private, admin read).
- Seed: the category tree below, 2-3 original placeholder products per top-level category (at least 3 sofas/beds/dining items with variations, e.g. size + fabric + colour), 4 hero slides, 4 delivery zones (Nairobi core, Nairobi environs, Mombasa/Kisumu/Nakuru, Rest of Kenya).

## Category tree (seed and shop navigation)
Modelled on the ranges Furniture Palace Kenya (furniturepalacekenya.com) sells: sofas, dining sets, beds, office furniture, and home, office and garden ranges. The site blocked automated access, so the exact menu could not be read. **The owner must confirm or replace this tree against the live site before seeding**; categories are fully editable in the admin afterwards, so a wrong guess costs nothing.
- **Living Room**: Sofas (3-seater, corner/L-shaped, sofa sets, recliners, sofa beds), Armchairs, Coffee Tables, TV Stands, Console and Side Tables, Cabinets and Shelving
- **Dining**: Dining Sets, Dining Tables, Dining Chairs, Bar Stools, Sideboards
- **Bedroom**: Beds and Bed Frames, Wardrobes, Dressing Tables, Bedside Tables, Chests of Drawers
- **Mattresses and Bedding**
- **Office**: Office Desks, Office Chairs, Reception Furniture, Filing and Storage
- **Outdoor and Garden**: Patio Sets, Garden Chairs, Loungers
- **Home Decor**: Rugs, Mirrors, Lighting, Wall Art
Every product belongs to exactly one sub-category (or top-level category when it has none). Filters work on the whole subtree.

## Variations (admin-editable)
Many products come in several sizes, fabrics, colours or finishes (for example a sofa in 2/3/5-seater, velvet/chenille/leather, grey/navy/beige).
- Data: `product_options` define the choices per product, `product_variants` hold one row per combination with its own SKU, price, stock and optional image.
- Products without variations still work as simple products (`has_variants = false`, stock on the product).
- **Storefront**: product page shows option selectors (buttons or colour swatches). Selecting a combination updates price, compare-at price, stock status ("In stock / Only N left / Out of stock"), SKU and the gallery image. Unavailable or out-of-stock combinations are visibly disabled but explained, never silently hidden. Add to cart is disabled until every option is chosen. The cart and order show the variant label. The shop grid shows "From KES X" when variant prices differ.
- **Admin variation editor** (inside the product edit page):
  1. Add or edit options (name + values), drag to reorder, rename or remove values with a warning if variants or past orders use them.
  2. "Generate variants" builds the combinations from the options. Never delete variants that have order history, deactivate them instead.
  3. Editable table of variants: SKU, price override, compare-at price, stock, low-stock threshold, image (pick from the product's images), active toggle.
  4. Bulk actions: set price for all or selected, add or remove stock for selected, activate or deactivate.
  5. Validation: no duplicate combinations, price greater than 0, stock is a whole number of 0 or more.
- **Inventory page** lists stock per variant (product, variant label, SKU, stock badge), and restock or adjust works per variant with a logged `inventory_movements` row.
- Stock for a variant product is the sum of its active variants, shown on the product list.

## Storefront pages
Home (hero carousel, category cards, featured products, why-choose-us, delivery and payment highlights), Category and sub-category pages, Shop (grid + filters + search + sort), Product detail (gallery, option selectors for variations, delivery estimate, stock state, quantity, add to cart, WhatsApp quick-order with the selected variant in the message), Cart (drawer + page, persisted in localStorage), Checkout (name, phone, email optional, address, city, delivery zone, preferred date, notes), Order confirmation (order number, summary, payment instructions, "Continue on WhatsApp"), Track Order, Custom Request, Guides list and detail, Delivery, Returns & Warranty, Payment Options, FAQ, About, Contact, 404. Per-page SEO meta tags and structured data (Product, LocalBusiness).

## Admin dashboard (/admin, Supabase Auth, role-checked)
- **Dashboard**: orders and revenue (today/week/month), pending orders, low and out-of-stock alerts, recent orders, top sellers, new custom requests.
- **Inventory**: stock badges per variant, inline restock/adjust with reason and note, movement history, filters, search, CSV export.
- **Products**: CRUD, multi-image upload with reorder, soft delete via `is_active`, badges, lead time, featured toggle, and the **variation editor** (options, generated variants, per-variant SKU/price/stock/image, bulk edit).
- **Categories**: two-level tree (category and sub-category) with add, rename, reorder (drag), image, and activate or deactivate. A category with products cannot be deleted, only deactivated.
- **Hero carousel**: add, edit, reorder (drag), schedule (start and end dates), activate or deactivate slides, upload desktop and mobile images, set headline, subtext and button link, with a live preview.
- **Orders**: filters (status, payment, date, search), detail page, update status and payment status, record deposit/payment method, internal notes, printable invoice and packing slip, "Message customer on WhatsApp" with prefilled text. Cancel restores stock.
- **Customers**: search, detail with total orders and total spent, order history, notes, CSV export.
- **Custom requests**: pipeline view, quote price, convert to order, status updates.
- **Delivery zones**, **Guides**, **Settings**.

## Blog and guide content rules
When writing guides or blog posts (including seed content): H1 for the title, H2 for sections, **bold** and *italics* for key points, and include internal links (to products and categories) and external links.

## Build phases
1. Database: migration, RLS, RPC functions, seed, first-admin instructions. **Test RLS before moving on** (anonymous users must not read orders or customers).
2. Storefront: pages, filters, cart, checkout, WhatsApp flow, delivery zones, tracking.
3. Admin dashboard: inventory, products, orders, customers, custom requests, zones, settings.
4. Content and polish: guides, trust pages, SEO, accessibility, performance, 404 and error boundaries, README (Supabase setup, migrations, env vars, first admin, Vercel deploy, custom domain), test checklist.

## Definition of done
- Anonymous visitor can browse, order, track an order and submit a custom request, and cannot read any private table.
- Owner can add stock, update orders and view customers without touching the database.
- Owner can create a product, define options, generate and edit variants, change hero slides and reorder categories entirely from the admin.
- Hero carousel autoplays, pauses on hover/touch, swipes on mobile and works with keyboard. Smooth scrolling is active on the storefront, off in `/admin`, and off with reduced motion.
- A customer can order a specific variant and the order, WhatsApp message and stock all reflect it.
- Works at 375px, 768px and 1280px. No console errors. Lighthouse mobile performance 90+.

## Research sources
MoKo delivery FAQs (moko.co.ke), Fairdeal FAQs (fairdealfurniture.co.ke), Kings & Queens help center (kingsandqueensfurniture.odoo.com), Furniture Palace profile (furnitureandfurnishing.com), Victoria Homestore feature (the-star.co.ke), Bobby Furniture listing (goafricaonline.com), Urban Sofas (urban-sofas.onrender.com), Jiji filters (jiji.co.ke).
