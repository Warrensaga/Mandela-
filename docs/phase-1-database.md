# Phase 1: Database

Supabase Postgres schema, RLS, RPC functions, storage buckets and seed data for Mandela Heritage Furniture.

## Files

| File | What it does |
|---|---|
| `supabase/migrations/20261111230816_schema.sql` | Enums, all tables, constraints, indexes, `updated_at` triggers, two-level category guard, variant option validation, `normalize_ke_phone()`, `variant_label()` |
| `supabase/migrations/20261111230841_rls.sql` | `is_admin()` / `is_owner()`, grants, RLS policies on every table, `product_summaries` view |
| `supabase/migrations/20261111230935_functions.sql` | `create_order`, `get_order_status`, `submit_custom_request`, `adjust_stock`, cancel-restores-stock trigger |
| `supabase/migrations/20261111230947_storage.sql` | `product-images` (public) and `custom-requests` (private) buckets and policies |
| `supabase/migrations/20261111231158_hardening.sql` | Advisor follow-ups: foreign-key indexes, role helpers not callable by anon |
| `supabase/seed.sql` | Settings, category tree, 4 delivery zones, 4 hero slides, 17 placeholder products (7 with variations, 61 variants), 1 hidden draft product |
| `supabase/tests/rls_check.sql` | 50 PASS/FAIL checks covering anon, signed-in and admin access plus the order flow. Rolls everything back. |

## 1. Apply to your Supabase project

Use **one** of these options.

### Option A: SQL Editor (no installs)

In Supabase Dashboard → **SQL Editor**, open a new query for each file below, paste its contents and click **Run**. Keep this order:

1. `supabase/migrations/20261111230816_schema.sql`
2. `supabase/migrations/20261111230841_rls.sql`
3. `supabase/migrations/20261111230935_functions.sql`
4. `supabase/migrations/20261111230947_storage.sql`
5. `supabase/seed.sql`

### Option B: Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push --include-seed
```

> **Status (2026-11-12):** all 5 migrations and the seed have been applied to the "Mandela" project (`roeeqbkgxhvsjjpxodel`) through the Supabase MCP server, and all 50 RLS checks passed there. Because they were applied through MCP, the migration versions recorded in Supabase differ from these filenames. If you later use the CLI (`db push`), run `npx supabase migration list` first and reconcile with `npx supabase migration repair`.

## 2. Test RLS (do this before Phase 2)

Paste `supabase/tests/rls_check.sql` into the SQL Editor and run it. You get one row per check. **Every row must say PASS** (failures sort to the top). The script leaves no data behind, but each run uses up one order number from the sequence.

What it proves:

- Anonymous users get *permission denied* on customers, orders, order items, inventory movements, custom requests and admin users.
- Anonymous users can read active products, variants, options, images, categories, hero slides, zones and public settings. They cannot see the draft product.
- Anonymous users cannot insert, update or delete any table, or call `adjust_stock`.
- `create_order` ignores prices sent by the client, adds the zone fee, snapshots the variant label, decrements the **variant's** stock and logs movements.
- It rejects: a variant product with no variant, out-of-stock items, quantity above stock, inactive products and invalid phones.
- `get_order_status` needs the order number **and** the matching phone, and returns no address or customer details.
- A signed-in user who is not an admin sees nothing private and cannot make themself admin.
- When an admin cancels an order, stock goes back to the same variant, cancellation is logged, and the cancelled order cannot be re-opened.

### Quick manual check from outside (optional)

With the anon key from Project Settings → API:

```bash
curl "https://<ref>.supabase.co/rest/v1/orders?select=*" -H "apikey: <anon-key>"
```

This should return a `permission denied` error. Requesting `/rest/v1/products?select=name` with the same key should list products.

## 3. Create the first admin (owner)

1. Dashboard → **Authentication → Users → Add user → Create new user**. Enter your email and a password and tick **Auto Confirm User**.
2. In the SQL Editor run:

   ```sql
   insert into public.admin_users (user_id, role)
   select id, 'owner' from auth.users where email = 'you@yourdomain.com';
   ```

> **Updated in Phase 3:** staff now sign up at `/admin/signup`, and the owner approves them on the admin Team page. Keep "Allow new users to sign up" **on**. See `docs/phase-3-admin.md`, section 1. Unapproved accounts have no more access than a shop visitor.

Staff can manage products, stock, orders and customers. Only an owner can change Settings (which hold the payment details) or approve and remove team members.

## 4. Before launch: replace placeholder data

All of these are editable from the admin (Phase 3):

- **Category tree**: confirm it against the reference site (see CLAUDE.md).
- **Settings**: `whatsapp_number` (currently `254700000000`), `contact`, `opening_hours`, `payment_instructions` (Paybill, Till and bank fields are blank).
- **Delivery zone fees**: placeholders (KES 1,000 / 2,500 / 6,500 / 9,000; free over KES 100,000 in Nairobi Core). The announcement bar mentions the KES 100,000 threshold.
- **Products and images**: all products are original placeholders, and images point to placehold.co.
- Delete or keep the inactive **Draft Bar Stool**. The RLS test uses it, so keep it until launch.

## RPC reference (for Phase 2)

All errors use SQLSTATE `P0001`, with a machine-readable `message` such as `OUT_OF_STOCK`. `details` holds JSON (for example product, variant, requested and available quantities).

```ts
supabase.rpc('create_order', {
  p_customer: { full_name, phone, email?, address, city },
  p_zone_id: zoneId,
  p_items: [{ product_id, variant_id?, quantity }],
  p_details: { preferred_delivery_date?: 'YYYY-MM-DD', notes? },
})
// -> { order_number, items[], subtotal, delivery_fee, total, deposit_amount,
//      balance_due, delivery_zone, estimated_delivery_from/to, ... }

