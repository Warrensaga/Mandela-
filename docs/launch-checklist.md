# Launch checklist

Pre-launch review on 16 November 2026, against the live site (mandelafurn.vercel.app) and the live database.

## Verified working (16 Nov)

- **Shopper journey on the live site, phone and desktop: 27/27 checks each.** Saved items, variant choice, cart, checkout validation, ordering, confirmation (with the 48-hour hold note), WhatsApp message, order tracking. No console errors.
- **Custom request** with a photo upload.
- **Admin, end to end:**
  - dashboard;
  - order filters and search, confirming an order, recording a deposit, invoice and packing slip, cancelling;
  - auto-cancel after 48 hours (run live);
  - quoting and converting a custom request;
  - customers;
  - inventory Adjust and History;
  - creating a product with opening stock, a photo and variants, and deleting it;
  - every other admin page loads, and Settings saves.
- **Security:** visitors cannot read orders, customers, requests, the stock log or admin data. Over the real API, a signed-in admin cannot set stock, write the stock log, change an order total, add order lines or insert orders.
- **Stock:** all 74 stock levels match the stock log.
- **Pages:** all 69 storefront pages crawl clean at phone width.
- **Fixed in this review:**
  - The page no longer jumps while it loads. The category page's layout shift was 1.07, about four times Google's "poor" line of 0.25; it is now 0.
  - On phones, the shop search box gets its own row; it was squeezed to show only "S".
- **Test data:** removed. The next order number is **MH-000063**.

## Blockers: do not launch until these are done

These are the client's and owner's to do. None of them needs code.

1. **Replace the demo catalogue.** All 17 active products (Amani Sofa, Kito Coffee Table and the rest) are invented placeholders, with made-up prices and stock. Every product photo comes from Unsplash or placehold.co.
   - Customers could order furniture that does not exist.
   - Add the real products with the client's own photos: Admin → Products → New product.
   - Then delete the demo ones, and the inactive "Draft Bar Stool": tick them on the Products list → Delete selected.
2. **Replace the four hero slides.** All use Unsplash stock photos. Use the client's own photos: Admin → Hero carousel.
3. **Payment details.** Paybill, Till and bank details are all blank, so the confirmation page has no way to pay. Admin → Settings → Payment instructions.
4. **Contact email** is blank. Admin → Settings → Contact.
5. **Hosting plans** (the plans that run the live site and its database are free tiers):
   - **Vercel Hobby (free) is for personal, non-commercial use.** A shop that takes orders needs **Vercel Pro**.
   - **Supabase Free:**
     - no automatic backups;
     - the project is **paused after a week without activity**;
     - leaked-password protection is unavailable.

     Upgrade to **Supabase Pro** before taking real orders. It is billed through Vercel, because the project was created from Vercel.
6. **Email for admin sign-in.** Supabase's built-in email is heavily rate-limited and only meant for testing; it may only deliver to the project's own team members. "Forgot password" and staff sign-up confirmations need a real sender:
   - Supabase → Authentication → Emails → SMTP settings;
   - use any email provider, ideally an address on the new domain.
7. **Privacy notice.** Checkout collects names, phone numbers and addresses, and Kenya's Data Protection Act 2019 expects customers to be told how that data is used. The site has no privacy page yet: needs the owner's details, and approval to add the page.
8. **Returns & Warranty page.** Required by the project brief and not built yet: needs the owner's actual policy.

## Domain switch (after buying the domain)

1. **Vercel → Project → Settings → Domains:** add `yourdomain.co.ke` and `www.yourdomain.co.ke`, and set the DNS records Vercel shows at the registrar. Make one of them the main address; Vercel redirects the other. Optionally redirect `mandelafurn.vercel.app` to it as well.
2. **Vercel → Settings → Environment Variables (Production):** set `VITE_SITE_URL` to `https://yourdomain.co.ke` with no trailing slash, then **redeploy**. Canonical links, the sitemap, robots.txt and WhatsApp/Facebook link previews all come from this one value.
3. **Supabase → Authentication → URL Configuration:**
   - **Site URL:** the new domain.
   - **Redirect URLs:** `https://yourdomain.co.ke/**`, the www version if used, `https://mandelafurn.vercel.app/**` and `http://localhost:5173/**`.
   - Test "Forgot password" once, end to end.
4. **Supabase → Authentication:** turn on leaked-password protection (once on Pro).
5. **After the switch, check:**
   - the site loads on both addresses, with the padlock;
   - `https://yourdomain.co.ke/robots.txt` names the new sitemap;
   - a product link pasted into WhatsApp shows its photo and price;
   - one real test order works, then delete it under Admin → Orders.

## Should do before or soon after launch

- **Mobile speed.** Measured on the live site under phone conditions (4× slower processor, mobile data):
  - home: about 5 s until the main content shows, and 0.8 s of the page being too busy to respond;
  - product pages: about 5–10 s until the main content shows.

  The project target is Lighthouse mobile 90+, which this is not yet. Much of it is the large Unsplash photos. Photos uploaded through the admin are resized to WebP at 400/800/1200 px, so re-measure on pagespeed.web.dev once the real photos are in. A code speed pass (smaller start-up JavaScript, preloading the first hero image) may still be needed after that.
- **Reviews:** confirm the published review ("Martha") is a real Google review copied exactly. Add the review count shown on Google: Admin → Reviews.
- **Delivery zones:** confirm the four zones, fees and days match what is actually charged. The announcement says free delivery within Nairobi over KES 100,000; make sure the zones agree.
- **Two customers with no orders** (from earlier testing): delete them in the database if they are not real.
- **Stock history:** the log still contains entries from earlier test orders, which balance out to zero. Ask if you want it reset to a single "Opening stock" entry per item before launch.
- **Admin sign-in security:** two-step sign-in for admin accounts, see [production-audit.md](production-audit.md) item B1.
- **Projects and Guides:** add at least one furnished project with the client's own photos. The public Guides pages and the About page are not built yet.

## After launch

- Submit `https://yourdomain.co.ke/sitemap.xml` to Google Search Console and Bing Webmaster Tools.
- Claim the Google Business Profile with the same name, phone and address as the site.
- Run pagespeed.web.dev on the home page and a product page (mobile).
- Paste a product link into the Facebook Sharing Debugger to confirm the preview.
- Redeploy after adding many products, so the sitemap updates.
- The remaining audit items, in [production-audit.md](production-audit.md): payment ledger, change history, error monitoring, analytics.
