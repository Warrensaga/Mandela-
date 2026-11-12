# Phase 3: Admin dashboard

The admin lives at **/admin**. It's code-split from the shop, uses native scrolling (no Lenis), and only accounts listed in `admin_users` can get in.

## 1. Create your owner account (required before testing)

Staff accounts are created by **signing up** at `/admin/signup`. A new account has **no access** until an owner approves it on the **Team** page. Only the very first owner needs a one-off step.

1. In Supabase, go to **Authentication → Sign In / Providers** and make sure **"Allow new users to sign up"** is **on**. The form needs it.
   - Optional: turn on **Confirm email** so every sign-up must verify their address.
   - Optional: turn on CAPTCHA protection against spam sign-ups.
2. Go to **Authentication → URL Configuration** and add `http://localhost:5173/admin/login` and your live domain's `/admin/login` to **Redirect URLs**. The confirmation and "Forgot password" emails need these.
3. Run `npm run dev`, open http://localhost:5173/admin/signup and create your account. You'll see "Waiting for approval".
4. Make that first account the owner. Either ask me to do it, or run this in the **SQL Editor**:

   ```sql
   insert into public.admin_users (user_id, role)
   select id, 'owner' from auth.users where email = 'you@yourdomain.com';
   update public.admin_access_requests set status = 'approved', decided_at = now()
   where email = 'you@yourdomain.com';
   ```

5. Reload `/admin`. From now on, approve everyone else under **Team**.

| Role | Can do |
|---|---|
| Unapproved account | Nothing (sees the "Waiting for approval" screen; same data access as a shop visitor) |
| Staff | Everything except Settings and Team |
| Owner | Everything, including Settings (payment details, WhatsApp number) and approving or removing team members |

## 2. Database additions

The new migration is `supabase/migrations/20261112000600_admin.sql`, already applied to the live project. Every function runs as the signed-in user, so RLS still applies, and each one checks `is_admin()` first.

| Object | Purpose |
|---|---|
| `admin_inventory` view | One row per variant (or per simple product) with its stock |
| `admin_customer_stats` view | Customers with order count, total spent and last order |
| `admin_dashboard()` | Revenue for today, this week and this month; pending/unpaid orders; stock alerts; recent orders; top sellers; open custom requests |
| `admin_set_sort_order(table, ids)` | Drag-and-drop ordering (whitelisted tables only) |
| `admin_option_usage(product)` | Shows which option values are used by variants and past orders, to drive warnings |
| `admin_set_product_options(product, options, renames)` | Saves options and renames values on existing variants. Variants that no longer fit are deleted, or deactivated if they have orders |
| `admin_generate_variants(product)` | Creates the missing combinations. Never deletes |
| `admin_convert_custom_request(...)` | Turns a quoted custom request into an order with a deposit |

`supabase/tests/admin_check.sql` runs 20 checks as an impersonated admin. All 20 passed on the live project, and the script rolls everything back.

## 3. What each screen does

- **Dashboard:** revenue and order counts for today, this week and this month; pending and unpaid orders; low and out-of-stock counts with an alert list; recent orders; top sellers over 30 days; open custom requests.
- **Orders:** filter by status, payment and date, and search by order number, name or phone. The list is paged and exports to CSV.
  - **Order detail:** change status and payment status; record the payment method/reference and deposit; add internal notes.
  - Cancelling returns the stock (done by a database trigger), and a cancelled order is final.
  - "Message on WhatsApp" opens a prefilled status update, and there are printable **Invoice** and **Packing slip** pages.
- **Inventory:** a stock badge for every variant; Add or Remove with a reason and note (each change is logged); movement history; filters for low/out/healthy; search; CSV export.
- **Products:** list with filters, then create or edit.
  - Details include badge, compare-at price, lead time, made-to-order, free delivery, featured and active.
  - Turning **Active** off is a soft delete: the product leaves the shop but its order history stays.
  - Photos: multi-upload (resized to WebP 400/800/1200 in the browser), drag to reorder, alt text, delete.