supabase.rpc('get_order_status', { p_order_number, p_phone })          // -> object | null
supabase.rpc('submit_custom_request', { p_customer_name, p_phone, p_description,
  p_email?, p_dimensions?, p_preferred_material?, p_budget?, p_reference_image_path? })
// upload the reference image first to bucket 'custom-requests' under 'uploads/...'
supabase.rpc('adjust_stock', { p_product_id, p_variant_id, p_change, p_reason, p_note }) // admin only
```

Error messages: `INVALID_NAME`, `INVALID_PHONE`, `INVALID_EMAIL`, `INVALID_ADDRESS`, `INVALID_DATE`, `INVALID_ZONE`, `EMPTY_CART`, `TOO_MANY_ITEMS`, `INVALID_ITEM`, `INVALID_QUANTITY`, `PRODUCT_UNAVAILABLE`, `VARIANT_REQUIRED`, `VARIANT_UNAVAILABLE`, `OUT_OF_STOCK`, `INVALID_DESCRIPTION`, `INVALID_BUDGET`, `INVALID_IMAGE_PATH`, `NOT_AUTHORIZED`, `STOCK_WOULD_GO_NEGATIVE`, `ORDER_CANCELLED_FINAL`, `CATEGORY_TOO_DEEP`, `CATEGORY_HAS_CHILDREN`, `INVALID_VARIANT_OPTION`, `INVALID_VARIANT_IMAGE`.

## Design decisions to confirm

- **Made-to-order items** (`is_made_to_order = true`) skip the stock check because they are built after ordering. An order that contains one gets a deposit of `deposit_percent` (default 50%) and a `balance_due`. Other orders have deposit 0 and the full total due.
- **Delivery fee** is 0 when every item has `free_delivery`, or when the subtotal reaches the zone's `free_delivery_threshold`.
- **Estimated delivery** = today (Nairobi time) + the longest product lead time + the zone's min/max days. It is stored on the order.
- **Sofa types** (3-seater, corner, sofa sets, recliners, sofa beds) are not a third category level, because the tree is limited to two. "Sofas" is one sub-category, and size and shape are variant options. If you would rather have separate sub-categories (for example "Corner Sofas"), rename them in the admin.
- **Cancelled is final.** Stock is restored once, and re-opening is blocked. Create a new order instead.

Small additions beyond the CLAUDE.md column list, each needed by a listed feature:

- `settings.is_public`: which settings anonymous users can read.
- `delivery_zones.free_delivery_threshold` and `sort_order`.
- `products.colour`: the colour filter for simple products.
- `orders.estimated_delivery_from/to`: the expected delivery date.
- `orders.custom_request_id`: converting a custom request to an order.
- `updated_at` on variants, custom requests and settings.
