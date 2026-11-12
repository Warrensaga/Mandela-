# Phase 2: Storefront

React + Vite + TypeScript storefront on the Phase 1 database. Admin is Phase 3; guides, trust pages and the performance pass are Phase 4.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. `.env.local` already points to the "Mandela" Supabase project (public anon key only).

```bash
npm run build
```

`npm run build` type-checks and builds to `dist/`. `vercel.json` handles SPA routing on Vercel.

## Where things live

| Area | Files |
|---|---|
| Data access (the only place that talks to Supabase) | `src/lib/api/*` |
| Business logic (pure, no React) | `src/lib/catalog/filters.ts`, `src/lib/catalog/variants.ts`, `src/lib/checkout.ts`, `src/lib/whatsapp.ts`, `src/lib/phone.ts` |
| App state | `src/state/site.tsx` (settings, categories, zones), `cart.tsx` (localStorage), `smoothScroll.tsx` (Lenis), `whatsapp.tsx` |
| Layout | `src/components/layout/*` |
| Pages | `src/pages/*` (all but Home are code-split) |

## Routes

`/`, `/shop`, `/category/:slug`, `/product/:slug`, `/cart`, `/checkout`, `/order/:orderNumber`, `/track-order`, `/custom-request`, 404.
Footer links to `/delivery`, `/returns`, `/payment`, `/faq`, `/about`, `/contact` and `/guides` show the 404 page until Phase 4 builds them.

## Manual test checklist

1. **Home**
   - Hero autoplays every 6s and pauses on hover.
   - Hero arrows, dots, pause button and arrow keys work.
   - Hero swipes on a phone.
   - Category cards and featured products appear.
2. **Smooth scrolling**
   - On desktop the page glides when you scroll.
   - With reduced motion turned on in the OS, or on a phone, it uses native scrolling.
   - The header hides as you scroll down and returns as you scroll up.
   - "Back to top" appears far down the page.
3. **Shop:** filter by room, price, material, colour, in stock, free delivery and made to order. Sort and search. The URL keeps the filters, so the back button works.
4. **Category:** `/category/living-room` shows sub-category chips and the whole subtree.
5. **Product (Amani Sofa)**
   - Add to cart stays disabled until size, fabric and colour are chosen.
   - Price, stock ("Only N left"), SKU and photo change with the choice.
   - Out-of-stock choices are crossed out.
   - "Order via WhatsApp" includes the chosen variant.
6. **Cart:** the drawer and `/cart` page update quantities. The cart survives a reload.
7. **Checkout**
   - Empty fields show errors.
   - Choosing an area shows the fee, free delivery over the threshold, and the deposit for made-to-order items.
   - Prices are re-checked against the database when checkout opens.
8. **Confirmation**
   - Shows the order number, items, totals, delivery dates, payment instructions and "We never ask for your M-Pesa PIN."
   - "Continue on WhatsApp" opens a prefilled order message.
9. **Tracking:** the order number plus the right phone shows the status. A wrong phone shows "could not find".
10. **Custom request:** submitting with an optional photo shows a CR- reference.

## Verified on 2026-11-12 (against the live project)

- **Full order flow:** a variant sofa plus a made-to-order sideboard.
  - Database totals matched the page: subtotal 127,000, free Nairobi delivery, 63,500 deposit.
  - Only the chosen variant's stock went down, and a sale movement was logged.
  - The WhatsApp message listed everything.
- **Tracking:** the right phone shows the order; a wrong phone gets "not found".
- **Custom request:** works with a photo uploaded to the private bucket.
- **Filters, sort, search and 404:** all checked.
- **Layout:** no horizontal overflow at 375, 768 or 1280px. No console errors.
- **Cleanup:** test data was removed afterwards.
  - One 8×8 test image remains in Storage → `custom-requests/uploads/`. SQL cannot delete storage files, so delete it in the dashboard.

## Known follow-ups

- **Bundle size:** initial JS is about 230 KB gzipped (React, Framer Motion, Supabase). It will be trimmed in the Phase 4 performance pass, aiming for Lighthouse 90+ on mobile.
- **Hero load time:** hero slides load after the first data request. Phase 4 can preload the first slide image.
- **Placeholder content:** WhatsApp number, payment details and images are still placeholders. Change them in Settings and Products once the admin exists (Phase 3).
