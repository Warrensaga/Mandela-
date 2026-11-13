# Launch checklist

Status of the pre-launch check on 12 Nov 2026, and what is left before opening to customers.

## Verified working

- **Customer flow** (tested through the site): add to cart → checkout with delivery zone fee and
  free-delivery hint → order placed → confirmation page with summary, delivery date and payment
  instructions → prefilled WhatsApp message with items, totals, address and delivery date → cart cleared.
  The test order was then removed and its stock restored.
- **Database** (live smoke test, all rolled back): visitors cannot read or write orders, customers,
  custom requests, stock history or admin data; only public settings and active products are visible;
  prices come from the database (a fake client price is ignored); variant products require a variant;
  over-stock orders are refused; tracking and custom requests work.
- **Security**: rate limits, upload limits, safe links, security headers (see [security.md](security.md)).
- **SEO**: titles, descriptions, structured data, robots.txt, sitemaps, product link previews
  (see [seo.md](seo.md)). Lighthouse: SEO 100, best practices 100, accessibility 96–100.
- **No broken links** across 67 pages; no broken images; one H1 per page; alt text everywhere.
- **Mobile**: works at 320–1920px; ~234 KB compressed JavaScript on the home page; admin code is not
  loaded for shoppers; layout shift 0.03.

## Must do before launch (owner)

1. **Deploy the latest code.** Commit and push to GitHub so Vercel builds it. Until then the live site
   runs the older version without today's security and SEO work.
2. **Vercel → Settings → Environment Variables** (Production): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_WHATSAPP_NUMBER`, and `VITE_SITE_URL` = your live domain
   (e.g. `https://mandelaheritage.co.ke`). Redeploy after adding them.
3. **Custom domain**: Vercel → Settings → Domains. Point your domain's DNS as Vercel shows.
4. **Supabase → Authentication → URL Configuration**: Site URL = your live domain; Redirect URLs =
   `https://<your-domain>/**` and `https://mandelafurn.vercel.app/**` (keep `http://localhost:5173/**` for
   development). The admin "Forgot password" email links to `/admin/reset-password`; if that address is
   not allowed here, Supabase sends people to the Site URL instead and the reset cannot be finished.
   Test it once: sign-in page → enter your email → Forgot password → open the email → set a new password.
5. **Supabase Auth settings** in [security.md](security.md): confirm email on, password length 10,
   leaked-password protection (paid plans).
6. **Admin → Settings**:
   - **Payment details**: M-Pesa Paybill or Till and/or bank details. Without them, customers are told
     "We will send payment details with your WhatsApp confirmation".
   - **Contact email**: the placeholder `hello@example.com` was removed; add your real address.
   - Check phone, WhatsApp number, address, opening hours and announcement bar.
7. **Replace the demo catalogue**: add your real products (Admin → Products → New product), then delete
   the demo ones (tick them on the Products list → Delete selected). Replace the four hero slides
   (they use stock photos) under Admin → Hero carousel.
8. **Delete test orders**: order MH-000019 (pending) looks like a test; delete it under Admin → Orders
   if so. Order numbers continue from the last one used (the next will be MH-000035); ask if you want
   the numbering restarted.
9. **Projects**: Admin → Projects. Add homes, offices and rentals you have furnished, with your own photos (ask clients first). Publish at least one and it also appears on the home page.
10. **Reviews**: Admin → Reviews. Paste the link to your Google reviews, your overall rating and count, and copy in your best real reviews exactly as written. They replace the delivery/payment block on the home page.
11. **Delivery zones**: confirm the four zones, fees and days match what you actually charge.

## Missing pages (needed before or soon after launch)

CLAUDE.md lists these; they need your own content, so they were not invented:

- **Returns & Warranty**: your actual return window, conditions and warranty terms.
- **About**: your workshop story, how long you have been making furniture, where.
- **Guides** (care and buying guides): the admin can already create guides, but the public guide
  pages are not built yet (Phase 4).

## After launch

- Submit `https://<your-domain>/sitemap.xml` to Google Search Console and Bing Webmaster Tools.
- Claim your Google Business Profile with the same name, phone and address.
- Run PageSpeed Insights (pagespeed.web.dev) on the live home and a product page (mobile).
  Lighthouse could not record a performance trace on this computer.
- Paste a product link into the Facebook Sharing Debugger to confirm the product preview.
- Redeploy after adding many products so the sitemap updates.
