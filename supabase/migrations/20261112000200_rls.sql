-- =============================================================================
-- Mandela Heritage Furniture: Row Level Security, grants and public views
--
-- Anonymous visitors: read active catalogue data, public settings and published
-- guides only. They never touch customers, orders, order items, inventory
-- movements, custom requests or admin users directly; they go through the
-- SECURITY DEFINER RPCs in the next migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so they can read admin_users under RLS)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid()) and a.role = 'owner'
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS on every table
-- -----------------------------------------------------------------------------
alter table public.admin_users         enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.product_options     enable row level security;
alter table public.product_variants    enable row level security;
alter table public.hero_slides         enable row level security;
alter table public.customers           enable row level security;
alter table public.delivery_zones      enable row level security;
alter table public.custom_requests     enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.guides              enable row level security;
alter table public.settings            enable row level security;

-- -----------------------------------------------------------------------------
-- Grants (defence in depth on top of RLS)
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on
  public.categories,
  public.products,
  public.product_images,
  public.product_options,
  public.product_variants,
  public.hero_slides,
  public.delivery_zones,
  public.guides,
  public.settings
to anon;

-- Authenticated users get table privileges, but every write is gated by
-- is_admin()/is_owner() policies. A signed-in non-admin sees what anon sees.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on sequence public.order_number_seq from anon;

-- New tables created later by migrations must opt in to anon access explicitly.
alter default privileges in schema public revoke all on tables from anon;

-- -----------------------------------------------------------------------------
-- admin_users
-- -----------------------------------------------------------------------------
create policy "admin_users: read own row or any if admin"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "admin_users: owner inserts"
  on public.admin_users for insert to authenticated
  with check ((select public.is_owner()));

create policy "admin_users: owner updates"
  on public.admin_users for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create policy "admin_users: owner deletes"
  on public.admin_users for delete to authenticated
  using ((select public.is_owner()) and user_id <> (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Public catalogue tables: anon/authenticated read active rows, admins do all
-- -----------------------------------------------------------------------------
create policy "categories: public read active"
  on public.categories for select to anon, authenticated
  using (is_active);
create policy "categories: admin all"
  on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "products: public read active"
  on public.products for select to anon, authenticated
  using (is_active);
create policy "products: admin all"
  on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "product_images: public read for active products"
  on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_images: admin all"
  on public.product_images for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "product_options: public read for active products"
  on public.product_options for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_options: admin all"
  on public.product_options for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "product_variants: public read active"
  on public.product_variants for select to anon, authenticated
  using (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_variants: admin all"
  on public.product_variants for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "hero_slides: public read active and in date"
  on public.hero_slides for select to anon, authenticated
  using (is_active
         and (starts_at is null or starts_at <= now())
         and (ends_at is null or ends_at > now()));
create policy "hero_slides: admin all"
  on public.hero_slides for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "delivery_zones: public read active"
  on public.delivery_zones for select to anon, authenticated
  using (is_active);
create policy "delivery_zones: admin all"
  on public.delivery_zones for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "guides: public read published"
  on public.guides for select to anon, authenticated
  using (is_published and (published_at is null or published_at <= now()));
create policy "guides: admin all"
  on public.guides for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Settings: public keys readable by everyone; all keys readable by admins;
-- only the owner can change settings (payment details live here).
create policy "settings: public read public keys"
  on public.settings for select to anon, authenticated
  using (is_public);
create policy "settings: admin read all"
  on public.settings for select to authenticated
  using ((select public.is_admin()));
create policy "settings: owner insert"
  on public.settings for insert to authenticated
  with check ((select public.is_owner()));
create policy "settings: owner update"
  on public.settings for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "settings: owner delete"
  on public.settings for delete to authenticated
  using ((select public.is_owner()));

-- -----------------------------------------------------------------------------
-- Private tables: admins only. No anon policies, no anon grants.
-- -----------------------------------------------------------------------------
create policy "customers: admin all"
  on public.customers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "custom_requests: admin all"
  on public.custom_requests for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Orders are never deleted, only cancelled.
create policy "orders: admin read"
  on public.orders for select to authenticated
  using ((select public.is_admin()));
create policy "orders: admin insert"
  on public.orders for insert to authenticated
  with check ((select public.is_admin()));
create policy "orders: admin update"
  on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "order_items: admin read"
  on public.order_items for select to authenticated
  using ((select public.is_admin()));
create policy "order_items: admin insert"
  on public.order_items for insert to authenticated
  with check ((select public.is_admin()));
create policy "order_items: admin update"
  on public.order_items for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Inventory movements are an append-only ledger.
create policy "inventory_movements: admin read"
  on public.inventory_movements for select to authenticated
  using ((select public.is_admin()));
create policy "inventory_movements: admin insert"
  on public.inventory_movements for insert to authenticated
  with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Views (security_invoker: the caller's RLS applies)
-- -----------------------------------------------------------------------------

-- Product listing helper: "From KES X" pricing and total stock.
-- For variant products, price range and stock come from ACTIVE variants only.
create view public.product_summaries
with (security_invoker = true)
as
select
  p.id,
  p.name,
  p.slug,
  p.category_id,
  p.price,
  p.compare_at_price,
  p.has_variants,
  p.is_active,
  p.is_featured,
  p.room,
  p.materials,
  p.colour,
  p.badge,
  p.free_delivery,
  p.is_made_to_order,
  p.lead_time_days,
  p.low_stock_threshold,
  p.created_at,
  case when p.has_variants then coalesce(v.min_price, p.price) else p.price end as min_price,
  case when p.has_variants then coalesce(v.max_price, p.price) else p.price end as max_price,
  case when p.has_variants then coalesce(v.total_stock, 0) else p.stock_quantity end as total_stock,
  coalesce(v.variant_count, 0) as active_variant_count,
  (select i.url from public.product_images i
    where i.product_id = p.id order by i.sort_order, i.created_at limit 1) as primary_image_url
from public.products p
left join lateral (
  select
    min(coalesce(pv.price, p.price))   as min_price,
    max(coalesce(pv.price, p.price))   as max_price,
    sum(pv.stock_quantity)::integer    as total_stock,
    count(*)::integer                  as variant_count
  from public.product_variants pv
  where pv.product_id = p.id and pv.is_active
) v on true;

grant select on public.product_summaries to anon, authenticated;
