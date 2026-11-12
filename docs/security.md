# Security

How the site is protected, and the few settings that must be switched on in the
Supabase dashboard (they cannot be set from code).

## What is in place

**Database (Supabase)**
- Row level security on every table. Visitors can read only active products,
  categories, images, delivery zones, published guides and public settings.
  Orders, customers, custom requests, stock movements and admin tables are
  admin-only.
- Visitors can write only through three functions: `create_order`,
  `submit_custom_request` and `get_order_status`. Prices, totals and stock are
  always recalculated in the database.
- **Rate limits** (migration `20261112000900_security_hardening.sql`), per hour:
  | Action | Per IP | Per phone | Site-wide |
  |---|---|---|---|
  | Place an order | 10 | 5 | 120 |
  | Custom request | 5 | 3 | 60 |
  | Reference-image upload | 6 | - | 100 |
  | Track order | 30 | 10 wrong phones per order number | - |
  Signed-in admins and staff are exempt from the order and custom-request limits. A blocked visitor sees
  "Too many attempts…" and can try again within the hour.
- Admin sign-in: Supabase Auth limits sign-in attempts per IP on the server, and the sign-in form locks for 60 seconds after 5 failed attempts, doubling each time up to 15 minutes.
- An anonymous order can never overwrite an existing customer's stored name,
  email or address (anyone can type anyone's phone number).
- Uploads to the private `custom-requests` bucket must be named
  `uploads/<random id>.jpg|png|webp|heic`, are 5 MB max and image types only. Only admins can view them.
- The public `product-images` bucket serves files by URL but cannot be listed.
- Hero button links, image URLs and the announcement link accept only site
  paths (`/shop`) or `https://` addresses. `javascript:` and `//other-site` links are refused
  by the database and ignored by the storefront.
- Admin access needs owner approval. Only the owner can approve staff, change settings, or permanently delete orders and products (`admin_delete_products`; past orders keep their own snapshot of each line).

**Website (Vercel)**
- `vercel.json` sends a strict Content-Security-Policy (scripts only from this
  site), blocks the site being framed (clickjacking), and sends `nosniff`, HSTS, a
  referrer policy and a permissions policy. `/admin` pages are `noindex` and never cached.
- `npm run preview` serves the production build with the same headers, so a CSP
  problem shows up locally before deploy.
- Only the public anon key is in the frontend. The service role key is never used.
- CSV exports neutralise spreadsheet formulas in customer-entered text.

Checks: `supabase/tests/security_check.sql`, `rls_check.sql`, `admin_check.sql`,
`signup_check.sql`, `delete_order_check.sql`. Run them in the SQL editor; every row must be PASS (all test data is rolled back).

## Do these in the Supabase dashboard (owner)

1. **Authentication → Sign In / Providers → Email**: keep **Confirm email** on.
2. **Authentication → Passwords** (or Policies): minimum length **10**, require
   letters and digits, and turn on **Leaked password protection** (paid plans only).
3. **Authentication → Rate limits**: keep the defaults or lower them for sign-ups.
4. **Authentication → URL Configuration**: set **Site URL** to your live domain and
   list only your own domains under **Redirect URLs** (plus `http://localhost:5173/**` for development).
5. Turn on **multi-factor authentication** for the owner account if your plan allows it, and use a password manager.
6. Never share the service role key, and never add it to Vercel environment variables.