- **Variation editor:**
  1. **Options:** add or rename options and values, and reorder them. Removing a value shows a warning first if variants or past orders use it.
  2. **Generate variants:** creates the missing combinations.
  3. **Variant table:** edit SKU, price override, compare-at price, stock (changes are logged), low-stock level, photo and active status.
  4. **Bulk actions on selected variants:** set price, add or remove stock, activate or deactivate.
  5. **Validation:** price must be above 0, stock must be a whole number of 0 or more, and duplicate values are blocked.
- **Categories:** a two-level tree. Drag (or use the arrows) to reorder; add, rename, set an image, activate or deactivate. Delete is blocked when a category has products or sub-categories.
- **Customers:** search, totals and CSV export. The detail page shows order history, editable details and notes, plus a WhatsApp link.
- **Custom requests:** a pipeline board (New → Quoted → Accepted → In production → Ready).
  - Open a request to view the private reference photo, set a quote and deposit (defaults to the deposit %), change status, and message the quote on WhatsApp.
  - **Convert to order** creates the order with delivery and deposit filled in.
- **Hero carousel:** add, edit, reorder, schedule start/end dates, activate or deactivate. Upload desktop and mobile images, with a live preview.
- **Delivery zones:** fee, days, free-delivery threshold, customer notes, order and active status.
- **Guides:** title, slug, excerpt, cover image, Markdown body, published toggle. The public guide pages come in Phase 4.
- **Settings:** owner only.
  - Store name, WhatsApp number, deposit %, Paybill/Till/bank details, trust note, contact details, map link, opening hours, announcement bar.
  - Every admin can change their own password here.

## 4. Test checklist (after signing in as owner)

1. **Settings:** set the real WhatsApp number and Paybill, then save. Reload the shop: the floating WhatsApp button and the confirmation page use the new values.
2. **Products → New product:** create a simple product with opening stock 5. Upload two photos, reorder them, then view it in the shop.
3. **Variations on that product:**
   - Add the options Size (S, M) and Colour (Grey, Navy), save, then **Generate variants**. You should get 4.
   - Set stock and prices in the table and save. Inventory history shows the stock changes.
   - Rename Grey to Charcoal. The variants keep their stock.
   - Remove Navy. You get a warning, then 2 variants are deleted.
4. **Inventory:** filter by Low. Add 3 to a variant with reason Restock, then open History.
5. **Order flow:**
   - Place an order on the shop, then find it in Orders. Mark it Confirmed and Deposit paid, record the M-Pesa reference, print the invoice and packing slip, and use Message on WhatsApp.
   - Cancel it: stock returns on the Inventory page.
6. **Custom request:**
   - Submit one on the shop, then open it in Custom requests. Set a quote and save; it moves to Quoted.
   - Convert it to an order: the order opens with the deposit filled in.
7. **Categories and hero:** reorder categories and slides, schedule a slide for tomorrow (it shows "Starts …"), and check the home page.
8. **Access check:** sign out and open `/admin/orders`. You're sent to the sign-in page.

## Known limits

- **Large catalogues:** inventory and product lists load everything at once. That's fine for hundreds of products; add server-side paging if the catalogue grows into the thousands.
- **Order CSV:** the orders CSV exports the current page (25 orders). Filter by date first to export a period.
- **Image formats:** photos are resized in the browser. Chrome, Edge and Firefox save WebP; Safari can't encode WebP, so it saves JPEG instead. The storefront handles both.

## Sign-up and approval (added after Phase 3)

The migration `supabase/migrations/20261112000700_admin_signups.sql` is applied to the live project.

- **Pending requests:** every new account gets a pending row in `admin_access_requests`, created by a trigger on `auth.users`.
- **Who sees what:** applicants see only their own row. The owner sees everyone. Nobody can edit the rows directly.
- **Decisions:** `admin_decide_access(user, approve, role)` is owner-only. It approves as staff or owner, changes roles, or declines and removes access. An owner can't change their own access.
- **Tests:** `supabase/tests/signup_check.sql` runs 17 checks, and all pass on the live project. They cover:
  - anonymous visitors can't see requests
  - applicants can't approve themselves or write to `admin_users`
  - staff can't approve
  - the owner can approve, change roles and remove people
- **Screens:** `/admin/signup` (form) and `/admin/team` (owner only). The sign-in page links to sign-up.
